
let subtitlesContainer = null;
let isSubtitlesActive = false;
let host = null;
let subtitlesHost = null;
let resizeListener = null;
let fullscreenListener = null;
let playerWatchObserver = null;
let currentLanguage = "it";
let captionsData = [];
let videoElement = null;
let timeUpdateHandler = null;
let silenceTimer = null;
let subtitleVersion = 0;
let translateButton = null;
let toastTimeout = null;
let extensionPort = null;

function keepExtensionAlive() {
  try {
    extensionPort = chrome.runtime.connect({ name: 'content-script-keepalive' });
    extensionPort.onDisconnect.addListener(() => {
      extensionPort = null;
      if (chrome.runtime.lastError?.message?.includes('context invalidated')) {
        cleanupSubtitlesContainer();
      }
      setTimeout(keepExtensionAlive, 2000);
    });
  } catch {
    extensionPort = null;
    setTimeout(keepExtensionAlive, 2000);
  }
}
keepExtensionAlive();

async function safeStorageGet(defaults, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      if (chrome?.storage?.local) {
        const result = await chrome.storage.local.get(defaults);
        return result;
      }
    } catch (e) {
      if (e?.message?.includes('context invalidated')) {
        keepExtensionAlive();
        if (i < retries) {
          await new Promise(r => setTimeout(r, 400 * (i + 1)));
          continue;
        }
        cleanupSubtitlesContainer();
      }
    }
    break;
  }
  return defaults;
}

async function safeSyncGet(defaults, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      if (chrome?.storage?.sync) {
        const result = await chrome.storage.sync.get(defaults);
        return result;
      }
    } catch (e) {
      if (e?.message?.includes('context invalidated')) {
        keepExtensionAlive();
        if (i < retries) {
          await new Promise(r => setTimeout(r, 400 * (i + 1)));
          continue;
        }
        cleanupSubtitlesContainer();
      }
    }
    break;
  }
  return defaults;
}

function safeSendMessage(msg) {
  return new Promise((resolve) => {
    // Contesto estensione invalidato (reload/update, SW sospeso o pagina che
    // naviga): chrome.runtime è undefined. Trattalo come un canale chiuso e
    // lascia il fallback al chiamante, senza loggare un warning né smontare l'UI.
    if (!chrome?.runtime?.sendMessage) {
      resolve(handleDisconnectedMessage(msg));
      return;
    }
    try {
      chrome.runtime.sendMessage(msg, (resp) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message || '';
          const errLower = errMsg.toLowerCase();
          if (
            errLower.includes('context invalidated') ||
            errLower.includes('disconnected') ||
            errLower.includes('message port closed') ||
            errLower.includes('channel closed') ||
            errLower.includes('receiving end does not exist') ||
            errLower.includes('could not establish connection') ||
            errLower.includes('no receiving end')
          ) {
            // Il service worker può sospendersi mentre una risposta asincrona è in
            // volo, chiudendo il canale prima che sendResponse venga chiamata (MV3),
            // oppure la pagina sta navigando. Non è un vero errore: risolviamo
            // senza smontare l'UI né loggare un giallo; il chiamante esegue il
            // proprio fallback.
            if (errLower.includes('context invalidated')) {
              console.warn('⚠️ Extension context invalidated, reloading state');
              cleanupSubtitlesContainer();
            }
            return resolve(handleDisconnectedMessage(msg));
          }
          console.warn('⚠️ runtime.sendMessage error:', errMsg);
          return resolve(null);
        }
        resolve(resp);
      });
    } catch (e) {
      // Contesto invalidato a metà chiamata: fallback silenzioso, niente panic.
      if (e?.message?.includes('Extension context invalidated')) {
        resolve(handleDisconnectedMessage(msg));
        return;
      }
      console.warn('⚠️ safeSendMessage error:', e);
      cleanupSubtitlesContainer();
      resolve(handleDisconnectedMessage(msg));
    }
  });
}

function handleDisconnectedMessage(msg) {
  if (msg.action === 'openLoginTab') {
    window.open('https://captionboost.vercel.app/login', '_blank');
    return { success: true };
  }
  return null;
}

async function isAuthenticated() {
  try {
    const result = await safeStorageGet({ captionboost_auth_token: null });
    if (result.captionboost_auth_token) return true;
    // Nessun token in storage: chiedi al background di sincronizzarsi con la
    // sessione del sito (chrome.cookies + /api/auth/sync) prima di mostrare
    // il bottone di login.
    const resp = await safeSendMessage({ action: "checkAuth" });
    return !!resp?.authenticated;
  } catch {
    return false;
  }
}

let qaPanel = null;
let qaPanelHost = null;
let isQaActive = false;
let multiLangCaptions = {};
let currentTranslateLang = '';
let originalCaptionsData = [];
let mainTranslateLang = '';

function getLucideIconSvg(name) {
  const icons = {
    languages:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
    login:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>',
    square:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="16" height="16" x="4" y="4" rx="2"/></svg>',
    messageCircle:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    x:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    send:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    globe:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
  };
  return icons[name] || "";
}

function getPlayer() {
  return document.querySelector("#movie_player") ||
         document.querySelector(".html5-video-player");
}

function getVideoElement() {
  return document.querySelector("#movie_player video") ||
         document.querySelector(".html5-video-player video") ||
         document.querySelector("#shorts-player video") ||
         document.querySelector("video");
}

function positionOverPlayer(el) {
  const player = getPlayer();
  if (!player) return false;

  el.style.position = "absolute";
  el.style.top = "20px";
  el.style.right = "20px";
  el.style.left = "auto";
  el.style.zIndex = "2001";
  el.style.width = "auto";
  el.style.height = "auto";
  el.style.pointerEvents = "auto";

  return true;
}

function showToast(message, type = "error") {
  const existing = document.getElementById("cb-toast");
  if (existing) existing.remove();
  if (toastTimeout) clearTimeout(toastTimeout);

  const toast = document.createElement("div");
  toast.id = "cb-toast";
  const isError = type === "error";
  toast.style.cssText =
    "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2147483647;" +
    `background:${isError ? "rgba(220,38,38,0.95)" : "rgba(22,163,74,0.95)"};` +
    "color:#fff;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:500;" +
    "font-family:\"JetBrains Mono\",ui-monospace,SFMono-Regular,monospace;box-shadow:0 4px 20px rgba(0,0,0,0.5);" +
    "backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);" +
    "opacity:0;transition:opacity 0.3s ease;pointer-events:none;max-width:360px;" +
    "text-align:center;line-height:1.4;";

  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => { toast.style.opacity = "1"; });

  toastTimeout = setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
    toastTimeout = null;
  }, 3000);
}

