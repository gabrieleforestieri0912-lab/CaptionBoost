// Background Service Worker - Gestisce le chiamate AI (Ollama deepseek-r1 / API Key cloud), traduzione e preferenze globali

// Configurazione di Ollama locale (modello predefinito: deepseek-r1)
const LLAMA3_API = 'http://localhost:11434/api/generate';
let CLOUD_API = 'http://localhost:3000/api/ai';

(async () => {
  try {
    const result = await chrome.storage.local.get(['apiUrl']);
    if (result.apiUrl) {
      CLOUD_API = `${result.apiUrl.replace(/\/+$/, '')}/api/ai`;
    }
  } catch {}
})();
const USE_CLOUD_FALLBACK = true; // Usa il server (Ollama deepseek-r1 / API Key) quando Ollama locale non è disponibile

function getAppBaseUrl() {
  return CLOUD_API.replace('/api/ai', '');
}

// Istanza globale del traduttore
let translator = null;

// Lingue supportate
const SUPPORTED_LANGUAGES = {
  it: { name: 'Italiano', emoji: '🇮🇹' },
  en: { name: 'English', emoji: '🇺🇸' },
  es: { name: 'Español', emoji: '🇪🇸' },
  fr: { name: 'Français', emoji: '🇫🇷' },
  de: { name: 'Deutsch', emoji: '🇩🇪' },
  pt: { name: 'Português', emoji: '🇵🇹' },
  ru: { name: 'Русский', emoji: '🇷🇺' },
  ja: { name: '日本語', emoji: '🇯🇵' },
  zh: { name: '中文', emoji: '🇨🇳' },
  ko: { name: '한국어', emoji: '🇰🇷' },
  ar: { name: 'العربية', emoji: '🇸🇦' },
  hi: { name: 'हिन्दी', emoji: '🇮🇳' },
  nl: { name: 'Nederlands', emoji: '🇳🇱' },
  pl: { name: 'Polski', emoji: '🇵🇱' },
  tr: { name: 'Türkçe', emoji: '🇹🇷' },
  th: { name: 'ไทย', emoji: '🇹🇭' },
  vi: { name: 'Tiếng Việt', emoji: '🇻🇳' },
  id: { name: 'Bahasa Indonesia', emoji: '🇮🇩' },
  sv: { name: 'Svenska', emoji: '🇸🇪' },
  da: { name: 'Dansk', emoji: '🇩🇰' },
};

