// Background Service Worker - Gestisce le chiamate AI (Gemini / API Key cloud), traduzione e preferenze globali

let CLOUD_API = 'http://localhost:3000/api/ai';

(async () => {
  try {
    const result = await chrome.storage.local.get(['apiUrl']);
    if (result.apiUrl) {
      CLOUD_API = `${result.apiUrl.replace(/\/+$/, '')}/api/ai`;
    }
  } catch {}
})();
const USE_CLOUD_FALLBACK = true; // Usa il server (Gemini / API Key) per le chiamate AI

function getAppBaseUrl() {
  return CLOUD_API.replace('/api/ai', '');
}

// Istanza globale del traduttore
let translator = null;

// ── Cache traduzioni (spec §4: chiave = videoId + lingua target) ──────────────
const TRANSLATION_CACHE_KEY = 'translationCache';
const TRANSLATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni
const TRANSLATION_CACHE_MAX_ENTRIES = 100;

// Firma del contenuto sorgente: invalida la cache se i captions cambiano
function captionsSignature(captions) {
  let s = '';
  for (const c of captions) s += c.start + '|' + (c.text || '') + ';';
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return String(hash);
}

async function getCachedTranslation(videoId, lang, sourceSignature) {
  if (!videoId || !lang) return null;
  try {
    const result = await chrome.storage.local.get([TRANSLATION_CACHE_KEY]);
    const cache = result[TRANSLATION_CACHE_KEY] || {};
    const entry = cache[`${videoId}:${lang}`];
    if (!entry) return null;
    if (Date.now() - (entry.ts || 0) > TRANSLATION_CACHE_TTL_MS) return null;
    // La firma sorgente deve combaciare (stessi captions originali)
    if (sourceSignature && entry.sig && entry.sig !== sourceSignature) return null;
    return entry.captions || null;
  } catch (e) {
    console.warn('⚠️ getCachedTranslation error:', e);
    return null;
  }
}