function cleanupSubtitlesContainer() {
  stopCaptionSync();
  if (qaPanelHost && qaPanelHost.parentNode) {
    qaPanelHost.parentNode.removeChild(qaPanelHost);
  }
  qaPanelHost = null;
  isQaActive = false;
  multiLangCaptions = {};
  if (subtitlesHost && subtitlesHost.parentNode) {
    subtitlesHost.parentNode.removeChild(subtitlesHost);
  }
  subtitlesContainer = null;
  subtitlesHost = null;
}

function cleanupButton() {
  if (resizeListener) {
    window.removeEventListener("resize", resizeListener);
    resizeListener = null;
  }
  if (fullscreenListener) {
    document.removeEventListener("fullscreenchange", fullscreenListener);
    document.removeEventListener("webkitfullscreenchange", fullscreenListener);
    fullscreenListener = null;
  }
  if (playerWatchObserver) {
    playerWatchObserver.disconnect();
    playerWatchObserver = null;
  }
  if (host && host.parentNode) {
    host.parentNode.removeChild(host);
  }
  host = null;
  cleanupSubtitlesContainer();
}

function createLoginButtonElement() {
  const btn = document.createElement("button");
  btn.className = "cb-login-btn";
  btn.title = "Accedi a CaptionBoost";
  btn.innerHTML = getLucideIconSvg("login");

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Apre il popup dell'estensione (login con codice email), non la pagina
    // di accesso del sito.
    safeSendMessage({ action: "openPopupLogin" });
  };

  return btn;
}

function createTranslateButtonElement() {
  const btn = document.createElement("button");
  btn.className = "cb-translate-btn";
  btn.title = "Traduci sottotitoli con AI";

  const langCode = currentLanguage || "it";
  const langName = LANG_DISPLAY_NAMES[langCode]?.split(" ")[0] || langCode.toUpperCase();

  btn.innerHTML =
    `<span class="cb-btn-icon">${getLucideIconSvg("languages")}</span>` +
    `<span class="cb-btn-label">Traduci in ${langName}</span>`;

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (btn.classList.contains("loading")) return;
    // Il click apre il popup dell'estensione sulla schermata delle modifiche:
    // lì si sceglie la lingua e si avvia la traduzione del video.
    safeSendMessage({ action: "openPopupTranslate" });
  };

  translateButton = btn;
  return btn;
}

function updateTranslateButtonLabel(btn) {
  const langCode = currentLanguage || "it";
  const langName = LANG_DISPLAY_NAMES[langCode]?.split(" ")[0] || langCode.toUpperCase();
  btn.innerHTML =
    `<span class="cb-btn-icon">${getLucideIconSvg("languages")}</span>` +
    `<span class="cb-btn-label">Traduci in ${langName}</span>`;
}

function createQaButtonElement() {
  const btn = document.createElement("button");
  btn.title = "AI Caption Q&A";
  btn.innerHTML = getLucideIconSvg("messageCircle");

  btn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleQaPanel();
  };

  return btn;
}

function toggleQaPanel() {
  if (qaPanelHost) {
    qaPanelHost.style.display = qaPanelHost.style.display === "none" ? "flex" : "none";
    isQaActive = qaPanelHost.style.display === "flex";
    if (isQaActive) document.getElementById("qa-input")?.focus();
  } else {
    createQaPanel();
    isQaActive = true;
  }
}

function createQaPanel() {
  if (qaPanelHost) {
    qaPanelHost.style.display = "flex";
    return;
  }

  const player = getPlayer();
  if (!player) return;

  qaPanelHost = document.createElement("div");
  qaPanelHost.id = "captionboost-qa-host";
  qaPanelHost.style.cssText =
    "position:absolute;bottom:80px;right:20px;z-index:2147483647;display:flex;flex-direction:column;" +
    "width:340px;max-height:420px;background:rgba(15,15,15,0.95);backdrop-filter:blur(12px);" +
    "border:1px solid rgba(255,255,255,0.12);border-radius:16px;overflow:hidden;" +
    "box-shadow:0 8px 32px rgba(0,0,0,0.6);font-family:\"JetBrains Mono\",ui-monospace,SFMono-Regular,monospace;";

  qaPanelHost.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">' +
    '<span style="color:#fff;font-size:14px;font-weight:600;">AI Caption Q&A</span>' +
    '<button id="qa-close-btn" style="background:none;border:none;color:#999;cursor:pointer;padding:4px;display:flex;">' +
    getLucideIconSvg("x") +
    '</button></div>' +
    '<div id="qa-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;min-height:200px;">' +
    '<div style="color:#888;font-size:12px;text-align:center;padding:20px;">Fai una domanda sul contenuto del video</div>' +
    '</div>' +
    '<div style="display:flex;border-top:1px solid rgba(255,255,255,0.08);padding:8px 12px;gap:8px;">' +
    '<input id="qa-input" type="text" placeholder="Chiedi qualcosa sul video..." ' +
    'style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:8px 12px;color:#fff;font-size:13px;outline:none;">' +
    '<button id="qa-send-btn" style="background:#4C94FF;border:none;border-radius:8px;color:#fff;cursor:pointer;padding:8px 12px;display:flex;align-items:center;justify-content:center;">' +
    getLucideIconSvg("send") +
    '</button></div>';

  player.appendChild(qaPanelHost);

  document.getElementById("qa-close-btn").onclick = () => {
    qaPanelHost.style.display = "none";
    isQaActive = false;
  };

  const input = document.getElementById("qa-input");
  const sendBtn = document.getElementById("qa-send-btn");

  async function sendQuestion() {
    const question = input.value.trim();
    if (!question) return;

    const messages = document.getElementById("qa-messages");
    const emptyMsg = messages.querySelector("div:only-child");
    if (emptyMsg) emptyMsg.remove();

    const questionDiv = document.createElement("div");
    questionDiv.style.cssText = "align-self:flex-end;background:#4C94FF;color:#fff;border-radius:12px 12px 4px 12px;padding:8px 12px;font-size:13px;max-width:85%;word-wrap:break-word;";
    questionDiv.textContent = question;
    messages.appendChild(questionDiv);

    input.value = "";
    input.disabled = true;
    sendBtn.disabled = true;

    const loadingDiv = document.createElement("div");
    loadingDiv.style.cssText = "align-self:flex-start;color:#aaa;font-size:12px;padding:4px 0;";
    loadingDiv.textContent = "🤔 Analisi in corso...";
    messages.appendChild(loadingDiv);
    messages.scrollTop = messages.scrollHeight;

    try {
      const resp = await safeSendMessage({
        action: "answerQuestion",
        captions: captionsData,
        question,
        targetLanguage: currentLanguage || "it",
      });

      loadingDiv.remove();

      if (resp?.success && resp.answer) {
        const answerDiv = document.createElement("div");
        answerDiv.style.cssText = "align-self:flex-start;background:rgba(255,255,255,0.08);color:#e0e0e0;border-radius:12px 12px 12px 4px;padding:10px 14px;font-size:13px;max-width:85%;word-wrap:break-word;line-height:1.5;";
        answerDiv.textContent = resp.answer.trim();
        messages.appendChild(answerDiv);

        safeSendMessage({
          action: "saveQaEntry",
          entry: { question, answer: resp.answer.trim(), videoId: getVideoId() },
        });
      } else {
        const errDiv = document.createElement("div");
        errDiv.style.cssText = "align-self:flex-start;color:#ff6b6b;font-size:13px;padding:4px 0;";
        errDiv.textContent = resp?.error || "Impossibile ottenere una risposta.";
        if (resp?.status === 403) {
          const upgradeBtn = document.createElement("button");
          upgradeBtn.textContent = "→ Passa a Premium";
          upgradeBtn.style.cssText = "display:block;margin-top:6px;background:#4C94FF;border:none;border-radius:8px;color:#fff;cursor:pointer;padding:6px 12px;font-size:12px;font-weight:600;";
          upgradeBtn.onclick = () => { safeSendMessage({ action: "openPricingTab" }); };
          errDiv.appendChild(upgradeBtn);
        }
        messages.appendChild(errDiv);
      }
    } catch (err) {
      loadingDiv.remove();
      const errDiv = document.createElement("div");
      errDiv.style.cssText = "align-self:flex-start;color:#ff6b6b;font-size:13px;padding:4px 0;";
      errDiv.textContent = "Errore di connessione.";
      messages.appendChild(errDiv);
    }

    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
    messages.scrollTop = messages.scrollHeight;
  }

  sendBtn.onclick = sendQuestion;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendQuestion();
  });

  setTimeout(() => input.focus(), 300);
}

function createShadowStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .cb-btn-group {
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      align-items: flex-end !important;
    }

    .cb-translate-btn {
      background: rgba(0, 0, 0, 0.65) !important;
      backdrop-filter: blur(8px) !important;
      border: 1px solid rgba(255, 255, 255, 0.12) !important;
      padding: 8px 16px 8px 12px !important;
      cursor: pointer !important;
      outline: none !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      color: #fff !important;
      border-radius: 24px !important;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4) !important;
      font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      white-space: nowrap !important;
      line-height: 1 !important;
      position: relative !important;
      overflow: hidden !important;
      letter-spacing: 0.01em !important;
    }

    .cb-translate-btn:hover {
      background: rgba(0, 77, 229, 0.75) !important;
      filter: brightness(1.15) !important;
      border-color: rgba(255, 255, 255, 0.25) !important;
      box-shadow: 0 4px 20px rgba(0, 77, 229, 0.5) !important;
    }

    .cb-translate-btn.active {
      background: #4C94FF !important;
      box-shadow: 0 0 20px rgba(0, 77, 229, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15) !important;
      border-color: rgba(255, 255, 255, 0.2) !important;
    }

    .cb-translate-btn.loading {
      pointer-events: none !important;
      opacity: 0.85 !important;
    }

    .cb-btn-icon {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex-shrink: 0 !important;
    }

    .cb-btn-icon svg {
      display: block !important;
      width: 20px !important;
      height: 20px !important;
    }

    .cb-btn-label {
      display: inline-block !important;
      vertical-align: middle !important;
    }

    .cb-spinner {
      display: block !important;
      width: 18px !important;
      height: 18px !important;
      border: 2px solid rgba(255, 255, 255, 0.3) !important;
      border-top-color: #fff !important;
      border-radius: 50% !important;
      animation: cb-spin 0.7s linear infinite !important;
    }

    @keyframes cb-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .cb-qa-btn {
      background: rgba(0, 0, 0, 0.6) !important;
      backdrop-filter: blur(4px) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      padding: 0 !important;
      width: 42px !important;
      height: 42px !important;
      cursor: pointer !important;
      outline: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #fff !important;
      border-radius: 50% !important;
      transition: all 0.2s cubic-bezier(0, 0, 0.2, 1) !important;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3) !important;
      line-height: 0 !important;
    }

    .cb-qa-btn:hover {
      background: rgba(0, 77, 229, 0.8) !important;
      filter: brightness(1.15) !important;
      border-color: rgba(255, 255, 255, 0.3) !important;
      box-shadow: 0 4px 20px rgba(0, 77, 229, 0.5) !important;
    }

    .cb-qa-btn svg {
      display: block !important;
      width: 22px !important;
      height: 22px !important;
      flex-shrink: 0 !important;
    }

    .cb-login-btn {
      background: #4C94FF !important;
      border: none !important;
      padding: 0 !important;
      width: 42px !important;
      height: 42px !important;
      cursor: pointer !important;
      outline: none !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      color: #fff !important;
      border-radius: 50% !important;
      transition: all 0.2s cubic-bezier(0, 0, 0.2, 1) !important;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3) !important;
      line-height: 0 !important;
    }

    .cb-login-btn:hover {
      background: #3A7BE0 !important;
      filter: brightness(1.15) !important;
      box-shadow: 0 4px 20px rgba(0, 77, 229, 0.5) !important;
    }

    .cb-login-btn svg {
      display: block !important;
      width: 22px !important;
      height: 22px !important;
      flex-shrink: 0 !important;
    }
  `;
  return style;
}

async function injectSubtitlesButton() {
  try {
    if (!window.location.pathname.includes("/watch") && !window.location.pathname.startsWith("/shorts/")) return;

    cleanupButton();

    const player = getPlayer();
    if (!player) { waitForPlayerAndInject(); return; }

    host = document.createElement("div");
    host.id = "captionboost-host";
    host.style.cssText = "position:absolute;z-index:2001;pointer-events:auto";

    const shadow = host.attachShadow({ mode: "open" });
    shadow.appendChild(createShadowStyles());

    const isAuth = await isAuthenticated();

    if (isAuth) {
      // Il bottone "Traduci in X" è dinamico: riflette la lingua selezionata
      // nel popup (translateTo). Leggila dalla sync prima di creare il bottone,
      // altrimenti partirebbe sempre da "it" finché non parte la traduzione.
      const stored = await safeSyncGet({ translateTo: "it" });
      if (stored.translateTo) currentLanguage = stored.translateTo;

      const group = document.createElement("div");
      group.className = "cb-btn-group";

      const transBtn = createTranslateButtonElement();
      group.appendChild(transBtn);

      // Q&A è Premium: mostriamo il pulsante solo agli abbonati attivi.
      // La verifica definitiva resta server-side su /api/qa (spec §7).
      const account = await safeSendMessage({ action: "getAccountInfo" });
      const plan = account?.plan;
      const isPremium = plan?.subscriptionStatus === "active" && plan?.plan && plan?.plan !== "free";
      if (isPremium) {
        const qaBtn = createQaButtonElement();
        qaBtn.className = "cb-qa-btn";
        group.appendChild(qaBtn);
      }

      shadow.appendChild(group);
    } else {
      const btn = createLoginButtonElement();
      shadow.appendChild(btn);
    }

    const positioned = positionOverPlayer(host);
    if (!positioned) { host = null; waitForPlayerAndInject(); return; }

    player.style.position = "relative";
    player.appendChild(host);

    resizeListener = () => {
      if (document.getElementById("captionboost-host")) positionOverPlayer(host);
    };
    window.addEventListener("resize", resizeListener);

    fullscreenListener = () => {
      if (document.getElementById("captionboost-host")) positionOverPlayer(host);
    };
    document.addEventListener("fullscreenchange", fullscreenListener);
    document.addEventListener("webkitfullscreenchange", fullscreenListener);

  } catch (error) {
    console.error("injectSubtitlesButton error:", error.name, error.message);
  }
}

function waitForPlayerAndInject() {
  if (!window.location.pathname.includes("/watch") && !window.location.pathname.startsWith("/shorts/")) return;
  if (playerWatchObserver) playerWatchObserver.disconnect();

  if (getPlayer()) { injectSubtitlesButton(); return; }

  playerWatchObserver = new MutationObserver(() => {
    if (getPlayer()) { playerWatchObserver.disconnect(); playerWatchObserver = null; injectSubtitlesButton(); }
  });
  playerWatchObserver.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    if (playerWatchObserver) {
      playerWatchObserver.disconnect();
      playerWatchObserver = null;
      if (!getPlayer() && (window.location.pathname.includes("/watch") || window.location.pathname.startsWith("/shorts/"))) {
        injectSubtitlesButton();
      }
    }
  }, 8000);
}

// --- CAPTION FETCHING ---

function getVideoId() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("v");
  if (fromQuery) return fromQuery;

  const shortsMatch = window.location.pathname.match(/^\/shorts\/([\w-]{11})/);
  if (shortsMatch) return shortsMatch[1];

  return "";
}

function parseJsonFromScript(text, startIdx) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === '\\') { escape = true; }
      else if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.substring(startIdx, i + 1);
    }
  }
  return null;
}

function getPlayerResponse() {
  try {
    if (window.ytInitialPlayerResponse) return window.ytInitialPlayerResponse;

    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const t = script.textContent || "";

      if (script.id === "player-response" || script.id === "player") {
        try { return JSON.parse(t); } catch (e) { console.error("Failed to parse player-response script", e); }
      }

      const idx = t.indexOf("ytInitialPlayerResponse");
      if (idx !== -1) {
        const start = t.indexOf("{", idx);
        if (start !== -1) {
          const json = parseJsonFromScript(t, start);
          if (json) {
            try { return JSON.parse(json); } catch (e) { console.error("Failed to parse ytInitialPlayerResponse JSON", e); continue; }
          }
        }
      }
    }

    if (window.ytplayer?.config?.args?.player_response) {
      try { return JSON.parse(window.ytplayer.config.args.player_response); } catch (e) { console.error("Failed to parse ytplayer config", e); }
    }
  } catch (e) {
    console.error("Failed to parse player response", e);
  }
  return null;
}

function getCaptionTracks() {
  const resp = getPlayerResponse();
  if (!resp) return [];
  try {
    const tracks = resp.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (tracks && tracks.length > 0) return tracks;
  } catch (e) {
    console.error("Failed to get caption tracks", e);
  }
  return [];
}

async function fetchAndParseCaptions(trackUrl) {
  try {
    const url = trackUrl + "&fmt=srv1";
    const resp = await fetch(url);
    const xml = await resp.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "text/xml");
    const texts = doc.querySelectorAll("text");

    const captions = [];
    texts.forEach((el) => {
      const start = parseFloat(el.getAttribute("start"));
      let dur = parseFloat(el.getAttribute("dur"));
      if (!dur || dur <= 0) {
        dur = 3;
      }
      captions.push({
        start,
        end: start + dur,
        text: el.textContent.replace(/\s+/g, " ").trim(),
      });
    });

    return captions;
  } catch (e) {
    console.error("Failed to fetch captions", e);
    return [];
  }
}

function tryDirectTimedtextUrl(videoId, lang) {
  return `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv1`;
}

async function fetchDirectCaptions(videoId) {
  const langs = [currentLanguage, "en", "it", "es", "fr", "de", "pt", "ja"];
  for (const lang of langs) {
    try {
      const url = tryDirectTimedtextUrl(videoId, lang);
      const resp = await fetch(url);
      if (!resp.ok) continue;
      const xml = await resp.text();
      if (!xml || xml.includes("<head") || xml.trim().length < 20) continue;

      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, "text/xml");
      const texts = doc.querySelectorAll("text");
      if (texts.length === 0) continue;

      const captions = [];
      texts.forEach((el) => {
        const start = parseFloat(el.getAttribute("start"));
        let dur = parseFloat(el.getAttribute("dur"));
        if (!dur || dur <= 0) {
          dur = 3;
        }
        captions.push({
          start,
          end: start + dur,
          text: el.textContent.replace(/\s+/g, " ").trim(),
        });
      });

      if (captions.length > 0) {
        return captions;
      }
    } catch (e) {
      console.warn(`Direct caption fetch failed for ${lang}:`, e);
      continue;
    }
  }
  return [];
}

async function findBestCaptionTrack(tracks) {
  if (tracks.length === 0) return null;

  const userLang = currentLanguage;
  const audioLang = tracks.find(
    (t) => t.languageCode === userLang && t.kind === "asr"
  ) || tracks.find((t) => t.languageCode === userLang);

  if (audioLang) return audioLang;

  const enTrack = tracks.find(
    (t) => t.languageCode === "en" && t.kind === "asr"
  ) || tracks.find((t) => t.languageCode === "en");

  if (enTrack) return enTrack;

  const asrTrack = tracks.find((t) => t.kind === "asr");
  if (asrTrack) return asrTrack;

  return tracks[0];
}

function getSourceLanguageCode(tracks, track) {
  if (!track) return "en";
  return track.languageCode || "en";
}

// --- CAPTION SYNC (YouTube ASR) ---

function stopCaptionSync() {
  if (timeUpdateHandler && videoElement) {
    videoElement.removeEventListener("timeupdate", timeUpdateHandler);
  }
  timeUpdateHandler = null;
  videoElement = null;
  captionsData = [];
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
}

async function startSubtitles(forceLang) {
  setupSubtitlesHost();

  const settings = await safeSyncGet({ translateTo: "it", translationNotes: false });
  currentLanguage = forceLang || settings.translateTo || "it";
  showTranslationNotes = Boolean(settings.translationNotes);
  currentTranslateLang = forceLang || settings.translateTo || "";

  const videoId = getVideoId();
  if (!videoId) {
    console.error("❌ startSubtitles: nessun video ID trovato");
    throw new Error("Nessun video trovato in questa pagina");
  }

  showProcessingMessage("Trascrizione in corso");

  const fetchResult = await fetchAllCaptions(videoId);
  if (fetchResult.captions.length === 0) {
    console.error("❌ startSubtitles: nessun sottotitolo disponibile per questo video");
    throw new Error("Nessun sottotitolo disponibile per questo video");
  }
  captionsData = optimizeSubtitleTiming(fetchResult.captions);

  showProcessingMessage("Generazione sottotitoli AI");

  // Conserva la sorgente originale (copia: lo streaming muta captionsData in-place)
  originalCaptionsData = captionsData.map(c => ({ ...c }));
  mainTranslateLang = currentLanguage || "it";
  multiLangCaptions = {};

  const restructured = await restructureCaptionsStreaming(captionsData, currentLanguage || "it", videoId);

  if (restructured && restructured.captions && restructured.captions.length > 0) {
    captionsData = restructured.captions;
    multiLangCaptions[mainTranslateLang] = restructured.captions;
  } else {
    console.warn("⚠️ AI non disponibile: inietto i sottotitoli originali del video");
    showSubtitleText("⚙️ Sottotitoli originali (AI non disponibile)", true);
    // Es. non autenticato (401) o limite free raggiunto (429): mostra il
    // messaggio del server e, se serve il login, apri la pagina di accesso.
    if (restructured?.error) {
      showToast(restructured.error);
      if (restructured.status === 401) {
        chrome.runtime.sendMessage({ action: "openPopupLogin" });
      }
    }
  }

  // Traduzione on-demand (spec §4): il selettore offre tutte le lingue,
  // ogni lingua viene tradotta solo quando viene selezionata (e cachata).
  populateLangSwitcher(Object.keys(LANG_DISPLAY_NAMES));

  videoElement = getVideoElement();
  if (!videoElement) {
    console.error("❌ startSubtitles: elemento video non trovato nel player");
    throw new Error("Player video non trovato");
  }
  if (timeUpdateHandler) videoElement.removeEventListener("timeupdate", timeUpdateHandler);

  let lastCaptionIndex = -1;
  timeUpdateHandler = () => {
    if (!isSubtitlesActive || captionsData.length === 0 || !videoElement) return;

    const currentTime = videoElement.currentTime;
    let found = null;
    let foundIdx = -1;

    let low = 0;
    let high = captionsData.length - 1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      const c = captionsData[mid];
      if (currentTime >= c.start && currentTime < c.end) {
        found = c;
        foundIdx = mid;
        break;
      }
      if (currentTime < c.start) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    if (!found && low > 0) {
      const prev = captionsData[low - 1];
      if (currentTime >= prev.start && currentTime < prev.end) {
        found = prev;
        foundIdx = low - 1;
      }
    }

    if (found && foundIdx !== lastCaptionIndex) {
      lastCaptionIndex = foundIdx;
      showSubtitleText(found.text);
    } else if (!found) {
      lastCaptionIndex = -1;
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        hideSubtitleContainer();
      }, 500);
    }
  };

  videoElement.addEventListener("timeupdate", timeUpdateHandler);
}

const LANG_DISPLAY_NAMES = {
  it: "Italiano 🇮🇹", en: "English 🇺🇸", es: "Español 🇪🇸", fr: "Français 🇫🇷",
  de: "Deutsch 🇩🇪", pt: "Português 🇵🇹", ru: "Русский 🇷🇺", ja: "日本語 🇯🇵",
  zh: "中文 🇨🇳", ko: "한국어 🇰🇷", ar: "العربية 🇸🇦", hi: "हिन्दी 🇮🇳",
  nl: "Nederlands 🇳🇱", pl: "Polski 🇵🇱", tr: "Türkçe 🇹🇷", th: "ไทย 🇹🇭",
  vi: "Tiếng Việt 🇻🇳", id: "Bahasa Indonesia 🇮🇩", sv: "Svenska 🇸🇪", da: "Dansk 🇩🇰",
};

function populateLangSwitcher(langCodes) {
  const select = document.getElementById("cb-lang-select");
  const switcher = document.getElementById("captionboost-lang-switcher");
  if (!select || !switcher) return;

  select.innerHTML = '<option value="">Lingua originale</option>';
  for (const code of langCodes) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = LANG_DISPLAY_NAMES[code] || code;
    select.appendChild(option);
  }

  if (langCodes.length > 0) {
    switcher.style.display = "flex";
  }
}

// Traduzione on-demand per lingua selezionata (spec §4)
async function applyTranslationForLang(lang, videoId) {
  if (!lang) {
    captionsData = originalCaptionsData;
    return;
  }
  if (lang === mainTranslateLang) {
    captionsData = multiLangCaptions[mainTranslateLang] || originalCaptionsData;
    return;
  }
  if (multiLangCaptions[lang]) {
    captionsData = multiLangCaptions[lang];
    return;
  }
  try {
    const resp = await safeSendMessage({
      action: "restructureCaptions",
      captions: originalCaptionsData,
      targetLanguage: lang,
      videoId,
    });
    if (resp?.success && resp.captions?.length > 0) {
      multiLangCaptions[lang] = resp.captions;
      captionsData = resp.captions;
    } else {
      showToast(resp?.error || "Traduzione non disponibile per questa lingua");
      if (resp?.status === 401) {
        chrome.runtime.sendMessage({ action: "openPopupLogin" });
      }
    }
  } catch (e) {
    console.warn("⚠️ Traduzione on-demand fallita:", e);
  }
}

// Traduzione con streaming progressivo (spec §4): apre un port verso il background
// che streama i sottotitoli da /api/ai/stream; i segmenti vengono aggiornati man
// mano che il modello li produce. Fallback al percorso non-streaming se il port
// o lo stream falliscono.
function restructureCaptionsStreaming(captions, targetLanguage, videoId) {
  return new Promise((resolve) => {
    let port = null;
    let finished = false;
    let fallbackStarted = false;

    const completeWith = (result) => {
      if (finished) return;
      finished = true;
      try { if (port) port.disconnect(); } catch (e) { /* noop */ }
      resolve(result);
    };

    const fallbackThenComplete = async () => {
      if (finished || fallbackStarted) return;
      fallbackStarted = true;
      completeWith(await fallbackRestructure(captions, targetLanguage, videoId));
    };

    try {
      port = chrome.runtime.connect({ name: "cb-stream-restructure" });
    } catch (e) {
      fallbackThenComplete();
      return;
    }

    port.onMessage.addListener((msg) => {
      if (!msg || finished) return;
      if (msg.type === "progress" && typeof msg.idx === "number" && msg.text) {
        // Aggiorna il segmento in tempo reale: il prossimo timeupdate lo mostrerà
        if (captions[msg.idx]) {
          captions[msg.idx] = { ...captions[msg.idx], text: msg.text };
        }
      } else if (msg.type === "done" && Array.isArray(msg.captions)) {
        completeWith({ captions: msg.captions, error: null });
      } else if (msg.type === "fallback" && Array.isArray(msg.captions)) {
        completeWith({ captions: msg.captions, error: null });
      } else if (msg.type === "error") {
        fallbackThenComplete();
      }
    });

    port.onDisconnect.addListener(fallbackThenComplete);

    port.postMessage({ action: "streamRestructure", captions, targetLanguage, videoId });
  });
}

// Percorso classico (non-streaming): usato come fallback quando lo streaming fallisce
async function fallbackRestructure(captions, targetLanguage, videoId) {
  try {
    const resp = await safeSendMessage({
      action: "restructureCaptions",
      captions,
      targetLanguage,
      videoId,
    });
    if (resp?.success && resp.captions?.length > 0) {
      return { captions: resp.captions, error: null, status: 0 };
    }
    if (resp?.error) {
      return { captions: null, error: resp.error, status: resp.status || 0 };
    }
  } catch (e) {
    console.warn("⚠️ Fallback restructure fallito:", e);
    return { captions: null, error: e?.message || "Errore di traduzione", status: e?.status || 0 };
  }
  return { captions: null, error: null, status: 0 };
}

let showTranslationNotes = false;
let processingStyleInjected = false;

function ensureProcessingStyles() {
  if (processingStyleInjected) return;
  processingStyleInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .cb-processing {
      display: inline-flex !important;
      align-items: center !important;
      gap: 10px !important;
      animation: cb-processing-pulse 1.6s ease-in-out infinite !important;
    }
    .cb-processing-spinner {
      width: 18px !important;
      height: 18px !important;
      border: 2px solid rgba(255, 255, 255, 0.25) !important;
      border-top-color: #4C94FF !important;
      border-radius: 50% !important;
      flex-shrink: 0 !important;
      animation: cb-processing-spin 0.8s linear infinite !important;
    }
    .cb-processing-text { color: #fff !important; font-size: 14px !important; font-weight: 500 !important; }
    .cb-processing-dots { display: inline-block !important; min-width: 1.2em !important; text-align: left !important; }
    @keyframes cb-processing-spin { to { transform: rotate(360deg); } }
    @keyframes cb-processing-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
  `;
  document.head.appendChild(style);
}

