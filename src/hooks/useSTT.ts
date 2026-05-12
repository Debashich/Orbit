import { useEffect, useState, useCallback, useRef } from 'react';
import { startVoice, stopVoice, destroyVoice } from '../services/speech/stt';

export const useSTT = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const isListeningRef = useRef(false);

  const startListening = useCallback(async (options: { continuous?: boolean } = {}) => {
    console.log('[Hook] 🎯 startListening called, isListeningRef:', isListeningRef.current);
    
    if (isListeningRef.current) {
      // If we are listening, but the state `isListening` is false, it means the wake word detector is running.
      // We should interrupt it to start a manual listening session.
      if (!isListening) {
        console.log('[Hook] 🛑 Interrupting wake word listener for manual listening');
        await stopVoice();
      } else {
        console.log('[Hook] ⚠️ Already in manual listening session, skipping');
        return;
      }
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
      },
      options
    );
  }, [isListening]);

  const startWakeWordDetection = useCallback(async (onDetected: (transcript?: string) => void, onEnded?: () => void) => {
    console.log('[Hook] 👂 Starting wake word detection...');
    
    if (isListeningRef.current) return;
    
    setIsWakeWordDetected(false);
    isListeningRef.current = true;
    
    await startVoice(
      (text) => {
        const lower = text.toLowerCase();
        // Expanded wake word variants for "Orbit"
        // Includes common misrecognitions (Orbed, Audit, Corbett, etc.) 
        // and Hindi transliterations (ऑर्बिट)
        const orbitVariants = [
          'hey orbit', 'orbit', 'hey orbed', 'orbed', 
          'hey audit', 'audit', 'hey corbett', 'corbett',
          'hey order', 'order', 'hey orb', 'orb',
          'hey corporate', 'corporate', 'hey carpet', 'carpet',
          'हे ऑर्बिट', 'ऑर्बिट', 'ओर्बिट', 'हे ओर्बिट',
          'heyorbit', 'hey-orbit'
        ];
        
        const detected = orbitVariants.some(variant => lower.includes(variant));
        
        if (detected) {
          console.log('[Hook] 🔔 Wake word detected:', lower);
          setTranscript(lower);
          isListeningRef.current = false;
          stopVoice();
          setIsWakeWordDetected(true);
          onDetected(lower);
        }
      },
      () => {
        console.log('[Hook] 🏁 Wake word detection session ended');
        isListeningRef.current = false;
        if (onEnded) onEnded();
      },
      { continuous: true, interimResults: true }
    );
  }, []);

  const stopListening = useCallback(async () => {
    console.log('[Hook] ⏹️ stopListening called');
    await stopVoice();
    setIsListening(false);
    isListeningRef.current = false;
    setIsWakeWordDetected(false);
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
    isWakeWordDetected,
    startListening,
    stopListening,
    startWakeWordDetection,
  };
};
