import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { PermissionsAndroid, Platform } from "react-native";

let activeListeners: Array<{ remove: () => void }> = [];
let isListeningNow = false;

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
          message: 'Clara needs access to your microphone so you can talk to her.',
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

export const startVoice = async (onResult: (text: string) => void, onEnd: () => void) => {
  try {
    console.log('[STT] 📢 Starting voice recognition...');
    
    if (isListeningNow) {
      console.log('[STT] ⚠️ Already listening, ending duplicate start request');
      onEnd();
      return;
    }

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
      console.warn('[STT] ❌ Microphone permission DENIED. User must grant permission in Android Settings.');
      isListeningNow = false;
      onEnd();
      return;
    }

    console.log('[STT] ✅ Permission GRANTED! Setting up listeners...');

    const resultListener = ExpoSpeechRecognitionModule.addListener('result', (event) => {
      console.log('[STT] 📝 Result event:', event);
      if (event.results && event.results[0]) {
        const transcript = event.results[0].transcript;
        console.log('[STT] ✅ Transcript:', transcript);
        onResult(transcript);
      }
    });

    const errorListener = ExpoSpeechRecognitionModule.addListener('error', (event) => {
      console.error('[STT] ❌ Error details:', JSON.stringify(event));
      console.error('[STT] ❌ Error code:', event.error, 'Message:', event.message);
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
    console.log('[STT] ✅ Listeners registered');

    console.log('[STT] 🚀 Calling module.start()');
    ExpoSpeechRecognitionModule.start({
      lang: 'en-IN',
      interimResults: true,
    });
    console.log('[STT] ✅ start() called successfully');
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