// Messaggio di elaborazione animato nello spazio dei futuri sottotitoli
// (spinner + testo pulsante + puntini progressivi)
function showProcessingMessage(text) {
  if (!isSubtitlesActive || !subtitlesHost || !subtitlesContainer) return;
  subtitleVersion++;
  const version = subtitleVersion;
  ensureProcessingStyles();

  subtitlesContainer.innerHTML =
    '<div class="cb-processing">' +
    '<span class="cb-processing-spinner"></span>' +
    `<span class="cb-processing-text">${text}<span class="cb-processing-dots"></span></span>` +
    '</div>';

  subtitlesHost.style.setProperty("display", "flex", "important");
  requestAnimationFrame(() => {
    if (!subtitlesHost) return;
    if (version === subtitleVersion) {
      subtitlesHost.style.setProperty("opacity", "1", "important");
    }
  });

  // Puntini progressivi animati via JS (affidabile su tutti i browser)
  let dots = 0;
  const iv = setInterval(() => {
    const dotHost = document.querySelector(".cb-processing-dots");
    if (version !== subtitleVersion || !dotHost || !dotHost.isConnected) {
      clearInterval(iv);
      return;
    }
    dots = (dots + 1) % 4;
    dotHost.textContent = ".".repeat(dots);
  }, 350);
}

