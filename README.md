# Clara: VisionVoice

Clara (VisionVoice) is an AI-powered assistant designed to support blind and visually impaired individuals through real-time audio guidance and vision-to-speech insights. The project leverages on-device LLMs to ensure 100% privacy and offline functionality.

## Current Status: Intelligent Assistive Navigation System Active

Clara has evolved from a simple "describer" into a **proactive navigation guide**. The system now features a deterministic intent engine and a strict assistive output contract to provide safe, actionable guidance.

### Core Features Implemented

- **Intent + Capability Routing Layer** *(New)*:
    - LLM-based classification of user queries into categories: `VISION_REQUIRED`, `VISION_OPTIONAL`, `NON_VISION`, and `UNCERTAIN`.
    - **Smart Auto-Trigger**: Queries like "Is it safe to walk?" or "Anything ahead?" automatically trigger the camera without needing specific keywords.
    - **Proactive Initiative**: Clara suggests opening the camera if she detects an ambiguous visual intent ("Should I open the camera?").
- **Assistive Output Contract (Natural Navigation Speech)** *(New)*:
    - **Action-First Guidance**: Every response is transformed into simple, spoken navigation instructions (e.g., "Car ahead. Stop.", "Path clear. Walk forward.").
    - **Zero Cognitive Overload**: Structured technical data (distances like "5m", labels like "center") are filtered out in favor of natural, high-signal speech.
    - **Safety Prioritization**: Intelligent filtering prioritizes moving objects (cars, bikes) and immediate obstacles (within 2m) over irrelevant background objects.
- **Self-Correcting Validation Loop** *(New)*:
    - Automated output validator checks every AI response for compliance with the assistive protocol.
    - **Smart Retry**: If a response is vague or structured incorrectly, Clara automatically re-prompts the model to refine the output before speaking.
- **Multimodal Vision Pipeline**:
    - Image resizing to 256×256 for fast local processing.
    - Raw Gemma prompt template (non-thinking mode) for direct, low-latency generation.
    - Thinking token extraction and filtering for clean output.
- **On-Device LLM Integration**:
    - Integration of **Gemma 4 E2B (Q4_K_M Quantized GGUF)** via `llama.rn`.
    - Automated two-phase model download (main model + vision projector).
- **Location & Environment Context**: 
    - Real-time location ingestion for spatially-aware conversational responses.
- **Responsive UI & Voice UX**: 
    - Waveform animations, safe-area handling, and unified chat/vision interface.

### The Assistive Intelligence Loop

Clara doesn't just respond; she makes decisions based on the environment:

```
Voice Input → Intent Engine → Action (Camera/Chat) → Perception → Output Validator → Natural Speech Guidance
```

### Voice Interaction Examples

| User Input | Clara's Action | Speech Output |
|------------|----------------|---------------|
| "Is it safe to cross?" | **Auto-open Camera** | "Checking surroundings... Car ahead. Stop." |
| "What is this?" | **Auto-open Camera** | "Looking now... Cup ahead. Path clear." |
| "Check this" | **Clarify** | "Should I look at something with the camera?" |
| "Yes" (after clarification) | **Follow-up Trigger** | "Opening camera... Low branch ahead. Duck." |
| "Where am I?" | **Context Response** | "You are at 123 Main Street. Path clear." |

### Tech Stack

| Category | Technology |
|----------|-----------|
| **AI Engine** | `llama.rn` (Local GGUF execution) |
| **Model** | Gemma 4 E2B Q4_K_M (~1.6GB) + Vision Projector (~986MB) |
| **Logic Layer** | Intent-based Routing & Assistive Output Contract |
| **Framework** | React Native (Expo SDK 54) |
| **Speech** | `expo-speech-recognition` (STT) & `expo-speech` (TTS) |

## 📂 Project Structure

```
src/
├── constants/
│   └── prompts.ts          # Assistive Protocol & Intent Classifier prompts
├── screens/
│   ├── HomeScreen.tsx      # Main logic (Intent Engine, Validation Loop, UI)
│   ├── CameraScreen.tsx    # Optimized vision capture
│   └── ...
├── services/
│   ├── camera.ts           # Dynamic prompt extraction logic
│   └── ...
```

## Roadmap: Next Steps

1. **Environmental Depth Analysis**: Integrate basic spatial primitives (ground plane detection) for better floor-level obstacle detection.
2. **Audio Haptics**: Use directional sound or vibration patterns to supplement speech for urgent warnings.
3. **Local Memory (RAG)**: Persistent user preferences and safe-route history stored locally.

## Getting Started

1. `npm install`
2. `npx expo run:android` (Requires device with ~4GB free space).
3. Complete onboarding → Download Model → Clara is ready to guide you.
