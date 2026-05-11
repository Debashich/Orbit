# Clara: VisionVoice

Clara (VisionVoice) is an AI-powered assistant designed to support blind and visually impaired individuals through real-time audio guidance and vision-to-speech insights. The project leverages on-device LLMs to ensure 100% privacy and offline functionality.

## Latest Features: Hands-Free Voice Control & Intelligence

Clara now features a unified **"Hey Gemini"** wake word detection system across all screens, enabling a completely hands-free experience from onboarding to daily use.

### Core Enhancements

- **Global "Hey Gemini" Wake Word** *(New)*:
    - **Always-Listening**: Background wake word detection is active on Home, Camera, Onboarding, and Download screens.
    - **Contextual Commands**:
        - **Onboarding**: Say *"Hey Gemini, go next"* to navigate through setup.
        - **Download**: Say *"Hey Gemini, start download"* to begin the initialization or *"Hey Gemini, continue"* once finished.
        - **Camera**: Say *"Hey Gemini"* to trigger an instant image analysis.
        - **Home**: Use it to wake Clara for questions or vision assistance.

- **Intelligent Onboarding & Navigation** *(New)*:
    - **Voice Navigation**: Complete the entire setup process using only your voice.
    - **Error Feedback**: Clara now reads validation errors aloud (e.g., if a question is skipped without an answer).
    - **Faster Interaction**: Optimized STT-to-TTS handoffs for a more natural conversational flow.

- **Dynamic Weather Integration** *(New)*:
    - **Open-Meteo Integration**: Real-time weather data fetching based on precise location coordinates.
    - **Visual Widget**: At-a-glance weather info in the header.
    - **Contextual Awareness**: Clara incorporates current weather conditions into her conversational responses.

- **Sensor Fusion & Situational Awareness**:
    - **Motion-Aware Decisions**: Clara distinguishes between "Wait" (stopped) and "Stop" (moving) based on GPS/Accelerometer data.
    - **Directional Guidance**: Uses real-time heading (compass) data for refined actions like "Move right" or "Slightly left".

### Current Status: Intelligent Proactive Mobility Guide

Clara has evolved into a **proactive mobility assistant** with deep situational awareness. The system now integrates phone sensors with vision and voice to provide fast, safety-critical navigation instructions.

### The Assistive Intelligence Loop

Clara combines multiple streams of data to make instant decisions:

```
Voice Input + Motion + Direction + Sound → Intent Engine → Action (Camera / Setting / Chat) → Natural Speech Guidance
```

### Real-World Interaction Examples

| Scenario | User Input | Clara's Action | Speech Output |
|----------|------------|----------------|---------------|
| **Walking to Car** | "Is it safe?" | **Smart Trigger** | "Car ahead. Stop." |
| **Already Stopped** | "Anything ahead?" | **Context Aware** | "Obstacle ahead. Wait." |
| **Ambiguity** | "Check" | **Clarify** | "Do you want me to look?" |
| **Follow-up** | "What about now?" | **Memory Trigger** | "Path clear. Walk forward." |
| **Hidden Hazard** | "Can I walk?" | **Sound Override** | "Vehicle left. Wait." |

### Tech Stack

| Category | Technology |
|----------|-----------|
| **AI Engine** | `llama.rn` (Local GGUF execution) |
| **Models** | Gemma 4 E2B Q4_K_M + Vision Projector |
| **Logic Layer** | Sensor Fusion (GPS/Compass/Motion) & Layered Protocols |
| **Framework** | React Native (Expo SDK 54) |
| **Speech** | `expo-speech-recognition` (STT) & `expo-speech` (TTS) |

## Folder Structure

```
android/
assets/
database/
ios/
scripts/
src/
    constants/       # Prompt templates, protocol settings, etc.
    hooks/           # Custom React hooks (STT, TTS, etc.)
    screens/         # User interface screens (Home, Camera, Onboarding)
    services/        # Background services (location, speech, camera)
```

## Getting Started

1. `npm install`
2. `npx expo run:android` (Requires device with ~4GB free space).
3. Complete onboarding → Download Model → Clara is ready to guide you.
