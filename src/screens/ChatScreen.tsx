import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSTT } from '../hooks/useSTT';
import { useNavigation } from '@react-navigation/native';
import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import { getCurrentLocation, LocationData } from '../services/location';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const ChatScreen = ({ navigation: propNavigation }: any) => {
  const hookNavigation = useNavigation<any>();
  const navigation = propNavigation || hookNavigation;
  const [isInitializing, setIsInitializing] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<LlamaContext | null>(null);
  const contextRef = useRef<LlamaContext | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const { transcript, isListening, startListening, stopListening } = useSTT();

  // Sync ref with state
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    if (transcript && isListening) {
      setInputText(transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Load Location
        const loc = await getCurrentLocation();
        setLocation(loc);

        // Load Model
        const modelPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-q4km.gguf`;
        const exists = await RNFS.exists(modelPath);
        
        if (!exists) {
          Alert.alert(
            "Model Not Found",
            "Please download the model first.",
            [{ text: "OK", onPress: () => navigation.navigate('Download') }]
          );
          return;
        }

        const stats = await RNFS.stat(modelPath);
        console.log(`[Chat] Model file size: ${stats.size} bytes`);

        if (stats.size < 1400000000) { // Gemma 2 2b Q4_K_M should be ~1.6GB
           Alert.alert(
             "Model Incomplete", 
             "The model file is incomplete or corrupted. Please go back to the Download screen and re-download it.",
             [{ text: "Go to Download", onPress: () => navigation.navigate('Download') }]
           );
           return;
        }

        const llamaContext = await initLlama({
          model: modelPath,
          use_mlock: false, // Set to false for better compatibility on emulators/mid-range devices
          n_ctx: 512,       // Further reduced context for initial loading stability
        });
        
        setContext(llamaContext);
        setIsInitializing(false);
        
        setMessages([
          {
            id: '1',
            text: `Hello! I am Clara. I've detected your location as ${loc?.address || 'unknown'}. How can I help you today?`,
            sender: 'ai',
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        console.error('Initialization error:', error);
        Alert.alert("Error", "Failed to initialize AI model or location services.");
      }
    };

    initializeApp();

    return () => {
      if (contextRef.current) {
        contextRef.current.release();
      }
    };
  }, []);

  const handleMicPress = async () => {
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };

  const sendMessage = async () => {
    if (inputText.trim() === '' || !context) return;

    const userText = inputText.trim();
    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputText('');
    setIsTyping(true);

    const aiMessageId = (Date.now() + 1).toString();
    const newAiMessage: Message = {
      id: aiMessageId,
      text: '',
      sender: 'ai',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newAiMessage]);

    try {
      // Refresh location for the most up-to-date context
      const currentLoc = await getCurrentLocation();
      setLocation(currentLoc);

      const locationContext = currentLoc 
        ? `User is currently at ${currentLoc.address} (Lat: ${currentLoc.latitude}, Lon: ${currentLoc.longitude}). `
        : "User location is unavailable. ";

      const prompt = `System: You are Clara, a helpful AI assistant. ${locationContext}Respond concisely.
User: ${userText}
AI:`;

      let fullResponse = '';
      await context.completion(
        {
          prompt,
          n_predict: 400,
          stop: ['User:', 'System:'],
        },
        (res) => {
          fullResponse += res.token;
          setMessages((prev) => 
            prev.map((msg) => 
              msg.id === aiMessageId ? { ...msg, text: fullResponse.trim() } : msg
            )
          );
        }
      );
    } catch (error) {
      console.error('Completion error:', error);
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === aiMessageId ? { ...msg, text: "Sorry, I encountered an error while thinking." } : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ]}
      >
        {!isUser && (
          <View style={styles.aiAvatar}>
            <LinearGradient
              colors={['#a855f7', '#db2777']}
              style={styles.avatarGradient}
            >
              <Ionicons name="sparkles" size={14} color="white" />
            </LinearGradient>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
          ]}
        >
          <Text style={[styles.messageText, isUser ? styles.userText : styles.aiText]}>
            {item.text}
          </Text>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#d946ef" />
        <Text style={styles.loadingText}>INITIALIZING CLARA AI...</Text>
        <Text style={styles.subLoadingText}>Ensuring the local model is ready for conversation.</Text>
      </View>
    );
  }

  const handleClearSession = async () => {
    try {
      setIsInitializing(true);
      if (context) {
        await context.release();
        setContext(null);
      }
      setMessages([]);
      
      // Re-run initialization to get a fresh context
      const modelPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-q4km.gguf`;
      const llamaContext = await initLlama({
        model: modelPath,
        use_mlock: false,
        n_ctx: 512, 
      });
      
      setContext(llamaContext);
      const loc = await getCurrentLocation();
      setLocation(loc);
      
      setMessages([
        {
          id: Date.now().toString(),
          text: `Session reset. Clara is ready at ${loc?.address || 'your location'}.`,
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    } catch (error) {
      console.error('Reset error:', error);
      Alert.alert("Error", "Failed to reset session.");
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Clara AI</Text>
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={handleClearSession}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <ActivityIndicator size="small" color="#a855f7" />
          <Text style={styles.typingText}>Clara is thinking...</Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={[styles.micButtonSmall, isListening && styles.micButtonActive]} 
            onPress={handleMicPress}
          >
            <Ionicons name={isListening ? "stop" : "mic"} size={22} color={isListening ? "#ef4444" : "#94a3b8"} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={isListening ? "Listening..." : "Type a message..."}
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
          >
            <LinearGradient
              colors={['#a855f7', '#db2777']}
              style={styles.sendGradient}
            >
              <Ionicons name="send" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111a',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    color: '#d946ef',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 20,
    textAlign: 'center',
  },
  subLoadingText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  statusText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  menuButton: {
    padding: 4,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  avatarGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  aiText: {
    color: '#e2e8f0',
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  typingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  attachButton: {
    padding: 8,
  },
  micButtonSmall: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  micButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 8,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;
