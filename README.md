# Clara: VisionVoice

Clara (VisionVoice) is an AI-powered assistant designed to support blind and visually impaired individuals through real-time audio guidance and vision-to-speech insights. The project leverages on-device LLMs to ensure 100% privacy and offline functionality.

## 🚀 Current Status: Foundation Layer Complete

The project has established its core navigation, user profile management, and model orchestration layer.

### Core Features Implemented:
- **Onboarding Workflow**: A multi-step process collecting vital user data (height, guidance preference, etc.) to tailor the AI experience.
- **Local Model Management**: 
    - Automated download of the **Gemma 2b (Quantized GGUF)** model directly from HuggingFace.
    - Real-time download tracking and file system persistence using `react-native-fs`.
    - On-device storage validation to prevent redundant downloads.
- **Local Data Persistence**: Profile management via `AsyncStorage` (ready for expansion to `expo-sqlite`).
- **High-Fidelity UI**: 
    - Modern dark-themed interface with interactive gradients.
    - Simulated waveform animations for voice interaction feedback.
    - Responsive chat-style interface for AI-user dialogue.

## 🛠 Tech Stack
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **AI Engine**: `llama.rn` (Local GGUF execution)
- **Navigation**: React Navigation (Static API)
- **Storage**: AsyncStorage & React Native FS
- **Styling**: Expo Linear Gradient & Vector Icons

## 📂 Project Structure
- `src/screens/`:
  - `OnboardingScreen.tsx`: User data collection.
  - `DownloadScreen.tsx`: Model acquisition and initialization.
  - `HomeScreen.tsx`: Main interaction hub (Chat & Voice).
- `database/db.ts`: Data persistence layer.
- `modelintegration.md`: Detailed technical roadmap for LLM integration.

## 🛤 Roadmap: Next Steps

The project is moving toward the **Voice-to-AI-to-Voice** loop:

1.  **Speech-to-Text (STT)**: Integrate `expo-speech-recognition` or similar to convert user voice input into prompts.
2.  **LLM Interaction**: Implement the `llama.rn` context in `HomeScreen.tsx` to process prompts using the downloaded `.gguf` model.
3.  **Text-to-Speech (TTS)**: Integrate `expo-speech` to read AI responses back to the user.
4.  **Vision Integration**: Add camera capabilities to provide real-time environment descriptions (using vision-capable models).

## 📥 Getting Started
1. `npm install`
2. `npx expo run:android` (Requires a device/emulator with ~2GB free space for the model).
