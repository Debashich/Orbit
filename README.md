<p align="center">
  <h1 align="center">Orbit -Intelligent Mobility AI</h1>
  <p align="center">
    <strong>Built with Google Gemma 4 E2B · On-Device · 100% Offline · Zero Cloud</strong>
  </p>
  <p align="center">
    A fully offline AI mobility assistant for blind and visually impaired users — powered entirely by <strong>Gemma 4 E2B</strong> running on-device via <code>llama.rn</code>.
  </p>
</p>

---

## Hackathon Submission - Gemma 4

**Orbit** demonstrates the full potential of **Google Gemma 4 E2B** as a real-time, multimodal, multilingual AI assistant running **entirely on a mobile phone** — no server, no API, no cloud. Every inference — text, vision, and intent classification — is powered by a single Gemma 4 model.

### Why Gemma 4?

| Capability Used | How Orbit Uses It |
|----------------|-------------------|
| **Multimodal Vision** | Camera images are analyzed on-device via Gemma 4's vision projector (`mmproj`) for obstacle detection, object identification, and text reading |
| **Multilingual Generation** | Orbit responds in 17 languages using Gemma 4's native multilingual abilities — no translation API needed |
| **Intent Classification** | Gemma 4 classifies ambiguous user queries into 5 intent categories directly via prompt engineering |
| **Conversational AI** | General Q&A, contextual follow-ups, and proactive clarifications — all Gemma 4 on-device |
| **Safety-Critical Reasoning** | Gemma 4 fuses sensor context (motion, direction, location) with vision to produce instant safety decisions |
| **Quantized Efficiency** | Runs as Q4_K_M GGUF (~3.3GB) with GPU offloading via `llama.rn`, enabling real-time inference on mobile hardware |

