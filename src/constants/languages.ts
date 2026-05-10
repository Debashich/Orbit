const DEFAULT_LANGUAGE = { promptName: 'English', code: 'en-US' };

const LANGUAGE_PATTERNS: Array<{ pattern: RegExp; promptName: string; code: string }> = [
  { pattern: /\b(en|en-us|en-gb|english)\b/i, promptName: 'English', code: 'en-US' },
  { pattern: /\b(es|es-es|spanish|espanol|español)\b/i, promptName: 'Spanish', code: 'es-ES' },
  { pattern: /\b(hi|hi-in|hindi)\b|हिन्दी|हिंदी/i, promptName: 'Hindi', code: 'hi-IN' },
  { pattern: /\b(fr|fr-fr|french|francais|français)\b/i, promptName: 'French', code: 'fr-FR' },
  { pattern: /\b(de|de-de|german|deutsch)\b/i, promptName: 'German', code: 'de-DE' },
  { pattern: /\b(zh|zh-cn|chinese)\b|中文/i, promptName: 'Chinese', code: 'zh-CN' },
  { pattern: /\b(ja|ja-jp|japanese)\b|日本語/i, promptName: 'Japanese', code: 'ja-JP' },
  { pattern: /\b(ko|ko-kr|korean)\b|한국어/i, promptName: 'Korean', code: 'ko-KR' },
  { pattern: /\b(pt|pt-br|portuguese|portugues|português)\b/i, promptName: 'Portuguese', code: 'pt-BR' },
  { pattern: /\b(it|it-it|italian|italiano)\b/i, promptName: 'Italian', code: 'it-IT' },
  { pattern: /\b(ru|ru-ru|russian)\b|русский/i, promptName: 'Russian', code: 'ru-RU' },
  { pattern: /\b(ar|ar-sa|arabic)\b|العربية/i, promptName: 'Arabic', code: 'ar-SA' },
  { pattern: /\b(bn|bn-in|bengali)\b|বাংলা/i, promptName: 'Bengali', code: 'bn-IN' },
  { pattern: /\b(ta|ta-in|tamil)\b|தமிழ்/i, promptName: 'Tamil', code: 'ta-IN' },
  { pattern: /\b(te|te-in|telugu)\b|తెలుగు/i, promptName: 'Telugu', code: 'te-IN' },
  { pattern: /\b(mr|mr-in|marathi)\b|मराठी/i, promptName: 'Marathi', code: 'mr-IN' },
  { pattern: /\b(gu|gu-in|gujarati)\b|ગુજરાતી/i, promptName: 'Gujarati', code: 'gu-IN' },
];

const normalizeLanguageInput = (languageName?: string): string => {
  if (typeof languageName !== 'string' || !languageName) return '';
  return languageName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const resolveLanguage = (languageName?: string) => {
  const normalized = normalizeLanguageInput(languageName);
  const bcp47Match = normalized.match(/^([a-z]{2,3})-([a-z]{2})$/i);
  if (bcp47Match) {
    const canonicalCode = `${bcp47Match[1].toLowerCase()}-${bcp47Match[2].toUpperCase()}`;
    const knownLanguage = LANGUAGE_PATTERNS.find(
      ({ code }) => code.toLowerCase() === canonicalCode.toLowerCase()
    );
    return knownLanguage || { ...DEFAULT_LANGUAGE, code: canonicalCode };
  }

  const match = LANGUAGE_PATTERNS.find(({ pattern }) => pattern.test(normalized));
  return match || DEFAULT_LANGUAGE;
};

export const getLanguageCode = (languageName?: string): string => resolveLanguage(languageName).code;

export const getSafePromptLanguageName = (languageName?: string): string =>
  resolveLanguage(languageName).promptName;
