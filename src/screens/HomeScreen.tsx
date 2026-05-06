import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Icons from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTTS } from '../hooks/useTTS';
import { useSTT } from '../hooks/useSTT';
import { useNavigation } from '@react-navigation/native';
import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import { getCurrentLocation, LocationData } from '../services/location';

const { width } = Dimensions.get('window');

// Safe Icon wrapper
const SafeIcon = ({ set, name, size, color }: any) => {
  try {
    const IconComponent = (Icons as any)[set];
    if (!IconComponent) return <Text style={{ color, fontSize: size }}>•</Text>;
    return <IconComponent name={name} size={size} color={color} />;
  } catch (e) {
    return <Text style={{ color, fontSize: size }}>•</Text>;
  }
};

const WAVE_HEIGHTS = [15, 25, 45, 60, 45, 65, 45, 55, 35, 20, 15];

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

export default function HomeScreen({ navigation: propNavigation }: any) {
  const hookNavigation = useNavigation<any>();
  const navigation = propNavigation || hookNavigation;
  const { speak, stop } = useTTS();
  const { transcript, isListening, startListening, stopListening } = useSTT();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [context, setContext] = useState<LlamaContext | null>(null);
  const contextRef = useRef<LlamaContext | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);

  // Sync ref with state
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);

        const modelPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-q4km.gguf`;
        const exists = await RNFS.exists(modelPath);
        
        if (!exists) {
          console.error("Model not found on HomeScreen load.");
          return;
        }

        const llamaContext = await initLlama({
          model: modelPath,
          use_mlock: false,
          n_ctx: 512,
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
        speak(`Hello! I am Clara. How can I help you today?`);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsInitializing(false); // don't block forever
      }
    };

    initializeApp();

    return () => {
      stop();
      if (contextRef.current) {
        contextRef.current.release();
      }
    };
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isGenerating]);

  // Handle automatic sending when transcript is captured
  useEffect(() => {
    if (transcript && !isListening && !isGenerating) {
      console.log('--- Triggering Send Message ---');
      console.log('Final Transcript:', transcript);
      sendMessage(transcript);
    }
  }, [transcript, isListening, isGenerating]);

  const handleMicPress = async () => {
    if (isGenerating) return;

    await stop();

    if (isListening) {
      await stopListening();
      return;
    }

    speak('Start speaking now', () => {
      setTimeout(() => {
        console.log('[Screen] Starting to listen after TTS');
        startListening();
      }, 100);
    });
  };

  const sendMessage = async (text: string) => {
    if (isGenerating || !text.trim() || !context) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const newAiMessage: Message = {
      id: assistantMsgId,
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
User: ${userMsg.text}
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
              msg.id === assistantMsgId ? { ...msg, text: fullResponse.trim() } : msg
            )
          );
        }
      );
      
      if (fullResponse.trim()) {
        speak(fullResponse.trim());
      }
    } catch (err) {
      console.error('Completion error:', err);
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === assistantMsgId ? { ...msg, text: "Sorry, I encountered an error while thinking." } : msg
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#d946ef" />
        <Text style={[styles.listeningText, { marginTop: 20 }]}>INITIALIZING AI...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <SafeIcon set="Ionicons" name="eye" size={24} color="#d946ef" />
            <Text style={styles.logoText}>
              <Text style={{ color: '#fff' }}>Vision</Text>
              <Text style={{ color: '#d946ef' }}>Voice</Text>
            </Text>
          </View>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <SafeIcon set="Ionicons" name="person" size={18} color="#e5e7eb" />
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 && (
            <View style={styles.center}>
              <Text style={styles.aiText}>
                {isListening ? 'Listening...' : 'Tap the mic to start talking to Clara.'}
              </Text>
            </View>
          )}

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <View
                key={msg.id}
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
                      <Icons.Ionicons name="sparkles" size={14} color="white" />
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
                    {msg.text}
                  </Text>
                  <Text style={styles.timestamp}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })}

          {/* Add bottom padding to allow scrolling past the fixed UI */}
          <View style={{ height: 200 }} />
        </ScrollView>
      </SafeAreaView>

      {/* LISTENING UI & BOTTOM BAR (Overlay) */}
      <View style={styles.fixedBottomContainer}>
        {/* WAVEFORM */}
        <View style={styles.listeningContainer}>
          <View style={styles.waveform}>
            {WAVE_HEIGHTS.map((h, i) => (
              <LinearGradient
                key={i}
                colors={['#c084fc', '#db2777']}
                style={[styles.waveBar, { height: (isGenerating || isListening) ? h * (Math.random() * 0.5 + 0.5) : 5 }]}
              />
            ))}
          </View>
          <Text style={styles.listeningText}>
            {isGenerating ? 'CLARA IS THINKING...' : (transcript || 'Say something...')}
          </Text>
        </View>

        {/* TAB BAR */}
        <View style={styles.bottomTabBar}>
          <TouchableOpacity 
            style={styles.tabIcon} 
            onPress={() => navigation.navigate('Chat')}
          >
            <SafeIcon set="MaterialCommunityIcons" name="history" size={28} color="#94a3b8" />
          </TouchableOpacity>

          {/* GLOWING MIC BUTTON */}
          <View style={styles.tabMicWrapper}>
            <View style={styles.micGlow} />
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={handleMicPress}
            >
              <LinearGradient
                colors={isListening ? ['#ef4444', '#b91c1c'] : ['#a855f7', '#db2777']}
                style={[styles.tabMicButton, isGenerating && { opacity: 0.5 }]}
              >
                <SafeIcon set="Ionicons" name={isListening ? "stop" : "mic"} size={32} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.tabIcon}>
            <SafeIcon set="Ionicons" name="settings-sharp" size={26} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f111a',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 10,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1c1e2d',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '90%',
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
    paddingVertical: 12,
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
    lineHeight: 24,
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
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f111a',
    paddingTop: 10,
  },
  listeningContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 70,
    gap: 6,
    marginBottom: 15,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  listeningText: {
    color: '#94a3b8',
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '600',
    paddingHorizontal: 40,
    textAlign: 'center',
  },
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  tabIcon: {
    padding: 10,
    marginBottom: 10,
  },
  tabMicWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#db2777',
    opacity: 0.15,
  },
  tabMicButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#db2777',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
});

