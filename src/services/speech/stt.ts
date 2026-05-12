import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { AppState, AppStateStatus } from "react-native";
import { getUserProfile } from "../../../database/db";
import { getLanguageCode } from "../../constants/languages";

let activeListeners: Array<{ remove: () => void }> = [];
let isListeningNow = false;
let cachedPermission: boolean | null = null;
let cachedLangCode: string | null = null;

// Stop mic immediately when app goes to background/closes
AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
  if (nextAppState !== 'active') {
    if (isListeningNow) {
      console.log('[STT] 📱 App backgrounded/closed, stopping mic');
      forceStopAll();
    }
  }
});

const forceStopAll = () => {
  try {
    isListeningNow = false;
    clearListeners();
    ExpoSpeechRecognitionModule.abort();
  } catch (e) {}
};

const clearListeners = () => {
  activeListeners.forEach((l) => { try { l.remove(); } catch (e) {} });
  activeListeners = [];
};

export const checkMicrophonePermission = async (): Promise<boolean> => {
  if (cachedPermission === true) return true;
  try {
    console.log('[STT] 🔐 Requesting speech recognition permission...');
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    cachedPermission = result.granted;
    console.log('[STT] 🔐 Permission:', result.granted);
    return result.granted;
  } catch (err) {
    console.error('[STT] ❌ Permission check failed:', err);
    return false;
  }
};

// Pre-cache language code to avoid DB lookup on every start
const refreshLangCode = async () => {
  try {
    const profile = await getUserProfile();
    cachedLangCode = getLanguageCode(profile?.language);
  } catch (e) {
    cachedLangCode = 'en-US';
  }
};

// Refresh on first call
let langInitPromise: Promise<void> | null = null;
const ensureLangCode = async (): Promise<string> => {
  if (cachedLangCode) return cachedLangCode;
  if (!langInitPromise) langInitPromise = refreshLangCode();
  await langInitPromise;
  langInitPromise = null;
  return cachedLangCode || 'en-US';
};

export const startVoice = async (
  onResult: (text: string) => void, 
  onEnd: () => void, 
  options: { continuous?: boolean; interimResults?: boolean } = {}
) => {
  // Abort any existing session quickly
  if (isListeningNow) {
    console.log('[STT] ⚠️ Aborting previous session');
    try {
      isListeningNow = false;
      clearListeners();
      ExpoSpeechRecognitionModule.abort();
    } catch (e) {}
    // Minimal wait — just enough for engine to release
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  try {
    // Use cached permission
    if (cachedPermission !== true) {
      const ok = await checkMicrophonePermission();
      if (!ok) { onEnd(); return; }
    }

    clearListeners();
    isListeningNow = true;

    let hasCalledOnEnd = false;
    const safeOnEnd = () => {
      if (hasCalledOnEnd) return;
      hasCalledOnEnd = true;
      isListeningNow = false;
      clearListeners();
      onEnd();
    };

    const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event) => {
      if (event.results?.[0]) {
        onResult(event.results[0].transcript);
      }
    });

    const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event) => {
      console.error('[STT] ❌ Error:', event.error, event.message);
      if (event.error === 'service-not-allowed') cachedPermission = null;
      safeOnEnd();
    });

    const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
      console.log('[STT] 🛑 Listening ended');
      safeOnEnd();
    });

    activeListeners = [resultListener, errorListener, endListener];

    // Use cached lang code for speed
    const langCode = await ensureLangCode();

    ExpoSpeechRecognitionModule.start({
      lang: langCode,
      interimResults: options.interimResults ?? true,
      continuous: options.continuous ?? false,
    } as any);
  } catch (err) {
    console.error('[STT] ❌ Start Error:', err);
    isListeningNow = false;
    clearListeners();
    onEnd();
  }
};

export const stopVoice = async () => {
  try {
    isListeningNow = false;
    clearListeners();
    ExpoSpeechRecognitionModule.stop();
  } catch (err) {
    console.error('[STT] ❌ Stop Error:', err);
  }
};

export const destroyVoice = async () => {
  try {
    isListeningNow = false;
    clearListeners();
    ExpoSpeechRecognitionModule.abort();
  } catch (err) {
    console.error('[STT] ❌ Destroy Error:', err);
  }
};

export const isMicActive = () => isListeningNow;

// Allow external refresh of lang code (e.g., after language change)
export const refreshSTTLanguage = () => { cachedLangCode = null; };
