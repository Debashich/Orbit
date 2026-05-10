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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTTS } from '../hooks/useTTS';
import { useSTT } from '../hooks/useSTT';
import { useNavigation, useRoute } from '@react-navigation/native';
import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import { ASSISTIVE_VISION_PROTOCOL, INTENT_CLASSIFICATION_PROMPT, Intent } from '../constants/prompts';
import { getCurrentLocation, LocationData } from '../services/location';
import { isCameraCommand, extractCameraPrompt } from '../services/camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getUserProfile, saveUserProfile } from '../../database/db';
import { getSafePromptLanguageName } from '../constants/languages';
import { refreshTTSLanguage } from '../services/speech/tts';

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

const isValidResponse = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  // Check for navigation keywords and actionable instructions
  const hasLocation = lowerText.includes('ahead') || lowerText.includes('left') || lowerText.includes('right') || lowerText.includes('center');
  const hasAction = lowerText.includes('stop') || lowerText.includes('walk') || lowerText.includes('duck') || lowerText.includes('move') || lowerText.includes('proceed') || lowerText.includes('clear');
  const isClear = lowerText.includes('path clear');
  
  return (hasLocation && hasAction) || isClear;
};

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
  const insets = useSafeAreaInsets();
  // If insets.bottom is 0 (button navigation), add padding; if > 0 (gesture nav), use insets
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;

  const [context, setContext] = useState<LlamaContext | null>(null);
  const contextRef = useRef<LlamaContext | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [lastIntent, setLastIntent] = useState<Intent | null>(null);
  const pendingImageRef = useRef<{ uri: string; prompt: string; command: string } | null>(null);
  const lastProcessedTranscript = useRef<string>('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsLanguage, setSettingsLanguage] = useState('');
  const classifyIntent = async (text: string): Promise<Intent> => {
    if (!context) return 'UNCERTAIN';
    
    // Quick keyword override for safety/common cases
    const lower = text.toLowerCase();
    if (lower.match(/\b(safe|walk|ahead|blocking|door|car|clear|see|look|identify)\b/)) {
      return 'VISION_REQUIRED';
    }

    const prompt = `<start_of_turn>user\n${INTENT_CLASSIFICATION_PROMPT.replace('{query}', text)}<end_of_turn>\n<start_of_turn>model\n`;
    
    let result = '';
    await context.completion({
      prompt,
      n_predict: 20,
      stop: ['<end_of_turn>', '\n'],
      temperature: 0.1,
    }, (res) => {
      result += res.token;
    });

    const intent = result.trim().toUpperCase();
    if (intent.includes('VISION_REQUIRED')) return 'VISION_REQUIRED';
    if (intent.includes('VISION_OPTIONAL')) return 'VISION_OPTIONAL';
    if (intent.includes('NON_VISION')) return 'NON_VISION';
    return 'UNCERTAIN';
  };

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
          n_ctx: 2048, // MUST be large enough to hold image tokens (256-512) + prompt + response
          n_gpu_layers: 99, // Attempt GPU offloading — Mali-G57 MC2 supports OpenCL 2.0
        };

        const llamaContext = await initLlama(llamaConfig);
        
        // Add multimodal projector for vision support if available
        if (mmprojExists) {
          try {
            const mmResult = await llamaContext.initMultimodal({ 
              path: mmprojPath,
              image_max_tokens: 256, // 256 is the minimum that works with this projector
            });
            console.log('[Home] initMultimodal returned:', mmResult);
            const mmEnabled = await llamaContext.isMultimodalEnabled();
            console.log('[Home] isMultimodalEnabled:', mmEnabled);
            if (mmEnabled) {
              console.log('[Home] ✅ Vision mode confirmed active');
            } else {
              console.error('[Home] ❌ Vision mode failed to activate despite no error');
            }
          } catch (err) {
            console.error('[Home] Failed to load mmproj:', err);
          }
        } else {
          console.log('[Home] mmproj not found, text-only mode');
        }
        
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
        onCapture: (uri: string, cmd: string, prompt: string) => {
          // Process the captured image directly
          analyzeImage(uri, prompt, cmd);
        }
      });
    },
    [navigation]
  );

  // Note: We no longer rely on useEffect and route.params to trigger analyzeImage.
  // It is now handled safely via the onCapture callback to prevent screen remounting bugs.

  // Handle automatic sending when transcript is captured
  useEffect(() => {
    if (transcript && transcript !== lastProcessedTranscript.current && !isListening && !isGenerating && !isAnalyzingImage) {
      console.log('--- Triggering Intent Check ---');
      console.log('Final Transcript:', transcript);
      
      lastProcessedTranscript.current = transcript;
      
      const processIntent = async () => {
        const intent = await classifyIntent(transcript);
        setLastIntent(intent);
        console.log('[Home] Detected intent:', intent);

        if (intent === 'VISION_REQUIRED') {
          console.log('[Home] Smart camera trigger');
          const analysisPrompt = extractCameraPrompt(transcript);
          speak('Checking surroundings.', () => {
            openCamera(transcript, analysisPrompt);
          });
          return;
        }
        
        // Handle "Yes" to VISION_OPTIONAL or UNCERTAIN follow-ups
        const lower = transcript.toLowerCase();
        if ((lower === 'yes' || lower === 'yeah' || lower === 'sure' || lower === 'do it') && 
            (lastIntent === 'VISION_OPTIONAL' || lastIntent === 'UNCERTAIN')) {
          speak('Opening camera.', () => {
            openCamera('Looking at surroundings', 'Describe the scene.');
          });
          return;
        }

        sendMessage(transcript, intent);
      };

      processIntent();
    }
  }, [transcript, isListening, isGenerating, isAnalyzingImage, lastIntent]);

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

  const sendMessage = async (text: string, currentIntent: Intent = 'NON_VISION') => {
    if (isGenerating || !text.trim() || !context) return;

    // Direct proactive responses for specific intents before even hitting the LLM if needed
    if (currentIntent === 'VISION_OPTIONAL') {
      const msg: Message = { id: Date.now().toString(), text: "I can look at that for you. Do you want me to open the camera?", sender: 'ai', timestamp: new Date() };
      setMessages(prev => [...prev, { id: (Date.now() - 1).toString(), text, sender: 'user', timestamp: new Date() }, msg]);
      speak(msg.text);
      return;
    }

    if (currentIntent === 'UNCERTAIN') {
      const msg: Message = { id: Date.now().toString(), text: "I'm not sure if you want me to look at something. Should I open the camera?", sender: 'ai', timestamp: new Date() };
      setMessages(prev => [...prev, { id: (Date.now() - 1).toString(), text, sender: 'user', timestamp: new Date() }, msg]);
      speak(msg.text);
      return;
    }

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

      const profile = await getUserProfile();
      const langName = getSafePromptLanguageName(profile?.language);

      const prompt = `System: You are Clara, a helpful AI assistant. ${locationContext}Respond concisely in ${langName}.
User: ${userMsg.text}
AI:`;
        ? `User location: ${currentLoc.address}. `
        : "";

      let fullResponse = '';
      let attempt = 1;
      const maxAttempts = 2;

      while (attempt <= maxAttempts) {
        fullResponse = '';
        const currentPrompt = attempt === 1 
          ? `<start_of_turn>user\n${ASSISTIVE_VISION_PROTOCOL}\n\nContext: ${locationContext}\nUser message: ${userMsg.text}\nIMPORTANT: If the user is asking about something you cannot see, DO NOT say "I cannot see". Instead, suggest they say "look at this" to open the camera.\nFollow the OUTPUT CONTRACT strictly.<end_of_turn>\n<start_of_turn>model\n`
          : `<start_of_turn>user\n${ASSISTIVE_VISION_PROTOCOL}\n\nContext: ${locationContext}\nUser message: ${userMsg.text}\nRETRY: Follow the FINAL SPEECH RULE: "<hazard> <location>. <action>."<end_of_turn>\n<start_of_turn>model\n`;

        await context.completion(
          {
            prompt: currentPrompt,
            n_predict: 150,
            stop: ['<end_of_turn>', '<start_of_turn>'],
            temperature: 0.2,
            top_p: 0.8,
          },
          (res) => {
            fullResponse += res.token;
            const cleanText = fullResponse
              .replace(/<\|channel>\w+/g, '')
              .replace(/<channel\|>/g, '')
              .trim();
            
            setMessages((prev) => 
              prev.map((msg) => 
                msg.id === assistantMsgId ? { ...msg, text: cleanText } : msg
              )
            );
          }
        );

        const finalAnswer = fullResponse.trim();
        // If it's a non-vision conversational reply, validation might fail but that's okay for general chat
        if (isValidResponse(finalAnswer) || currentIntent === 'NON_VISION') {
          break;
        } else {
          attempt++;
        }
      }
      
      const finalClean = fullResponse.trim();
      if (finalClean) {
        speak(finalClean);
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

      // Verify multimodal is still active (it can get lost after navigation)
      const mmCheck = await contextRef.current.isMultimodalEnabled();
      console.log('[Vision] Multimodal enabled check:', mmCheck);
      
      if (!mmCheck) {
        console.log('[Vision] Multimodal not active, attempting re-init...');
        const mmprojPath = `${RNFS.DocumentDirectoryPath}/gemma4-e2b-mmproj.gguf`;
        const reInit = await contextRef.current.initMultimodal({
          path: mmprojPath,
          image_max_tokens: 256,
        });
        console.log('[Vision] Re-init result:', reInit);
        const reCheck = await contextRef.current.isMultimodalEnabled();
        if (!reCheck) {
          throw new Error('Failed to re-enable multimodal after re-init');
        }
        console.log('[Vision] ✅ Multimodal re-enabled successfully');
      }

      const cleanPath = imageUri.replace('file://', '');
      console.log('[Vision] Original image path:', cleanPath);
      
      // Resize image to 256x256 to dramatically speed up projector processing
      console.log('[Vision] Resizing image to 256x256...');
      const resizeStart = Date.now();
      const resized = await manipulateAsync(
        imageUri,
        [{ resize: { width: 256, height: 256 } }],
        { compress: 0.5, format: SaveFormat.JPEG }
      );
      const resizedPath = resized.uri.replace('file://', '');
      console.log('[Vision] Resized in', Date.now() - resizeStart, 'ms →', resized.width, 'x', resized.height);
      console.log('[Vision] Resized image path:', resizedPath);
      
      console.log('[Vision] Starting completion...');
      const startTime = Date.now();

      let fullResponse = '';
      let tokenCount = 0;
      let attempt = 1;
      const maxAttempts = 2;

      const profile = await getUserProfile();
      const langName = getSafePromptLanguageName(profile?.language);

      const completionPromise = contextRef.current.completion(
        {
          // Use raw prompt with Gemma's NON-THINKING template format
          // This bypasses the Jinja template that enables the thinking channel
          prompt: `<start_of_turn>user\n<__media__>\nWhat is in this image? Answer in one sentence only in ${langName}.<end_of_turn>\n<start_of_turn>model\n`,
          n_predict: 100, // Short answer only, no thinking = fewer tokens needed
          stop: ['<end_of_turn>', '<start_of_turn>'],
          temperature: 0.3,
          media_paths: [resizedPath],
        } as any,
        (res) => {
          tokenCount++;
          if (tokenCount === 1) {
            console.log('[Vision] First token received after', Date.now() - startTime, 'ms');
          }
          
          const tok = res.token || res.content || '';
          fullResponse += tok;
          
          // Direct display — no thinking tokens with this template
          const cleanText = fullResponse
            .replace(/<\|channel>\w+/g, '')
            .replace(/<channel\|>/g, '')
            .trim();
          
          if (cleanText) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId ? { ...msg, text: cleanText } : msg
              )
            );
      while (attempt <= maxAttempts) {
        fullResponse = '';
        tokenCount = 0;
        
        const currentPrompt = attempt === 1 
          ? `<start_of_turn>user\n<__media__>\n${ASSISTIVE_VISION_PROTOCOL}\n\nUser request: ${analysisPrompt}\nFollow the OUTPUT CONTRACT strictly.<end_of_turn>\n<start_of_turn>model\n`
          : `<start_of_turn>user\n<__media__>\n${ASSISTIVE_VISION_PROTOCOL}\n\nUser request: ${analysisPrompt}\nRETRY: Follow the FINAL SPEECH RULE: "<hazard> <location>. <action>."<end_of_turn>\n<start_of_turn>model\n`;

        console.log(`[Vision] Attempt ${attempt} starting...`);

        const completionPromise = contextRef.current.completion(
          {
            prompt: currentPrompt,
            n_predict: 100,
            stop: ['<end_of_turn>', '<start_of_turn>'],
            temperature: 0.2, // Lower temperature for more deterministic output
            top_p: 0.8,
            media_paths: [resizedPath],
          } as any,
          (res) => {
            tokenCount++;
            const tok = res.token || res.content || '';
            fullResponse += tok;
            
            const cleanText = fullResponse
              .replace(/<\|channel>\w+/g, '')
              .replace(/<channel\|>/g, '')
              .trim();
            
            if (cleanText) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, text: cleanText } : msg
                )
              );
            }
          }
        );

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Image analysis timed out')), 180000)
        );

        await Promise.race([completionPromise, timeoutPromise]);

        const finalAnswer = fullResponse
          .replace(/<\|channel>\w+/g, '')
          .replace(/<channel\|>/g, '')
          .trim();

        if (isValidResponse(finalAnswer)) {
          console.log(`[Vision] Valid response on attempt ${attempt}`);
          break;
        } else {
          console.warn(`[Vision] Invalid response on attempt ${attempt}: ${finalAnswer}`);
          attempt++;
          if (attempt <= maxAttempts) {
            speak('Refining description...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      const finalCleanAnswer = fullResponse
        .replace(/<\|channel>\w+/g, '')
        .replace(/<channel\|>/g, '')
        .trim();

      if (finalCleanAnswer) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, text: finalCleanAnswer } : msg
          )
        );
        
        await stop();
        await new Promise<void>((resolve) => {
          speak(finalCleanAnswer);
          const wordCount = finalCleanAnswer.split(' ').length;
          const estimatedMs = Math.max(3000, wordCount * 400);
          setTimeout(resolve, estimatedMs);
        });
      } else {
        throw new Error('Empty response');
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
      await new Promise(resolve => setTimeout(resolve, 4000));
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
          <View style={{ height: 280 }} />
        </ScrollView>
      </SafeAreaView>

      {/* LISTENING UI & BOTTOM BAR (Overlay) */}
      <View style={[styles.fixedBottomContainer, { paddingBottom: bottomPadding }]}>
        {/* WAVEFORM */}
        <View style={styles.listeningContainer}>
          <View style={styles.waveform}>
            {WAVE_HEIGHTS.map((h, i) => (
              <LinearGradient
                key={i}
                colors={['#c084fc', '#db2777']}
                style={[styles.waveBar, { height: (isGenerating || isListening) ? h * 0.85 * (Math.random() * 0.5 + 0.5) : 5 }]}
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
            <SafeIcon set="MaterialCommunityIcons" name="history" size={26} color="#94a3b8" />
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
                <SafeIcon set="Ionicons" name={isListening ? "stop" : "mic"} size={30} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.tabIcon} onPress={async () => {
            const profile = await getUserProfile();
            setSettingsLanguage(profile?.language || 'English');
            setIsSettingsOpen(true);
          }}>
            <SafeIcon set="Ionicons" name="settings-sharp" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* SETTINGS MODAL */}
      <Modal visible={isSettingsOpen} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settings</Text>
            <Text style={styles.modalSubtitle}>Preferred Language:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. English, Spanish, Hindi"
              placeholderTextColor="#94a3b8"
              value={settingsLanguage}
              onChangeText={setSettingsLanguage}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setIsSettingsOpen(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonPrimary]} 
                onPress={async () => {
                  const profile = await getUserProfile();
                  if (!profile) {
                    Alert.alert('Unable to save', 'No user profile was found. Please complete onboarding or recreate your profile before updating settings.');
                    return;
                  }

                  await saveUserProfile({ ...profile, language: settingsLanguage || 'English' });
                  await refreshTTSLanguage(settingsLanguage || 'English');
                  Alert.alert('Success', 'Language updated!');
                  setIsSettingsOpen(false);
                }}
              >
                <Text style={styles.modalButtonTextPrimary}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: 8,
  },
  listeningContainer: {
    alignItems: 'center',
    marginBottom: 14,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    gap: 5,
    marginBottom: 10,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  listeningText: {
    color: '#94a3b8',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '600',
    paddingHorizontal: 40,
    textAlign: 'center',
  },
  bottomTabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  tabIcon: {
    padding: 10,
  },
  tabMicWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#db2777',
    opacity: 0.15,
  },
  tabMicButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#db2777',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1c1e2d',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#0f111a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonPrimary: {
    backgroundColor: '#d946ef',
  },
  modalButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtonTextPrimary: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
