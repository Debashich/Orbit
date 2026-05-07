import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Icons from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTTS } from '../hooks/useTTS';
import { useSTT } from '../hooks/useSTT';
import { useNavigation, useRoute } from '@react-navigation/native';
import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import { getCurrentLocation, LocationData } from '../services/location';
import { isCameraCommand, extractCameraPrompt } from '../services/camera';

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
  imageUri?: string;
}

export default function HomeScreen({ navigation: propNavigation, route: propRoute }: any) {
  const hookNavigation = useNavigation<any>();
  const hookRoute = useRoute<any>();
  const navigation = propNavigation || hookNavigation;
  const route = propRoute || hookRoute;
  const { speak, stop } = useTTS();
  const { transcript, isListening, startListening, stopListening } = useSTT();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const [context, setContext] = useState<LlamaContext | null>(null);
  const contextRef = useRef<LlamaContext | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const pendingImageRef = useRef<{ uri: string; prompt: string; command: string } | null>(null);

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
        const mmprojPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-mmproj.gguf`;
        const modelExists = await RNFS.exists(modelPath);
        const mmprojExists = await RNFS.exists(mmprojPath);
        
        if (!modelExists) {
          console.error("Model not found on HomeScreen load.");
          return;
        }

        const llamaConfig: any = {
          model: modelPath,
          use_mlock: false,
          n_ctx: 512,
        };

        // Add multimodal projector for vision support if available
        if (mmprojExists) {
          llamaConfig.mmproj = mmprojPath;
          console.log('[Home] mmproj found, vision mode enabled');
        } else {
          console.log('[Home] mmproj not found, text-only mode');
        }

        const llamaContext = await initLlama(llamaConfig);
        
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

  const openCamera = useCallback(
    (command: string, analysisPrompt: string) => {
      navigation.navigate('Camera', {
        command,
        analysisPrompt,
      });
    },
    [navigation]
  );

  // Handle captured image returned from CameraScreen
  useEffect(() => {
    const params = route.params;
    if (params?.capturedImageUri && contextRef.current && !isAnalyzingImage) {
      const imageUri = params.capturedImageUri;
      const analysisPrompt = params.analysisPrompt || 'Describe what you see in this image.';
      const cameraCommand = params.cameraCommand || 'capture image';
      
      // Clear the params to prevent re-processing
      navigation.setParams({ capturedImageUri: undefined, analysisPrompt: undefined, cameraCommand: undefined });
      
      // Process the captured image
      analyzeImage(imageUri, analysisPrompt, cameraCommand);
    }
  }, [route.params?.capturedImageUri, isAnalyzingImage]);

  // Handle automatic sending when transcript is captured
  useEffect(() => {
    if (transcript && !isListening && !isGenerating && !isAnalyzingImage) {
      console.log('--- Triggering Send Message ---');
      console.log('Final Transcript:', transcript);
      
      // Check if this is a camera command
      if (isCameraCommand(transcript)) {
        console.log('[Home] Camera command detected:', transcript);
        const analysisPrompt = extractCameraPrompt(transcript);
        speak('Opening camera now', () => {
          openCamera(transcript, analysisPrompt);
        });
        return;
      }
      
      sendMessage(transcript);
    }
  }, [transcript, isListening, isGenerating, isAnalyzingImage]);

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

  const handleManualCameraPress = useCallback(async () => {
    if (isGenerating || isAnalyzingImage) return;
    if (isListening) {
      await stopListening();
    }
    await stop();
    speak('Opening camera now', () => {
      openCamera('Capture image', 'Describe what you see in this image.');
    });
  }, [isGenerating, isAnalyzingImage, isListening, stopListening, stop, speak, openCamera]);

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

  // Analyze a captured image using the multimodal model
  const analyzeImage = async (imageUri: string, analysisPrompt: string, cameraCommand: string) => {
    if (!contextRef.current || isAnalyzingImage) return;

    setIsAnalyzingImage(true);
    
    // Add user message with image
    const userMsg: Message = {
      id: Date.now().toString(),
      text: cameraCommand,
      sender: 'user',
      timestamp: new Date(),
      imageUri: imageUri,
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
      speak('Analyzing the image now...');

      const prompt = `System: You are Clara, a helpful AI assistant with vision capabilities. Analyze the provided image carefully and respond to the user's request.
User: ${analysisPrompt}
AI:`;

      let fullResponse = '';
      await contextRef.current.completion(
        {
          prompt,
          n_predict: 500,
          stop: ['User:', 'System:'],
          media_paths: [imageUri],
        } as any,
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
        await stop();
        speak(fullResponse.trim());
      }
    } catch (err) {
      console.error('[Home] Image analysis error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, text: 'Sorry, I could not analyze the image. Please try again.' }
            : msg
        )
      );
      speak('Sorry, I could not analyze the image. Please try again.');
    } finally {
      setIsGenerating(false);
      setIsAnalyzingImage(false);
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
                  {msg.imageUri && (
                    <Image
                      source={{ uri: msg.imageUri }}
                      style={styles.capturedImage}
                      resizeMode="cover"
                    />
                  )}
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
            {isAnalyzingImage ? 'ANALYZING IMAGE...' : isGenerating ? 'CLARA IS THINKING...' : (transcript || 'Say something...')}
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

          <TouchableOpacity style={styles.tabIcon} onPress={handleManualCameraPress}>
            <SafeIcon set="Ionicons" name="camera-outline" size={26} color="#94a3b8" />
          </TouchableOpacity>

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
  capturedImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
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
