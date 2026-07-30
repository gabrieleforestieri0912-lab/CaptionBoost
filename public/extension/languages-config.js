/**
 * Configurazione Lingue Supportate
 * File di configurazione centralizzato per tutte le lingue supportate da Subverse
 */

const LANGUAGES_CONFIG = {
  // Lingue Europee
  it: {
    name: "Italiano",
    emoji: "🇮🇹",
    nativeName: "Italiano",
    region: "EU",
    code: "it-IT",
    voiceSpeed: 1.0,
    priority: 1,
  },
  en: {
    name: "English",
    emoji: "🇺🇸",
    nativeName: "English",
    region: "NA",
    code: "en-US",
    voiceSpeed: 1.0,
    priority: 2,
  },
  es: {
    name: "Español",
    emoji: "🇪🇸",
    nativeName: "Español",
    region: "EU",
    code: "es-ES",
    voiceSpeed: 0.95,
    priority: 3,
  },
  fr: {
    name: "Français",
    emoji: "🇫🇷",
    nativeName: "Français",
    region: "EU",
    code: "fr-FR",
    voiceSpeed: 1.05,
    priority: 4,
  },
  de: {
    name: "Deutsch",
    emoji: "🇩🇪",
    nativeName: "Deutsch",
    region: "EU",
    code: "de-DE",
    voiceSpeed: 1.0,
    priority: 5,
  },
  pt: {
    name: "Português",
    emoji: "🇵🇹",
    nativeName: "Português",
    region: "EU",
    code: "pt-PT",
    voiceSpeed: 1.0,
    priority: 6,
  },
  nl: {
    name: "Nederlands",
    emoji: "🇳🇱",
    nativeName: "Nederlands",
    region: "EU",
    code: "nl-NL",
    voiceSpeed: 1.0,
    priority: 7,
  },
  pl: {
    name: "Polski",
    emoji: "🇵🇱",
    nativeName: "Polski",
    region: "EU",
    code: "pl-PL",
    voiceSpeed: 1.0,
    priority: 8,
  },
  sv: {
    name: "Svenska",
    emoji: "🇸🇪",
    nativeName: "Svenska",
    region: "EU",
    code: "sv-SE",
    voiceSpeed: 0.95,
    priority: 9,
  },
  da: {
    name: "Dansk",
    emoji: "🇩🇰",
    nativeName: "Dansk",
    region: "EU",
    code: "da-DK",
    voiceSpeed: 0.95,
    priority: 10,
  },

  // Lingue Slavo-Orientali
  ru: {
    name: "Русский",
    emoji: "🇷🇺",
    nativeName: "Русский",
    region: "EA",
    code: "ru-RU",
    voiceSpeed: 1.0,
    priority: 11,
  },
  tr: {
    name: "Türkçe",
    emoji: "🇹🇷",
    nativeName: "Türkçe",
    region: "ME",
    code: "tr-TR",
    voiceSpeed: 1.0,
    priority: 12,
  },

  // Lingue Asiatiche
  ja: {
    name: "日本語",
    emoji: "🇯🇵",
    nativeName: "日本語",
    region: "AS",
    code: "ja-JP",
    voiceSpeed: 1.0,
    priority: 13,
    rtl: false,
  },
  zh: {
    name: "中文",
    emoji: "🇨🇳",
    nativeName: "中文",
    region: "AS",
    code: "zh-CN",
    voiceSpeed: 1.0,
    priority: 14,
    rtl: false,
  },
  ko: {
    name: "한국어",
    emoji: "🇰🇷",
    nativeName: "한국어",
    region: "AS",
    code: "ko-KR",
    voiceSpeed: 1.0,
    priority: 15,
    rtl: false,
  },
  th: {
    name: "ไทย",
    emoji: "🇹🇭",
    nativeName: "ไทย",
    region: "AS",
    code: "th-TH",
    voiceSpeed: 1.0,
    priority: 16,
    rtl: false,
  },
  vi: {
    name: "Tiếng Việt",
    emoji: "🇻🇳",
    nativeName: "Tiếng Việt",
    region: "AS",
    code: "vi-VN",
    voiceSpeed: 1.0,
    priority: 17,
    rtl: false,
  },
  id: {
    name: "Bahasa Indonesia",
    emoji: "🇮🇩",
    nativeName: "Bahasa Indonesia",
    region: "AS",
    code: "id-ID",
    voiceSpeed: 1.0,
    priority: 18,
    rtl: false,
  },

  // Lingue Mediorientali e Sud Asiatiche
  ar: {
    name: "العربية",
    emoji: "🇸🇦",
    nativeName: "العربية",
    region: "ME",
    code: "ar-SA",
    voiceSpeed: 1.0,
    priority: 19,
    rtl: true,
  },
  hi: {
    name: "हिन्दी",
    emoji: "🇮🇳",
    nativeName: "हिन्दी",
    region: "SA",
    code: "hi-IN",
    voiceSpeed: 1.0,
    priority: 20,
    rtl: false,
  },
};