async function shouldShowSubtitles() {
  const settings = await safeSyncGet({ showCaptions: true, showOriginalCaptions: true });
  const showCaptions = settings.showCaptions !== false;
  const showOriginalCaptions = settings.showOriginalCaptions !== false;
  return { showCaptions, showOriginalCaptions };
}

function showSubtitleText(text, persistent = false) {
  if (!text || !isSubtitlesActive || !subtitlesHost || !subtitlesContainer) return;

  subtitleVersion++;
  const version = subtitleVersion;

  const isOriginal = !currentTranslateLang;

  shouldShowSubtitles().then(async ({ showCaptions, showOriginalCaptions }) => {
    if (version !== subtitleVersion) return;
    if (!showCaptions || (isOriginal && !showOriginalCaptions)) {
      hideSubtitleContainer();
      return;
    }

    if (showTranslationNotes && currentTranslateLang) {
      const note = document.createElement("div");
      note.style.cssText = "font-size:10px;opacity:0.6;margin-top:2px;text-align:center;color:#aaa;";
      note.textContent = "🤖 Tradotto con AI";
      subtitlesContainer.innerHTML = '';
      subtitlesContainer.appendChild(document.createTextNode(text));
      subtitlesContainer.appendChild(note);
    } else {
      subtitlesContainer.textContent = text;
    }

    const settings = await getCaptionSettings();
    const opacity = Math.min(1, Math.max(0, (Number(settings.opacity) || 100) / 100));

    subtitlesHost.style.setProperty("display", "flex", "important");
    requestAnimationFrame(() => {
      if (!subtitlesHost || !subtitlesContainer) return;
      if (version === subtitleVersion) {
        subtitlesHost.style.setProperty("opacity", String(opacity), "important");
      }
    });

    if (silenceTimer) clearTimeout(silenceTimer);
    if (!persistent) {
      silenceTimer = setTimeout(() => {
        if (version === subtitleVersion) {
          hideSubtitleContainer();
        }
      }, 3000);
    }
  });
}

