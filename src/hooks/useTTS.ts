import { useEffect, useCallback, useRef } from 'react';
import { speakText, stopSpeech, initializeTTS } from '../services/speech/tts';

export const useTTS = () => {
  const isSpeakingRef = useRef(false);

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
    isSpeakingRef.current = true;
    speakText(text, () => {
      isSpeakingRef.current = false;
      if (onDone) onDone();
    });
  }, []);

  const stop = useCallback(async () => {
    console.log('[Hook] ⏹️ stop() called');
    isSpeakingRef.current = false;
    stopSpeech();
  }, []);

  const getIsSpeaking = useCallback(() => isSpeakingRef.current, []);

  return { speak, stop, getIsSpeaking };
};
