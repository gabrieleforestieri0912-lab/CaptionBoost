export interface CaptionSegment {
  start: number
  end: number
  text: string
}

export interface TranslationWindow {
  index: number
  captions: CaptionSegment[]
  before: CaptionSegment[]
  after: CaptionSegment[]
}

export interface TranslationResult {
  captions: CaptionSegment[]
  translated: boolean
  glossary: string[]
}

export interface TranslateOptions {
  windowSize?: number
  contextBefore?: number
  contextAfter?: number
  maxRetries?: number
}

export const LANGUAGE_NAMES: Record<string, string> = {
  it: 'Italiano',
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
  ru: 'Русский',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिन्दी',
  nl: 'Nederlands',
  pl: 'Polski',
  tr: 'Türkçe',
  th: 'ไทย',
  vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia',
  sv: 'Svenska',
  da: 'Dansk',
}

const DEFAULT_WINDOW_SIZE = 10
const DEFAULT_CONTEXT_BEFORE = 3
const DEFAULT_CONTEXT_AFTER = 2
const DEFAULT_MAX_RETRIES = 1

export function languageName(code: string): string {
  return LANGUAGE_NAMES[code] || code
}

export function splitIntoWindows(
  captions: CaptionSegment[],
  options: TranslateOptions = {}
): TranslationWindow[] {
  const windowSize = options.windowSize ?? DEFAULT_WINDOW_SIZE
  const contextBefore = options.contextBefore ?? DEFAULT_CONTEXT_BEFORE
  const contextAfter = options.contextAfter ?? DEFAULT_CONTEXT_AFTER

  if (captions.length === 0) return []

  const windows: TranslationWindow[] = []
  for (let start = 0; start < captions.length; start += windowSize) {
    const end = Math.min(start + windowSize, captions.length)
    const before = captions.slice(Math.max(0, start - contextBefore), start)
    const after = captions.slice(end, Math.min(captions.length, end + contextAfter))
    windows.push({
      index: start,
      captions: captions.slice(start, end),
      before,
      after,
    })
  }
  return windows
}

const TERM_CANDIDATE_RE =
  /(?<!\w)([A-Z][A-Za-zÀ-ž]{2,}(?:\s[A-Z][A-Za-zÀ-ž]{2,}){0,3})(?!\w)|(?<!\w)([A-Z]{2,}(?:\s[A-Z]{2,})*)(?!\w)/g

const STOPWORDS = new Set([
  'The', 'And', 'For', 'With', 'From', 'That', 'This', 'These', 'Those',
  'What', 'When', 'Where', 'Which', 'Who', 'How', 'Why', 'Not', 'But',
  'You', 'Your', 'Our', 'Their', 'They', 'We', 'He', 'She', 'It', 'I',
  'OK', 'Yeah', 'Yes', 'No', 'Okay', 'Hello', 'Hi', 'Thanks', 'Thank',
  'Please', 'Also', 'Then', 'So', 'Now', 'Well', 'Just', 'Very',
  'Please', 'Let', 'Look', 'Come', 'Get', 'Go', 'See', 'Know', 'Make',
])

