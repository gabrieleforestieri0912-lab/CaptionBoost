document.addEventListener("DOMContentLoaded", async () => {
  const loadingScreen = document.getElementById("loading");
  const authScreen = document.getElementById("auth-screen");
  const contentScreen = document.getElementById("content");
  const userProfile = document.getElementById("user-profile");
  const userEmail = document.getElementById("user-email");
  const errorMessage = document.getElementById("error-message");
  const successMessage = document.getElementById("success-message");

  const stepEmail = document.getElementById("step-email");
  const stepCode = document.getElementById("step-code");
  const authEmailInput = document.getElementById("auth-email");
  const authCodeInput = document.getElementById("auth-code");
  const codeHintEmail = document.getElementById("code-hint-email");
  const sendCodeBtn = document.getElementById("send-code-btn");
  const verifyCodeBtn = document.getElementById("verify-code-btn");
  const resendCodeBtn = document.getElementById("resend-code-btn");
  const backToEmailBtn = document.getElementById("back-to-email-btn");

  const languageSelect = document.getElementById("language");
  const translateToSelect = document.getElementById("translate-to");
  const modelSelect = document.getElementById("model");
  const fontSizeSlider = document.getElementById("fontSize");
  const opacitySlider = document.getElementById("opacity");
  const fontSizeValue = document.getElementById("fontSizeValue");
  const opacityValue = document.getElementById("opacityValue");
  const showCaptionsCheck = document.getElementById("showCaptions");
  const showOriginalCaptionsCheck = document.getElementById("showOriginalCaptions");
  const translationNotesCheck = document.getElementById("translationNotes");
  const captionPositionSelect = document.getElementById("captionPosition");
  const originalColorInput = document.getElementById("originalColor");
  const originalSizeInput = document.getElementById("originalSize");
  const originalWeightInput = document.getElementById("originalWeight");
  const translatedColorInput = document.getElementById("translatedColor");
  const translatedSizeInput = document.getElementById("translatedSize");
  const translatedWeightInput = document.getElementById("translatedWeight");
  const captionBackgroundInput = document.getElementById("captionBackground");
  const captionRadiusInput = document.getElementById("captionRadius");
  const captionPaddingInput = document.getElementById("captionPadding");
  const captionHorizontalMarginInput = document.getElementById("captionHorizontalMargin");
  const enableBtn = document.getElementById("enable-btn");
  const disableBtn = document.getElementById("disable-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const traduciVideoBtn = document.getElementById("traduci-video-btn");
  const statusEl = document.getElementById("status");
  const quotaLabel = document.getElementById("quota-label");
  const quotaFill = document.getElementById("quota-fill");
  const quotaPlan = document.getElementById("quota-plan");

  let pendingEmail = "";
  let translateIntent = false;
  const FREE_PLAN_MAX_TRANSLATIONS = 50;

  // Aperta dal bottone "Traduci" del player: mostra la schermata delle modifiche
  // con la scelta della lingua in evidenza.
  chrome.storage.local.get(["cb_popup_intent"], (result) => {
    if (result.cb_popup_intent === "translate") {
      translateIntent = true;
      chrome.storage.local.remove("cb_popup_intent");
    }
  });

  function setLoading(isLoading) {
    loadingScreen.style.display = isLoading ? "block" : "none";
  }

  function showAuthScreen() {
    authScreen.style.display = "block";
    contentScreen.style.display = "none";
    userProfile.style.display = "none";
    showEmailStep(authEmailInput.value?.trim() || "");
  }

  function showContentScreen(user) {
    authScreen.style.display = "none";
    contentScreen.style.display = "block";
    userProfile.style.display = "block";
    userEmail.textContent = user?.email || "";
    loadSettings();
    loadQuota();

    if (translateIntent) {
      // Landing sulla schermata delle modifiche: evidenzia scelta lingua + bottone
      translateToSelect.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => translateToSelect.focus(), 300);
      traduciVideoBtn.classList.add("btn-highlight");
    }
  }

  function updateQuotaUi(usedTranslations = 0, maxTranslations = FREE_PLAN_MAX_TRANSLATIONS, planInfo = null) {
    const safeUsed = Math.max(0, Number(usedTranslations) || 0);
    const isUnlimited =
      maxTranslations === "unlimited" || Number(maxTranslations) >= 999999;
    const safeMax = isUnlimited
      ? 1
      : Math.max(1, Number(maxTranslations) || FREE_PLAN_MAX_TRANSLATIONS);
    const ratio = isUnlimited ? 100 : Math.min((safeUsed / safeMax) * 100, 100);

    // Segnala l'account come Pro quando l'abbonamento è attivo (piano a pagamento)
    const isPaid =
      planInfo &&
      planInfo.subscriptionStatus === "active" &&
      planInfo.plan &&
      planInfo.plan !== "free";
    if (quotaPlan) {
      quotaPlan.textContent = isPaid ? "Piano Pro" : "Piano Free";
      quotaPlan.style.color = isPaid ? "#16a34a" : "#334155";
    }

    quotaLabel.textContent = isUnlimited
      ? `${safeUsed} traduzioni (illimitate)`
      : `${safeUsed} / ${safeMax} traduzioni`;
    quotaFill.style.width = `${ratio}%`;
    quotaFill.style.background =
      !isUnlimited && ratio >= 100
        ? "#ef4444"
        : "#4C94FF";
  }

  // La quota viene letta dal server (/api/account tramite il background): il
  // contatore locale è stato rimosso perché manipolabile (spec §7). Fallback
  // sui dati in storage solo quando non c'è un account autenticato.
  function loadQuota() {
    chrome.runtime.sendMessage({ action: "getAccountInfo" }, (resp) => {
      if (chrome.runtime.lastError || !resp?.success || !resp.plan) {
        chrome.storage.local.get(["translatedVideosCount", "planMaxVideos"], (result) => {
          updateQuotaUi(
            result.translatedVideosCount || 0,
            result.planMaxVideos || FREE_PLAN_MAX_TRANSLATIONS
          );
        });
        return;
      }
      const p = resp.plan;
      updateQuotaUi(
        p.translationsUsed ?? p.translatedVideosCount ?? 0,
        p.translationsLimit ?? p.maxVideos ?? FREE_PLAN_MAX_TRANSLATIONS,
        p
      );
    });
  }

  function showEmailStep(email = "") {
    pendingEmail = email;
    authEmailInput.value = email;
    authCodeInput.value = "";
    stepEmail.style.display = "block";
    stepCode.style.display = "none";
  }

  function showCodeStep(email) {
    pendingEmail = email;
    stepEmail.style.display = "none";
    stepCode.style.display = "block";
    codeHintEmail.textContent = `We have sent a code to ${email}.`;
    authCodeInput.focus();
  }

  function updateStatus(enabled) {
    if (enabled) {
      statusEl.textContent = "Active";
      statusEl.classList.add("active");
      enableBtn.classList.add("active");
    } else {
      statusEl.textContent = "Inactive";
      statusEl.classList.remove("active");
      enableBtn.classList.remove("active");
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
    successMessage.style.display = "none";
    setTimeout(() => {
      errorMessage.style.display = "none";
    }, 4000);
  }

  function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = "block";
    errorMessage.style.display = "none";
    setTimeout(() => {
      successMessage.style.display = "none";
    }, 3000);
  }

  async function checkAuthentication() {
    setLoading(true);
    authScreen.style.display = "none";
    contentScreen.style.display = "none";

    try {
      // 1) Prima la sincronizzazione col sito (stessa logica del content script):
      // il background autentica con il token in storage o con la sessione del sito
      // (chrome.cookies + /api/auth/sync). Così il popup apre la schermata delle
      // modifiche subito dopo il login sulla landing, senza passare dal login.
      const synced = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "checkAuth" }, (resp) => {
          if (chrome.runtime.lastError) return resolve(null);
          resolve(resp);
        });
      });

      if (synced?.authenticated) {
        const stored = await new Promise((resolve) => {
          chrome.storage.local.get(["captionboost_user"], (result) => {
            resolve(result.captionboost_user || null);
          });
        });
        showContentScreen(stored || { email: "" });
        return;
      }

      // 2) Flusso classico: login dall'estensione (token in storage)
      const user = await authManager.getAuthenticatedUser();
      if (user) {
        showContentScreen(user);
      } else {
        showAuthScreen();
      }
    } catch (error) {
      console.error("Authentication check error:", error);
      showAuthScreen();
    } finally {
      setLoading(false);
    }
  }

  function loadSettings() {
    chrome.storage.sync.get(
      [
        "language", "translateTo", "model", "fontSize", "opacity", "enabled",
        "showCaptions", "showOriginalCaptions", "translationNotes", "captionPosition",
        "originalColor", "originalSize", "originalWeight",
        "translatedColor", "translatedSize", "translatedWeight",
        "captionBackground", "captionRadius", "captionPadding", "captionHorizontalMargin",
      ],
      (result) => {
        if (result.language) languageSelect.value = result.language;
        if (typeof result.translateTo !== "undefined") {
          translateToSelect.value = result.translateTo;
        }
        if (result.model) modelSelect.value = result.model;
        if (result.fontSize) {
          fontSizeSlider.value = result.fontSize;
          fontSizeValue.textContent = `${result.fontSize}px`;
        }
        if (result.opacity) {
          opacitySlider.value = result.opacity;
          opacityValue.textContent = `${result.opacity}%`;
        }
        if (typeof result.showCaptions !== "undefined") showCaptionsCheck.checked = result.showCaptions;
        if (typeof result.showOriginalCaptions !== "undefined") showOriginalCaptionsCheck.checked = result.showOriginalCaptions;
        if (typeof result.translationNotes !== "undefined") translationNotesCheck.checked = result.translationNotes;
        if (result.captionPosition) captionPositionSelect.value = result.captionPosition;
        if (result.originalColor) originalColorInput.value = result.originalColor;
        if (result.originalSize) originalSizeInput.value = result.originalSize;
        if (result.originalWeight) originalWeightInput.value = result.originalWeight;
        if (result.translatedColor) translatedColorInput.value = result.translatedColor;
        if (result.translatedSize) translatedSizeInput.value = result.translatedSize;
        if (result.translatedWeight) translatedWeightInput.value = result.translatedWeight;
        if (result.captionBackground) captionBackgroundInput.value = result.captionBackground;
        if (result.captionRadius) captionRadiusInput.value = result.captionRadius;
        if (result.captionPadding) captionPaddingInput.value = result.captionPadding;
        if (result.captionHorizontalMargin) captionHorizontalMarginInput.value = result.captionHorizontalMargin;
        updateStatus(Boolean(result.enabled));
      }
    );
  }

  async function requestCode(email) {
    if (typeof authManager.requestLoginCode !== "function") {
      return {
        success: false,
        error: "Email code flow not configured in auth module.",
      };
    }
    return authManager.requestLoginCode(email);
  }

  async function verifyCode(email, code) {
    if (typeof authManager.loginWithEmailCode !== "function") {
      return {
        success: false,
        error: "Code verification not configured in auth module.",
      };
    }
    return authManager.loginWithEmailCode(email, code);
  }

  sendCodeBtn.addEventListener("click", async () => {
    const email = authEmailInput.value.trim().toLowerCase();
    if (!email) {
      showError("Please enter an email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError("Please enter a valid email.");
      return;
    }

    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = "Sending...";
    const result = await requestCode(email);

    if (result.success) {
      showSuccess("Code sent via email.");
      showCodeStep(email);
    } else {
      showError(result.error || "Unable to send the code.");
    }

    sendCodeBtn.disabled = false;
    sendCodeBtn.textContent = "Send code";
  });

  verifyCodeBtn.addEventListener("click", async () => {
    const code = authCodeInput.value.trim();
    if (!pendingEmail) {
      showError("Email missing, go back to the previous step.");
      showEmailStep("");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      showError("Please enter a valid 6-digit code.");
      return;
    }

    verifyCodeBtn.disabled = true;
    verifyCodeBtn.textContent = "Verifying...";
    const result = await verifyCode(pendingEmail, code);

    if (result.success) {
      showSuccess("Login completed.");
      setTimeout(() => {
        checkAuthentication();
      }, 700);
    } else {
      showError(result.error || "Invalid or expired code.");
    }

    verifyCodeBtn.disabled = false;
    verifyCodeBtn.textContent = "Verify and login";
  });

  resendCodeBtn.addEventListener("click", async () => {
    if (!pendingEmail) {
      showError("Please enter your email first.");
      showEmailStep("");
      return;
    }

    resendCodeBtn.disabled = true;
    resendCodeBtn.textContent = "Sending...";
    const result = await requestCode(pendingEmail);
    if (result.success) {
      showSuccess("New code sent.");
    } else {
      showError(result.error || "Unable to resend the code.");
    }
    resendCodeBtn.disabled = false;
    resendCodeBtn.textContent = "Resend code";
  });

  backToEmailBtn.addEventListener("click", () => {
    showEmailStep(pendingEmail);
  });

  fontSizeSlider.addEventListener("input", (e) => {
    const value = e.target.value;
    fontSizeValue.textContent = `${value}px`;
    chrome.storage.sync.set({ fontSize: value });
  });

  opacitySlider.addEventListener("input", (e) => {
    const value = e.target.value;
    opacityValue.textContent = `${value}%`;
    chrome.storage.sync.set({ opacity: value });
  });

  languageSelect.addEventListener("change", (e) => {
    chrome.storage.sync.set({ language: e.target.value });
  });

  translateToSelect.addEventListener("change", (e) => {
    chrome.storage.sync.set({ translateTo: e.target.value });
  });

  modelSelect.addEventListener("change", (e) => {
    chrome.storage.sync.set({ model: e.target.value });
  });

  showCaptionsCheck.addEventListener("change", (e) => {
    chrome.storage.sync.set({ showCaptions: e.target.checked });
  });

  showOriginalCaptionsCheck.addEventListener("change", (e) => {
    chrome.storage.sync.set({ showOriginalCaptions: e.target.checked });
  });

  translationNotesCheck.addEventListener("change", (e) => {
    chrome.storage.sync.set({ translationNotes: e.target.checked });
  });

  captionPositionSelect.addEventListener("change", (e) => {
    chrome.storage.sync.set({ captionPosition: e.target.value });
  });

  originalColorInput.addEventListener("input", (e) => {
    chrome.storage.sync.set({ originalColor: e.target.value });
  });

  originalSizeInput.addEventListener("change", (e) => {
    chrome.storage.sync.set({ originalSize: e.target.value });
  });

  originalWeightInput.addEventListener("change", (e) => {
    chrome.storage.sync.set({ originalWeight: e.target.value });
  });

  translatedColorInput.addEventListener("input", (e) => {
    chrome.storage.sync.set({ translatedColor: e.target.value });
  });

  translatedSizeInput.addEventListener("change", (e) => {
    chrome.storage.sync.set({ translatedSize: e.target.value });
  });

  translatedWeightInput.addEventListener("change", (e) => {
    chrome.storage.sync.set({ translatedWeight: e.target.value });
  });

  captionBackgroundInput.addEventListener("change", (e) => {
    chrome.storage.sync.set({ captionBackground: e.target.value });
  });

  captionRadiusInput.addEventListener("change", (e) => {
    chrome.storage.sync.set({ captionRadius: e.target.value });
  });

  captionPaddingInput.addEventListener("change", (e) => {
    chrome.storage.sync.set({ captionPadding: e.target.value });
  });

  captionHorizontalMarginInput.addEventListener("change", (e) => {
    chrome.storage.sync.set({ captionHorizontalMargin: e.target.value });
  });

  enableBtn.addEventListener("click", async () => {
    enableBtn.disabled = true;
    enableBtn.textContent = "Enabling...";

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url || !tab.url.includes("youtube.com")) {
        showError("Open a YouTube page to use CaptionBoost.");
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: "enable" }, (response) => {
        if (chrome.runtime.lastError) {
          showError(`Error: ${chrome.runtime.lastError.message}`);
          return;
        }
        if (response?.success) {
          chrome.storage.sync.set({ enabled: true });
          updateStatus(true);
          loadQuota(); // aggiorna la quota dal server (contatore gestito server-side)
          showSuccess("Subtitles enabled.");
        } else {
          showError(response?.error || "Unable to enable subtitles.");
        }
      });
    } catch (error) {
      showError(`Error: ${error.message}`);
    } finally {
      enableBtn.disabled = false;
      enableBtn.textContent = "Enable subtitles";
    }
  });

  disableBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url && tab.url.includes("youtube.com")) {
        chrome.tabs.sendMessage(tab.id, { action: "disable" }, () => {
          chrome.storage.sync.set({ enabled: false });
          updateStatus(false);
          showSuccess("Subtitles disabled.");
        });
      } else {
        chrome.storage.sync.set({ enabled: false });
        updateStatus(false);
      }
    } catch (error) {
      console.error(error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    logoutBtn.disabled = true;
    logoutBtn.textContent = "Exiting...";
    await authManager.logout();
    showSuccess("Logout completed.");
    setTimeout(() => {
      logoutBtn.disabled = false;
      logoutBtn.textContent = "Logout";
      checkAuthentication();
    }, 700);
  });

  // Flusso "Traduci": scegli la lingua nella schermata delle modifiche e avvia
  // la generazione dei sottotitoli sul video YouTube attivo.
  traduciVideoBtn.addEventListener("click", async () => {
    const lang = translateToSelect.value || "it";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || !tab.url.includes("youtube.com")) {
      showError("Apri un video YouTube per tradurlo.");
      return;
    }

    traduciVideoBtn.disabled = true;
    traduciVideoBtn.textContent = "Avvio traduzione...";

    chrome.tabs.sendMessage(tab.id, { action: "startTranslateVideo", lang }, (response) => {
      if (chrome.runtime.lastError) {
        traduciVideoBtn.disabled = false;
        traduciVideoBtn.textContent = "Traduci questo video";
        showError(`Errore: ${chrome.runtime.lastError.message}`);
        return;
      }
      if (response?.success) {
        window.close();
      } else {
        traduciVideoBtn.disabled = false;
        traduciVideoBtn.textContent = "Traduci questo video";
        showError(response?.error || "Impossibile avviare la traduzione.");
      }
    });
  });

  checkAuthentication();
});
