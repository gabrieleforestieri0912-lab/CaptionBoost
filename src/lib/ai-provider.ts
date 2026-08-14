import OpenAI from 'openai'

export type AiProvider = 'openai' | 'gemini' | 'groq' | 'anthropic' | 'deepl' | 'ollama' | 'mock'

export interface AiOptions {
  prompt: string
  provider?: AiProvider
  apiKey?: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AiTestOptions {
  provider: AiProvider
  apiKey?: string
  model?: string
}

export interface AiResponse {
  text: string
  provider: AiProvider
  model: string
}

// Modello più adatto per la traduzione contestuale dei sottotitoli, usato quando
// viene configurata un'API Key per il provider. Per il motore locale (Ollama) il
// modello predefinito è deepseek-r1.
export const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  groq: 'llama-3.3-70b-versatile',
  anthropic: 'claude-3-5-haiku-20241022',
  deepl: 'default',
  ollama: 'deepseek-r1',
  mock: 'mock-model',
}

/**
 * Returns the effective API Key for a provider from explicitly passed parameter,
 * or server environment variables.
 */
export function getEffectiveApiKey(provider: AiProvider, customKey?: string): string | null {
  if (customKey && customKey.trim()) {
    return customKey.trim()
  }

  switch (provider) {
    case 'openai':
      return process.env.OPENAI_API_KEY || process.env.AI_API_KEY || null
    case 'gemini':
      return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null
    case 'groq':
      return process.env.GROQ_API_KEY || null
    case 'anthropic':
      return process.env.ANTHROPIC_API_KEY || null
    case 'deepl':
      return process.env.DEEPL_API_KEY || null
    case 'ollama':
      // Ollama è un motore locale: nessuna API key richiesta
      return null
    case 'mock':
      return 'mock-key'
    default:
      return process.env.OPENAI_API_KEY || process.env.AI_API_KEY || null
  }
}

/**
 * Executes an AI call.
 *
 * Motore predefinito: Ollama locale con deepseek-r1 (nessuna API key richiesta).
 * In parallelo è strutturato il percorso con API Key: scegliendo un provider cloud
 * il modello più adatto per i sottotitoli viene selezionato automaticamente
 * (vedi DEFAULT_MODELS) oppure può essere passato esplicitamente.
 */
