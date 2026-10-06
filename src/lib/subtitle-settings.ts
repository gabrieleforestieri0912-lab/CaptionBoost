// Impostazioni di stile dei sottotitoli condivise tra web app ed estensione.
// La web app salva in localStorage e, se l'estensione è installata,
// sincronizza le stesse chiavi in chrome.storage.sync tramite bridge.js.

export interface SubtitleSettings {
  outputLanguage: string
  showCaptions: boolean
  showOriginalCaptions: boolean
  translationNotes: boolean
  originalSize: string
  originalWeight: string
  originalColor: string
  translatedSize: string
  translatedWeight: string
  translatedColor: string
  captionPosition: string
  captionBackground: string
  captionRadius: string
  captionPadding: string
  captionHorizontalMargin: string
}

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  outputLanguage: 'it',
  showCaptions: true,
  showOriginalCaptions: true,
  translationNotes: false,
  originalSize: '1.0',
  originalWeight: '400',
  originalColor: '#ffffff',
  translatedSize: '1.0',
  translatedWeight: '500',
  translatedColor: '#7dd3fc',
  captionPosition: 'bottom',
  captionBackground: 'rgba(0,0,0,0.85)',
  captionRadius: '10px',
  captionPadding: '8px',
  captionHorizontalMargin: '10%',
}

export const SUBTITLE_LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'sv', label: 'Svenska' },
  { code: 'da', label: 'Dansk' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ไทย' },
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
] as const

const STORAGE_KEY = 'captionboost-subtitle-settings'

function sanitize(raw: Partial<SubtitleSettings>): SubtitleSettings {
  const d = DEFAULT_SUBTITLE_SETTINGS
  const str = (v: unknown, fallback: string) =>
    typeof v === 'string' && v.length > 0 ? v : fallback
  const bool = (v: unknown, fallback: boolean) =>
    typeof v === 'boolean' ? v : fallback
  return {
    outputLanguage: str(raw.outputLanguage, d.outputLanguage),
    showCaptions: bool(raw.showCaptions, d.showCaptions),
    showOriginalCaptions: bool(raw.showOriginalCaptions, d.showOriginalCaptions),
    translationNotes: bool(raw.translationNotes, d.translationNotes),
    originalSize: str(raw.originalSize, d.originalSize),
    originalWeight: str(raw.originalWeight, d.originalWeight),
    originalColor: str(raw.originalColor, d.originalColor),
    translatedSize: str(raw.translatedSize, d.translatedSize),
    translatedWeight: str(raw.translatedWeight, d.translatedWeight),
    translatedColor: str(raw.translatedColor, d.translatedColor),
    captionPosition: str(raw.captionPosition, d.captionPosition),
    captionBackground: str(raw.captionBackground, d.captionBackground),
    captionRadius: str(raw.captionRadius, d.captionRadius),
    captionPadding: str(raw.captionPadding, d.captionPadding),
    captionHorizontalMargin: str(raw.captionHorizontalMargin, d.captionHorizontalMargin),
  }
}

export function loadLocalSubtitleSettings(): SubtitleSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SUBTITLE_SETTINGS }
    return sanitize(JSON.parse(raw) as Partial<SubtitleSettings>)
  } catch {
    return { ...DEFAULT_SUBTITLE_SETTINGS }
  }
}

export function saveLocalSubtitleSettings(settings: SubtitleSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // storage non disponibile: ignora
  }
}

/** Invia le impostazioni all'estensione (se installata) via bridge.js */
export function syncSubtitleSettingsToExtension(
  settings: SubtitleSettings
): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      let done = false
      const finish = (ok: boolean) => {
        if (done) return
        done = true
        window.removeEventListener('message', onMessage)
        resolve(ok)
      }
      const onMessage = (event: MessageEvent) => {
        if (event.source !== window) return
        const data = event.data as {
          source?: string
          action?: string
          success?: boolean
        } | null
        if (
          !data ||
          data.source !== 'captionboost-extension' ||
          data.action !== 'syncSubtitleSettingsResult'
        )
          return
        finish(Boolean(data.success))
      }
      window.addEventListener('message', onMessage)
      window.postMessage(
        {
          source: 'captionboost-webapp',
          action: 'syncSubtitleSettings',
          settings,
        },
        '*'
      )
      // L'estensione potrebbe non essere installata: timeout di fallback
      setTimeout(() => finish(false), 1500)
    } catch {
      resolve(false)
    }
  })
}

/** Legge le impostazioni dall'estensione (se installata), altrimenti null */
export function loadSubtitleSettingsFromExtension(): Promise<SubtitleSettings | null> {
  return new Promise((resolve) => {
    try {
      let done = false
      const finish = (value: SubtitleSettings | null) => {
        if (done) return
        done = true
        window.removeEventListener('message', onMessage)
        resolve(value)
      }
      const onMessage = (event: MessageEvent) => {
        if (event.source !== window) return
        const data = event.data as {
          source?: string
          action?: string
          success?: boolean
          settings?: Partial<SubtitleSettings>
        } | null
        if (
          !data ||
          data.source !== 'captionboost-extension' ||
          data.action !== 'getSubtitleSettingsResult'
        )
          return
        if (data.success && data.settings) finish(sanitize(data.settings))
        else finish(null)
      }
      window.addEventListener('message', onMessage)
      window.postMessage(
        { source: 'captionboost-webapp', action: 'getSubtitleSettings' },
        '*'
      )
      setTimeout(() => finish(null), 1500)
    } catch {
      resolve(null)
    }
  })
}
