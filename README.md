# Clara: VisionVoice

Clara (VisionVoice) is an AI-powered assistant designed to support blind and visually impaired individuals through real-time audio guidance and vision-to-speech insights. The project leverages on-device LLMs to ensure 100% privacy and offline functionality.

## Current Status: Intelligent Proactive Mobility Guide

Clara has evolved into a **proactive mobility assistant** with deep situational awareness. The system now integrates phone sensors (GPS, Compass, Accelerometer) with vision and voice to provide fast, safety-critical navigation instructions.

### Core Features Implemented

- **Sensor Fusion & Situational Awareness** *(New)*:
    *   **Motion-Aware Decisions**: Clara intelligently distinguishes between user states. She will say **"Wait"** if you are already stopped at a hazard, or **"Stop"** if you are walking towards one.
    *   **Directional Guidance**: Uses real-time heading (compass) data to provide refined actions like **"Move right"** or **"Slightly left"** instead of generic instructions.
    *   **Sound Priority**: Integrated audio context overrides visual data—if a vehicle is heard approaching from the side, Clara prioritizes an immediate safety warning.

- **"Zero-Delay" Intent Engine** *(New)*:
    *   **High-Speed Heuristics**: A regex-based classification layer identifies 90% of commands (Safety, Description, Language) **instantly**, bypassing LLM inference delays for common tasks.
    *   **Pass-Through Pipeline**: Intent is classified once at the voice stage and passed directly to the vision engine, eliminating redundant processing and saving ~10 seconds per interaction.

- **Layered Priority Protocols** *(New)*:
    *   **Priority 1: Mobility Guidance**: Triggered for safety-critical queries. Enforces a strict `<hazard> <location>. <action>.` format.
    *   **Priority 2: Assistive Description**: Triggered for detail-oriented queries ("What is this?"). Preserves rich spatial feedback, including estimated distances and object names.
    *   **Priority 3: General Chat**: Warm, concise conversational assistance.
    *   **Safety Overrides**: Even during descriptive requests, Clara will ignore curiosity and prioritize safety if an immediate hazard is detected.

- **Smart Conversation Memory** *(New)*:
    *   **Follow-up Handling**: Intelligently handles queries like **"What about now?"** or **"Again"** by assuming the previous visual context and re-triggering the camera instantly.
    *   **Proactive Clarification**: If a user request is ambiguous (e.g., "Check"), Clara proactively asks, **"Do you want me to look?"** instead of guessing.

- **Universal Multi-Lingual Support**:
    *   **Native Script Enforcement**: Responses use the native alphabet of the target language (e.g., Devanagari for Hindi).
    *   **Multi-Language Safety**: Heuristic layer supports safety keywords in English, Hindi, and other major languages for zero-delay triggers globally.

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