export async function callProductionAI(options: AiOptions): Promise<AiResponse> {
  const provider = options.provider || (process.env.DEFAULT_AI_PROVIDER as AiProvider) || 'ollama'
  // Ollama: modello locale predefinito (deepseek-r1).
  // Provider cloud con API Key: modello più adatto per i sottotitoli.
  const model = options.model || (
    provider === 'ollama'
      ? (process.env.DEFAULT_AI_MODEL || DEFAULT_MODELS.ollama)
      : (DEFAULT_MODELS[provider] || 'gpt-4o-mini')
  )
  const apiKey = getEffectiveApiKey(provider, options.apiKey)
  const temperature = options.temperature ?? 0.3
  const maxTokens = options.maxTokens ?? 2000

  if (!apiKey && provider !== 'mock' && provider !== 'ollama') {
    throw new Error(
      `API Key non trovata per il provider "${provider}". Configura la chiave API nelle impostazioni o nei file d'ambiente del server (${provider.toUpperCase()}_API_KEY).`
    )
  }

  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey: apiKey! })
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Sei un traduttore ed editor professionista di sottotitoli. Traduci basandoti sul contesto, senza alterare la struttura e la numerazione delle righe.',
        },
        { role: 'user', content: options.prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    })

    const text = response.choices[0]?.message?.content || ''
    return { text, provider: 'openai', model }
  }

  if (provider === 'groq') {
    // Groq provides an OpenAI-compatible endpoint
    const groq = new OpenAI({
      apiKey: apiKey!,
      baseURL: 'https://api.groq.com/openai/v1',
    })
    const response = await groq.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Sei un traduttore ed editor professionista di sottotitoli. Traduci basandoti sul contesto.',
        },
        { role: 'user', content: options.prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    })

    const text = response.choices[0]?.message?.content || ''
    return { text, provider: 'groq', model }
  }

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: options.prompt }],
          },
        ],
        generationConfig: {
          temperature,
          maxOutputTokens: maxTokens,
        },
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Gemini API Error (${resp.status}): ${errText}`)
    }

    const data = await resp.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    return { text, provider: 'gemini', model }
  }

  if (provider === 'anthropic') {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: 'Sei un traduttore ed editor professionista di sottotitoli.',
        messages: [{ role: 'user', content: options.prompt }],
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`Anthropic API Error (${resp.status}): ${errText}`)
    }

    const data = await resp.json()
    const text = data.content?.[0]?.text || ''
    return { text, provider: 'anthropic', model }
  }

  if (provider === 'ollama') {
    // Ollama locale (es. deepseek-r1): nessuna API key richiesta.
    const ollamaUrl = (process.env.OLLAMA_API_URL || 'http://localhost:11434').replace(/\/+$/, '')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    try {
      const resp = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: options.prompt,
          stream: false,
          think: false, // disattiva i blocchi di ragionamento dei modelli reasoning (deepseek-r1)
          options: { temperature, num_predict: maxTokens },
        }),
        signal: controller.signal,
      })

      if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(`Ollama API Error (${resp.status}): ${errText}`)
      }

      const data = await resp.json()
      const text = data.response || ''
      return { text, provider: 'ollama', model }
    } catch (error) {
      const message = (error as Error).message || 'errore sconosciuto'
      if ((error as Error).name === 'AbortError') {
        throw new Error(
          `Ollama locale non risponde (timeout). Avvia "ollama serve" e assicurati che il modello "${model}" sia installato (ollama pull ${model}).`
        )
      }
      throw new Error(`Impossibile contattare Ollama locale (${ollamaUrl}): ${message}`)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  if (provider === 'deepl') {
    // DeepL endpoint (free or pro endpoint depending on key suffix)
    const isFree = apiKey!.endsWith(':fx')
    const domain = isFree ? 'api-free.deepl.com' : 'api.deepl.com'
    const params = new URLSearchParams()
    params.append('text', options.prompt)
    params.append('target_lang', 'IT')

    const resp = await fetch(`https://${domain}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      throw new Error(`DeepL API Error (${resp.status}): ${errText}`)
    }

    const data = await resp.json()
    const text = data.translations?.[0]?.text || ''
    return { text, provider: 'deepl', model: 'deepl-v2' }
  }

  if (provider === 'mock') {
    return {
      text: '[0] Traduzione simulata con successo per produzione',
      provider: 'mock',
      model: 'mock',
    }
  }

  throw new Error(`Provider non supportato: ${provider}`)
}

/**
 * Tests an API Key by sending a lightweight prompt.
 */
export async function testAIConnection(options: AiTestOptions): Promise<{
  success: boolean
  provider: AiProvider
  model: string
  message: string
}> {
  try {
    const testPrompt = 'Rispondi con una sola parola: "OK".'
    const res = await callProductionAI({
      prompt: testPrompt,
      provider: options.provider,
      apiKey: options.apiKey,
      model: options.model,
      temperature: 0.1,
      maxTokens: 20,
    })

    if (res.text && res.text.trim()) {
      return {
        success: true,
        provider: res.provider,
        model: res.model,
        message: `Connessione riuscita a ${res.provider} (${res.model})`,
      }
    }

    return {
      success: false,
      provider: options.provider,
      model: options.model || DEFAULT_MODELS[options.provider] || '',
      message: 'La risposta dall\'API è risultata vuota.',
    }
  } catch (error) {
    return {
      success: false,
      provider: options.provider,
      model: options.model || DEFAULT_MODELS[options.provider] || '',
      message: (error as Error).message || 'Errore di connessione sconosciuto',
    }
  }
}
