_# 📁 🔥 FINAL TARGET FILE STRUCTURE (Lean + Scalable)

```plaintext
src/
│
├── screens/
│   └── HomeScreen.tsx        ← ONLY UI + orchestration (no heavy logic)
│
├── hooks/
│   ├── useTTS.ts            ← Phase 1
│   ├── useSTT.ts            ← Phase 2
│
├── services/                ← (IMPORTANT: reuse-first mindset)
│   ├── speech/
│   │   ├── tts.ts           ← thin wrapper over expo-speech
│   │   └── stt.ts           ← thin wrapper over voice lib
│
├── constants/
│   └── voice.ts             ← config (language, rate, etc.)
│
└── utils/
    └── guards.ts            ← tiny helpers (optional, minimal)
```

---

# ⚡ DESIGN PRINCIPLE (VERY IMPORTANT)

> Hooks = orchestration
> Services = library wrappers
> Screen = UI only

👉 This avoids rewriting logic later when you plug in LLM

---

# 🔹 PHASE 1 PR — “TTS Foundation”

## 🎯 Goal

Clara speaks reliably

---

## 📁 Files to CREATE

### 1. `services/speech/tts.ts`

(Wrapper → reuse expo directly)

```ts
import * as Speech from 'expo-speech';
import { VOICE_CONFIG } from '../../constants/voice';

export const speakText = (text: string, onDone?: () => void) => {
  Speech.stop();

  Speech.speak(text, {
    ...VOICE_CONFIG,
    onDone,
    onError: onDone,
  });
};

export const stopSpeech = () => {
  Speech.stop();
};
```

---

### 2. `constants/voice.ts`

```ts
export const VOICE_CONFIG = {
  language: 'en-IN',
  rate: 0.9,
  pitch: 1.0,
};
```

---

### 3. `hooks/useTTS.ts`

```ts
import { speakText, stopSpeech } from '../services/speech/tts';

export const useTTS = () => {
  return {
    speak: speakText,
    stop: stopSpeech,
  };
};
```

👉 Notice:

* No logic duplication
* Only imports → clean

---

## ✏️ MODIFY

### `HomeScreen.tsx`

```ts
import { useTTS } from '../hooks/useTTS';
```

Add:

```ts
const { speak, stop } = useTTS();
```

---

### On mount:

```ts
useEffect(() => {
  speak('Clara is ready');
}, []);
```

---

### Button:

```ts
onPress={() => speak('Hello, how can I help you')}
```



# 🔹 PHASE 2 PR — “STT Foundation”

## 🎯 Goal

Voice → Text

---

## 📁 Files to CREATE

### 1. `services/speech/stt.ts`

```ts
import Voice from '@react-native-voice/voice';

export const startVoice = async () => {
  await Voice.start('en-IN');
};

export const stopVoice = async () => {
  await Voice.stop();
};

export const destroyVoice = async () => {
  await Voice.destroy();
  Voice.removeAllListeners();
};
```

---

### 2. `hooks/useSTT.ts`

```ts
import { useEffect, useState } from 'react';
import Voice from '@react-native-voice/voice';
import { startVoice, stopVoice, destroyVoice } from '../services/speech/stt';

export const useSTT = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      setTranscript(e.value?.[0] ?? '');
      setIsListening(false);
    };

    Voice.onSpeechError = () => {
      setIsListening(false);
    };

    return () => {
      destroyVoice();
    };
  }, []);

  const startListening = async () => {
    setTranscript('');
    setIsListening(true);
    await startVoice();
  };

  const stopListening = async () => {
    await stopVoice();
    setIsListening(false);
  };

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
  };
};
```

---

## ✏️ MODIFY

### `HomeScreen.tsx`

```ts
import { useSTT } from '../hooks/useSTT';
```

Add:

```ts
const { transcript, startListening, isListening } = useSTT();
```

---

### UI Add:

```ts
<Text>{transcript || 'Say something...'}</Text>
```

```ts
onPress={startListening}
```

### `HomeScreen.tsx`

Add:

```ts
useEffect(() => {
  if (transcript && !isListening) {
    speak(`You said: ${transcript}`);
  }
}, [transcript]);
```

---

### Optional Guard

```ts
if (!transcript.trim()) return;
```


