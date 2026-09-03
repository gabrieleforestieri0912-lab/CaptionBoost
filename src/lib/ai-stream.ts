import OpenAI from 'openai'
import {
  type AiProvider,
  getEffectiveApiKey,
  DEFAULT_MODELS,
  callProductionAI,
} from './ai-provider'

export interface AiStreamOptions {
  prompt: string
  provider?: AiProvider
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export function isStreamableProvider(provider: AiProvider): boolean {
  return ['openai', 'groq', 'gemini', 'anthropic', 'ollama'].includes(provider)
}

/**
 * Streaming della risposta AI (spec §4): genera i token uno alla volta.
 * - openai / groq: SDK OpenAI con stream:true
 * - ollama: /api/generate con stream:true (NDJSON)
 * - gemini: streamGenerateContent (SSE)
 * - anthropic: /v1/messages con stream:true (SSE)
 * - deepl / mock / altro: nessuno streaming, emette tutto in un colpo
 */
export async function* streamProductionAI(
  options: AiStreamOptions
): AsyncGenerator<string> {
  const provider =
    options.provider ||
    (process.env.DEFAULT_AI_PROVIDER as AiProvider) ||
    'gemini'
  const model =
    options.model ||
    (provider === 'ollama'
      ? process.env.DEFAULT_AI_MODEL || DEFAULT_MODELS.ollama
      : DEFAULT_MODELS[provider] || 'gemini-2.0-flash')
  const apiKey = getEffectiveApiKey(provider, options.apiKey)
  const temperature = options.temperature ?? 0.3
  const maxTokens = options.maxTokens ?? 2000

  if (provider === 'openai' || provider === 'groq') {
    if (!apiKey) {
      throw new Error(
        `API Key non trovata per il provider "${provider}". Configura la chiave API nel server (${provider.toUpperCase()}_API_KEY).`
      )
    }
    const client = new OpenAI({
      apiKey,
      ...(provider === 'groq'
        ? { baseURL: 'https://api.groq.com/openai/v1' }
        : {}),
    })
    const stream = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Sei un traduttore ed editor professionista di sottotitoli. Traduci basandoti sul contesto, senza alterare la struttura e la numerazione delle righe.',
        },
        { role: 'user', content: options.prompt },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    })
    for await (const part of stream) {
      const delta = part.choices?.[0]?.delta?.content
      if (delta) yield delta
    }
    return
  }

  if (provider === 'ollama') {
    const ollamaUrl = (
      process.env.OLLAMA_API_URL || 'http://localhost:11434'
    ).replace(/\/+$/, '')
    const resp = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: options.prompt,
        stream: true,
        think: false, // disattiva i blocchi di ragionamento dei modelli reasoning (deepseek-r1)
        options: { temperature, num_predict: maxTokens },
      }),
    })
    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Ollama API Error (${resp.status}): ${errText}`)
    }
    if (!resp.body) throw new Error('Ollama: stream non disponibile')
    yield* readNdjson(resp.body, (data) => data.response)
    return
  }

  if (provider === 'gemini') {
    if (!apiKey) {
      throw new Error(
        'API Key non trovata per il provider "gemini". Configura GEMINI_API_KEY nel server.'
      )
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: options.prompt }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      }),
    })
    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Gemini API Error (${resp.status}): ${errText}`)
    }
    if (!resp.body) throw new Error('Gemini: stream non disponibile')
    yield* readSse(resp.body, (data) => {
      if (data === '[DONE]') return ''
      return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    })
    return
  }

  if (provider === 'anthropic') {
    if (!apiKey) {
      throw new Error(
        'API Key non trovata per il provider "anthropic". Configura ANTHROPIC_API_KEY nel server.'
      )
    }
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: 'Sei un traduttore ed editor professionista di sottotitoli.',
        messages: [{ role: 'user', content: options.prompt }],
        stream: true,
      }),
    })
    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Anthropic API Error (${resp.status}): ${errText}`)
    }
    if (!resp.body) throw new Error('Anthropic: stream non disponibile')
    yield* readSse(resp.body, (data) => {
      if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
        return data.delta.text || ''
      }
      return ''
    })
    return
  }

  // deepl / mock / provider non streamable: risposta completa in un colpo
  const result = await callProductionAI({
    prompt: options.prompt,
    provider,
    apiKey: apiKey || undefined,
    model,
    temperature,
    maxTokens,
  })
  yield result.text
}

/** Legge un flusso NDJSON (una riga = un JSON) e ne estrae il testo per riga. */
// I payload JSON dei provider variano molto: usiamo `any` per le callback
// di estrazione (i campi accessibili sono verificati dal provider specifico).
type ExtractFn = (data: any) => string

async function* readNdjson(
  body: ReadableStream<Uint8Array>,
  extract: ExtractFn
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, nl).trim()
        buffer = buffer.slice(nl + 1)
        if (!line) continue
        try {
          const text = extract(JSON.parse(line))
          if (text) yield text
        } catch {
          // riga non JSON: ignora
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/** Legge un flusso SSE (eventi `data: ...` separati da riga vuota) e ne estrae il testo. */
async function* readSse(
  body: ReadableStream<Uint8Array>,
  extract: ExtractFn
): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let sep: number
      while ((sep = buffer.indexOf('\n\n')) !== -1) {
        const event = buffer.slice(0, sep).trim()
        buffer = buffer.slice(sep + 2)
        for (const line of event.split('\n')) {
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (!payload) continue
          if (payload === '[DONE]') {
            continue
          }
          try {
            const text = extract(JSON.parse(payload))
            if (text) yield text
          } catch {
            // evento non JSON: ignora
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}
