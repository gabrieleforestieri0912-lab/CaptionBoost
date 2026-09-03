import { NextResponse } from 'next/server'
import { callProductionAI, AiProvider } from '@/lib/ai-provider'
import { getAuthenticatedUser } from '@/lib/get-user'
import {
  checkTranslationLimit,
  incrementTranslationUsage,
} from '@/lib/usage-limit'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as {
      prompt?: string
      provider?: AiProvider
      apiKey?: string
      model?: string
      temperature?: number
      max_tokens?: number
    }

    const headerApiKey = request.headers.get('x-ai-api-key') || undefined
    const headerProvider = (request.headers.get('x-ai-provider') as AiProvider) || undefined
    const headerModel = request.headers.get('x-ai-model') || undefined

    const prompt = body.prompt
    if (!prompt) {
      return NextResponse.json(
        { error: 'Il parametro "prompt" è obbligatorio.' },
        { status: 400 }
      )
    }

    // Solo utenti autenticati: senza account non c'è un limite applicabile e
    // il server non può addebitare l'uso della AI.
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        {
          error: "Devi effettuare l'accesso per usare la traduzione. Crea un account o accedi.",
        },
        { status: 401 }
      )
    }

    // Limite free (50 traduzioni/mese) verificato server-side, non nel popup
    // (spec §7). I piani a pagamento hanno traduzioni illimitate.
    const check = await checkTranslationLimit(user)
    if (!check.allowed) {
      return NextResponse.json(
        {
          error: `Hai raggiunto il limite gratuito di ${check.limit} traduzioni al mese. Passa a Premium per traduzioni illimitate.`,
          used: check.used,
          remaining: 0,
          limit: check.limit,
        },
        { status: 429 }
      )
    }
    const usage: {
      used: number
      remaining: number | null
      limit: number | 'unlimited'
    } = { used: check.used, remaining: check.remaining, limit: check.limit }

    // Se non viene specificato, il server usa il provider predefinito (DEFAULT_AI_PROVIDER,
    // di default Google Gemini con gemini-2.0-flash).
    const provider = body.provider || headerProvider
    const apiKey = body.apiKey || headerApiKey
    const model = body.model || headerModel
    const temperature = body.temperature
    const maxTokens = body.max_tokens

    const result = await callProductionAI({
      prompt,
      provider,
      apiKey,
      model,
      temperature,
      maxTokens,
    })

    try {
      await incrementTranslationUsage(user.id)
    } catch (error) {
      console.error('⚠️ Impossibile aggiornare il contatore traduzioni:', error)
    }

    return NextResponse.json({
      response: result.text,
      provider: result.provider,
      model: result.model,
      usage,
    })
  } catch (error) {
    console.error('AI API Route Error:', error)
    return NextResponse.json(
      {
        error: (error as Error).message || 'Errore durante l\'elaborazione della richiesta AI',
      },
      { status: 500 }
    )
  }
}
