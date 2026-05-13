import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { getUserProfile } from "../../../database/db";
import { getLanguageCode } from "../../constants/languages";
import { AppState, AppStateStatus } from "react-native";

let activeListeners: Array<{ remove: () => void }> = [];
let isListeningNow = false;
let cachedPermission: boolean | null = null;
let cachedLangCode: string | null = null;

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

const refreshLangCode = async () => {
  try {
    const profile = await getUserProfile();
    cachedLangCode = getLanguageCode(profile?.language);
  } catch (e) {
    cachedLangCode = 'en-US';
  }
};

let langInitPromise: Promise<void> | null = null;
const ensureLangCode = async (): Promise<string> => {
  if (cachedLangCode) return cachedLangCode;
  if (!langInitPromise) langInitPromise = refreshLangCode();
  await langInitPromise;
  langInitPromise = null;
  return cachedLangCode || 'en-US';
};

// Monitor app state — force-stop mic when app goes to background
let appStateSubscription: { remove: () => void } | null = null;

const setupAppStateMonitor = () => {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState !== 'active' && isListeningNow) {
      console.log('[STT] 📱 App not active, force-stopping mic');
      try {
        clearListeners();
        ExpoSpeechRecognitionModule.abort();
      } catch (e) {}
      isListeningNow = false;
    }
  });
};

/**
 * Start speech recognition. Returns a Promise<boolean> indicating whether
 * the recognition session actually started successfully.
 */
export const startVoice = async (
  onResult: (text: string) => void,
  onEnd: () => void,
  options: { continuous?: boolean; interimResults?: boolean } = {}
): Promise<boolean> => {
  setupAppStateMonitor();

  // Always abort previous session first
  try {
    clearListeners();
    ExpoSpeechRecognitionModule.abort();
  } catch (e) {}
  isListeningNow = false;

  // Wait for native engine to fully release
  await new Promise(resolve => setTimeout(resolve, 300));

  try {
    if (cachedPermission !== true) {
      const ok = await checkMicrophonePermission();
      if (!ok) { onEnd(); return false; }
    }

    let hasCalledOnEnd = false;
    let didStart = false;

    const safeOnEnd = () => {
      if (hasCalledOnEnd) return;
      hasCalledOnEnd = true;
      isListeningNow = false;
      clearListeners();
      onEnd();
    };

    // Register event listeners
    const startListener = ExpoSpeechRecognitionModule.addListener('start', () => {
      console.log('[STT] ✅ Recognition started');
      didStart = true;
    });

    const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
      if (event.results?.[0]) {
        onResult(event.results[0].transcript);
      }
    });

    const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
      console.error('[STT] ❌ Error:', event.error, event.message);
      if (event.error === 'service-not-allowed') cachedPermission = null;
      safeOnEnd();
    });

    const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
      console.log('[STT] 🛑 Listening ended');
      safeOnEnd();
    });

    activeListeners = [startListener, resultListener, errorListener, endListener];
    isListeningNow = true;

    const langCode = await ensureLangCode();

    ExpoSpeechRecognitionModule.start({
      lang: langCode,
      interimResults: options.interimResults ?? true,
      continuous: options.continuous ?? false,
    } as any);

    // Wait briefly to see if recognition actually starts
    await new Promise(resolve => setTimeout(resolve, 400));

    if (!didStart && !hasCalledOnEnd) {
      // Recognition may still be initializing — give it more time
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    return isListeningNow;
  } catch (err) {
    console.error('[STT] ❌ Start Error:', err);
    isListeningNow = false;
    clearListeners();
    onEnd();
    return false;
  }
};

export const stopVoice = async () => {
  try {
    isListeningNow = false;
    clearListeners();
    ExpoSpeechRecognitionModule.abort();
  } catch (err) {
    console.error('[STT] ❌ Stop Error:', err);
  }
};

export const destroyVoice = async () => {
  try {
    isListeningNow = false;
    clearListeners();
    ExpoSpeechRecognitionModule.abort();
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
  } catch (err) {
    console.error('[STT] ❌ Destroy Error:', err);
  }
};

export const isMicActive = () => isListeningNow;
export const refreshSTTLanguage = () => { cachedLangCode = null; };
