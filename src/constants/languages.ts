export const getLanguageCode = (languageName?: string): string => {
    if (!languageName) return 'en-US';
    
    const lang = languageName.toLowerCase().trim();
    
    if (lang.includes('spanish') || lang.includes('español')) return 'es-ES';
    if (lang.includes('hindi') || lang.includes('हिन्दी')) return 'hi-IN';
    if (lang.includes('french') || lang.includes('français')) return 'fr-FR';
    if (lang.includes('german') || lang.includes('deutsch')) return 'de-DE';
    if (lang.includes('chinese') || lang.includes('中文')) return 'zh-CN';
    if (lang.includes('japanese') || lang.includes('日本語')) return 'ja-JP';
    if (lang.includes('korean') || lang.includes('한국어')) return 'ko-KR';
    if (lang.includes('portuguese') || lang.includes('português')) return 'pt-BR';
    if (lang.includes('italian') || lang.includes('italiano')) return 'it-IT';
    if (lang.includes('russian') || lang.includes('русский')) return 'ru-RU';
    if (lang.includes('arabic') || lang.includes('العربية')) return 'ar-SA';
    if (lang.includes('bengali') || lang.includes('বাংলা')) return 'bn-IN';
    if (lang.includes('tamil') || lang.includes('தமிழ்')) return 'ta-IN';
    if (lang.includes('telugu') || lang.includes('తెలుగు')) return 'te-IN';
    if (lang.includes('marathi') || lang.includes('मराठी')) return 'mr-IN';
    if (lang.includes('gujarati') || lang.includes('ગુજરાતી')) return 'gu-IN';
    
    return 'en-US';
};
