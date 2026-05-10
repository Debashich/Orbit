const stripDiacritics = (value: string): string =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const getLanguageCode = (languageName?: string): string => {
    if (!languageName) return 'en-US';
    
    const lang = languageName.toLowerCase().trim();
    const normalizedLang = stripDiacritics(lang);

    if (/^[a-z]{2,3}-[a-z]{2}$/i.test(lang)) {
        const [language, region] = lang.split('-');
        return `${language.toLowerCase()}-${region.toUpperCase()}`;
    }
    
    if (normalizedLang.includes('spanish') || normalizedLang.includes('espanol')) return 'es-ES';
    if (normalizedLang.includes('hindi') || lang.includes('हिन्दी')) return 'hi-IN';
    if (normalizedLang.includes('french') || normalizedLang.includes('francais')) return 'fr-FR';
    if (normalizedLang.includes('german') || normalizedLang.includes('deutsch')) return 'de-DE';
    if (normalizedLang.includes('chinese') || lang.includes('中文')) return 'zh-CN';
    if (normalizedLang.includes('japanese') || lang.includes('日本語')) return 'ja-JP';
    if (normalizedLang.includes('korean') || lang.includes('한국어')) return 'ko-KR';
    if (normalizedLang.includes('portuguese') || normalizedLang.includes('portugues')) return 'pt-BR';
    if (normalizedLang.includes('italian') || normalizedLang.includes('italiano')) return 'it-IT';
    if (normalizedLang.includes('russian') || lang.includes('русский')) return 'ru-RU';
    if (normalizedLang.includes('arabic') || lang.includes('العربية')) return 'ar-SA';
    if (normalizedLang.includes('bengali') || lang.includes('বাংলা')) return 'bn-IN';
    if (normalizedLang.includes('tamil') || lang.includes('தமிழ்')) return 'ta-IN';
    if (normalizedLang.includes('telugu') || lang.includes('తెలుగు')) return 'te-IN';
    if (normalizedLang.includes('marathi') || lang.includes('मराठी')) return 'mr-IN';
    if (normalizedLang.includes('gujarati') || lang.includes('ગુજરાતી')) return 'gu-IN';
    
    return 'en-US';
};
