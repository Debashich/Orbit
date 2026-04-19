import { useEffect, useState, useCallback, useRef } from 'react';
import { startVoice, stopVoice, destroyVoice } from '../services/speech/stt';

export const useSTT = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);

  const startListening = useCallback(async () => {
    console.log('[Hook] 🎯 startListening called, isListeningRef:', isListeningRef.current);
    
    if (isListeningRef.current) {
      console.log('[Hook] ⚠️ Already listening, skipping');
      return;
    }
    
    console.log('[Hook] 📍 Setting listening state to true');
    setTranscript('');
    setIsListening(true);
    isListeningRef.current = true;
    
    await startVoice(
      (text) => {
        console.log('[Hook] 📨 Transcript received:', text);
        setTranscript(text);
      },
      () => {
        console.log('[Hook] 🏁 onEnd callback triggered');
        setIsListening(false);
        isListeningRef.current = false;
      }
    );
  }, []);

  const stopListening = useCallback(async () => {
    console.log('[Hook] ⏹️ stopListening called');
    await stopVoice();
    setIsListening(false);
    isListeningRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      console.log('[Hook] 🧹 Cleanup: calling destroyVoice');
      destroyVoice();
    };
  }, []);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
  };
};
