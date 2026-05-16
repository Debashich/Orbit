import { useEffect, useState, useCallback, useRef } from 'react';
import { startVoice, stopVoice, destroyVoice } from '../services/speech/stt';

export const useSTT = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const isListeningRef = useRef(false);
  const isBusyRef = useRef(false);

  /**
   * Force-stop any running STT session (wake word or manual).
   * Waits for the native engine to fully release before returning.
   */
  const forceStop = useCallback(async () => {
    console.log('[STT-Hook] 🛑 Force-stopping STT session');
    try { await stopVoice(); } catch (e) {}
    isListeningRef.current = false;
    isBusyRef.current = false;
    setIsListening(false);
    // Wait for native engine to fully release
    await new Promise(resolve => setTimeout(resolve, 300));
  }, []);

  /**
   * Start listening for user speech input.
   * Returns true if recognition started successfully, false otherwise.
   * Always force-stops any existing session first.
   */
  const startListening = useCallback(async (): Promise<boolean> => {
    // Always force-stop first — mic button / prompt must always win
    if (isBusyRef.current || isListeningRef.current) {
      await forceStop();
    }

    isBusyRef.current = true;
    setTranscript('');
    setIsListening(true);
    isListeningRef.current = true;

    const started = await startVoice(
      (text) => setTranscript(text),
      () => {
        setIsListening(false);
        isListeningRef.current = false;
        isBusyRef.current = false;
      },
      {}
    );

    if (!started) {
      isBusyRef.current = false;
      isListeningRef.current = false;
      setIsListening(false);
      console.log('[STT-Hook] ⚠️ startListening failed');
      return false;
    }

    console.log('[STT-Hook] ✅ Listening started');
    return true;
  }, [forceStop]);

  /**
   * Start wake word detection in continuous mode.
   * When detected, calls onDetected with the transcript.
   * When session ends naturally (silence timeout), calls onEnded.
   */
  const startWakeWordDetection = useCallback(async (
    onDetected: (transcript?: string) => void,
    onEnded?: () => void
  ): Promise<boolean> => {
    if (isBusyRef.current || isListeningRef.current) {
      console.log('[STT-Hook] ⚠️ Busy, skipping wake word start');
      if (onEnded) onEnded();
      return false;
    }

    isBusyRef.current = true;
    isListeningRef.current = true;

    const started = await startVoice(
      (text) => {
        const lower = text.toLowerCase();
        const orbitVariants = [
          'hey orbit', 'orbit', 'hey orbed', 'orbed',
          'hey audit', 'audit', 'hey corbett', 'corbett',
          'hey order', 'order', 'hey orb', 'orb',
          'hey corporate', 'corporate', 'hey carpet', 'carpet',
          'हे ऑर्बिट', 'ऑर्बिट', 'ओर्बिट', 'हे ओर्बिट',
          'heyorbit', 'hey-orbit', 'hey google', 'google', 'he orbit'
        ];

        if (orbitVariants.some(v => lower.includes(v))) {
          console.log('[STT-Hook] 🔔 Wake word detected:', lower);
          const words = lower.trim().split(/\s+/);
          if (words.length > 2) {
            setTranscript(lower);
          } else {
            setTranscript('');
          }
          // Clear flags FIRST
          isListeningRef.current = false;
          isBusyRef.current = false;
          // Stop the recognition session
          stopVoice();
          // Notify caller
          onDetected(lower);
        }
      },
      () => {
        // Session ended naturally (silence timeout)
        isListeningRef.current = false;
        isBusyRef.current = false;
        if (onEnded) onEnded();
      },
      { continuous: true, interimResults: true }
    );

    if (!started) {
      isBusyRef.current = false;
      isListeningRef.current = false;
      console.log('[STT-Hook] ⚠️ Wake word detection failed to start');
      if (onEnded) onEnded();
      return false;
    }

    return true;
  }, []);

  const stopListening = useCallback(async () => {
    await stopVoice();
    setIsListening(false);
    isListeningRef.current = false;
    isBusyRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      console.log('[STT-Hook] 🧹 useSTT unmounting, destroying voice');
      isListeningRef.current = false;
      isBusyRef.current = false;
      destroyVoice();
    };
  }, []);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    startWakeWordDetection,
  };
};
