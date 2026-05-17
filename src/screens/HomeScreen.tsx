import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Icons from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTTS } from '../hooks/useTTS';
import { useSTT } from '../hooks/useSTT';
import { useNavigation, useRoute } from '@react-navigation/native';
import { initLlama, LlamaContext } from 'llama.rn';
import RNFS from 'react-native-fs';
import { 
  ORBIT_MOBILITY_PROTOCOL, 
  ASSISTIVE_DESCRIPTION_PROTOCOL, 
  GENERAL_ASSISTANT_PROTOCOL, 
  INTENT_CLASSIFICATION_PROMPT, 
  LANGUAGE_SWITCH_CONFIRMATION_PROMPT,
  Intent 
} from '../constants/prompts';
import { getCurrentLocation, LocationData } from '../services/location';
import { extractCameraPrompt } from '../services/camera';
import { getWeatherData } from '../services/weather';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getUserProfile, saveUserProfile } from '../../database/db';
import { getSafePromptLanguageName } from '../constants/languages';
import { refreshTTSLanguage } from '../services/speech/tts';

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
  // Check for Mobility format: "<hazard> <location>. <action>."
  const hasLocation = lowerText.includes('ahead') || lowerText.includes('left') || lowerText.includes('right') || lowerText.includes('center') || lowerText.includes('forward');
  const hasAction = lowerText.includes('stop') || lowerText.includes('walk') || lowerText.includes('duck') || lowerText.includes('move') || lowerText.includes('proceed') || lowerText.includes('clear') || lowerText.includes('wait') || lowerText.includes('stay');
  const isPathClear = lowerText.includes('path clear');
  
  // Check for Description format: "Object: 5m, center, approaching. Stop."
  const hasDistance = lowerText.includes('m') || lowerText.includes('meter');
  
  return (hasLocation && hasAction) || isPathClear || (hasDistance && hasLocation);
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
  const { speak, speakAndWait, stop, getIsSpeaking } = useTTS();
  const { transcript, isListening, startListening, stopListening, startWakeWordDetection } = useSTT();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const isWakeWordActive = useRef(false);
  const isGeneratingRef = useRef(false);
  const isInitializingRef = useRef(true);
  const isListeningRef = useRef(false);
  const handleMicPressRef = useRef<() => void>(() => {});
  const wakeLoopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLoopMounted = useRef(true);

  // Keep refs in sync with state
  useEffect(() => { isGeneratingRef.current = isGenerating; }, [isGenerating]);
  useEffect(() => { isInitializingRef.current = isInitializing; }, [isInitializing]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  // ─── Self-contained wake word loop ───
  // Uses refs for blocking checks, restarts via scheduleWakeWord.
  const scheduleWakeWord = useCallback((delay = 1000) => {
    if (wakeLoopTimer.current) clearTimeout(wakeLoopTimer.current);
    if (!wakeLoopMounted.current) return;

    wakeLoopTimer.current = setTimeout(async () => {
      if (!wakeLoopMounted.current) return;

      // Wait for ALL blocking conditions to clear
      if (
        isInitializingRef.current || 
        isGeneratingRef.current || 
        isListeningRef.current || 
        isWakeWordActive.current || 
        getIsSpeaking()
      ) {
        scheduleWakeWord(500);
        return;
      }

      isWakeWordActive.current = true;
      console.log('[Home] 👂 Starting wake word detection...');

      const started = await startWakeWordDetection(
        async (fullTranscript) => {
          // Wake word detected!
          isWakeWordActive.current = false;
          if (!wakeLoopMounted.current) return;
          if (fullTranscript) {
            const words = fullTranscript.toLowerCase().trim().split(/\s+/);
            if (words.length > 2) return; // Command was included
          }
          // Trigger mic press flow, then restart wake word loop.
          // scheduleWakeWord polls blocking conditions so it will wait
          // until the full mic→AI→TTS flow completes before restarting.
          handleMicPressRef.current();
          scheduleWakeWord(2000);
        },
        () => {
          // Session ended naturally (silence timeout) — restart loop
          isWakeWordActive.current = false;
          if (wakeLoopMounted.current) scheduleWakeWord(1500);
        }
      );

      // If detection failed to start, retry after delay
      if (!started) {
        isWakeWordActive.current = false;
        if (wakeLoopMounted.current) scheduleWakeWord(3000);
      }
    }, delay);
  }, [startWakeWordDetection, getIsSpeaking]);

  // Start the loop once init completes, stop on unmount
  useEffect(() => {
    wakeLoopMounted.current = true;
    if (!isInitializing) {
      console.log('[Home] 🚀 Init complete, starting wake word loop');
      scheduleWakeWord(2500); // Give TTS greeting time to finish
    }
    return () => {
      wakeLoopMounted.current = false;
      if (wakeLoopTimer.current) clearTimeout(wakeLoopTimer.current);
    };
  }, [isInitializing, scheduleWakeWord]);

  // ─── Auto-restart wake word when system becomes idle ───
  // This is the primary restart mechanism. Whenever isGenerating or
  // isListening flip to false, we kick the wake word loop if it's not
  // already running. This covers all edge cases (mic button, wake word,
  // AI response completion, TTS completion, etc.)
  useEffect(() => {
    if (!isInitializing && !isGenerating && !isListening && !isWakeWordActive.current) {
      console.log('[Home] 🔄 System idle, restarting wake word loop');
      scheduleWakeWord(1500);
    }
  }, [isGenerating, isListening, isInitializing, scheduleWakeWord]);

  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  // If insets.bottom is 0 (button navigation), add padding; if > 0 (gesture nav), use insets
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 12;

  const [context, setContext] = useState<LlamaContext | null>(null);
  const contextRef = useRef<LlamaContext | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [lastIntent, setLastIntent] = useState<Intent | null>(null);
  const lastProcessedTranscript = useRef<string>('');

  const [currentWeather, setCurrentWeather] = useState<any>(null);

  const getSensorContext = (loc: LocationData | null) => {
    if (!loc) return "Motion: unknown. Direction: unknown. ";
    const motion = (loc.speed !== null && loc.speed > 0.5) ? "walking" : "stopped";
    let direction = "facing forward";
    if (loc.heading !== null) {
      if (loc.heading > 45 && loc.heading <= 135) direction = "facing right";
      else if (loc.heading > 135 && loc.heading <= 225) direction = "facing backward";
      else if (loc.heading > 225 && loc.heading <= 315) direction = "facing left";
    }
    return `Motion: ${motion}. Direction: ${direction}. `;
  };

  const classifyIntent = async (text: string): Promise<Intent> => {
    const lower = text.toLowerCase();
    
    if (lower.match(/\b(safe|walk|ahead|blocking|door|car|clear|obstacle|path|danger|stop|go|cross|stairs|step|curb|traffic|signal)\b/) || lower.match(/(चल|खतरा|साफ|रुक|सामने)/)) {
      return 'VISION_REQUIRED';
    }
    if (lower.match(/\b(now|about now|again|once more)\b/) || lower.match(/(फिर से|अभी)/)) {
       if (lastIntent === 'VISION_REQUIRED') return 'VISION_REQUIRED';
       if (lastIntent === 'VISION_OPTIONAL') return 'VISION_OPTIONAL';
    }
    if (lower.match(/\b(describe|what is|read|text|color|label|recognize|identify|looking at|see|show|look|scan)\b/) || lower.match(/(क्या है|देखे|बताओ|पढ़ो|दिखाओ|नाम|ब्रांड)/)) {
      return 'VISION_OPTIONAL';
    }
    if (lower.match(/\b(speak in|language|switch to|hindi|spanish|english|french|german|bengali)\b/) || lower.match(/(हिंदी|अंग्रेजी|भाषा)/)) {
      return 'LANGUAGE_SWITCH';
    }
    // Expanded NON_VISION: covers most conversational queries to avoid slow LLM fallback
    if (lower.match(/\b(hello|hi|hey|how are you|who are you|what is your name|your name|time|date|day|weather|temperature|joke|tell me|thank|thanks|help|what can you|good morning|good night|good evening|sorry|please|okay|ok|fine|great|nice|cool|bye|goodbye|where am i|my location|my name)\b/) || lower.match(/(नमस्ते|शुक्रिया|धन्यवाद|कैसे हो|मेरा नाम)/)) {
      return 'NON_VISION';
    }

    // Short queries (≤4 words) default to NON_VISION — skip slow LLM
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount <= 4) return 'NON_VISION';

    if (!context) return 'UNCERTAIN';
    const prompt = `<start_of_turn>user\n${INTENT_CLASSIFICATION_PROMPT.replace('{query}', text)}<end_of_turn>\n<start_of_turn>model\n`;
    
    let result = '';
    await context.completion({
      prompt,
      n_predict: 10,
      stop: ['<end_of_turn>', '\n'],
      temperature: 0.1,
    }, (res) => {
      result += res.token;
    });

    const intent = result.trim().toUpperCase();
    if (intent.includes('VISION_REQUIRED')) return 'VISION_REQUIRED';
    if (intent.includes('VISION_OPTIONAL')) return 'VISION_OPTIONAL';
    if (intent.includes('LANGUAGE_SWITCH')) return 'LANGUAGE_SWITCH';
    if (intent.includes('NON_VISION')) return 'NON_VISION';
    return 'UNCERTAIN';
  };

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);

        if (loc) {
          getWeatherData(loc.latitude, loc.longitude).then(setCurrentWeather);
        }

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
          n_ctx: 2048,
          n_gpu_layers: 99,
        };

        const llamaContext = await initLlama(llamaConfig);
        
        if (mmprojExists) {
          try {
            await llamaContext.initMultimodal({ 
              path: mmprojPath,
              image_max_tokens: 256,
            });
            console.log('[Home] ✅ Vision mode active');
          } catch (err) {
            console.error('[Home] Failed to load mmproj:', err);
          }
        }
        
        setContext(llamaContext);
        setIsInitializing(false);
        
        setMessages([
          {
            id: '1',
            text: `Hello! I am Orbit. How can I help you today?`,
            sender: 'ai',
            timestamp: new Date(),
          },
        ]);
        speak(`Hello! I am Orbit. How can I help you today?`);
      } catch (error) {
        console.error('Initialization error:', error);
        setIsInitializing(false);
        setMessages([
          {
            id: 'error_1',
            text: `I encountered an error while starting the AI engine. This usually means the model file is corrupted or incomplete. Please clear app data and redownload the model.`,
            sender: 'ai',
            timestamp: new Date(),
          },
        ]);
        speak(`Error starting the AI engine. Please redownload the model.`);
      }
    };

    initializeApp();

    return () => {
      // CRITICAL: stop TTS and release mic on unmount
      stop();
      stopListening();
      if (contextRef.current) {
        contextRef.current.release();
      }
    };
  }, []);

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isGenerating]);

  const openCamera = useCallback(
    (command: string, analysisPrompt: string, intent: Intent = 'VISION_REQUIRED') => {
      navigation.navigate('Camera', {
        command,
        analysisPrompt,
        onCapture: (uri: string, cmd: string, prompt: string) => {
          analyzeImage(uri, prompt, cmd, intent);
        }
      });
    },
    [navigation]
  );

  useEffect(() => {
    if (transcript && transcript !== lastProcessedTranscript.current && !isListening && !isGenerating && !isAnalyzingImage) {
      lastProcessedTranscript.current = transcript;
      console.log('[Home] 🧠 Processing transcript:', `"${transcript}"`);
      
      const processIntent = async () => {
        const intent = await classifyIntent(transcript);
        console.log('[Home] Detected intent:', intent);

        if (intent === 'VISION_REQUIRED' || intent === 'VISION_OPTIONAL') {
          const analysisPrompt = extractCameraPrompt(transcript);
          const feedback = intent === 'VISION_REQUIRED' ? 'Checking surroundings.' : 'Looking now.';
          await speakAndWait(feedback);
          openCamera(transcript, analysisPrompt, intent);
          setLastIntent(intent);
          return;
        }
        
        const lower = transcript.toLowerCase();
        
        if (intent === 'LANGUAGE_SWITCH') {
          let extractedLang = '';
          const extractPrompt = `<start_of_turn>user\nExtract target language from: "${transcript}". Reply ONLY with the name (e.g. "Hindi").<end_of_turn>\n<start_of_turn>model\n`;
          
          if (context) {
            await context.completion({
              prompt: extractPrompt,
              n_predict: 15,
              stop: ['<end_of_turn>', '\n', '<eos>'],
              temperature: 0.1,
            }, (res) => {
              extractedLang += res.token;
            });
          }

          const cleanExtracted = extractedLang.replace(/<\/?(start_of_turn|end_of_turn|eos|s|pad)>/gi, '').trim();
          const safeLang = getSafePromptLanguageName(cleanExtracted);
          
          const profile = await getUserProfile();
          if (profile) {
            await saveUserProfile({ ...profile, language: safeLang });
            await refreshTTSLanguage(safeLang);
            setIsGenerating(true);
            const confirmationPrompt = `<start_of_turn>user\n${LANGUAGE_SWITCH_CONFIRMATION_PROMPT.replace(/{language}/g, safeLang)}<end_of_turn>\n<start_of_turn>model\n`;
            let confirmationMsg = '';
            if (context) {
              await context.completion({ prompt: confirmationPrompt, n_predict: 40, stop: ['<end_of_turn>', '<eos>'], temperature: 0.3 }, (res) => { confirmationMsg += res.token; });
            }
            const cleanConfirmation = confirmationMsg.replace(/<\/?(start_of_turn|end_of_turn|eos|s|pad)>/gi, '').trim();
            const aiMsg: Message = { id: Date.now().toString(), text: cleanConfirmation || `Switched to ${safeLang}.`, sender: 'ai', timestamp: new Date() };
            setMessages(prev => [...prev, { id: (Date.now() - 1).toString(), text: transcript, sender: 'user', timestamp: new Date() }, aiMsg]);
            setIsGenerating(false);
            speak(aiMsg.text);
            return;
          }
        }

        if ((lower === 'yes' || lower === 'yeah' || lower === 'sure' || lower === 'do it' || lower.includes('हाँ') || lower.includes('करो')) && 
            (lastIntent === 'VISION_OPTIONAL' || lastIntent === 'UNCERTAIN')) {
          await speakAndWait('Opening camera.');
          openCamera('Looking at surroundings', 'Describe the scene.', 'VISION_OPTIONAL');
          return;
        }

        setLastIntent(intent);
        sendMessage(transcript, intent);
      };

      processIntent();
    }
  }, [transcript, isListening, isGenerating, isAnalyzingImage, lastIntent]);

  const handleMicPress = async () => {
    if (isGenerating) return;
    // Stop any running wake word detection AND TTS
    await stopListening();
    await stop();
    if (isListening) {
      return; // Was actively listening, just stop
    }
    // Await-based sequencing: TTS completes THEN mic opens
    await speakAndWait('Go ahead');
    // Generous delay for Android audio focus handoff and speaker cleanup.
    // Prevents the mic from hearing the tail end of "Go ahead".
    await new Promise(r => setTimeout(r, 800));
    startListening();
  };
  handleMicPressRef.current = handleMicPress;

  const handleManualCameraPress = useCallback(async () => {
    if (isGenerating || isAnalyzingImage) return;
    if (isListening) await stopListening();
    await stop();
    await speakAndWait('Opening camera now');
    openCamera('Capture image', 'Describe what you see in this image.', 'VISION_OPTIONAL');
  }, [isGenerating, isAnalyzingImage, isListening, stopListening, stop, speakAndWait, openCamera]);

  const sendMessage = async (text: string, currentIntent: Intent = 'NON_VISION') => {
    if (isGenerating || !text.trim() || !context) return;

    // Type-safe proactive clarification for UNCERTAIN intent
    if (currentIntent === 'UNCERTAIN') {
      const msg: Message = { id: Date.now().toString(), text: "I'm not sure if you want me to look at something. Should I open the camera?", sender: 'ai', timestamp: new Date() };
      setMessages(prev => [...prev, { id: (Date.now() - 1).toString(), text, sender: 'user', timestamp: new Date() }, msg]);
      speak(msg.text);
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), text: text.trim(), sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const newAiMessage: Message = { id: assistantMsgId, text: '', sender: 'ai', timestamp: new Date() };
    setMessages((prev) => [...prev, newAiMessage]);

    try {
      const currentLoc = await getCurrentLocation();
      setLocation(currentLoc);
      
      let weatherInfo = "";
      if (text.toLowerCase().includes('weather') || text.toLowerCase().includes('temperature')) {
        if (currentLoc) {
          console.log('[Home] ☁️ Fetching weather data...');
          const weatherData = await getWeatherData(currentLoc.latitude, currentLoc.longitude);
          if (weatherData) {
            weatherInfo = `CRITICAL WEATHER DATA: ${weatherData.temperature}°C, ${weatherData.description} (Code: ${weatherData.weatherCode}), Humidity: ${weatherData.humidity}%. Use this data ONLY for weather reports. `;
          }
        }
      }

      const locationContext = currentLoc ? `User location: ${currentLoc.address}. ` : "";
      const sensorContext = getSensorContext(currentLoc);
      const profile = await getUserProfile();
      const langName = getSafePromptLanguageName(profile?.language);
      const fullContext = `${locationContext}${sensorContext}${weatherInfo}User profile: ${JSON.stringify(profile || {})}`;
      
      let attempt = 1;
      const maxAttempts = 2;
      const languageInstruction = langName.toLowerCase() === 'english'
        ? `\nCRITICAL: Respond in English only. Use proper English words and grammar. Do NOT use Hindi, Hinglish, or any other language.`
        : `\nCRITICAL: Respond in ${langName} using its native script and alphabet. NO Latin/English letters. Write in ${langName} script only.`;
      
      let activeProtocol = GENERAL_ASSISTANT_PROTOCOL;
      if (currentIntent === 'VISION_REQUIRED') activeProtocol = ORBIT_MOBILITY_PROTOCOL;
      else if (currentIntent === 'VISION_OPTIONAL') activeProtocol = ASSISTIVE_DESCRIPTION_PROTOCOL;

      let fullResponse = '';
      while (attempt <= maxAttempts) {
        fullResponse = '';
        const currentPrompt = `<start_of_turn>user\n${activeProtocol}\n\nContext: ${fullContext}\nUser: ${userMsg.text}${languageInstruction}\nFollow protocol strictly.<end_of_turn>\n<start_of_turn>model\n`;

        await context.completion({ prompt: currentPrompt, n_predict: 150, stop: ['<end_of_turn>', '<start_of_turn>', '<eos>'], temperature: 0.2, top_p: 0.8 }, (res) => {
          fullResponse += res.token;
          const cleanText = fullResponse.replace(/<\/?(start_of_turn|end_of_turn|eos|s|pad)>/gi, '').replace(/<\|channel>\w+/g, '').replace(/<channel\|>/g, '').trim();
          setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, text: cleanText } : msg));
        });

        if (isValidResponse(fullResponse.trim()) || currentIntent === 'NON_VISION' || currentIntent === 'LANGUAGE_SWITCH') break;
        attempt++;
      }
      
      const finalClean = fullResponse.replace(/<\/?(start_of_turn|end_of_turn|eos|s|pad)>/gi, '').trim();
      if (finalClean) speak(finalClean);
    } catch (err) {
      console.error('Completion error:', err);
      setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, text: "Sorry, I encountered an error." } : msg));
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeImage = async (imageUri: string, analysisPrompt: string, cameraCommand: string, intent: Intent = 'VISION_REQUIRED') => {
    if (!contextRef.current || isAnalyzingImage) return;
    setIsAnalyzingImage(true);
    const userMsg: Message = { id: Date.now().toString(), text: cameraCommand, sender: 'user', timestamp: new Date(), imageUri };
    setMessages(prev => [...prev, userMsg]);
    setIsGenerating(true);
    const assistantMsgId = (Date.now() + 1).toString();
    const newAiMessage: Message = { id: assistantMsgId, text: '', sender: 'ai', timestamp: new Date() };
    setMessages((prev) => [...prev, newAiMessage]);

    try {
      speak('Analyzing now...');
      const resized = await manipulateAsync(imageUri, [{ resize: { width: 256, height: 256 } }], { compress: 0.5, format: SaveFormat.JPEG });
      const resizedPath = resized.uri.replace('file://', '');
      
      const profile = await getUserProfile();
      const langName = getSafePromptLanguageName(profile?.language);
      const currentLoc = await getCurrentLocation();
      const sensorContext = getSensorContext(currentLoc);
      const languageInstruction = langName.toLowerCase() === 'english'
        ? `\nCRITICAL: Respond in English only. Do NOT use Hindi, Hinglish, or any other language.`
        : `\nCRITICAL: Respond in ${langName} using its native script. NO Latin/English letters.`;
      const activeProtocol = intent === 'VISION_REQUIRED' ? ORBIT_MOBILITY_PROTOCOL : ASSISTIVE_DESCRIPTION_PROTOCOL;

      let attempt = 1;
      const maxAttempts = 2;
      let fullResponse = '';

      while (attempt <= maxAttempts) {
        fullResponse = '';
        const currentPrompt = `<start_of_turn>user\n<__media__>\n${activeProtocol}\n\nContext: ${sensorContext}\nUser request: ${analysisPrompt}${languageInstruction}\nFollow protocol strictly.<end_of_turn>\n<start_of_turn>model\n`;

        await contextRef.current.completion({ prompt: currentPrompt, n_predict: 100, stop: ['<end_of_turn>', '<start_of_turn>', '<eos>'], temperature: 0.2, top_p: 0.8, media_paths: [resizedPath] } as any, (res) => {
          fullResponse += res.token || res.content || '';
          const cleanText = fullResponse.replace(/<\/?(start_of_turn|end_of_turn|eos|s|pad)>/gi, '').replace(/<\|channel>\w+/g, '').replace(/<channel\|>/g, '').trim();
          setMessages((prev) => prev.map((msg) => msg.id === assistantMsgId ? { ...msg, text: cleanText } : msg));
        });

        if (isValidResponse(fullResponse.trim())) break;
        attempt++;
      }
      
      const finalClean = fullResponse.replace(/<\/?(start_of_turn|end_of_turn|eos|s|pad)>/gi, '').trim();
      if (finalClean) {
        await new Promise<void>(resolve => {
          speak(finalClean, () => resolve());
        });
      }
    } catch (err) {
      console.error('[Home] Image analysis error:', err);
      speak('Sorry, I could not analyze the image.');
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
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/logo.png')} style={{ width: 32, height: 32, borderRadius: 8 }} />
            <View>
              <Text style={styles.logoText}>
                <Text style={{ color: '#fff' }}>Orbit</Text>
              </Text>
              {currentWeather && (
                <Text style={styles.weatherSubtext}>
                  {currentWeather.temperature}°C • {currentWeather.description.split(',')[0]}
                </Text>
              )}
            </View>
          </View>
        </View>

        <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageContainer, msg.sender === 'user' ? styles.userMessageContainer : styles.aiMessageContainer]}>
              <View style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                {msg.imageUri && <Image source={{ uri: msg.imageUri }} style={styles.capturedImage} resizeMode="cover" />}
                <Text style={[styles.messageText, msg.sender === 'user' ? styles.userText : styles.aiText]}>{msg.text}</Text>
              </View>
            </View>
          ))}
          <View style={{ height: 280 }} />
        </ScrollView>
      </SafeAreaView>

      <View style={[styles.fixedBottomContainer, { paddingBottom: bottomPadding }]}>
        <View style={styles.listeningContainer}>
          <View style={styles.waveform}>
            {WAVE_HEIGHTS.map((h, i) => (
              <LinearGradient key={i} colors={['#c084fc', '#db2777']} style={[styles.waveBar, { height: (isGenerating || isListening) ? h * 0.85 * (Math.random() * 0.5 + 0.5) : 5 }]} />
            ))}
          </View>
          <Text style={styles.listeningText}>
            {isAnalyzingImage ? 'ANALYZING IMAGE...' : isGenerating ? 'ORBIT IS THINKING...' : (transcript || 'Say something...')}
          </Text>
        </View>

        <View style={styles.bottomTabBar}>
          <View style={styles.tabIcon} /> 
          <View style={styles.tabMicWrapper}>
            <View style={styles.micGlow} />
            <TouchableOpacity activeOpacity={0.8} onPress={handleMicPress}>
              <LinearGradient colors={isListening ? ['#ef4444', '#b91c1c'] : ['#a855f7', '#db2777']} style={[styles.tabMicButton, isGenerating && { opacity: 0.5 }]}>
                <SafeIcon set="Ionicons" name={isListening ? "stop" : "mic"} size={30} color="white" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.tabIcon} onPress={() => navigation.navigate('Settings')}>
            <SafeIcon set="Ionicons" name="settings-sharp" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f111a' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20, marginTop: 10 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoText: { fontSize: 22, fontWeight: 'bold' },
  weatherSubtext: { color: '#94a3b8', fontSize: 10, fontWeight: '600', letterSpacing: 0.5 },
  messageContainer: { flexDirection: 'row', marginBottom: 16, maxWidth: '90%' },
  userMessageContainer: { alignSelf: 'flex-end' },
  aiMessageContainer: { alignSelf: 'flex-start' },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  userBubble: { backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#1e293b', borderBottomLeftRadius: 4 },
  capturedImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 8 },
  messageText: { fontSize: 16, lineHeight: 24 },
  userText: { color: '#fff' },
  aiText: { color: '#e2e8f0' },
  fixedBottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0f111a', paddingTop: 8 },
  listeningContainer: { alignItems: 'center', marginBottom: 14 },
  waveform: { flexDirection: 'row', alignItems: 'center', height: 60, gap: 5, marginBottom: 10 },
  waveBar: { width: 5, borderRadius: 3 },
  listeningText: { color: '#94a3b8', fontSize: 11, letterSpacing: 2, fontWeight: '600', paddingHorizontal: 40, textAlign: 'center' },
  bottomTabBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 10, paddingHorizontal: 20 },
  tabIcon: { padding: 10 },
  tabMicWrapper: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  micGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#db2777', opacity: 0.15 },
  tabMicButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', elevation: 12 },
});
