import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { PermissionsAndroid, Platform, AppState } from "react-native";
import { getUserProfile } from "../../../database/db";
import { getLanguageCode } from "../../constants/languages";

let activeListeners: Array<{ remove: () => void }> = [];
let isListeningNow = false;

// Handle app state changes to turn off mic
AppState.addEventListener('change', (nextAppState) => {
  if (nextAppState !== 'active') {
    console.log('[STT] 📱 App backgrounded/closed, ensuring mic is OFF');
    destroyVoice();
  }
});

const clearListeners = () => {
  activeListeners.forEach((listener) => listener.remove());
  activeListeners = [];
};

export const checkMicrophonePermission = async () => {
  try {
    console.log('[STT] 🔐 Checking microphone permission...');
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Orbit needs access to your microphone so you can talk to her.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      console.log('[STT] 🔐 PermissionsAndroid result:', granted);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    console.log('[STT] 🔐 Permission result:', result.granted, 'Status:', result.status);
    return result.granted;
  } catch (err) {
    console.error('[STT] ❌ Permission check failed:', err);
    return false;
  }
};

export const startVoice = async (
  onResult: (text: string) => void, 
  onEnd: () => void, 
  options: { continuous?: boolean; interimResults?: boolean } = {}
) => {
  try {
    console.log(`[STT] 📢 Starting voice recognition (continuous: ${!!options.continuous})...`);
    
    // Safety: Abort any existing session before starting a new one
    try {
      await ExpoSpeechRecognitionModule.abort();
    } catch (e) {}
    
    clearListeners();
    isListeningNow = true;

    let hasPermission = false;
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      hasPermission = result.granted;
    }
    
    if (!hasPermission) {
      console.warn('[STT] ❌ Microphone permission DENIED.');
      isListeningNow = false;
      onEnd();
      return;
    }

    const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event) => {
      if (event.results && event.results[0]) {
        const transcript = event.results[0].transcript;
        onResult(transcript);
      }
    });

    const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event) => {
      console.error('[STT] ❌ Error:', event.error, event.message);
      isListeningNow = false;
      clearListeners();
      onEnd();
    });

    const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
      console.log('[STT] 🛑 Listening ended');
      isListeningNow = false;
      clearListeners();
      onEnd();
    });

    activeListeners = [resultListener, errorListener, endListener];

    const profile = await getUserProfile();
    const langCode = getLanguageCode(profile?.language);

    ExpoSpeechRecognitionModule.start({
      lang: langCode,
      interimResults: options.interimResults ?? true,
      continuous: options.continuous ?? false,
    });
  } catch (err) {
    console.error('[STT] ❌ Start Error:', err);
    isListeningNow = false;
    onEnd();
  }
};

export const stopVoice = async () => {
  try {
    console.log('[STT] ⏹️ Stopping voice recognition');
    isListeningNow = false;
    clearListeners();
    ExpoSpeechRecognitionModule.stop();
  } catch (err) {
    console.error('[STT] ❌ Stop Error:', err);
  }
};

export const destroyVoice = async () => {
  try {
    console.log('[STT] 🗑️ Destroying voice recognition');
    ExpoSpeechRecognitionModule.abort();
    isListeningNow = false;
    clearListeners();
  } catch (err) {
    console.error('[STT] ❌ Destroy Error:', err);
  }
};
