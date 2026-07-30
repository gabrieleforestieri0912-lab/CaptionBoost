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
  const enableBtn = document.getElementById("enable-btn");
  const disableBtn = document.getElementById("disable-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const statusEl = document.getElementById("status");
  const quotaLabel = document.getElementById("quota-label");
  const quotaFill = document.getElementById("quota-fill");
  const plansLink = document.getElementById("plans-link");
  const settingsLink = document.getElementById("settings-link");
  const qaLink = document.getElementById("qa-link");
  const supportLink = document.getElementById("support-link");

  let pendingEmail = "";
  const FREE_PLAN_MAX_VIDEOS = 10;

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
  }

  function updateQuotaUi(usedVideos = 0, maxVideos = FREE_PLAN_MAX_VIDEOS) {
    const safeUsed = Math.max(0, Number(usedVideos) || 0);
    const safeMax = Math.max(1, Number(maxVideos) || FREE_PLAN_MAX_VIDEOS);
    const ratio = Math.min((safeUsed / safeMax) * 100, 100);

    quotaLabel.textContent = `${safeUsed} / ${safeMax} videos`;
    quotaFill.style.width = `${ratio}%`;
    quotaFill.style.background =
      ratio >= 100
        ? "#ef4444"
        : "#0066cc";
  }

  function loadQuota() {
    chrome.storage.local.get(["translatedVideosCount", "planMaxVideos"], (result) => {
      updateQuotaUi(
        result.translatedVideosCount || 0,
        result.planMaxVideos || FREE_PLAN_MAX_VIDEOS
      );
    });
  }

  function incrementQuotaUsage() {
    chrome.storage.local.get(["translatedVideosCount", "planMaxVideos"], (result) => {
      const used = Number(result.translatedVideosCount || 0);
      const max = Number(result.planMaxVideos || FREE_PLAN_MAX_VIDEOS);
      const next = Math.min(used + 1, max);
      chrome.storage.local.set({ translatedVideosCount: next }, () => {
        updateQuotaUi(next, max);
      });
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
      const isAuth = await authManager.isAuthenticated();
      const user = await authManager.getAuthenticatedUser();
      if (isAuth && user) {
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
      ["language", "translateTo", "model", "fontSize", "opacity", "enabled"],
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

  plansLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${authManager.apiUrl.replace('/api/auth', '')}/pricing` });
  });

  settingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${authManager.apiUrl.replace('/api/auth', '')}/settings` });
  });

  const subtitlesLink = document.getElementById("subtitles-link");
  subtitlesLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${authManager.apiUrl.replace('/api/auth', '')}/account` });
  });

  qaLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `${authManager.apiUrl.replace('/api/auth', '')}/account` });
  });

  supportLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: `https://captionboost.it/support` });
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
          incrementQuotaUsage();
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

  checkAuthentication();
});
