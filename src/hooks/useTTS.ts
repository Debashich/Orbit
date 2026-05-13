import { useEffect, useCallback, useRef } from 'react';
import { speakText, stopSpeech, initializeTTS, getIsSpeakingRaw } from '../services/speech/tts';

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

  /**
   * Speak text. Returns a Promise that resolves when speech finishes.
   * Also accepts an optional `onDone` callback for backward compatibility.
   */
  const speak = useCallback((text: string, onDone?: () => void): Promise<void> => {
    console.log('[Hook] 📣 speak() called with:', text.substring(0, 50));
    isSpeakingRef.current = true;
    return speakText(text, () => {
      isSpeakingRef.current = false;
      if (onDone) onDone();
    });
  }, []);

  /**
   * Convenience: speak and await completion. Use this when you need to
   * sequence actions after TTS (e.g., start mic after "Go ahead").
   */
  const speakAndWait = useCallback(async (text: string): Promise<void> => {
    console.log('[Hook] 📣 speakAndWait() called with:', text.substring(0, 50));
    isSpeakingRef.current = true;
    await speakText(text, () => {
      isSpeakingRef.current = false;
    });
  }, []);

  const stop = useCallback(async () => {
    console.log('[Hook] ⏹️ stop() called');
    isSpeakingRef.current = false;
    await stopSpeech();
  }, []);

  const getIsSpeaking = useCallback(() => {
    // Check both the ref AND the raw module state for maximum reliability
    return isSpeakingRef.current || getIsSpeakingRaw();
  }, []);

  return { speak, speakAndWait, stop, getIsSpeaking };
};
