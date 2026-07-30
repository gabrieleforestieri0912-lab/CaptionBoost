// Background Service Worker - Gestisce le chiamate a Llama3, traduzione e preferenze globali

console.log('🔧 CaptionBoost Background Service Worker Loaded');

// Configurazione di Llama3 (usa Ollama in locale o fallback cloud)
const LLAMA3_API = 'http://localhost:11434/api/generate';
const CLOUD_API = (() => {
  try {
    const url = new URL(chrome.runtime.getURL('/'));
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api/ai';
    }
  } catch {}
  return 'https://captionboost.it/api/ai';
})();
const USE_CLOUD_FALLBACK = true; // Usa API cloud quando Ollama non è disponibile

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
    console.log('📝 Generazione sottotitoli richiesta...');
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
    console.log('🌍 Traduzione sottotitoli richiesta...');
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

  if (request.action === 'testConnection') {
    testLlamaConnection()
      .then(result => {
        sendResponse({ success: true, result });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    
    return true;
  }

  if (request.action === 'saveSubtitles') {
    console.log('💾 Salvataggio sottotitoli richiesto...');
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
    chrome.tabs.create({ url: 'https://captionboost.it/login' });
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
 * Genera sottotitoli usando Llama3
 */
async function generateSubtitlesWithLlama(transcript) {
  try {
    // Ottieni le preferenze salvate
    const settings = await chrome.storage.sync.get(['language', 'model']);
    const targetLanguage = settings.language || 'it';
    const model = settings.model || 'llama3';

    console.log(`🤖 Usando modello: ${model}, lingua: ${targetLanguage}`);

    // Prepara il prompt
    const prompt = buildSubtitlePrompt(transcript, targetLanguage);

    // Chiama Llama3
    const response = await callLlama(prompt, model);

    // Estrai e elabora i sottotitoli
    const subtitles = parseSubtitles(response);

    console.log(`✅ Generati ${subtitles.length} sottotitoli`);
    return subtitles;
  } catch (error) {
    console.error('❌ Errore nella generazione:', error);
    
    // Ritorna sottotitoli di fallback
    return getFallbackSubtitles();
  }
}

/**
 * Traduce i sottotitoli mantenendo il contesto
 */
async function translateSubtitles(subtitles, targetLanguage, context = {}) {
  try {
    const settings = await chrome.storage.sync.get(['model']);
    const model = settings.model || 'llama3';

    console.log(`🌍 Traduzione in ${SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage}...`);

    const translated = [];

    for (const subtitle of subtitles) {
      try {
        const prompt = buildTranslationPrompt(subtitle, targetLanguage, context, model);
        const response = await callLlama(prompt, model);
        
        translated.push({
          originalText: subtitle,
          translatedText: response.trim(),
          language: targetLanguage,
          timestamp: Date.now(),
        });
      } catch (error) {
        console.warn('⚠️ Errore nella traduzione di una singola linea:', error);
        // Fallback: ritorna il testo originale
        translated.push({
          originalText: subtitle,
          translatedText: subtitle,
          language: targetLanguage,
          error: true,
        });
      }
    }

    console.log(`✅ Tradotti ${translated.length} sottotitoli`);
    return translated;
  } catch (error) {
    console.error('❌ Errore nella traduzione:', error);
    throw error;
  }
}

/**
 * Costruisce il prompt per la traduzione intelligente
 */
function buildTranslationPrompt(text, targetLanguage, context = {}, model = 'llama3') {
  const languageName = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;
  
  let prompt = `Traduci il seguente testo in ${languageName}.`;

  // Aggiungi contesto se disponibile
  if (context.genre) {
    prompt += ` Genere: ${context.genre}.`;
  }
  if (context.tone) {
    prompt += ` Tono: ${context.tone}.`;
  }
  if (context.topics && context.topics.length > 0) {
    prompt += ` Argomenti: ${context.topics.join(', ')}.`;
  }
  if (context.terminology && Object.keys(context.terminology).length > 0) {
    prompt += ` Usa questa terminologia: ${JSON.stringify(context.terminology)}.`;
  }

  prompt += `

REGOLE IMPORTANTI:
- Traduci SOLO il testo, senza spiegazioni aggiuntive
- Mantieni il tono, lo stile e il significato originale
- Se contiene espressioni idiomatiche, traducile in modo equivalente
- Preserva nomi propri, brand e riferimenti tecnici
- Usa una terminologia naturale e idiomatica per la lingua target
- Risposta BREVE e concisa

Testo da tradurre:
"${text}"

Traduzione in ${languageName}:`;

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

    const response = await callLlama(prompt, 'llama3');
    
    try {
      return JSON.parse(response);
    } catch (e) {
      console.log('📊 Contesto analizzato (formato testo)');
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
 * Chiama l'API di Llama3 con fallback cloud
 */
async function callLlama(prompt, model = 'llama3') {
  try {
    console.log('📡 Contattando Llama3...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const response = await fetch(LLAMA3_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Risposta ricevuta da Llama3');
    return data.response || '';
  } catch (error) {
    console.error('❌ Errore connessione Llama3:', error);
    
    // Fallback to cloud API
    if (USE_CLOUD_FALLBACK) {
      console.log('🔄 Tentativo fallback cloud API...');
      try {
        const response = await fetch(CLOUD_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt,
            temperature: 0.7,
            max_tokens: 500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.response || data.text || '';
        }
      } catch (cloudError) {
        console.error('❌ Fallback cloud fallito:', cloudError);
      }
    }
    
    console.log('💡 Assicurati che Ollama è in esecuzione: ollama run llama3');
    throw error;
  }
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
 * Testa la connessione a Llama3
 */
async function testLlamaConnection() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(LLAMA3_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: 'Ciao',
        stream: false
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      return { connected: true, message: 'Llama3 è connesso e pronto' };
    } else {
      return { connected: false, message: 'Llama3 non risponde' };
    }
  } catch (error) {
    return {
      connected: false,
      message: 'Impossibile connettersi a Llama3. Esegui: ollama run llama3'
    };
  }
}

/**
 * Salva i sottotitoli nell'account dell'utente tramite API
 */
async function saveSubtitlesToAccount(data) {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('⚠️ Utente non autenticato, salvataggio locale');
      await saveSubtitlesLocally(data);
      return { saved: 'local' };
    }

    const CLOUD_API_BASE = CLOUD_API.replace('/api/ai', '/api/account/subtitles');

    const response = await fetch(CLOUD_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Sottotitoli salvati nel cloud');
    return { saved: 'cloud', subtitle: result.subtitle };
  } catch (error) {
    console.error('❌ Errore salvataggio cloud:', error);
    await saveSubtitlesLocally(data);
    return { saved: 'local' };
  }
}

/**
 * Salva i sottotitoli in locale come fallback
 */
async function saveSubtitlesLocally(data) {
  const result = await chrome.storage.sync.get(['localSubtitles']);
  const local = result.localSubtitles || [];
  const existing = local.findIndex(
    s => s.videoId === data.videoId && s.language === data.language
  );

  const entry = {
    ...data,
    savedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    local[existing] = entry;
  } else {
    local.push(entry);
  }

  await chrome.storage.sync.set({ localSubtitles: local });
  console.log('✅ Sottotitoli salvati in locale');
}

/**
 * Ottiene il token di autenticazione dallo storage
 */
async function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['captionboost_auth_token'], (result) => {
      resolve(result.captionboost_auth_token || null);
    });
  });
}