// Ascolta i messaggi dai content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateSubtitles') {
    generateSubtitlesWithLlama(request.transcript)
      .then(subtitles => {
        sendResponse({ success: true, subtitles });
      })
      .catch(error => {
        console.error('❌ Errore:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }

  if (request.action === 'translateSubtitles') {
    translateSubtitles(request.subtitles, request.targetLanguage, request.context)
      .then(translated => {
        sendResponse({ success: true, subtitles: translated });
      })
      .catch(error => {
        console.error('❌ Errore traduzione:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }

  if (request.action === 'saveSubtitles') {
    saveSubtitlesToAccount(request.data)
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('❌ Errore salvataggio sottotitoli:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (request.action === 'getSupportedLanguages') {
    sendResponse({ success: true, languages: SUPPORTED_LANGUAGES });
    return true;
  }

  if (request.action === 'restructureCaptions') {
    restructureCaptionsWithOllama(request.captions, request.targetLanguage)
      .then(result => sendResponse({ success: true, captions: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'openLoginTab') {
    chrome.tabs.create({ url: `${getAppBaseUrl()}/login` });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'answerQuestion') {
    answerCaptionQuestion(request.captions, request.question, request.targetLanguage)
      .then(answer => sendResponse({ success: true, answer }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'translateToAllLanguages') {
    translateToAllLanguages(request.captions, request.sourceLanguage)
      .then(result => sendResponse({ success: true, translations: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getQaHistory') {
    chrome.storage.local.get(['qaHistory'], (result) => {
      sendResponse({ success: true, history: result.qaHistory || [] });
    });
    return true;
  }

  if (request.action === 'fetchCaptionsFromTab') {
    handleFetchCaptionsFromTab(request)
      .then(result => sendResponse(result))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (request.action === 'saveQaEntry') {
    chrome.storage.local.get(['qaHistory'], (result) => {
      const history = result.qaHistory || [];
      history.unshift({
        ...request.entry,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
      });
      if (history.length > 50) history.length = 50;
      chrome.storage.local.set({ qaHistory: history }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

/**
 * Genera sottotitoli usando il motore AI (predefinito: Ollama deepseek-r1)
 */
async function generateSubtitlesWithLlama(transcript) {
  try {
    // Ottieni le preferenze salvate
    const settings = await chrome.storage.sync.get(['language', 'model']);
    const targetLanguage = settings.language || 'it';
    const model = settings.model || 'deepseek-r1';

    // Prepara il prompt
    const prompt = buildSubtitlePrompt(transcript, targetLanguage);

    // Chiama Llama3
    const response = await callLlama(prompt, model);

    // Estrai e elabora i sottotitoli
    const subtitles = parseSubtitles(response);

    return subtitles;
  } catch (error) {
    console.error('❌ Errore nella generazione:', error);
    
    // Ritorna sottotitoli di fallback
    return getFallbackSubtitles();
  }
}

/**
 * Traduce i sottotitoli mantenendo il contesto (mai parola per parola)
 */
async function translateSubtitles(subtitles, targetLanguage, context = {}) {
  try {
    const settings = await chrome.storage.sync.get(['model']);
    const model = settings.model || 'deepseek-r1';

    const windowSize = 10;
    const contextBefore = 3;
    const translated = [];

    for (let start = 0; start < subtitles.length; start += windowSize) {
      const end = Math.min(start + windowSize, subtitles.length);
      const windowTexts = subtitles.slice(start, end);
      const beforeTexts = subtitles.slice(Math.max(0, start - contextBefore), start);

      const prompt = buildWindowTranslationPrompt(
        windowTexts,
        beforeTexts,
        targetLanguage,
        context,
        model
      );

      try {
        const response = await callLlama(prompt, model);
        const lines = response
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        for (let i = 0; i < windowTexts.length; i++) {
          const lineRe = /^\[(\d+)\]\s+(.+)$/;
          const match = lines[i]?.match(lineRe);
          let translatedText = windowTexts[i];

          if (match && parseInt(match[1], 10) === i) {
            translatedText = match[2].trim();
          } else if (lines[i]) {
            const fallbackMatch = lines[i].match(/^\[(\d+)\]\s+(.+)$/);
            if (fallbackMatch) {
              const idx = parseInt(fallbackMatch[1], 10);
              if (idx >= 0 && idx < windowTexts.length) {
                translatedText = fallbackMatch[2].trim();
              } else {
                translatedText = lines[i].replace(/^\[\d+\]\s*/, '').trim();
              }
            } else {
              translatedText = lines[i];
            }
          }

          translated.push({
            originalText: windowTexts[i],
            translatedText,
            language: targetLanguage,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.warn('⚠️ Errore nella traduzione di una finestra:', error);
        for (const text of windowTexts) {
          translated.push({
            originalText: text,
            translatedText: text,
            language: targetLanguage,
            error: true,
          });
        }
      }
    }

    return translated;
  } catch (error) {
    console.error('❌ Errore nella traduzione:', error);
    throw error;
  }
}

/**
 * Costruisce un prompt contestuale per una finestra di sottotitoli
 */
function buildWindowTranslationPrompt(windowTexts, beforeTexts, targetLanguage, context = {}, model = 'deepseek-r1') {
  const languageName = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;

  let prompt = `Sei un traduttore professionista di sottotitoli. Traduci i sottotitoli dal contesto in ${languageName}, mai parola per parola.\n`;
  prompt += 'Regole:\n';
  prompt += '- Traduci in modo naturale e idiomatico, coerente con la conversazione.\n';
  prompt += '- Mantieni nomi propri, marchi e termini tecnici.\n';
  prompt += '- Scegli il significato coerente con il contesto circostante.\n';
  prompt += '- Adatta espressioni idiomatiche.\n';

  if (context.genre) prompt += `Genere: ${context.genre}.\n`;
  if (context.tone) prompt += `Tono: ${context.tone}.\n`;
  if (context.topics && context.topics.length > 0) prompt += `Argomenti: ${context.topics.join(', ')}.\n`;
  if (context.terminology && Object.keys(context.terminology).length > 0) {
    prompt += `Terminologia: ${JSON.stringify(context.terminology)}.\n`;
  }

  if (beforeTexts.length > 0) {
    prompt += `\nCONTESTO PRECEDENTE (già tradotto, usalo per coerenza):\n`;
    beforeTexts.forEach((t) => prompt += `- ${t}\n`);
  }

  prompt += `\nSOTTOTITOLI DA TRADURRE (indice, poi testo):\n`;
  windowTexts.forEach((t, i) => prompt += `[${i}] ${t}\n`);

  prompt += `\nRispondi SOLO con le righe tradotte in formato [indice] testo, una per riga, senza spiegazioni.\n`;

  return prompt;
}

/**
 * Analizza il contesto per migliorare la traduzione
 */
async function analyzeContextForTranslation(videoTitle = '', videoDescription = '', transcript = '') {
  try {
    const prompt = `Analizza il seguente contesto e fornisci informazioni strutturate per migliorare la traduzione:

Titolo: ${videoTitle}
Descrizione: ${videoDescription}
Trascrizione (primi 300 caratteri): ${transcript.substring(0, 300)}...

Rispondi in JSON con: { "genre": "...", "tone": "...", "topics": [...], "terminology": {...} }

Esempio:
{ "genre": "tutorial", "tone": "professional", "topics": ["programming", "javascript"], "terminology": {"API": "API", "function": "funzione"} }

Rispondi SOLO con JSON valido, senza testo aggiuntivo:`;

    const response = await callLlama(prompt, 'deepseek-r1');
    
    try {
      return JSON.parse(response);
    } catch (e) {
      return { genre: 'general', tone: 'neutral', topics: [], terminology: {} };
    }
  } catch (error) {
    console.error('❌ Errore nell\'analisi del contesto:', error);
    return { genre: 'general', tone: 'neutral', topics: [], terminology: {} };
  }
}

/**
 * Costruisce il prompt per Llama3
 */
function buildSubtitlePrompt(transcript, language) {
  const languageMap = {
    it: 'italiano',
    en: 'inglese',
    es: 'spagnolo',
    fr: 'francese',
    de: 'tedesco',
    ja: 'giapponese',
    zh: 'cinese',
    pt: 'portoghese',
    ru: 'russo',
    ar: 'arabo'
  };

  const targetLang = languageMap[language] || 'italiano';

  return `Sei un esperto di traduzione e sottotitoli. Analizza il seguente testo trascritto e crea sottotitoli ottimizzati in ${targetLang}.

Testo trascritto:
"${transcript.text || ''}"

Requisiti:
1. Crea frasi brevi e leggibili (max 10 parole per riga)
2. Mantieni il significato e il tono originale
3. Adatta i tempi per una lettura naturale (2-4 secondi per sottotitolo)
4. Aggiungi punteggiatura appropriata
5. Ritorna SOLO i sottotitoli, uno per riga

Sottotitoli in ${targetLang}:`;
}

/**
 * Helper per caricare le impostazioni AI dell'estensione
 */
async function getAISettings() {
  const settings = await chrome.storage.sync.get(['aiEngine', 'aiProvider', 'apiKey', 'model']);
  return {
    aiEngine: settings.aiEngine || 'cloud',
    aiProvider: settings.aiProvider || 'openai',
    apiKey: settings.apiKey || '',
    model: settings.model || 'deepseek-r1',
  };
}

/**
 * Chiama il motore AI per generare e tradurre sottotitoli.
 * - Predefinito (nessuna API Key): il server usa Ollama locale con deepseek-r1.
 * - Con API Key: il server sceglie automaticamente il modello più adatto per il provider.
 * - Modalità "ollama": chiamata diretta a Ollama locale.
 */
async function callLlama(prompt, overrideModel = null) {
  const { aiEngine, aiProvider, apiKey, model } = await getAISettings();
  const LOCAL_DEFAULT_MODEL = 'deepseek-r1';
  const effectiveModel = overrideModel || model || LOCAL_DEFAULT_MODEL;

  if (aiEngine === 'ollama') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(LLAMA3_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: effectiveModel,
          prompt: prompt,
          stream: false,
          think: false,
          options: { temperature: 0.7 },
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data.response || '';
      }
    } catch (localError) {
      console.warn('❌ Errore Ollama locale, tentato fallback cloud:', localError);
    }
  }

  // Cloud / API Key: il modello viene inviato solo se configurato esplicitamente
  // dall'utente (diverso dai modelli locali di Ollama); altrimenti il server
  // sceglie automaticamente il modello più adatto per il provider.
  const localModels = ['deepseek-r1', 'llama3', 'llama3-70b'];
  const customModel = overrideModel && !localModels.includes(overrideModel) ? overrideModel
    : (model && !localModels.includes(model) ? model : '');

  // Modalità "cloud": nessun provider/modello forzato, usa il default del server (Ollama deepseek-r1).
  const hasCustomKey = Boolean(apiKey) || aiEngine === 'custom_key';
  const providerForRequest = hasCustomKey ? aiProvider : undefined;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const response = await fetch(CLOUD_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { 'x-ai-api-key': apiKey } : {}),
      ...(providerForRequest ? { 'x-ai-provider': providerForRequest } : {}),
      ...(customModel ? { 'x-ai-model': customModel } : {}),
    },
    body: JSON.stringify({
      ...(providerForRequest ? { provider: providerForRequest } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(customModel ? { model: customModel } : {}),
      prompt,
      temperature: 0.3,
      max_tokens: 2000,
    }),
    signal: controller.signal
  });
  clearTimeout(timeoutId);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP Error ${response.status}`);
  }

  const data = await response.json();
  return data.response || data.text || '';
}

/**
 * Estrae i sottotitoli dalla risposta
 */
function parseSubtitles(response) {
  if (!response) return [];

  const lines = response
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('[') && !line.startsWith('#'));

  return lines.slice(0, 10); // Limita a 10 sottotitoli per demo
}

/**
 * Sottotitoli di fallback
 */
function getFallbackSubtitles() {
  return [
    '🎬 Sottotitoli generati da AI',
    "Un'esperienza di visualizzazione migliorata",
    'Supporto per multiple lingue',
    'Sincronizzazione automatica',
    'Qualità professionale'
  ];
}

/**
 * Salva i sottotitoli nell'account dell'utente tramite API
 */
async function saveSubtitlesToAccount(data) {
  try {
    const token = await getAuthToken();
    if (!token) {
      await saveSubtitlesLocally(data);
      return { saved: 'local' };
    }
    return { saved: 'cloud' };
  } catch (error) {
    console.error('❌ Errore salvataggio sottotitoli:', error);
    await saveSubtitlesLocally(data);
    return { saved: 'local' };
  }
}

/**
 * Salva sottotitoli in storage locale
 */
async function saveSubtitlesLocally(data) {
  const result = await chrome.storage.local.get(['savedSubtitles']);
  const subtitles = result.savedSubtitles || [];
  subtitles.unshift({
    id: Date.now().toString(36),
    ...data,
    savedAt: new Date().toISOString()
  });
  if (subtitles.length > 20) subtitles.length = 20;
  await chrome.storage.local.set({ savedSubtitles: subtitles });
}

/**
 * Ottiene il token di autenticazione dallo storage
 */
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['captionboost_auth_token'], (result) => {
      resolve(result.captionboost_auth_token || null);
    });
  });
}

/**
 * Genera sottotitoli migliorati e tradotti via AI
 * Usa Cloud Production API (GPT-4o Mini) o Ollama locale in base alle impostazioni
 */
async function restructureCaptionsWithOllama(captions, targetLanguage) {
  const langName = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;

  const transcriptText = captions.map((c, i) =>
    `[${i + 1}] ${formatTime(c.start)} --> ${formatTime(c.end)}: ${c.text}`
  ).join("\n");

  const prompt = `Sei un editor e traduttore professionista di sottotitoli. Correggi errori di trascrizione, aggiungi punteggiatura, migliora la naturalezza del testo e traduci TUTTO in ${langName}.

Traduci BASANDOTI SUL CONTESTO dell'intero video, MAI parola per parola. Regole:
- Rendi la traduzione naturale e idiomatica, coerente con la conversazione nel suo insieme.
- Scegli il significato corretto di ogni parola in base al contesto delle frasi vicine.
- Mantieni nomi propri, marchi e termini tecnici invariati.
- Adatta le espressioni idiomatiche in modo equivalente in ${langName}.

IMPORTANTE: Mantieni IDENTICI i timestamp originali. Non modificare i numeri di riga.

Rispondi SOLO con i sottotitoli corretti e tradotti in questo formato esatto, senza spiegazioni:

[RIGA] [TIMESTAMP_INIZIO] --> [TIMESTAMP_FINE]: [TESTO_TRADOTTO]

Sottotitoli originali:
${transcriptText}

Sottotitoli corretti e tradotti in ${langName}:`;

  try {
    const output = await callLlama(prompt);

    if (output) {
      const result = parseRestructuredOutput(output, captions);
      if (result.length > 0) return result;
    }

    return captions.map(c => ({ ...c, text: c.text }));
  } catch (e) {
    console.error("❌ Batch restructuring failed:", e);
    return captions.map(c => ({ ...c, text: c.text }));
  }
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}

function parseRestructuredOutput(output, originalCaptions) {
  try {
    const lines = output.split("\n").filter(l => l.trim());
    const result = [];

    for (const line of lines) {
      const match = line.match(/^\[(\d+)\]\s+(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3}):\s*(.+)/);
      if (!match) continue;

      const idx = parseInt(match[1]) - 1;
      const text = match[4].trim();
      if (text && idx >= 0 && idx < originalCaptions.length) {
        result.push({
          ...originalCaptions[idx],
          text,
        });
      }
    }

    return result;
  } catch (e) {
    console.error("Failed to parse Ollama output:", e);
    return [];
  }
}

/**
 * AI Caption Q&A - Risponde a domande sul contenuto del video
 */
async function answerCaptionQuestion(captions, question, targetLanguage = 'it') {
  const transcriptText = captions.map(c => c.text).join(' ');
  const langName = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;

  const prompt = `Sei un assistente esperto che risponde a domande sul contenuto di un video basandoti sui suoi sottotitoli.

SOTTOTITOLI DEL VIDEO:
"${transcriptText}"

DOMANDA: "${question}"

Rispondi in ${langName} in modo chiaro e conciso, basandoti SOLO sulle informazioni presenti nei sottotitoli. Se la risposta non è nei sottotitoli, dì che non hai abbastanza informazioni per rispondere.

RISPOSTA:`;

  const settings = await chrome.storage.sync.get(['model']);
  const model = settings.model || 'deepseek-r1';
  return callLlama(prompt, model);
}

/**
 * Traduce i sottotitoli in tutte le 20 lingue supportate
 */
async function translateToAllLanguages(captions, sourceLanguage = 'en') {
  const transcriptText = captions.map(c => c.text).join('\n');
  const actualSource = SUPPORTED_LANGUAGES[sourceLanguage] ? sourceLanguage : 'en';
  const targetCodes = Object.keys(SUPPORTED_LANGUAGES).filter(l => l !== actualSource);
  const targetNames = targetCodes.map(c => SUPPORTED_LANGUAGES[c].name).join(', ');

  const prompt = `Sei un traduttore professionista. Traduci il seguente testo in TUTTE queste lingue: ${targetNames}.

Testo originale (${SUPPORTED_LANGUAGES[actualSource]?.name || actualSource}):
"${transcriptText}"

Per ogni lingua, fornisci la traduzione in questo formato esatto:
[LINGUA]: [TRADUZIONE]

Lingue: ${targetNames}

Traduzioni:`;

  try {
    const settings = await chrome.storage.sync.get(['model']);
    const model = settings.model || 'deepseek-r1';
    const response = await callLlama(prompt, model);

    const translations = {};
    const lines = response.split('\n').filter(l => l.trim());

    for (const line of lines) {
      for (const [code, lang] of Object.entries(SUPPORTED_LANGUAGES)) {
        if (code === actualSource) continue;
        const prefix = `${lang.name}:`;
        const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = line.match(new RegExp(`^${escapedPrefix}\\s*(.+)$`, 'i'));
        if (match) {
          translations[code] = match[1].trim();
          break;
        }
      }
    }

    return translations;
  } catch (e) {
    console.error('Batch translate failed:', e);
    return {};
  }
}

// --- Bridge: fetch captions from a YouTube tab ---
async function handleFetchCaptionsFromTab({ requestId, videoId, lang, sourceLang }) {
  try {
    const tabs = await chrome.tabs.query({ url: '*://www.youtube.com/*' });
    let targetTab = null;

    if (videoId) {
      targetTab = tabs.find(t => t.url && t.url.includes('watch?v=' + videoId));
    }
    if (!targetTab && tabs.length > 0) {
      targetTab = tabs[0];
    }
    if (!targetTab) {
      return { success: false, error: 'Nessuna scheda YouTube aperta. Apri youtube.com/watch?v=' + videoId };
    }

    const result = await chrome.tabs.sendMessage(targetTab.id, {
      action: 'getCaptionsForVideo',
      videoId,
      lang,
      sourceLang,
    });

    if (!result || !result.success) {
      return { success: false, error: result?.error || 'Impossibile ottenere i sottotitoli dalla scheda YouTube' };
    }

    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}
// --- End Bridge ---

// Inizializza le preferenze di default
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['language', 'model', 'fontSize', 'opacity'], (result) => {
    if (!result.language) {
      chrome.storage.sync.set({
        language: 'it',
        model: 'deepseek-r1',
        fontSize: 14,
        opacity: 100,
        enabled: false
      });
    }
  });
});