function hideSubtitleContainer() {
  if (!subtitlesHost) return;
  subtitlesHost.style.setProperty("opacity", "0", "important");
  setTimeout(() => {
    if (!subtitlesHost) return;
    subtitlesHost.style.setProperty("display", "none", "important");
  }, 250);
}

/**
 * Ottimizza i sottotitoli grezzi per la leggibilità (spec §3 step 3).
 * Funzione pura e testabile, senza dipendenze da chrome/DOM:
 * - pulisce il testo (spazi multipli) e scarta i segmenti vuoti/invalidi
 * - unisce i segmenti troppo corti a quello successivo
 * - garantisce un tempo minimo di permanenza a schermo, senza sforare
 *   l'inizio del segmento successivo
 */
function optimizeSubtitleTiming(captions, opts = {}) {
  const minDuration = opts.minDuration ?? 1.2;        // permanenza minima a schermo (s)
  const minMergeThreshold = opts.minMergeThreshold ?? 0.7; // sotto questa durata, fondi col successivo
  if (!Array.isArray(captions) || captions.length === 0) return [];

  const cleaned = captions
    .map(c => ({
      start: Number(c.start) || 0,
      end: Number(c.end) || (Number(c.start) || 0) + 3,
      text: (c.text || '').replace(/\s+/g, ' ').trim(),
    }))
    .filter(c => c.text && c.end > c.start);

  const result = [];
  let pending = null;

  for (let i = 0; i < cleaned.length; i++) {
    const seg = { ...cleaned[i] };

    if (pending) {
      // Accorpa il segmento corto precedente in questo
      seg.start = pending.start;
      seg.text = pending.text + ' ' + seg.text;
      pending = null;
    }

    const next = cleaned[i + 1];
    if (!next) {
      // Ultimo segmento: assicura solo la durata minima
      if (seg.end - seg.start < minDuration) seg.end = seg.start + minDuration;
      result.push(seg);
      continue;
    }

    if (seg.end - seg.start < minMergeThreshold) {
      // Troppo corto: accorpalo al successivo
      pending = seg;
      continue;
    }

    if (seg.end - seg.start < minDuration) {
      // Estendi alla durata minima, senza sforare l'inizio del successivo
      seg.end = Math.min(seg.start + minDuration, next.start);
      if (seg.end <= seg.start) seg.end = seg.start + 0.1;
    }

    result.push(seg);
  }

  if (pending && result.length > 0) {
    const last = result[result.length - 1];
    last.text = last.text + ' ' + pending.text;
    last.start = Math.min(last.start, pending.start);
  }

  return result;
}

