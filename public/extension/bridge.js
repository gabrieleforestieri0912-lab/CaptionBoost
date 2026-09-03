// Bridge content script - runs on the web app to relay captions from YouTube via the extension
// e per sincronizzare l'autenticazione sito -> estensione.

let pendingRequests = new Map();
let requestIdCounter = 0;

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== 'captionboost-webapp') return;

  if (data.action === 'fetchCaptions') {
    const requestId = ++requestIdCounter;
    pendingRequests.set(requestId, data);

    chrome.runtime.sendMessage(
      {
        action: 'fetchCaptionsFromTab',
        requestId,
        videoId: data.videoId,
        lang: data.lang,
        sourceLang: data.sourceLang,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          window.postMessage(
            {
              source: 'captionboost-extension',
              action: 'captionsResult',
              requestId,
              success: false,
              error: chrome.runtime.lastError.message,
            },
            '*'
          );
          return;
        }
        window.postMessage(
          {
            source: 'captionboost-extension',
            action: 'captionsResult',
            requestId,
            ...response,
          },
          '*'
        );
      }
    );
  }
});

// --- Auth sync sito -> estensione ------------------------------------------
// Il sito salva la sessione Supabase nei cookie `sb-<ref>-auth-token.N`
// (chunk in base64url, con `tokens-only` contengono solo i token). Il content
// script condivide il cookie jar della pagina, quindi possiamo leggere la
// sessione, estrarre l'access token e inviarlo al background, che lo scambia
// con un JWT dell'app (route /api/auth/sync).

let lastSentToken = null;
let lastLoggedIn = null;

function base64UrlDecode(value) {
  let b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bytes = atob(b64);
  const chars = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) chars[i] = bytes.charCodeAt(i);
  return new TextDecoder().decode(Uint8Array.from(chars));
}

function getSessionAccessToken() {
  try {
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const byKey = {};
    for (const cookie of cookies) {
      const eq = cookie.indexOf('=');
      if (eq === -1) continue;
      const name = cookie.slice(0, eq);
      const match = name.match(/^(sb-.+-auth-token)(?:\.(\d+))?$/);
      if (!match) continue;
      const key = match[1];
      const idx = parseInt(match[2] || '0', 10);
      if (!byKey[key]) byKey[key] = [];
      byKey[key][idx] = cookie.slice(eq + 1);
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
    // cookie non decodificabile (es. sessione a metà scrittura): ignora
  }
  return null;
}

function pollSiteAuth() {
  const token = getSessionAccessToken();
  const loggedIn = !!token;

  if (token !== lastSentToken) {
    lastSentToken = token;
    if (token) {
      chrome.runtime.sendMessage({ action: 'siteAuthSync', loggedIn: true, accessToken: token });
    } else if (lastLoggedIn) {
      chrome.runtime.sendMessage({ action: 'siteAuthSync', loggedIn: false });
    }
    lastLoggedIn = loggedIn;
  }
}

// Controllo ogni secondo: quando l'utente fa login/logout sul sito la sessione
// nei cookie cambia e l'estensione viene aggiornata quasi in tempo reale.
setInterval(pollSiteAuth, 1000);
pollSiteAuth();

// Notify the web app that bridge is ready
window.postMessage({ source: 'captionboost-extension', action: 'bridgeReady' }, '*');