/**
 * Termini tecnici comuni nelle traduzioni
 * Userati per migliorare la quality della traduzione
 */
const TECHNICAL_TERMS = {
  it: {
    API: "API",
    function: "funzione",
    variable: "variabile",
    string: "stringa",
    array: "array",
    object: "oggetto",
    class: "classe",
    method: "metodo",
    property: "proprietà",
    parameter: "parametro",
    return: "ritorno",
    loop: "ciclo",
    condition: "condizione",
    null: "null",
    undefined: "indefinito",
  },
  es: {
    API: "API",
    function: "función",
    variable: "variable",
    string: "cadena",
    array: "matriz",
    object: "objeto",
    class: "clase",
    method: "método",
    property: "propiedad",
    parameter: "parámetro",
  },
  fr: {
    API: "API",
    function: "fonction",
    variable: "variable",
    string: "chaîne",
    array: "tableau",
    object: "objet",
    class: "classe",
    method: "méthode",
    property: "propriété",
    parameter: "paramètre",
  },
  de: {
    API: "API",
    function: "Funktion",
    variable: "Variable",
    string: "String",
    array: "Array",
    object: "Objekt",
    class: "Klasse",
    method: "Methode",
    property: "Eigenschaft",
    parameter: "Parameter",
  },
};

/**
 * Toni di voce per diverse categorie di video
 */
const TRANSLATION_TONES = {
  tutorial: {
    name: "Tutorial",
    emoji: "🎓",
    description: "Tono didattico e professionale",
    temperature: 0.6,
  },
  entertainment: {
    name: "Intrattenimento",
    emoji: "🎬",
    description: "Tono rilassato e informale",
    temperature: 0.8,
  },
  news: {
    name: "Notizie",
    emoji: "📰",
    description: "Tono neutro e formale",
    temperature: 0.5,
  },
  music: {
    name: "Musica",
    emoji: "🎵",
    description: "Tono creativo e artistico",
    temperature: 0.7,
  },
  sports: {
    name: "Sport",
    emoji: "⚽",
    description: "Tono energico e appassionato",
    temperature: 0.75,
  },
  gaming: {
    name: "Gaming",
    emoji: "🎮",
    description: "Tono entusiasta e conversazionale",
    temperature: 0.8,
  },
};

/**
 * Ottiene la configurazione completa per una lingua
 */
function getLanguageConfig(languageCode) {
  return LANGUAGES_CONFIG[languageCode] || LANGUAGES_CONFIG["en"];
}

/**
 * Restituisce tutte le lingue supportate ordinate per priorità
 */
function getSupportedLanguages() {
  return Object.keys(LANGUAGES_CONFIG)
    .sort((a, b) => {
      return LANGUAGES_CONFIG[a].priority - LANGUAGES_CONFIG[b].priority;
    })
    .map((code) => ({
      code,
      ...LANGUAGES_CONFIG[code],
    }));
}

/**
 * Verifica se una lingua è supportata
 */
function isLanguageSupported(languageCode) {
  return languageCode in LANGUAGES_CONFIG;
}

/**
 * Ottiene i termini tecnici per una lingua
 */
function getTechnicalTerms(languageCode) {
  return TECHNICAL_TERMS[languageCode] || TECHNICAL_TERMS["en"] || {};
}

/**
 * Esporta configurazione
 */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    LANGUAGES_CONFIG,
    TECHNICAL_TERMS,
    TRANSLATION_TONES,
    getLanguageConfig,
    getSupportedLanguages,
    isLanguageSupported,
    getTechnicalTerms,
  };
}
