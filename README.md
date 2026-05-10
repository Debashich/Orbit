# Clara: VisionVoice

Clara (VisionVoice) is an AI-powered assistant designed to support blind and visually impaired individuals through real-time audio guidance and vision-to-speech insights. The project leverages on-device LLMs to ensure 100% privacy and offline functionality.

## Current Status: Multimodal Vision + Voice Pipeline Active

The project has a fully functional voice-to-voice loop with **multimodal vision capabilities** — users can say "look at this" to capture an image and receive a spoken description of what the camera sees, all processed locally on-device.

### Core Features Implemented

- **Onboarding Workflow**: Multi-step process collecting user data (height, weight, vision impairment duration, guidance preference) to tailor the AI experience.
- **On-Device LLM Integration**:
    - Full integration of **Gemma 4 E2B (Q4_K_M Quantized GGUF)** using `llama.rn`.
    - Local execution of prompts with streaming token responses.
    - Automated two-phase model download (main model ~1.6GB + vision projector ~986MB).
    - GPU layer offloading attempted via `n_gpu_layers: 99` for compatible hardware.
- **Multimodal Vision Pipeline** *(New)*:
    - Camera integration via `expo-camera` with auto-capture countdown.
    - Image resizing to 256×256 via `expo-image-manipulator` before model processing.
    - Vision projector (`mmproj`) initialization with `image_max_tokens: 256`.
    - Raw Gemma prompt template (non-thinking mode) to bypass internal reasoning and output answers directly.
    - Thinking token extraction and filtering (`<|channel>thought` / `<channel|>` markers).
    - Automatic TTS read-aloud of image descriptions with speech completion delay.
- **Voice Commands**:
    - Natural language camera triggers: "look at this", "what's in front of me", "describe", etc.
    - Prompt extraction from voice commands for contextual image analysis.
- **Location Ingestion System**: 
    - Real-time location tracking using `expo-location`.
    - Dynamic location context provided to the AI for spatially-aware responses.
- **Speech-to-Text (STT)**: Integrated `expo-speech-recognition` for voice input.
- **Text-to-Speech (TTS)**: Integrated `expo-speech` with configurable voice (pitch 1.3, rate 0.85).
- **Responsive UI**: 
    - Dynamic safe area handling via `useSafeAreaInsets()` for button navigation vs gesture navigation.
    - Unified `HomeScreen` with chat bubbles, waveform animation, and bottom tab bar.
    - Modern dark-themed interface with gradient accents.
- **Local Data Persistence**: Profile management via `AsyncStorage` and SQLite.

### Vision Pipeline Details

The vision pipeline processes images entirely on-device:

```
Voice Command → Camera Capture → Image Resize (256×256) → mmproj Projector → Gemma 4 → TTS Read-Aloud
```

| Stage | Time (RMX3388) | Notes |
|-------|---------------|-------|
| Image Resize | ~700ms | `expo-image-manipulator`, JPEG @ 50% quality |
| Projector Processing | ~90-100s | CPU-only (no GPU/NPU acceleration on Dimensity 810) |
| Token Generation | ~10-15s | ~18-24 tokens for a 1-sentence answer |
| **Total** | **~105-115s** | Hardware-bound; faster on Snapdragon w/ Adreno GPU |

**Key Optimizations Applied:**
- Raw prompt template bypasses the model's internal "thinking" mode, reducing token generation from ~364 tokens to ~18-24 tokens (saving ~110 seconds).
- Image pre-resized to 256×256 before projector processing.
- `n_predict: 100` limits output length for concise answers.
- Speech completion delay prevents auto-listen from killing TTS read-aloud.

### Known Limitations
- **Hardware-bound processing**: The mmproj vision projector takes ~90-100s on CPU-only devices (MediaTek Dimensity 810, Mali-G57 MC2). Devices with Qualcomm Snapdragon (Adreno GPU + Hexagon NPU) would be significantly faster.
- **No cloud fallback**: All processing is local. A cloud API (e.g., Google Gemini) would reduce vision response time to 2-5 seconds but requires internet.
- **Navigation state warning**: A benign `non-serializable values` warning in React Navigation due to the `onCapture` callback pattern; does not impact functionality.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | React Native (Expo SDK 54) |
| **Language** | TypeScript |
| **AI Engine** | `llama.rn` (Local GGUF execution) |
| **AI Model** | Gemma 4 E2B Q4_K_M (~1.6GB) |
| **Vision Projector** | `mmproj-google_gemma-4-E2B-it-f16.gguf` (~986MB) |
| **Image Processing** | `expo-image-manipulator` |
| **Camera** | `expo-camera` |
| **Location** | `expo-location` |
| **Voice Recognition** | `expo-speech-recognition` |
| **Speech Synthesis** | `expo-speech` |
| **Navigation** | React Navigation (Static API) |
| **Storage** | AsyncStorage, SQLite & React Native FS |
| **Styling** | Expo Linear Gradient & Vector Icons |

## 📂 Project Structure

```
src/
├── screens/
│   ├── OnboardingScreen.tsx    # User data collection (4-step wizard)
│   ├── DownloadScreen.tsx      # Model download (main model + mmproj)
│   ├── HomeScreen.tsx          # Primary interface (Voice, Chat, Vision, AI Engine)
│   └── CameraScreen.tsx        # Camera capture with auto-countdown
├── services/
│   ├── speech/
│   │   ├── stt.ts              # Speech-to-text service
│   │   └── tts.ts              # Text-to-speech service
│   ├── location.ts             # Location ingestion service
│   └── camera.ts               # Camera command detection & prompt extraction
├── hooks/
│   ├── useSTT.ts               # Voice input management hook
│   └── useTTS.ts               # Speech output management hook
database/
└── db.ts                       # Data persistence layer
```

## Roadmap: Next Steps

1. **State Management Refactor**: Transition navigation-callback pattern to Zustand or React Context API to eliminate non-serializable navigation warnings.
2. **UI/UX Polish**: Loading indicators during vision processing, accessibility improvements.
3. **Local Memory (RAG)**: Long-term AI memory using `expo-sqlite` for user preferences across sessions.
4. **Audio Customization**: Allow users to customize Clara's voice profile (pitch, rate, accent).
5. **Performance**: Explore quantized mmproj projectors when available, alternative smaller vision models (MobileVLM).

## Getting Started

1. `npm install`
2. `npx expo run:android` (Requires a device/emulator with ~4GB free space for model files).
3. Complete onboarding → Download AI model (~2.5GB total) → Start talking to Clara.

### Voice Commands for Vision
- "Look at this" / "What is this?" → Opens camera, auto-captures, describes the image.
- "Describe what you see" / "What's in front of me" → Same as above.
- Any question with "look", "see", "describe", "camera", "photo", etc. triggers vision mode.
