/**
 * Translation Module - Traduzione intelligente con context-awareness
 * Utilizza Llama3 per comprendere il contesto e tradurre accuratamente
 */

const SUPPORTED_LANGUAGES = {
  it: { name: "Italiano", emoji: "🇮🇹" },
  en: { name: "English", emoji: "🇺🇸" },
  es: { name: "Español", emoji: "🇪🇸" },
  fr: { name: "Français", emoji: "🇫🇷" },
  de: { name: "Deutsch", emoji: "🇩🇪" },
  pt: { name: "Português", emoji: "🇵🇹" },
  ru: { name: "Русский", emoji: "🇷🇺" },
  ja: { name: "日本語", emoji: "🇯🇵" },
  zh: { name: "中文", emoji: "🇨🇳" },
  ko: { name: "한국어", emoji: "🇰🇷" },
  ar: { name: "العربية", emoji: "🇸🇦" },
  hi: { name: "हिन्दी", emoji: "🇮🇳" },
  nl: { name: "Nederlands", emoji: "🇳🇱" },
  pl: { name: "Polski", emoji: "🇵🇱" },
  tr: { name: "Türkçe", emoji: "🇹🇷" },
  th: { name: "ไทย", emoji: "🇹🇭" },
  vi: { name: "Tiếng Việt", emoji: "🇻🇳" },
  id: { name: "Bahasa Indonesia", emoji: "🇮🇩" },
  sv: { name: "Svenska", emoji: "🇸🇪" },
  da: { name: "Dansk", emoji: "🇩🇰" },
};

/**
 * Classe per gestire la traduzione intelligente
 */
class IntelligentTranslator {
  constructor(targetLanguage = "it", modelName = "llama3") {
    this.targetLanguage = targetLanguage;
    this.modelName = modelName;
    this.llama3Api = "http://localhost:11434/api/generate";
    this.contextCache = new Map();
    this.translationCache = new Map();
  }

  /**
   * Analizza il contesto per migliorare la traduzione
   */
  async analyzeContext(transcript, videoTitle = "", videoDescription = "") {
    const cacheKey = `${videoTitle}_${this.targetLanguage}`;

    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey);
    }

    try {
      const prompt = `Analizza il seguente contesto e identifica il genere, il tono e gli argomenti principali per migliorare la traduzione:

Titolo Video: ${videoTitle}
Descrizione: ${videoDescription}
Trascrizione (prime 500 caratteri): ${transcript.substring(0, 500)}...

Rispondi in JSON con: { "genre": "...", "tone": "...", "topics": [...], "terminology": {...} }`;

      const context = await this._callLlama3(prompt);

      try {
        const parsed = JSON.parse(context);
        this.contextCache.set(cacheKey, parsed);
        return parsed;
      } catch (e) {
        console.log("📊 Contesto analizzato (formato testo)");
        return {
          genre: "general",
          tone: "neutral",
          topics: [],
          terminology: {},
        };
      }
    } catch (error) {
      console.error("❌ Errore nell'analisi del contesto:", error);
      return { genre: "general", tone: "neutral", topics: [], terminology: {} };
    }
  }

  /**
   * Traduce un testo mantenendo il contesto
   */
  async translate(text, context = {}) {
    const cacheKey = `${text}_${this.targetLanguage}`;

    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    try {
      const languageName =
        SUPPORTED_LANGUAGES[this.targetLanguage]?.name || this.targetLanguage;

      const prompt = this._buildTranslationPrompt(text, languageName, context);

      const translation = await this._callLlama3(prompt);

      // Cache della traduzione
      this.translationCache.set(cacheKey, translation);

      // Limita la cache a 1000 voci
      if (this.translationCache.size > 1000) {
        const firstKey = this.translationCache.keys().next().value;
        this.translationCache.delete(firstKey);
      }

      return translation.trim();
    } catch (error) {
      console.error("❌ Errore nella traduzione:", error);
      return text; // Fallback al testo originale
    }
  }

  /**
   * Costruisce il prompt di traduzione considerando il contesto
   */
  _buildTranslationPrompt(text, targetLanguage, context) {
    let prompt = `Traduci il seguente testo in ${targetLanguage}.`;

    // Aggiungi informazioni sul contesto
    if (context.genre) {
      prompt += ` Genere: ${context.genre}.`;
    }
    if (context.tone) {
      prompt += ` Tono: ${context.tone}.`;
    }
    if (context.topics && context.topics.length > 0) {
      prompt += ` Argomenti: ${context.topics.join(", ")}.`;
    }
    if (context.terminology && Object.keys(context.terminology).length > 0) {
      prompt += ` Usa questa terminologia specifica: ${JSON.stringify(context.terminology)}.`;
    }

    prompt += `

REGOLE:
- Mantieni lo stile e il tono del testo originale
- Usa una terminologia naturale e idiomatica
- Se contiene espressioni idiomatiche, traducile in modo equivalente
- Preserva nomi propri, brand e riferimenti tecnici
- Rispondi SOLO con la traduzione, senza spiegazioni

Testo da tradurre:
"${text}"

Traduzione:`;

    return prompt;
  }

  /**
   * Traduce un batch di sottotitoli
   */
  async translateBatch(subtitles, context = {}) {
    const translated = [];

    for (const subtitle of subtitles) {
      const translation = await this.translate(subtitle.text, context);
      translated.push({
        ...subtitle,
        text: translation,
        originalText: subtitle.text,
        translated: true,
      });
    }

    return translated;
  }

  /**
   * Chiama l'API di Llama3
   */
  async _callLlama3(prompt, temperature = 0.7) {
    try {
      const response = await fetch(this.llama3Api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt: prompt,
          stream: false,
          temperature: temperature,
          top_p: 0.95,
          top_k: 40,
        }),
      });

      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }

      const data = await response.json();
      return data.response || "";
    } catch (error) {
      console.error("❌ Errore nella chiamata a Llama3:", error);
      throw error;
    }
  }

  /**
   * Imposta la lingua di destinazione
   */
  setTargetLanguage(languageCode) {
    if (SUPPORTED_LANGUAGES[languageCode]) {
      this.targetLanguage = languageCode;
      this.translationCache.clear(); // Svuota la cache
    } else {
      console.warn(`⚠️ Lingua non supportata: ${languageCode}`);
    }
  }

  /**
   * Pulisce la cache
   */
  clearCache() {
    this.translationCache.clear();
    this.contextCache.clear();
  }

  /**
   * Restituisce le lingue supportate
   */
  static getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }
}

// Esporta il modulo
if (typeof module !== "undefined" && module.exports) {
  module.exports = { IntelligentTranslator, SUPPORTED_LANGUAGES };
}
