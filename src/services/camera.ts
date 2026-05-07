/**
 * Camera utility functions for detecting camera-related voice commands
 * and extracting analysis prompts from user speech.
 */

// Keywords that trigger the camera feature
const CAMERA_KEYWORDS = [
  'capture',
  'take a photo',
  'take a picture',
  'take photo',
  'take picture',
  'camera',
  'what do you see',
  'what can you see',
  'look at',
  'scan',
  'photograph',
  'snap',
  'shoot',
  'click a photo',
  'click a picture',
  'click photo',
  'click picture',
  'show me',
  'identify',
  'recognize',
  'detect',
];

/**
 * Check if the user's voice input contains a camera-related command.
 */
export const isCameraCommand = (text: string): boolean => {
  const lower = text.toLowerCase().trim();
  return CAMERA_KEYWORDS.some((keyword) => lower.includes(keyword));
};

/**
 * Extract an analysis prompt from the user's camera command.
 * e.g. "capture the bottle on the table" → "Describe the bottle on the table"
 *      "what do you see" → "Describe what you see in this image"
 */
export const extractCameraPrompt = (text: string): string => {
  const lower = text.toLowerCase().trim();

  // If user asks "what do you see" / "what can you see", keep it direct
  if (lower.includes('what do you see') || lower.includes('what can you see')) {
    return 'Describe what you see in this image in detail.';
  }

  // If user says "identify" or "recognize" or "detect"
  if (lower.includes('identify') || lower.includes('recognize') || lower.includes('detect')) {
    return `Identify and describe the objects in this image. ${text}`;
  }

  // For "capture X", "take a photo of X", "scan X" etc., extract the subject
  const subjectPatterns = [
    /capture\s+(?:the\s+|a\s+|an\s+)?(.+)/i,
    /take\s+(?:a\s+)?(?:photo|picture)\s+(?:of\s+)?(.+)/i,
    /click\s+(?:a\s+)?(?:photo|picture)\s+(?:of\s+)?(.+)/i,
    /scan\s+(?:the\s+|a\s+|an\s+)?(.+)/i,
    /photograph\s+(?:the\s+|a\s+|an\s+)?(.+)/i,
    /look\s+at\s+(?:the\s+|a\s+|an\s+)?(.+)/i,
    /show\s+me\s+(?:the\s+|a\s+|an\s+)?(.+)/i,
  ];

  for (const pattern of subjectPatterns) {
    const match = lower.match(pattern);
    if (match && match[1] && match[1].trim().length > 0) {
      return `Describe and analyze the following in this image: ${match[1].trim()}`;
    }
  }

  // Default fallback
  return 'Describe what you see in this image. Provide a detailed analysis.';
};
