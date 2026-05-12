import * as Speech from 'expo-speech';
import { Vibration } from 'react-native';
import { VOICE_CONFIG } from '../../constants/voice';
import { getUserProfile } from '../../../database/db';
import { getLanguageCode } from '../../constants/languages';

let isSpeaking = false;
let isInitialized = false;
let cachedLanguageCode = '';
let hasCachedLanguage = false;
let languageRefreshPromise: Promise<string> | null = null;

export const refreshTTSLanguage = async (languageName?: string, forceRefresh = false) => {
  if (typeof languageName === 'string' && languageName.trim().length > 0) {
    cachedLanguageCode = getLanguageCode(languageName);
    hasCachedLanguage = true;
    languageRefreshPromise = null;
    return cachedLanguageCode;
  }

  if (!forceRefresh && hasCachedLanguage && cachedLanguageCode) {
    return cachedLanguageCode;
  }

  if (languageRefreshPromise) {
    return languageRefreshPromise;
  }

  languageRefreshPromise = (async () => {
    const profile = await getUserProfile();
    cachedLanguageCode = getLanguageCode(profile?.language);
    hasCachedLanguage = true;
    return cachedLanguageCode;
  })();

  try {
    return await languageRefreshPromise;
  } finally {
    languageRefreshPromise = null;
  }
};

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
    await refreshTTSLanguage();
    isInitialized = true;
    console.log('[TTS] ✅ TTS Engine Ready');
  } catch (err) {
    console.log('[TTS] ❌ Init error:', err);
  }
};

export const stopSpeech = () => {
  try {
    Speech.stop();
    isSpeaking = false;
    console.log('[TTS] ⏹️ Speech stop requested');
  } catch (err) {
    console.error('[TTS] ❌ Stop error:', err);
  }
};

export const speakText = async (text: string, onDone?: () => void) => {
  if (!text || text.trim().length === 0) {
    console.log('[TTS] ⚠️ Empty text, skipping');
    onDone?.();
    return;
  }

  // Stop any previous speech and wait for engine to release
  try {
    await Speech.stop();
  } catch (e) {}
  // Android TTS engine needs a moment between stop and start
  await new Promise(resolve => setTimeout(resolve, 100));
  
  await refreshTTSLanguage();
  const langCode = cachedLanguageCode || 'en-US';

  isSpeaking = true;
  let callbackFired = false;

  const safeOnDone = () => {
    if (callbackFired) return;
    callbackFired = true;
    isSpeaking = false;
    if (onDone) onDone();
  };

  // Safety timeout — if TTS silently drops the speech (no onDone/onError), 
  // we still clean up after 15 seconds so the app doesn't get stuck
  const safetyTimeout = setTimeout(() => {
    if (!callbackFired) {
      console.warn('[TTS] ⚠️ Safety timeout — speech may have been silently dropped');
      safeOnDone();
    }
  }, 15000);

  const speakOptions: any = {
    ...VOICE_CONFIG,
    language: langCode,
    onDone: () => {
      clearTimeout(safetyTimeout);
      console.log('[TTS] ✅ Speech completed');
      safeOnDone();
    },
    onError: (error: any) => {
      clearTimeout(safetyTimeout);
      console.error('[TTS] ❌ Error:', error);
      safeOnDone();
    },
    onStart: () => {
      console.log('[TTS] 🔊 Speech started:', text.substring(0, 50));
      try {
        Vibration.vibrate([100, 50, 100]);
      } catch (e) {}
    },
  };

  console.log('[TTS] 📢 SPEAKING NOW:', text);
  Speech.speak(text, speakOptions);
};
