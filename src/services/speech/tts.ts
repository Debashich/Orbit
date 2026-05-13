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

// Generation counter: incremented on every new speak/stop call.
// Stale callbacks compare their captured generation to the current one.
let speakGeneration = 0;

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

export const getIsSpeakingRaw = () => isSpeaking;

export const stopSpeech = async () => {
  try {
    speakGeneration++; // Invalidate any in-flight callbacks
    isSpeaking = false;
    await Speech.stop();
    console.log('[TTS] ⏹️ Speech stopped');
  } catch (err) {
    console.error('[TTS] ❌ Stop error:', err);
  }
};

/**
 * Estimate how long TTS should take for a given text.
 * At rate 0.85, speech is slower (~10 chars/sec).
 * Generous minimum of 4s, maximum of 60s.
 */
const estimateSpeechDuration = (text: string): number => {
  const rate = VOICE_CONFIG.rate || 0.85;
  const charsPerSecond = 12 * rate; // ~10 chars/sec at 0.85 rate
  const estimatedSeconds = text.length / charsPerSecond;
  // Add 4s buffer for engine startup/teardown
  const withBuffer = estimatedSeconds + 4;
  return Math.max(4000, Math.min(withBuffer * 1000, 60000));
};

/**
 * Core TTS function — returns a Promise that resolves when speech completes.
 *
 * The callback `onDone` is still supported for backward compatibility,
 * but callers should prefer awaiting the returned Promise.
 *
 * Fixes applied:
 * 1. Single stop → single speak (no double-stop race)
 * 2. Adaptive safety timeout based on text length
 * 3. isSpeakingAsync polling fallback if onDone never fires
 * 4. Generation counter to discard stale callbacks
 */
export const speakText = async (text: string, onDone?: () => void): Promise<void> => {
  if (!text || text.trim().length === 0) {
    console.log('[TTS] ⚠️ Empty text, skipping');
    onDone?.();
    return;
  }

  // 1. Increment generation — any in-flight callbacks from previous calls are now stale
  speakGeneration++;
  const myGeneration = speakGeneration;

  // 2. Stop any ongoing speech cleanly
  try {
    isSpeaking = false;
    await Speech.stop();
  } catch (e) {}

  // 3. Small delay for Android TTS engine to release audio focus
  await new Promise(resolve => setTimeout(resolve, 150));

  // 4. Check if we were superseded while waiting
  if (myGeneration !== speakGeneration) {
    console.log('[TTS] ⏭️ Superseded by newer speak call, aborting');
    onDone?.();
    return;
  }

  // 5. Refresh language
  await refreshTTSLanguage();
  const langCode = cachedLanguageCode || 'en-US';

  // 6. Check superseded again after async language refresh
  if (myGeneration !== speakGeneration) {
    console.log('[TTS] ⏭️ Superseded by newer speak call, aborting');
    onDone?.();
    return;
  }

  // 7. Create a promise that will resolve when speech completes
  return new Promise<void>((resolve) => {
    isSpeaking = true;
    let settled = false;

    const settle = (reason: string) => {
      if (settled) return;
      settled = true;
      isSpeaking = false;
      // Clear all timers
      if (safetyTimer) clearTimeout(safetyTimer);
      if (pollTimer) clearInterval(pollTimer);
      console.log(`[TTS] 🏁 Settled (${reason}): ${text.substring(0, 40)}`);
      if (onDone) onDone();
      resolve();
    };

    // 8. Safety timeout — adaptive based on text length
    const timeoutMs = estimateSpeechDuration(text);
    let safetyTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (myGeneration !== speakGeneration) {
        settle('superseded-during-timeout');
        return;
      }
      console.warn(`[TTS] ⚠️ Safety timeout (${timeoutMs}ms) — falling through`);
      settle('safety-timeout');
    }, timeoutMs);

    // 9. Polling fallback — requires 3 consecutive "not speaking" readings
    //    to avoid false negatives from Android's isSpeakingAsync.
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let consecutiveFalse = 0;
    const REQUIRED_FALSE_COUNT = 3;

    const startPolling = () => {
      pollTimer = setInterval(async () => {
        if (settled || myGeneration !== speakGeneration) {
          if (pollTimer) clearInterval(pollTimer);
          return;
        }
        try {
          const still = await Speech.isSpeakingAsync();
          if (!still) {
            consecutiveFalse++;
            if (consecutiveFalse >= REQUIRED_FALSE_COUNT) {
              console.log('[TTS] 📊 Poll confirmed speech ended');
              settle('poll-detected');
            }
          } else {
            consecutiveFalse = 0;
          }
        } catch (e) {}
      }, 400);
    };

    // 10. Actually speak
    const speakOptions: any = {
      ...VOICE_CONFIG,
      language: langCode,
      onDone: () => {
        if (myGeneration !== speakGeneration) return;
        console.log('[TTS] ✅ Speech completed (onDone)');
        settle('onDone');
      },
      onError: (error: any) => {
        console.error('[TTS] ❌ Error:', error);
        settle('error');
      },
      onStopped: () => {
        if (myGeneration !== speakGeneration) return;
        console.log('[TTS] ⏹️ Speech was stopped externally');
        settle('stopped');
      },
      onStart: () => {
        if (myGeneration !== speakGeneration) return;
        console.log('[TTS] 🔊 Speech started:', text.substring(0, 50));
        try { Vibration.vibrate([100, 50, 100]); } catch (e) {}
      },
    };

    console.log('[TTS] 📢 SPEAKING:', text.substring(0, 60));
    Speech.speak(text, speakOptions);

    // Start polling only after ~60% of estimated speech time.
    // This prevents premature false-negative from isSpeakingAsync.
    const pollDelay = Math.max(3000, timeoutMs * 0.6);
    setTimeout(() => {
      if (!settled && myGeneration === speakGeneration) {
        startPolling();
      }
    }, pollDelay);
  });
};
