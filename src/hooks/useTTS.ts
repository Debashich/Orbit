import { useEffect, useCallback } from 'react';
import { speakText, stopSpeech, initializeTTS } from '../services/speech/tts';

export const useTTS = () => {
  useEffect(() => {
    console.log('[Hook] 🎯 Mounting useTTS hook');
    const init = async () => {
      await initializeTTS();
      console.log('[Hook] ✅ TTS initialized on mount');
    };
    init();
  }, []);

  const speak = useCallback((text: string, onDone?: () => void) => {
    console.log('[Hook] 📣 speak() called with:', text);
    speakText(text, onDone);
  }, []);

  const stop = useCallback(async () => {
    console.log('[Hook] ⏹️ stop() called');
    stopSpeech();
  }, []);

  return { speak, stop };
};