export function buildGlossary(captions: CaptionSegment[], maxTerms = 25): string[] {
  const counts = new Map<string, number>()
  for (const cap of captions) {
    const matches = cap.text.match(TERM_CANDIDATE_RE) || []
    for (const raw of matches) {
      const term = raw.trim()
      if (!term) continue
      const head = term.split(/\s+/)[0]
      if (STOPWORDS.has(head)) continue
      counts.set(term, (counts.get(term) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(([term]) => term)
}

export function buildContextualPrompt(
  window: TranslationWindow,
  targetLang: string,
  sourceLang: string,
  glossary: string[]
): string {
  const targetName = languageName(targetLang)
  const sourceName = languageName(sourceLang)

  const lines: string[] = []
  lines.push(`Sei un traduttore professionista di sottotitoli.`)
  lines.push(
    `Traduci i sottotitoli dal ${sourceName} al ${targetName} basandoti sul CONTESTO, non parola per parola.`
  )
  lines.push('')
  lines.push('REGOLE:')
  lines.push('- Traduci in modo naturale e idiomatico per il contesto della conversazione.')
  lines.push('- Mantieni nomi propri, marchi e termini tecnici (usa la GLOSSARIO se presente).')
  lines.push('- Conserva tono, registro e significato originale.')
  lines.push('- Se una frase ha più significati, scegli quello coerente con il contesto circostante.')
  lines.push('- Non tradurre mai parola per parola: adatta le espressioni idiomatiche.')
  lines.push('')

  if (glossary.length > 0) {
    lines.push(`GLOSSARIO (termini da NON tradurre o da mantenere): ${glossary.join(', ')}`)
    lines.push('')
  }

  if (window.before.length > 0) {
    lines.push('--- CONTESTO PRECEDENTE (già tradotto, usalo per coerenza) ---')
    for (const cap of window.before) {
      lines.push(`[${cap.start.toFixed(2)}s] ${cap.text}`)
    }
    lines.push('')
  }

  lines.push('--- SOTTOTITOLI DA TRADURRE ---')
  for (let i = 0; i < window.captions.length; i++) {
    lines.push(`[${i}] ${window.captions[i].text}`)
  }
  lines.push('')

  if (window.after.length > 0) {
    lines.push('--- CONTESTO SUCCESSIVO (non tradurlo, usalo per capire il seguito) ---')
    for (const cap of window.after) {
      lines.push(`[${cap.start.toFixed(2)}s] ${cap.text}`)
    }
    lines.push('')
  }

  lines.push('Rispondi SOLO con le righe tradotte, una per riga, in questo formato esatto:')
  lines.push('[indice] testo tradotto')
  lines.push('Non aggiungere spiegazioni, prefissi o testo extra.')

  return lines.join('\n')
}

export function parseTranslatedLines(
  output: string,
  windowCaptions: CaptionSegment[]
): CaptionSegment[] {
  const result: CaptionSegment[] = []
  if (!output) return result

  const lineRe = /^\s*\[(\d+)\]\s+(.+)\s*$/
  for (const rawLine of output.split('\n')) {
    const line = rawLine.trim()
    if (!line) continue
    const match = line.match(lineRe)
    if (!match) continue
    const idx = parseInt(match[1], 10)
    const text = match[2].trim()
    const original = windowCaptions[idx]
    if (original && text) {
      result.push({ start: original.start, end: original.end, text })
    }
  }
  return result
}

export type AiCaller = (
  prompt: string,
  context: { targetLang: string; sourceLang: string; windowIndex: number }
) => Promise<string>

export async function translateCaptionsWithAI(
  captions: CaptionSegment[],
  targetLang: string,
  sourceLang: string,
  callAI: AiCaller,
  options: TranslateOptions = {}
): Promise<TranslationResult> {
  const windows = splitIntoWindows(captions, options)
  const glossary = buildGlossary(captions)
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES

  const translated: CaptionSegment[] = []
  let anyTranslated = false

  for (const win of windows) {
    let output = ''
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const prompt = buildContextualPrompt(win, targetLang, sourceLang, glossary)
        output = await callAI(prompt, {
          targetLang,
          sourceLang,
          windowIndex: win.index,
        })
        if (output && output.trim()) break
      } catch (e) {
        console.warn(`AI translation attempt ${attempt + 1} failed for window ${win.index}:`, e)
      }
      output = ''
    }

    if (output && output.trim()) {
      const parsed = parseTranslatedLines(output, win.captions)
      if (parsed.length > 0) {
        const parsedByStart = new Map<number, CaptionSegment>()
        for (const seg of parsed) parsedByStart.set(seg.start, seg)
        translated.push(
          ...win.captions.map((c) => parsedByStart.get(c.start) || { ...c })
        )
        anyTranslated = true
      } else {
        translated.push(...win.captions.map((c) => ({ ...c })))
      }
    } else {
      translated.push(...win.captions.map((c) => ({ ...c })))
    }
  }

  return {
    captions: translated,
    translated: anyTranslated,
    glossary,
  }
}
