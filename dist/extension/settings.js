const DEFAULT_SETTINGS = {
  youtubeApiKey: "",
  outputLanguage: "en",
  showCaptions: true,
  showOriginalCaptions: true,
  translationNotes: false,
  originalSize: "1.0",
  originalWeight: "400",
  originalColor: "#ffffff",
  translatedSize: "1.0",
  translatedWeight: "500",
  translatedColor: "#ffffff",
  captionPosition: "bottom",
  captionBackground: "rgba(0,0,0,0.85)",
  captionRadius: "10px",
  captionPadding: "8px",
  captionHorizontalMargin: "10%",
};

const FIELD_IDS = Object.keys(DEFAULT_SETTINGS);

function getFieldValue(id) {
  const el = document.getElementById(id);
  if (el.type === "checkbox") return el.checked;
  return el.value;
}

function setFieldValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "checkbox") {
    el.checked = Boolean(value);
  } else {
    el.value = value;
  }
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
    FIELD_IDS.forEach((id) => setFieldValue(id, result[id]));
  });
}

function saveSettings() {
  const payload = {};
  FIELD_IDS.forEach((id) => {
    payload[id] = getFieldValue(id);
  });

  // Compatibility with existing extension keys.
  payload.translateTo = payload.outputLanguage;
  payload.position = payload.captionPosition;

  chrome.storage.sync.set(payload, () => {
    const savedMessage = document.getElementById("savedMessage");
    savedMessage.style.display = "inline";
    setTimeout(() => {
      savedMessage.style.display = "none";
    }, 1500);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  document
    .getElementById("saveSettingsBtn")
    .addEventListener("click", saveSettings);
});
