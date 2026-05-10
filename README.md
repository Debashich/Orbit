# Clara: VisionVoice

Clara (VisionVoice) is an AI-powered assistant designed to support blind and visually impaired individuals through real-time audio guidance and vision-to-speech insights. The project leverages on-device LLMs to ensure 100% privacy and offline functionality.

## Current Status: Intelligent Multi-Lingual Full Assistant

Clara has evolved from a simple "describer" into a **proactive navigation guide** and **full conversational assistant**. The system now features a deterministic intent engine, a strict assistive output contract for navigation, and universal language switching capabilities.

### Core Features Implemented

- **Universal Multi-Lingual Voice Support** *(New)*:
    - **Phonetic STT Handling**: Clara uses LLM-based intent extraction to seamlessly handle phonetic cross-language commands (e.g. saying "switch language to English" while in Hindi mode, which STT parses as "स्विच लैंग्वेज टू इंग्लिश").
    - **Native Script Enforcement**: AI responses strictly use the native script of the selected language (e.g., Devanagari for Hindi, Cyrillic for Russian) instead of defaulting to Romanized text (Hinglish).
    - **Auto-TTS Refresh**: Switching languages instantly updates the app's Text-to-Speech and STT configuration engines on-the-fly.

- **Dual-Protocol Intent Routing Layer** *(New)*:
    - LLM-based classification of user queries into categories: `VISION_REQUIRED`, `VISION_OPTIONAL`, `NON_VISION`, `LANGUAGE_SWITCH`, and `UNCERTAIN`.
    - **Full Assistant Mode**: General queries like "Who is the PM of India?" are routed to the `GENERAL_ASSISTANT_PROTOCOL` and answered conversationally utilizing the user's database profile (incorporating their height, vision impairment level, etc.).
    - **Assistive Vision Mode**: Queries asking for navigation/safety help invoke the strict `ASSISTIVE_VISION_PROTOCOL`.
    - **Smart Auto-Trigger**: Queries like "Is it safe to walk?" or "Anything ahead?" automatically trigger the camera without needing specific keywords.

- **Assistive Output Contract (Natural Navigation Speech)**:
    - **Action-First Guidance**: Every response is transformed into simple, spoken navigation instructions (e.g., "Car ahead. Stop.", "Path clear. Walk forward.").
    - **Zero Cognitive Overload**: Structured technical data (distances like "5m", labels like "center") are filtered out in favor of natural, high-signal speech.

- **Self-Correcting Validation Loop & Cleanup**:
    - Automated output validator checks every AI response for compliance with the assistive protocol.
    - **Strict Tag Filtering**: Aggressive regex cleanup strips out any hallucinated XML tokens (`<start_of_turn>`, `<eos>`) ensuring the Text-to-Speech engine remains uninterrupted.

- **Multimodal Vision Pipeline**:
    - Image resizing to 256×256 for fast local processing.
    - Integration of **Gemma 4 E2B (Q4_K_M Quantized GGUF)** via `llama.rn` and Vision Projector.

### The Assistive Intelligence Loop

Clara doesn't just respond; she makes decisions based on the environment and intent:

```
Voice Input → Intent Engine (General / Vision / Language Switch) → Action (Camera / Setting / Chat) → Natural Speech Guidance
```

### Voice Interaction Examples

| User Input | Clara's Action | Speech Output |
|------------|----------------|---------------|
| "Is it safe to cross?" | **Auto-open Camera** | "Checking surroundings... Car ahead. Stop." |
| "What is this?" | **Auto-open Camera** | "Looking now... Cup ahead. Path clear." |
| "स्विच लैंग्वेज टू इंग्लिश" | **Language Switch** | "I just switched your language to English." |
| "Who is the PM of India?" | **General Chat** | "Narendra Modi is the current Prime Minister." |

### Tech Stack

| Category | Technology |
|----------|-----------|
| **AI Engine** | `llama.rn` (Local GGUF execution) |
| **Model** | Gemma 4 E2B Q4_K_M (~1.6GB) + Vision Projector (~986MB) |
| **Logic Layer** | Dual-Protocol Intent Routing & Universal Language Switcher |
| **Framework** | React Native (Expo SDK 54) |
| **Speech** | `expo-speech-recognition` (STT) & `expo-speech` (TTS) |

## 📂 Project Structure

```
src/
├── constants/
│   ├── prompts.ts          # Assistive Protocol, General Protocol & Intent Classifier
│   └── languages.ts        # Universal language configuration
├── screens/
│   ├── HomeScreen.tsx      # Main logic (Intent Engine, Validation Loop, UI)
│   ├── CameraScreen.tsx    # Optimized vision capture
│   └── ...
├── services/
│   ├── camera.ts           # Dynamic prompt extraction logic
│   └── ...
```

## Getting Started

1. `npm install`
2. `npx expo run:android` (Requires device with ~4GB free space).
3. Complete onboarding → Download Model → Clara is ready to guide you.