/**
 * Genera sottotitoli migliorati e tradotti via AI
 * Usa Llama3 in locale o servizio cloud come fallback
 */
async function restructureCaptionsWithOllama(captions, targetLanguage) {
  const langName = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;

  const transcriptText = captions.map((c, i) =>
    `[${i + 1}] ${formatTime(c.start)} --> ${formatTime(c.end)}: ${c.text}`
  ).join("\n");

  const prompt = `Sei un editor professionista di sottotitoli. Correggi errori di trascrizione, aggiungi punteggiatura, migliora la naturalezza del testo e traduci TUTTO in ${langName}.

IMPORTANTE: Mantieni IDENTICI i timestamp originali. Non modificare i numeri di riga.

Rispondi SOLO con i sottotitoli corretti e tradotti in questo formato esatto, senza spiegazioni:

[RIGA] [TIMESTAMP_INIZIO] --> [TIMESTAMP_FINE]: [TESTO_TRADOTTO]

Sottotitoli originali:
${transcriptText}

Sottotitoli corretti e tradotti in ${langName}:`;

  try {
    const settings = await chrome.storage.sync.get(['model']);
    const model = settings.model || 'llama3';

    const resp = await fetch(LLAMA3_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        temperature: 0.3,
        top_p: 0.9,
      }),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    const output = data.response || "";

    const result = parseRestructuredOutput(output, captions);
    if (result.length > 0) return result;

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
  const model = settings.model || 'llama3';
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
    const model = settings.model || 'llama3';
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
  console.log('📦 CaptionBoost Extension Installed');

  chrome.storage.sync.get(['language', 'model', 'fontSize', 'opacity'], (result) => {
    if (!result.language) {
      chrome.storage.sync.set({
        language: 'it',
        model: 'llama3',
        fontSize: 14,
        opacity: 100,
        enabled: false
      });
      console.log('✅ Preferenze di default impostate');
    }
  });
});

console.log('✅ CaptionBoost Background Service Worker Ready');
