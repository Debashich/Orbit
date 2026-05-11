# Orbit: Intelligent Mobility AI

Orbit is an AI-powered assistant designed to support blind and visually impaired individuals through real-time audio guidance and vision-to-speech insights. The project leverages on-device LLMs to ensure 100% privacy and offline functionality.

## Latest Features: Hands-Free Voice Control & Intelligence

Orbit now features a unified **"Hey Orbit"** wake word detection system across all screens, enabling a completely hands-free experience from onboarding to daily use.

### Core Enhancements

- **Global "Hey Orbit" Wake Word** *(New)*:
    - **Always-Listening**: Background wake word detection is active on Home, Camera, Onboarding, and Download screens.
    - **Contextual Commands**:
        - **Onboarding**: Say *"Hey Orbit, go next"* to navigate through setup.
        - **Download**: Say *"Hey Orbit, start download"* to begin the initialization or *"Hey Orbit, continue"* once finished.
        - **Camera**: Say *"Hey Orbit"* to trigger an instant image analysis.
        - **Home**: Use it to wake Orbit for questions or vision assistance.

- **Intelligent Onboarding & Navigation** *(New)*:
    - **Voice Navigation**: Complete the entire setup process using only your voice.
    - **Error Feedback**: Orbit now reads validation errors aloud (e.g., if a question is skipped without an answer).
    - **Faster Interaction**: Optimized STT-to-TTS handoffs for a more natural conversational flow.

- **Dynamic Weather Integration** *(New)*:
    - **Open-Meteo Integration**: Real-time weather data fetching based on precise location coordinates.
    - **Visual Widget**: At-a-glance weather info in the header.
    - **Contextual Awareness**: Orbit incorporates current weather conditions into her conversational responses.

- **Sensor Fusion & Situational Awareness**:
    - **Motion-Aware Decisions**: Orbit distinguishes between "Wait" (stopped) and "Stop" (moving) based on GPS/Accelerometer data.
    - **Directional Guidance**: Uses real-time heading (compass) data for refined actions like "Move right" or "Slightly left".

### Current Status: Intelligent Proactive Mobility Guide

Orbit has evolved into a **proactive mobility assistant** with deep situational awareness. The system now integrates phone sensors with vision and voice to provide fast, safety-critical navigation instructions.

### The Assistive Intelligence Loop

Orbit combines multiple streams of data to make instant decisions:

```
Voice Input + Motion + Direction + Sound → Intent Engine → Action (Camera / Setting / Chat) → Natural Speech Guidance
```

### Real-World Interaction Examples

| Scenario | User Input | Orbit's Action | Speech Output |
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
3. Complete onboarding → Download Model → Orbit is ready to guide you.