async function fetchAllCaptions(videoId) {
  const settings = await safeSyncGet({ youtubeApiKey: "" });
  const apiKey = settings.youtubeApiKey || "";
  let sourceLanguage = "en";

  if (apiKey) {
    const tracks = await fetchTracksViaAPI(videoId, apiKey);
    if (tracks.length > 0) {
      const track = pickBestTrack(tracks);
      sourceLanguage = track?.languageCode || "en";
      if (track?.baseUrl) {
        const caps = await fetchAndParseCaptions(track.baseUrl);
        if (caps.length > 0) return { captions: caps, sourceLanguage };
      }
    }
  }

  let tracks = getCaptionTracks();
  if (tracks.length > 0) {
    const track = await findBestCaptionTrack(tracks);
    if (track) {
      sourceLanguage = track.languageCode || "en";
      const caps = await fetchAndParseCaptions(track.baseUrl);
      if (caps.length > 0) return { captions: caps, sourceLanguage };
    }
  }

  const directCaptions = await fetchDirectCaptions(videoId);
  if (directCaptions.length > 0) return { captions: directCaptions, sourceLanguage };

  // Fallback finale (spec §3 step 2): il server prova a recuperare la
  // trascrizione quando YouTube non fornisce captions al client.
  try {
    const resp = await safeSendMessage({ action: 'fetchTranscriptFallback', videoId });
    if (resp?.success && resp.captions?.length > 0) {
      return { captions: resp.captions, sourceLanguage };
    }
    console.warn('⚠️ Transcript fallback server non disponibile:', resp?.error);
  } catch (e) {
    console.warn('⚠️ Transcript fallback fallito:', e);
  }

  return { captions: [], sourceLanguage };
}

