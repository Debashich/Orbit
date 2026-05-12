import { useEffect, useState, useCallback, useRef } from 'react';
import { startVoice, stopVoice, destroyVoice } from '../services/speech/stt';

export const useSTT = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const isListeningRef = useRef(false);
  const isBusyRef = useRef(false);
  const failCountRef = useRef(0);

  const startListening = useCallback(async (options: { continuous?: boolean } = {}) => {
    // Force-clear busy if wake word was running — mic button always wins
    if (isBusyRef.current && !isListening) {
      console.log('[Hook] 🛑 Force-clearing busy lock for manual mic press');
      await stopVoice();
      await new Promise(resolve => setTimeout(resolve, 150));
      isListeningRef.current = false;
      isBusyRef.current = false;
    }

    if (isBusyRef.current) {
      console.log('[Hook] ⚠️ Busy, skipping');
      return;
    }

    if (isListeningRef.current && isListening) {
      return; // Already in manual session
    }
    
    isBusyRef.current = true;
    setTranscript('');
    setIsListening(true);
    isListeningRef.current = true;
    
    await startVoice(
      (text) => setTranscript(text),
      () => {
        setIsListening(false);
        isListeningRef.current = false;
        isBusyRef.current = false;
      },
      options
    );
    
    if (!isListeningRef.current) {
      isBusyRef.current = false;
      setIsListening(false);
    }
  }, [isListening]);

  const startWakeWordDetection = useCallback(async (onDetected: (transcript?: string) => void, onEnded?: () => void) => {
    if (isListeningRef.current || isBusyRef.current) {
      if (onEnded) onEnded();
      return;
    }
    
    isBusyRef.current = true;
    setIsWakeWordDetected(false);
    isListeningRef.current = true;
    
    await startVoice(
      (text) => {
        const lower = text.toLowerCase();
        const orbitVariants = [
          'hey orbit', 'orbit', 'hey orbed', 'orbed', 
          'hey audit', 'audit', 'hey corbett', 'corbett',
          'hey order', 'order', 'hey orb', 'orb',
          'hey corporate', 'corporate', 'hey carpet', 'carpet',
          'हे ऑर्बिट', 'ऑर्बिट', 'ओर्बिट', 'हे ओर्बिट',
          'heyorbit', 'hey-orbit'
        ];
        
        if (orbitVariants.some(v => lower.includes(v))) {
          console.log('[Hook] 🔔 Wake word detected:', lower);
          setTranscript(lower);
          isListeningRef.current = false;
          isBusyRef.current = false;
          failCountRef.current = 0;
          stopVoice();
          setIsWakeWordDetected(true);
          onDetected(lower);
        }
      },
      () => {
        isListeningRef.current = false;
        isBusyRef.current = false;
        if (onEnded) onEnded();
      },
      { continuous: true, interimResults: true }
    );

    // If start failed
    if (!isListeningRef.current) {
      isBusyRef.current = false;
      failCountRef.current++;
      if (onEnded) onEnded();
    }
  }, []);

  const getFailCount = useCallback(() => failCountRef.current, []);
  const resetFailCount = useCallback(() => { failCountRef.current = 0; }, []);

  const stopListening = useCallback(async () => {
    await stopVoice();
    setIsListening(false);
    isListeningRef.current = false;
    isBusyRef.current = false;
    setIsWakeWordDetected(false);
  }, []);

  useEffect(() => {
    return () => {
      isListeningRef.current = false;
      isBusyRef.current = false;
      destroyVoice();
    };
  }, []);

  return {
    transcript,
    isListening,
    isWakeWordDetected,
    startListening,
    stopListening,
    startWakeWordDetection,
    getFailCount,
    resetFailCount,
  };
};
