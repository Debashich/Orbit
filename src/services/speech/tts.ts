import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';
import { VOICE_CONFIG } from '../../constants/voice';

let isSpeaking = false;
let isInitialized = false;

export const initializeTTS = async () => {
  if (isInitialized) return;
  try {
    console.log('[TTS] 🎙️ Initializing TTS engine...');
    const voices = await Speech.getAvailableVoicesAsync();
    console.log('[TTS] 🎙️ Available voices:', voices.length);
    if (voices.length > 0) {
      const english = voices.find((v: any) => v.language?.includes('en'));
      if (english) {
        console.log('[TTS] ✅ Using English voice:', english.language, english.identifier);
      }
    }
    isInitialized = true;
    console.log('[TTS] ✅ TTS Engine Ready');
  } catch (err) {
    console.log('[TTS] ❌ Init error:', err);
  }
};

export const stopSpeech = () => {
  if (isSpeaking) {
    isSpeaking = false;
    Speech.stop();
    console.log('[TTS] ⏹️ Speech stopped');
  }
};

export const speakText = (text: string, onDone?: () => void) => {
  if (!text || text.trim().length === 0) {
    console.log('[TTS] ⚠️ Empty text, skipping');
    onDone?.();
    return;
  }

  stopSpeech();
  isSpeaking = true;

  const speakOptions: any = {
    ...VOICE_CONFIG,
    onDone: () => {
      isSpeaking = false;
      console.log('[TTS] ✅ Speech completed');
      onDone?.();
    },
    onError: (error: any) => {
      isSpeaking = false;
      console.error('[TTS] ❌ Error:', error);
      onDone?.();
    },
    onStart: () => {
      console.log('[TTS] 🔊 Speech started:', text.substring(0, 50));
      console.log('[TTS] 🔊 Config:', VOICE_CONFIG);
      try {
        Vibration.vibrate([100, 50, 100]);
      } catch (e) {
        console.log('[TTS] Vibration not available');
      }
    },
  };

  console.log('[TTS] 📢 SPEAKING NOW:', text);
  console.log('[TTS] 📢 Options:', speakOptions);
  Speech.speak(text, speakOptions);
};
