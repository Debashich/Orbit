# Clara: VisionVoice

Clara (VisionVoice) is an AI-powered assistant designed to support blind and visually impaired individuals through real-time audio guidance and vision-to-speech insights. The project leverages on-device LLMs to ensure 100% privacy and offline functionality.

## Current Status: Core Loops Implemented

The project has established its core navigation, user profile management, and model orchestration layer, along with initial voice-to-voice loops.

### Core Features Implemented:
- **Onboarding Workflow**: A multi-step process collecting vital user data (height, guidance preference, etc.) to tailor the AI experience.
- **On-Device LLM Integration**:
    - Full integration of **Gemma 2b (Quantized GGUF)** using `llama.rn`.
    - Local execution of prompts with streaming responses.
    - Automated model download and persistence layer.
- **Location Ingestion System**: 
    - Real-time location tracking using `expo-location`.
    - Dynamic location context provided to the AI for spatially-aware responses.
- **Speech-to-Text (STT)**: Integrated `expo-speech-recognition` to convert user voice input into prompts.
- **Text-to-Speech (TTS)**: Integrated `expo-speech` to read AI responses back to the user in real-time.
- **High-Fidelity UI**: 
    - Modern dark-themed interface with interactive gradients and waveform animations.
    - Responsive chat-style interface for AI-user dialogue with history support.
- **Local Data Persistence**: Profile management via `AsyncStorage`.

## Tech Stack
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **AI Engine**: `llama.rn` (Local GGUF execution)
- **Location**: `expo-location`
- **Voice Recognition**: `expo-speech-recognition`
- **Speech Synthesis**: `expo-speech`
- **Navigation**: React Navigation (Static API)
- **Storage**: AsyncStorage, SQLite & React Native FS
- **Styling**: Expo Linear Gradient & Vector Icons

## 📂 Project Structure
- `src/screens/`:
  - `OnboardingScreen.tsx`: User data collection.
  - `DownloadScreen.tsx`: Model acquisition and initialization.
  - `HomeScreen.tsx`: Main interaction hub (Voice-first).
  - `ChatScreen.tsx`: Traditional chat interface with message history.
- `src/services/speech/`:
  - `stt.ts`: Speech-to-text service implementation.
  - `tts.ts`: Text-to-speech service implementation.
- `src/services/location.ts`: Location ingestion service.
- `src/hooks/`:
  - `useSTT.ts`: Hook for voice input management.
  - `useTTS.ts`: Hook for speech output management.
- `database/db.ts`: Data persistence layer.

## Roadmap: Next Steps

The project is moving toward full **On-Device Intelligence**:

1.  **Vision Integration**: Add camera capabilities to provide real-time environment descriptions (using vision-capable models).
2.  **Local Memory (RAG)**: Implement long-term AI memory using `expo-sqlite` to allow Clara to remember user preferences and context across sessions.
3.  **Audio Customization**: Allow users to customize Clara's voice profile (pitch, rate, and accent).

## Getting Started
1. `npm install`
2. `npx expo run:android` (Requires a device/emulator with ~2GB free space for the model).