async function fetchTracksViaAPI(videoId, apiKey) {
  try {
    const resp = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    if (!data.items || data.items.length === 0) return [];

    const userLang = currentLanguage;
    const sorted = data.items.sort((a, b) => {
      const aScore = a.snippet.language === userLang ? 2 : a.snippet.language === "en" ? 1 : 0;
      const bScore = b.snippet.language === userLang ? 2 : b.snippet.language === "en" ? 1 : 0;
      return bScore - aScore;
    });

    const best = sorted[0];
    const lang = best.snippet.language;

    const baseUrl = `https://www.googleapis.com/youtube/v3/captions/${best.id}?key=${apiKey}`;

    const downloadResp = await fetch(baseUrl);
    if (downloadResp.ok) {
      const xml = await downloadResp.text();
      return [{
        id: best.id,
        languageCode: lang,
        kind: best.snippet.trackKind === "ASR" ? "asr" : "standard",
        baseUrl,
        _xml: xml,
      }];
    }

    return [{
      id: best.id,
      languageCode: lang,
      kind: best.snippet.trackKind === "ASR" ? "asr" : "standard",
      baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=srv1`,
    }];
  } catch (e) {
    console.error("API fetch failed:", e);
    return [];
  }
}

function pickBestTrack(tracks) {
  if (tracks.length === 0) return null;
  return tracks[0];
}

function setupSubtitlesHost() {
  if (subtitlesHost) return;

  const player = getPlayer();
  if (!player) {
    console.error("❌ setupSubtitlesHost: player YouTube non trovato");
    return;
  }

  player.style.position = "relative";

  subtitlesHost = document.createElement("div");
  subtitlesHost.id = "captionboost-subtitles-host";

  subtitlesContainer = document.createElement("div");
  subtitlesContainer.id = "captionboost-subtitles-container";

  const langSwitcher = document.createElement("div");
  langSwitcher.id = "captionboost-lang-switcher";
  langSwitcher.style.cssText =
    "position:absolute;top:-36px;left:50%;transform:translateX(-50%);z-index:10;" +
    "display:none;gap:4px;";

  const langSelect = document.createElement("select");
  langSelect.id = "cb-lang-select";
  langSelect.style.cssText =
    "background:rgba(0,0,0,0.7);color:#fff;border:1px solid rgba(255,255,255,0.15);" +
    "border-radius:8px;padding:4px 8px;font-size:12px;cursor:pointer;outline:none;" +
    "font-family:\"JetBrains Mono\",ui-monospace,SFMono-Regular,monospace;";
  langSelect.innerHTML = '<option value="">Lingua originale</option>';

  langSelect.addEventListener("change", async (e) => {
    const lang = e.target.value;
    currentTranslateLang = lang;
    await applyTranslationForLang(lang, getVideoId());
    positionSubtitlesOverPlayer();
  });

  langSwitcher.appendChild(langSelect);
  subtitlesHost.appendChild(langSwitcher);
  subtitlesHost.appendChild(subtitlesContainer);
  player.appendChild(subtitlesHost);

  positionSubtitlesOverPlayer();
}

async function getCaptionSettings() {
  const defaults = {
    fontSize: 22,
    opacity: 100,
    showCaptions: true,
    showOriginalCaptions: true,
    captionPosition: 'bottom',
    captionBackground: 'rgba(0,0,0,0.85)',
    captionRadius: '12px',
    captionPadding: '10px 22px',
    captionHorizontalMargin: '10%',
    originalColor: '#ffffff',
    originalSize: '1.0',
    originalWeight: '500',
    translatedColor: '#7dd3fc',
    translatedSize: '1.0',
    translatedWeight: '500',
  };
  try {
    const result = await safeSyncGet(defaults);
    return { ...defaults, ...result };
  } catch {
    return defaults;
  }
}

async function positionSubtitlesOverPlayer() {
  if (!subtitlesHost || !subtitlesContainer) return;

  const settings = await getCaptionSettings();
  const position = settings.captionPosition === 'top' ? '20px' : '70px';
  const opacity = Math.min(1, Math.max(0, (Number(settings.opacity) || 100) / 100));

  const isTranslated = Boolean(currentTranslateLang && multiLangCaptions[currentTranslateLang]);
  const color = isTranslated ? settings.translatedColor : settings.originalColor;
  const size = (isTranslated ? settings.translatedSize : settings.originalSize) || '1.0';
  const weight = (isTranslated ? settings.translatedWeight : settings.originalWeight) || '500';
  const fontSize = Math.round(Number(settings.fontSize || 22) * Number(size) * 10) / 10;

  subtitlesHost.setAttribute("style",
    `position: absolute !important;` +
    `${position === '20px' ? 'top' : 'bottom'}: ${position} !important;` +
    "left: 0 !important;" +
    "right: 0 !important;" +
    "display: flex !important;" +
    "justify-content: center !important;" +
    "align-items: center !important;" +
    "pointer-events: none !important;" +
    "z-index: 2147483647 !important;" +
    "margin: 0 !important;" +
    "padding: 0 !important;" +
    "border: none !important;" +
    "overflow: visible !important;" +
    "transition: opacity 0.2s ease !important;"
  );

  subtitlesContainer.setAttribute("style",
    "display: inline-flex !important;" +
    "justify-content: center !important;" +
    "align-items: center !important;" +
    `padding: ${settings.captionPadding} !important;` +
    `background: ${settings.captionBackground} !important;` +
    `color: ${color} !important;` +
    `border-radius: ${settings.captionRadius} !important;` +
    "font-family: \"JetBrains Mono\", ui-monospace, SFMono-Regular, monospace !important;" +
    `font-size: ${fontSize}px !important;` +
    `font-weight: ${weight} !important;` +
    "text-align: center !important;" +
    "border: 1px solid rgba(0, 77, 229, 0.35) !important;" +
    "border-left: 3px solid #4C94FF !important;" +
    "box-shadow: 0 2px 12px rgba(0, 0, 0, 0.7), 0 0 12px rgba(0, 77, 229, 0.15) !important;" +
    "text-shadow: 0 1px 3px rgba(0,0,0,0.5) !important;" +
    `max-width: ${100 - parseFloat(settings.captionHorizontalMargin || '0') * 2}% !important;` +
    "backdrop-filter: blur(4px) !important;" +
    "line-height: 1.5 !important;"
  );
}

function stopSubtitles() {
  isSubtitlesActive = false;
  subtitleVersion++;
  stopCaptionSync();
  hideSubtitleContainer();
  if (silenceTimer) {
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
}

// --- MESSAGE LISTENER (popup & bridge) ---

async function fetchCaptionsForBridge(videoId, lang, sourceLang) {
  const videoElement = getVideoElement();
  const currentTime = videoElement?.currentTime || 0;

  const fetchResult = await fetchAllCaptions(videoId);
  if (fetchResult.captions.length === 0) {
    return { success: false, error: 'Nessun sottotitolo disponibile per questo video' };
  }

  let captions = optimizeSubtitleTiming(fetchResult.captions);
  const sourceLanguage = fetchResult.sourceLanguage || 'en';

  if (lang && lang !== sourceLanguage) {
    try {
      const resp = await safeSendMessage({
        action: 'restructureCaptions',
        captions,
        targetLanguage: lang,
        videoId,
      });
      if (resp?.success && resp.captions?.length > 0) {
        captions = resp.captions;
      }
    } catch (e) {
      console.warn('Translation failed for bridge:', e);
    }
  }

  return { success: true, captions, sourceLanguage };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "authStateChanged") {
    // Login/logout sincronizzato dal sito: rigenera il bottone nel player
    injectSubtitlesButton();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === "startTranslateVideo") {
    const lang = request.lang || "it";
    chrome.storage.sync.set({ translateTo: lang, enabled: true });
    isSubtitlesActive = true;
    startSubtitles(lang)
      .then(() => {
        if (translateButton) {
          translateButton.classList.remove("loading");
          translateButton.classList.add("active");
          translateButton.innerHTML =
            `<span class="cb-btn-icon">${getLucideIconSvg("languages")}</span>` +
            `<span class="cb-btn-label">Sottotitoli attivi</span>`;
        }
        sendResponse({ success: true });
      })
      .catch((error) => {
        isSubtitlesActive = false;
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.action === 'getCaptionsForVideo') {
    fetchCaptionsForBridge(request.videoId, request.lang, request.sourceLang)
      .then(result => sendResponse(result))
      .catch(e => sendResponse({ success: false, error: e.message }));
    return true;
  }

  if (request.action === "enable") {
    isSubtitlesActive = true;
    startSubtitles()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  if (request.action === "disable") {
    stopSubtitles();
    sendResponse({ success: true });
    return true;
  }
});

// --- NAVIGATION ---

function onNavigateFinish() {
  stopSubtitles();
  setTimeout(injectSubtitlesButton, 500);
}

window.addEventListener("yt-navigate-start", () => {
  stopSubtitles();
  cleanupButton();
});
window.addEventListener("yt-navigate-finish", onNavigateFinish);

if (document.readyState === "complete") {
  injectSubtitlesButton();
} else {
  window.addEventListener("load", injectSubtitlesButton);
}

const observer = new MutationObserver(() => {
  if ((window.location.pathname.includes("/watch") || window.location.pathname.startsWith("/shorts/")) && !document.getElementById("captionboost-host")) {
    waitForPlayerAndInject();
  }
});
observer.observe(document.body, { childList: true, subtree: true });

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync") {
      if (changes.captionboost_auth_token) {
        injectSubtitlesButton();
      }
      if (changes.translationNotes) {
        showTranslationNotes = Boolean(changes.translationNotes.newValue);
      }
      if (changes.translateTo) {
        currentLanguage = changes.translateTo.newValue || "";
        if (translateButton && !isSubtitlesActive) {
          updateTranslateButtonLabel(translateButton);
        }
      }
      const appearanceKeys = [
        "fontSize", "opacity", "showCaptions", "showOriginalCaptions", "translationNotes",
        "captionPosition", "originalColor", "originalSize", "originalWeight",
        "translatedColor", "translatedSize", "translatedWeight",
        "captionBackground", "captionRadius", "captionPadding", "captionHorizontalMargin",
      ];
      if (appearanceKeys.some((k) => changes[k])) {
        positionSubtitlesOverPlayer();
      }
    }
    if (area === "local") {
      if (changes.captionboost_auth_token) {
        injectSubtitlesButton();
      }
    }
  });
} catch (e) {
  console.warn("storage.onChanged not available:", e);
}