async function setCachedTranslation(videoId, lang, captions, sourceSignature) {
  if (!videoId || !lang || !captions) return;
  try {
    const result = await chrome.storage.local.get([TRANSLATION_CACHE_KEY]);
    const cache = result[TRANSLATION_CACHE_KEY] || {};
    const keys = Object.keys(cache);
    if (keys.length >= TRANSLATION_CACHE_MAX_ENTRIES) {
      // Rimuovi la voce più vecchia
      keys.sort((a, b) => (cache[a].ts || 0) - (cache[b].ts || 0));
      delete cache[keys[0]];
    }
    cache[`${videoId}:${lang}`] = {
      ts: Date.now(),
      sig: sourceSignature || null,
      captions,
    };
    await chrome.storage.local.set({ [TRANSLATION_CACHE_KEY]: cache });
  } catch (e) {
    console.warn('⚠️ setCachedTranslation error:', e);
  }
}

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
    restructureCaptions(request.captions, request.targetLanguage, request.videoId)
      .then(result => sendResponse({ success: true, captions: result, cached: result._cached }))
      .catch(error => sendResponse({ success: false, error: error.message, status: error.status }));
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
      .catch(error => sendResponse({ success: false, error: error.message, status: error.status }));
    return true;
  }

  if (request.action === 'getAccountInfo') {
    getAccountInfo()
      .then(result => sendResponse(result))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (request.action === 'openPricingTab') {
    chrome.tabs.create({ url: `${getAppBaseUrl()}/pricing` });
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'siteAuthSync') {
    handleSiteAuthSync(request)
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (request.action === 'checkAuth') {
    checkAuth()
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ success: false, authenticated: false, error: e.message }));
    return true;
  }

  if (request.action === 'openPopupTranslate') {
    openPopupWithIntent('translate')
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (request.action === 'openPopupLogin') {
    openPopupWithIntent('login')
      .then((result) => sendResponse(result))
      .catch((e) => sendResponse({ success: false, error: e.message }));
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

  if (request.action === 'fetchTranscriptFallback') {
    fetchTranscriptFallback(request.videoId)
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
 * Genera sottotitoli usando il motore AI (predefinito: Google Gemini)
 */
async function generateSubtitlesWithLlama(transcript) {
  try {
    // Ottieni le preferenze salvate
    const settings = await chrome.storage.sync.get(['language', 'model']);
    const targetLanguage = settings.language || 'it';
    const model = settings.model || 'gemini-2.0-flash';

    // Prepara il prompt
    const prompt = buildSubtitlePrompt(transcript, targetLanguage);

    // Chiama il motore AI
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
    const model = settings.model || 'gemini-2.0-flash';

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
function buildWindowTranslationPrompt(windowTexts, beforeTexts, targetLanguage, context = {}, model = 'gemini-2.0-flash') {
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

    const response = await callLlama(prompt, 'gemini-2.0-flash');
    
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
 * Costruisce il prompt per il motore AI
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
    aiProvider: settings.aiProvider || 'gemini',
    apiKey: settings.apiKey || '',
    model: settings.model || 'gemini-2.0-flash',
  };
}

/**
 * Chiama il motore AI per generare e tradurre sottotitoli.
 * - Predefinito: il server usa Google Gemini con gemini-2.0-flash.
 * - Con API Key: il server sceglie automaticamente il modello più adatto per il provider.
 */
async function callLlama(prompt, overrideModel = null) {
  const { aiEngine, aiProvider, apiKey, model } = await getAISettings();

  // Cloud / API Key: il modello viene inviato solo se configurato esplicitamente
  // dall'utente; altrimenti il server sceglie automaticamente il modello più adatto.
  const customModel = overrideModel || model || '';

  // Modalità "cloud": nessun provider/modello forzato, usa il default del server (Gemini gemini-2.0-flash).
  const hasCustomKey = Boolean(apiKey) || aiEngine === 'custom_key';
  const providerForRequest = hasCustomKey ? aiProvider : undefined;

  // Token di autenticazione: il server applica il limite free (50 traduzioni/mese)
  // sull'utente autenticato (spec §7).
  const token = await getAuthToken();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  const response = await fetch(CLOUD_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    const err = new Error(errData.error || `HTTP Error ${response.status}`);
    err.status = response.status;
    throw err;
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
 * Legge il token app salvato in storage (senza fallback).
 */
function getStoredAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['captionboost_auth_token'], (result) => {
      resolve(result.captionboost_auth_token || null);
    });
  });
}

/**
 * Ottiene il token di autenticazione dell'app.
 * 1) Token già in storage (login dall'estensione o sync precedente).
 * 2) Fallback: sincronizza la sessione del sito (via chrome.cookies o bridge)
 *    scambiando l'access token Supabase con un JWT dell'app (/api/auth/sync).
 */
async function getAuthToken() {
  const stored = await getStoredAuthToken();
  if (stored) return stored;
  return ensureSyncedAuth();
}

function base64UrlDecode(value) {
  let b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bytes = atob(b64);
  const chars = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) chars[i] = bytes.charCodeAt(i);
  return new TextDecoder().decode(Uint8Array.from(chars));
}

/**
 * Legge l'access token della sessione del sito dai cookie (sb-*-auth-token).
 * Funziona anche senza bridge.js: chrome.cookies legge il cookie jar del sito
 * direttamente, senza dipendere da SameSite o da una scheda del sito aperta.
 */
async function getSiteSessionAccessToken() {
  const siteUrl = getAppBaseUrl();
  let cookies = [];
  try {
    cookies = await chrome.cookies.getAll({ url: siteUrl });
  } catch (e) {
    console.warn('⚠️ chrome.cookies non disponibile:', e);
    return null;
  }
  try {
    const byKey = {};
    for (const c of cookies) {
      const m = c.name.match(/^(sb-.+-auth-token)(?:\.(\d+))?$/);
      if (!m) continue;
      const key = m[1];
      const idx = parseInt(m[2] || '0', 10);
      if (!byKey[key]) byKey[key] = [];
      byKey[key][idx] = c.value;
    }
    for (const key of Object.keys(byKey)) {
      const value = byKey[key].join('');
      if (!value.startsWith('base64-')) continue;
      const session = JSON.parse(base64UrlDecode(value.substring('base64-'.length)));
      if (session && typeof session.access_token === 'string' && session.access_token) {
        return session.access_token;
      }
    }
  } catch (e) {
    // cookie non decodificabile (es. scrittura a metà): ignora
  }
  return null;
}

/**
 * Scambia l'access token Supabase del sito con un JWT dell'app e lo salva.
 */
async function exchangeSiteToken(accessToken) {
  if (!accessToken) return null;
  const resp = await fetch(`${getAppBaseUrl()}/api/auth/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: accessToken }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.token) {
    console.warn('⚠️ Auth sync fallito:', data?.error || resp.status);
    return null;
  }
  await chrome.storage.local.set({
    captionboost_auth_token: data.token,
    captionboost_user: data.user,
  });
  notifyYouTubeTabs({ action: 'authStateChanged', authenticated: true });
  return data.token;
}

/**
 * Sincronizza la sessione del sito (se presente) con l'estensione.
 */
async function ensureSyncedAuth() {
  const siteToken = await getSiteSessionAccessToken();
  if (!siteToken) return null;
  return exchangeSiteToken(siteToken);
}

/**
 * Genera sottotitoli migliorati e tradotti via AI
 * Usa Cloud Production API (Gemini) in base alle impostazioni
 */
/**
 * Costruisce il prompt per ripulire e tradurre i sottotitoli.
 * Condiviso tra il percorso non-streaming e quello streaming.
 */
function buildRestructurePrompt(captions, targetLanguage) {
  const langName = SUPPORTED_LANGUAGES[targetLanguage]?.name || targetLanguage;

  const transcriptText = captions.map((c, i) =>
    `[${i + 1}] ${formatTime(c.start)} --> ${formatTime(c.end)}: ${c.text}`
  ).join("\n");

  return `Sei un editor e traduttore professionista di sottotitoli. Correggi errori di trascrizione, aggiungi punteggiatura, migliora la naturalezza del testo e traduci TUTTO in ${langName}.

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
}
async function restructureCaptions(captions, targetLanguage, videoId) {
  const sourceSignature = captionsSignature(captions);

  // Cache hit: riusa la traduzione già fatta per questo video + lingua
  const cached = await getCachedTranslation(videoId, targetLanguage, sourceSignature);
  if (cached && cached.length === captions.length) {
    const copy = cached.slice();
    copy._cached = true;
    return copy;
  }

  const prompt = buildRestructurePrompt(captions, targetLanguage);

  try {
    const output = await callLlama(prompt);

    if (output) {
      const result = parseRestructuredOutput(output, captions);
      if (result.length > 0) {
        await setCachedTranslation(videoId, targetLanguage, result, sourceSignature);
        return result;
      }
    }

    return captions.map(c => ({ ...c, text: c.text }));
  } catch (e) {
    console.error("❌ Batch restructuring failed:", e);
    // Errore di quota (429): propaga il messaggio perché la UI mostri il limite
    // invece di ripiegare silenziosamente sui sottotitoli originali.
    if (e && (e.status === 429 || /limite/i.test(e.message || ''))) {
      throw e;
    }
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
    console.error("Failed to parse AI output:", e);
    return [];
  }
}

/**
 * AI Caption Q&A - Risponde a domande sul contenuto del video.
 * Premium only: il piano viene verificato server-side su /api/qa (spec §7),
 * quindi qui non ci si fida mai di un flag locale.
 */
async function answerCaptionQuestion(captions, question, targetLanguage = 'it') {
  const token = await getAuthToken();
  if (!token) {
    const err = new Error("Devi effettuare l'accesso per usare il Q&A.");
    err.status = 401;
    throw err;
  }

  let resp;
  try {
    resp = await fetch(`${getAppBaseUrl()}/api/qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ captions, question, targetLanguage }),
    });
  } catch (e) {
    const err = new Error('Impossibile contattare il server.');
    err.status = 0;
    throw err;
  }

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.success) {
    const err = new Error(data?.error || `HTTP ${resp.status}`);
    err.status = resp.status;
    throw err;
  }
  return data.answer;
}

/**
 * Recupera le informazioni sull'account (piano, stato abbonamento) dal server.
 */
async function getAccountInfo() {
  const token = await getAuthToken();
  if (!token) return { success: false, error: 'Non autenticato' };
  const resp = await fetch(`${getAppBaseUrl()}/api/account`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return { success: false, error: data?.error || `HTTP ${resp.status}` };
  return { success: true, plan: data.plan };
}

/**
 * Sincronizza l'autenticazione dal sito: il bridge (content script sul sito)
 * invia l'access token Supabase della sessione appena cambiata; al logout il
 * token dell'estensione viene rimosso.
 */
async function handleSiteAuthSync({ loggedIn, accessToken }) {
  if (!loggedIn || !accessToken) {
    const had = await chrome.storage.local.get(['captionboost_auth_token']);
    await chrome.storage.local.remove(['captionboost_auth_token', 'captionboost_user']);
    if (had.captionboost_auth_token) {
      notifyYouTubeTabs({ action: 'authStateChanged', authenticated: false });
    }
    return { success: true, authenticated: false };
  }

  const token = await exchangeSiteToken(accessToken);
  return token
    ? { success: true, authenticated: true }
    : { success: false, error: 'Auth sync fallito' };
}

/** Verifica se l'estensione può autenticarsi (token app in storage). */
async function checkAuth() {
  const token = await getAuthToken();
  if (!token) return { authenticated: false };
  const info = await getAccountInfo();
  if (info?.success) return { authenticated: true, plan: info.plan };
  return { authenticated: false };
}

/** Apre il popup dell'estensione con un intent (es. 'translate', 'login'). */
async function openPopupWithIntent(intent) {
  await chrome.storage.local.set({ cb_popup_intent: intent });
  try {
    await chrome.action.openPopup();
    return { success: true, mode: 'popup' };
  } catch (e) {
    // openPopup non disponibile (es. Chrome < 127): apre il popup in una scheda
    await chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    return { success: true, mode: 'tab' };
  }
}

/** Notifica tutti i tab YouTube aperti (per aggiornare il bottone). */
function notifyYouTubeTabs(msg) {
  chrome.tabs.query({ url: '*://www.youtube.com/*' }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
    }
  });
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
// Streaming sottotitoli tradotti progressivamente (spec §4):
// il content script apre un port, il background streama da /api/ai/stream
// e invia i segmenti man mano che il modello li produce.
chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((msg) => {
    if (msg?.action === 'streamRestructure') {
      streamRestructureCaptions(port, msg.captions, msg.targetLanguage, msg.videoId);
    }
  });
});

// Estrae le righe complete "[N] ... --> ...: testo" man mano che arrivano
function emitProgressLines(rawOutput, captions, lastProcessed) {
  const lines = rawOutput.split('\n');
  const complete = rawOutput.endsWith('\n') ? lines.length : lines.length - 1;
  const updates = [];
  for (let i = lastProcessed; i < complete; i++) {
    const line = lines[i].trim();
    const match = line.match(/^\[(\d+)\]\s+(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3}):\s*(.+)/);
    if (match) {
      const idx = parseInt(match[1], 10) - 1;
      const text = match[4].trim();
      if (text && idx >= 0 && idx < captions.length) {
        updates.push({ idx, text });
      }
    }
  }
  return { complete, updates };
}

async function streamRestructureCaptions(port, captions, targetLanguage, videoId) {
  const sourceSignature = captionsSignature(captions);

  // Cache hit: invia subito il risultato completo
  const cached = await getCachedTranslation(videoId, targetLanguage, sourceSignature);
  if (cached && cached.length === captions.length) {
    port.postMessage({ type: "done", captions: cached.slice() });
    return;
  }

  try {
    const token = await getAuthToken();
    const resp = await fetch(`${getAppBaseUrl()}/api/ai/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prompt: buildRestructurePrompt(captions, targetLanguage) }),
    });
    if (!resp.ok || !resp.body) {
      let message = `HTTP ${resp.status}`;
      try {
        const text = await resp.text();
        const m = text.match(/data: (\{.*\})/);
        if (m) {
          const data = JSON.parse(m[1]);
          if (data?.error) message = data.error;
        }
      } catch (e) { /* corpo non parseabile */ }
      const err = new Error(message);
      err.status = resp.status;
      throw err;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let rawOutput = '';
    let lastProcessed = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sep;
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, sep).trim();
        buffer = buffer.slice(sep + 2);
        if (!event.startsWith('data:')) continue;
        const payload = event.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const data = JSON.parse(payload);
          if (data.error) throw new Error(data.error);
          if (typeof data.token === 'string') {
            rawOutput += data.token;
            const { complete, updates } = emitProgressLines(rawOutput, captions, lastProcessed);
            lastProcessed = complete;
            for (const u of updates) {
              port.postMessage({ type: "progress", idx: u.idx, text: u.text });
            }
          }
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }

    const result = parseRestructuredOutput(rawOutput, captions);
    if (result.length > 0) {
      await setCachedTranslation(videoId, targetLanguage, result, sourceSignature);
      port.postMessage({ type: "done", captions: result });
    } else {
      port.postMessage({ type: "fallback", captions: captions.map(c => ({ ...c, text: c.text })) });
    }
  } catch (e) {
    console.error('❌ Streaming restructuring failed:', e);
    try { port.postMessage({ type: 'error', error: e.message, status: e.status }); } catch {}
  }
}
// --- Fallback trascrizione server-side (spec §3 step 2) ---
async function fetchTranscriptFallback(videoId) {
  try {
    const resp = await fetch(`${getAppBaseUrl()}/api/transcript?videoId=${encodeURIComponent(videoId)}`);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { success: false, error: err.error || `HTTP ${resp.status}` };
    }
    const data = await resp.json();
    if (data?.success && data.captions?.length > 0) {
      return { success: true, captions: data.captions };
    }
    return { success: false, error: data.error || 'Nessuna trascrizione dal server' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
// --- End Fallback ---

// --- Bridge: fetch captions from a YouTube tab ---

// Inizializza le preferenze di default
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['language', 'model', 'fontSize', 'opacity'], (result) => {
    if (!result.language) {
      chrome.storage.sync.set({
        language: 'it',
        model: 'gemini-2.0-flash',
        fontSize: 14,
        opacity: 100,
        enabled: false
      });
    }
  });
});