> **Every AI feature in Orbit is Gemma 4.** There is no secondary model, no cloud fallback, and no external AI service.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Gemma 4 Integration Details](#gemma-4-integration-details)
- [Tech Stack](#tech-stack)
- [Folder Structure](#folder-structure)
- [App Flow](#app-flow)
- [Getting Started](#getting-started)
- [Voice Commands](#voice-commands)
- [Supported Languages](#supported-languages)

---

## Overview

Orbit is an AI-powered mobility assistant built with React Native (Expo SDK 54). It combines **Gemma 4's multimodal capabilities** with **on-device speech recognition**, **text-to-speech**, and **phone sensor fusion** (GPS, compass, accelerometer) into a single hands-free experience.

The entire app — from onboarding to daily navigation — can be operated **using only voice**. A visually impaired user never needs to touch the screen.

### Core Principles

- **100% Offline** — All AI inference runs locally on the device. No data ever leaves the phone.
- **Single Model** — One Gemma 4 E2B instance handles text, vision, classification, and multilingual output.
- **Fully Hands-Free** — Global "Hey Orbit" wake word across every screen.
- **Real-Time** — Sub-second safety decisions using sensor fusion + Gemma 4 vision.

---

## Key Features

### Hands-Free Voice Control — "Hey Orbit"

A unified wake word detection system is active across **every screen** in the app, enabling a completely hands-free experience from first launch to daily use.

| Screen | Wake Word Action |
|--------|-----------------|
| **Onboarding** | Say *"Hey Orbit, go next"* to advance through setup steps |
| **Download** | Say *"Hey Orbit, start download"* to begin, or *"Hey Orbit, continue"* when finished |
| **Home** | Say *"Hey Orbit"* to activate the mic for questions or commands |
| **Camera** | Say *"Hey Orbit"* to instantly trigger image capture |

- Wake word variants handled: `orbit`, `orbed`, `audit`, `corbett`, `order`, `orb`, `हे ऑर्बिट`, `ओर्बिट`, and more — robust against STT misrecognition.
- Self-restarting wake word loop with idle detection ensures Orbit is always listening when the system is not busy.

---

### 5-Class Intent Classification (Gemma 4)

Every voice input is classified by **Gemma 4** into one of five intents before processing:

| Intent | Trigger Examples | Action |
|--------|-----------------|--------|
| `VISION_REQUIRED` | "Is it safe to walk?", "Anything ahead?" | Opens camera → Gemma 4 Mobility Protocol |
| `VISION_OPTIONAL` | "What is this?", "Read the label" | Opens camera → Gemma 4 Description Protocol |
| `NON_VISION` | "Tell me a joke", "Who are you?" | Gemma 4 General Assistant Protocol (no camera) |
| `LANGUAGE_SWITCH` | "Speak in Hindi", "Switch to Spanish" | Gemma 4 extracts language → updates full pipeline |
| `UNCERTAIN` | "Check this" | Gemma 4 proactive clarification: "Should I open the camera?" |

- Regex-first fast path for common patterns, with **Gemma 4 LLM fallback** for ambiguous queries.
- Follow-up detection: "What about now?" inherits the previous intent context.
- Short queries (≤4 words) are fast-tracked to skip the LLM classification step.

---

### Multimodal Vision — Gemma 4 + Camera

This is where Gemma 4's multimodal architecture shines. The vision projector enables real-time image understanding directly on the phone.

- **Auto-Capture**: Camera opens with a 3-second countdown and captures automatically.
- **Manual Capture**: Tap the shutter button or say *"Hey Orbit"* to capture instantly.
- **On-Device Analysis**: Captured images are resized to 256×256, compressed to JPEG, and analyzed by **Gemma 4 E2B via its multimodal projector** — no image ever leaves the device.
- **Two Analysis Protocols** (both powered by Gemma 4):
  - **Mobility Protocol** — terse, safety-critical: `"Car ahead. Stop."` (max 10 words)
  - **Description Protocol** — detailed object/text identification: `"Paracetamol 500mg tablet."` (max 20 words)
- **Safety Override**: Even during description mode, if Gemma 4 detects a hazard, it switches to mobility format automatically.
- **Retry Logic**: If Gemma 4's first response doesn't match expected format, the model retries once with the same prompt.

---

### Sensor Fusion & Situational Awareness

Orbit fuses phone sensor data and injects it as context into every **Gemma 4** prompt, enabling physically-aware AI responses:

| Sensor | Data Used | Impact on Gemma 4's Response |
|--------|-----------|------------------------------|
| **GPS** | Latitude, longitude, reverse geocode | Location context injected into prompt |
| **Speed** | `> 0.5 m/s` = walking, else stopped | Gemma 4 says "Stop" (moving) vs "Wait" (stopped) |
| **Compass** | 0–360° heading | Gemma 4 gives directional guidance: "Move right", "Slightly left" |

```
Voice Input + Motion + Direction + Location → Intent Engine → Gemma 4 Protocol → Natural Speech Output
```

---

### Multilingual Support — 17 Languages (Gemma 4 Native)

Orbit leverages **Gemma 4's built-in multilingual capabilities** — no translation API, no external service. The entire pipeline adapts:

- **STT** recognizes speech in the selected language
- **Gemma 4** generates responses in the target language's **native script** (no Latin transliteration)
- **TTS** speaks the output in the matching language

| Language | Code | Language | Code |
|----------|------|----------|------|
| English | `en-US` | Bengali | `bn-IN` |
| Hindi | `hi-IN` | Tamil | `ta-IN` |
| Spanish | `es-ES` | Telugu | `te-IN` |
| French | `fr-FR` | Marathi | `mr-IN` |
| German | `de-DE` | Gujarati | `gu-IN` |
| Chinese | `zh-CN` | Portuguese | `pt-BR` |
| Japanese | `ja-JP` | Italian | `it-IT` |
| Korean | `ko-KR` | Arabic | `ar-SA` |
| Russian | `ru-RU` | | |

- Language input is normalized (diacritics stripped, BCP-47 codes parsed, fuzzy matched).
- Mid-conversation switching: *"Speak in Hindi"* → Gemma 4 extracts the target language, confirms in that language, and all subsequent output switches.

---

### Advanced TTS Engine

- **Sentence-level chunking**: Long Gemma 4 responses are split at sentence boundaries to prevent the TTS engine from rejecting long strings.
- **Generation counter**: Prevents stale callbacks from previous speak calls from interfering with current speech.
- **Adaptive safety timeout**: Timeout scales with text length (4s minimum, 60s maximum).
- **Polling fallback**: 50 consecutive `isSpeakingAsync() === false` readings required before declaring speech complete.
- **Haptic feedback**: Vibration on speech start for tactile confirmation.
- **speakAndWait()**: Promise-based API for sequencing mic activation after TTS.

---

### Robust STT Service

- **App state monitoring**: Mic is force-stopped when app goes to background.
- **Permission caching**: Mic permission is checked once and cached for the session.
- **Language sync**: STT language code is synced with the user's profile language.
- **Clean session management**: Previous sessions are always aborted before starting new ones, with native engine release delays.

---

### Personalized Onboarding (5-Step Voice Setup)

| Step | Question | How It Customizes Gemma 4 |
|------|----------|--------------------------|
| 1 | "How would you describe your vision?" | Injected into Gemma 4's context as user profile |
| 2 | "Which language do you prefer?" | Sets Gemma 4's output language + STT/TTS language |
| 3 | "Where do you spend most of your time?" | Gives Gemma 4 environmental context |
| 4 | "What tasks do you need the most help with?" | Prioritizes Gemma 4's response focus |
| 5 | "How do you like Orbit to respond?" | Shapes Gemma 4's tone and verbosity |

- Each question is read aloud via TTS.
- Answers can be typed or spoken (tap mic or say *"Hey Orbit"*).
- Voice navigation: *"Hey Orbit, go next"* / *"continue"*.
- Validation: Empty answers trigger spoken error feedback.
- Profile is persisted locally via AsyncStorage.

---

### One-Time Model Download

Gemma 4 E2B runs entirely on-device, but the model weights need to be downloaded once:

- **Two files**: Main model (~3.3GB, Q4_K_M quantized) + Vision Projector (~200MB, f16)
- **Progress tracking**: Real-time MB counter with gradient progress bar
- **Resume detection**: Checks existing files on mount — skips completed downloads
- **Integrity validation**: Model must exceed size threshold to be considered complete
- **Voice-controlled**: Say *"Hey Orbit, start download"* to begin

After download, **Orbit never needs an internet connection again.**

---

## Architecture

### The Assistive Intelligence Loop

```
┌──────────────┐     ┌────────────────┐     ┌───────────────────┐
│  Voice Input │────▶│ Intent Engine  │────▶│ Protocol Selection│
│  (On-Device  │     │ (Regex + Gemma │     │                   │
│   STT)       │     │  4 Fallback)   │     └───────────────────┘
└──────────────┘     └────────────────┘               │
                                                      │
                     ┌────────────────┐               │
                     │ Sensor Fusion  │───────────────┤
                     │ GPS + Compass  │               │
                     │ + Motion       │               ▼
                     └────────────────┘     ┌───────────────────┐
                                            │   Gemma 4 E2B     │
                     ┌────────────────┐     │   (On-Device)     │
                     │ Camera/Vision  │────▶│   + mmproj Vision │
                     │ (Optional)     │     │   Projector       │
                     └────────────────┘     └───────────────────┘
                                                      │
                                                      ▼
                                            ┌───────────────────┐
                                            │ TTS Output        │
                                            │ (Natural Speech)  │
                                            └───────────────────┘
```

### Three Gemma 4 Protocols

| Protocol | Use Case | Max Words | Gemma 4 Prompt Format |
|----------|----------|-----------|----------------------|
| **Mobility** | Walking, obstacles, safety | 10 | `"<hazard> <location>. <action>."` |
| **Description** | Reading, identifying, describing | 20 | Natural language answer to user's query |
| **General** | Conversation, info, follow-ups | 25 | Concise conversational response |

### Real-World Interaction Examples

| Scenario | User Input | Gemma 4's Action | Speech Output |
|----------|------------|-------------------|---------------|
| Walking toward car | "Is it safe?" | Vision + Mobility Protocol | "Car ahead. Stop." |
| Standing still, obstacle | "Anything ahead?" | Sensor-aware (stopped) | "Obstacle ahead. Wait." |
| Ambiguous request | "Check" | Proactive clarification | "Should I open the camera?" |
| Follow-up | "What about now?" | Inherits previous intent | "Path clear. Walk forward." |
| Reading medicine | "Read this" | Vision + Description Protocol | "Paracetamol 500mg tablet." |
| Language switch | "Speak in Hindi" | Extracts + confirms in Hindi | "भाषा हिंदी में बदल दी गई।" |

---

## Gemma 4 Integration Details

### Model Configuration

```typescript
// LLM initialization (HomeScreen.tsx)
const llamaContext = await initLlama({
  model: modelPath,           // gemma4-e2b-q4km.gguf (~3.3GB)
  use_mlock: false,
  n_ctx: 2048,                // Context window
  n_gpu_layers: 99,           // Maximum GPU offloading
});

// Vision projector initialization
await llamaContext.initMultimodal({
  path: mmprojPath,           // gemma4-e2b-mmproj.gguf (~200MB)
  image_max_tokens: 256,      // Vision token budget
});
```

### Inference Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `n_predict` | 100–150 | Short, actionable responses for safety |
| `temperature` | 0.1–0.2 | Low creativity for deterministic safety outputs |
| `top_p` | 0.8 | Focused token sampling |
| `stop` | `<end_of_turn>`, `<eos>` | Gemma 4 chat template stop tokens |

### Prompt Template (Gemma 4 Chat Format)

```
<start_of_turn>user
[PROTOCOL INSTRUCTIONS]

Context: [sensor data + user profile]
User: [voice input]
[LANGUAGE INSTRUCTION]
Follow protocol strictly.<end_of_turn>
<start_of_turn>model
```

### Vision Prompt Template

```
<start_of_turn>user
<__media__>
[PROTOCOL INSTRUCTIONS]

Context: [sensor data]
User request: [analysis prompt]
[LANGUAGE INSTRUCTION]
Follow protocol strictly.<end_of_turn>
<start_of_turn>model
```

---

## Tech Stack

| Category | Technology | Details |
|----------|-----------|---------|
| **AI Model** | **Google Gemma 4 E2B** | Q4_K_M quantized GGUF + f16 vision projector |
| **AI Runtime** | `llama.rn` v0.12.0-rc.8 | On-device GGUF execution with GPU offloading |
| **Framework** | React Native (Expo SDK 54) | New Architecture enabled, TypeScript 5.9 |
| **Speech-to-Text** | `expo-speech-recognition` v3.1.2 | On-device STT with continuous mode |
| **Text-to-Speech** | `expo-speech` v14.0.8 | Platform-native TTS engine |
| **Camera** | `expo-camera` v17.0.10 | Photo capture with auto/manual trigger |
| **Image Processing** | `expo-image-manipulator` v14.0.8 | Resize + compress before Gemma 4 analysis |
| **Location** | `expo-location` v19.0.8 | GPS, speed, heading, reverse geocode |
| **Storage** | `@react-native-async-storage` v2.2.0 | User profile persistence (fully local) |
| **Navigation** | `@react-navigation/native-stack` v7 | Static navigation with transitions |
| **UI** | `expo-linear-gradient`, `@expo/vector-icons` | Gradient UI elements, icon library |

---

## Folder Structure

```
orbit/
│
├── App.tsx                          # Root navigator — Boot → Onboarding → Download → Home → Camera → Settings
├── index.ts                         # Expo entry point — registers App as root component
├── app.json                         # Expo config — permissions, plugins, splash screen
├── package.json                     # Dependencies and scripts
├── tsconfig.json                    # TypeScript configuration
│
├── assets/                          # Static assets
│   ├── icon.png                     #   App icon
│   ├── adaptive-icon.png            #   Android adaptive icon
│   ├── splash-icon.png              #   Splash screen icon
│   ├── logo.png                     #   In-app header logo
│   └── favicon.png                  #   Web favicon
│
├── database/                        # Local data persistence
│   └── db.ts                        #   AsyncStorage wrapper — user profile CRUD
│                                    #   Defines UserProfile: visionDescription, language,
│                                    #   locationContext, helpNeeded, responseStyle
│
├── scripts/                         # Build-time utilities
│   └── postinstall-fixes.js         #   Patches expo-speech-recognition tsconfig paths
│
└── src/                             # Application source code
    │
    ├── constants/                   # Configuration and Gemma 4 prompt templates
    │   ├── prompts.ts               #   Three Gemma 4 protocols:
    │   │                            #     • ORBIT_MOBILITY_PROTOCOL (safety, max 10 words)
    │   │                            #     • ASSISTIVE_DESCRIPTION_PROTOCOL (vision, max 20 words)
    │   │                            #     • GENERAL_ASSISTANT_PROTOCOL (chat, max 25 words)
    │   │                            #   + INTENT_CLASSIFICATION_PROMPT (5-class)
    │   │                            #   + LANGUAGE_SWITCH_CONFIRMATION_PROMPT
    │   │
    │   ├── languages.ts             #   17-language registry — regex pattern matching,
    │   │                            #   BCP-47 code resolution, fuzzy input normalization
    │   │
    │   └── voice.ts                 #   TTS config (rate: 0.85, pitch: 1.3, volume: 1.0)
    │
    ├── hooks/                       # React hooks — bridge between services and UI
    │   ├── useSTT.ts                #   STT hook — startListening(), startWakeWordDetection(),
    │   │                            #   stopListening(), 23 wake word variants, fail counter
    │   │
    │   └── useTTS.ts                #   TTS hook — speak(), speakAndWait(), stop(),
    │                                #   getIsSpeaking(), auto-init on mount
    │
    ├── screens/                     # UI screens (5 screens)
    │   ├── HomeScreen.tsx           #   Main interface — Gemma 4 init, intent classification,
    │   │                            #   sensor fusion, chat UI, wake word loop, streaming tokens
    │   │
    │   ├── CameraScreen.tsx         #   Camera — auto-capture countdown, manual capture,
    │   │                            #   front/back toggle, wake word capture, crosshair overlay
    │   │
    │   ├── OnboardingScreen.tsx     #   5-step voice setup — progress bar, validation,
    │   │                            #   wake word navigation, live language sync
    │   │
    │   ├── DownloadScreen.tsx       #   Model download — two-phase progress, resume detection,
    │   │                            #   integrity check, voice-controlled flow
    │   │
    │   └── SettingsScreen.tsx       #   Settings — language change with instant TTS/STT sync
    │
    └── services/                    # Platform services
        ├── camera.ts                #   Voice command detection (29 keywords),
        │                            #   prompt extraction ("capture bottle" → "Locate: bottle")
        │
        ├── location.ts              #   GPS provider — lat/lon, speed, heading, reverse geocode
        │
        ├── weather.ts               #   Weather context provider for Gemma 4 prompts
        │
        └── speech/                  #   Speech engine services
            ├── stt.ts               #   Low-level STT — session management, app state monitor,
            │                        #   permission caching, language sync
            │
            └── tts.ts               #   Low-level TTS — sentence chunking, generation counter,
                                     #   adaptive timeout, polling fallback, haptic feedback
```

---

## App Flow

```
┌─────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐
│  Boot   │────▶│  Onboarding  │────▶│   Download   │────▶│    Home    │
│         │     │  (5 steps)   │     │ (Gemma 4 DL) │     │  (Gemma 4) │
└─────────┘     └──────────────┘     └──────────────┘     └────────────┘
     │                                                      │         │
     │  (profile + model exist)                             │         │
     └──────────────────────────────────────────────────────┘         │
                                                              ┌──────┴───────┐
                                                              │              │
                                                         ┌────────┐   ┌──────────┐
                                                         │ Camera │   │ Settings │
                                                         │(Gemma 4│   │          │
                                                         │ Vision)│   │          │
                                                         └────────┘   └──────────┘
```

1. **Boot** — Checks profile → model files → integrity → routes accordingly.
2. **Onboarding** — 5-step voice/text setup → builds user profile for Gemma 4 context.
3. **Download** — One-time Gemma 4 model download (~3.5GB total). After this, **fully offline.**
4. **Home** — Main AI interface. Gemma 4 handles text, vision, classification, and multilingual output.
5. **Camera** — Auto/manual capture → image sent to Gemma 4 vision pipeline on-device.
6. **Settings** — Language change triggers Gemma 4 confirmation in the new language.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Android device with **~4GB free storage** (for Gemma 4 model files)
- Expo CLI (`npx expo`)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd orbit

# Install dependencies
npm install

# Build and run on Android device
npx expo run:android
```

### First Launch

1. **Onboarding** — Answer 5 personalization questions (voice or text).
2. **Download** — Gemma 4 E2B model downloads once (~3.5GB total).
3. **Offline Forever** — Orbit greets you and begins listening. Say *"Hey Orbit"* to start.

---

## Voice Commands

| Command | Context | Action |
|---------|---------|--------|
| *"Hey Orbit"* | Any screen | Activates Orbit / captures image (Camera) |
| *"Hey Orbit, go next"* | Onboarding | Advances to next question |
| *"Hey Orbit, start download"* | Download | Begins model download |
| *"Hey Orbit, continue"* | Download (complete) | Navigates to Home |
| *"Is it safe to walk?"* | Home | Opens camera → Gemma 4 Mobility analysis |
| *"What is this?"* | Home | Opens camera → Gemma 4 Description analysis |
| *"Read the label"* | Home | Opens camera → Gemma 4 text recognition |
| *"Speak in Hindi"* | Home | Gemma 4 switches all output to Hindi |
| *"Yes" / "Sure"* | After uncertain intent | Confirms camera opening |

---

## Supported Languages

English · Hindi · Spanish · French · German · Chinese · Japanese · Korean · Portuguese · Italian · Russian · Arabic · Bengali · Tamil · Telugu · Marathi · Gujarati

All 17 languages are powered by **Gemma 4's native multilingual generation** — no translation service involved.

---

<p align="center">
  <strong>Built for the Gemma 4 Hackathon</strong><br>
  <em>Proving that a single on-device Gemma 4 model can power a complete, safety-critical AI assistant — with zero cloud dependency.</em>
</p>
