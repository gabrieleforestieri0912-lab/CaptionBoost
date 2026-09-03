import { NextResponse } from 'next/server'
import { streamProductionAI } from '@/lib/ai-stream'
import type { AiProvider } from '@/lib/ai-provider'
import { getAuthenticatedUser } from '@/lib/get-user'
import {
  checkTranslationLimit,
  incrementTranslationUsage,
} from '@/lib/usage-limit'

export const dynamic = 'force-dynamic'

// Endpoint SSE: come /api/ai ma in streaming, token per token (spec §4).
// Il client legge gli eventi `data: { "token": "..." }` fino a `data: [DONE]`.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
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
    return new Response(
      `data: ${JSON.stringify({
        error: "Devi effettuare l'accesso per usare la traduzione. Crea un account o accedi.",
        status: 401,
      })}\n\n`,
      {
        status: 401,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      }
    )
  }

  // Limite free (50 traduzioni/mese) verificato server-side, come su /api/ai:
  // i piani a pagamento hanno traduzioni illimitate.
  const check = await checkTranslationLimit(user)
  if (!check.allowed) {
    return new Response(
      `data: ${JSON.stringify({
        error: `Hai raggiunto il limite gratuito di ${check.limit} traduzioni al mese. Passa a Premium per traduzioni illimitate.`,
        status: 429,
      })}\n\n`,
      {
        status: 429,
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
        },
      }
    )
  }
  try {
    await incrementTranslationUsage(user.id)
  } catch (error) {
    console.error('⚠️ Impossibile aggiornare il contatore traduzioni:', error)
  }

  const provider = body.provider || headerProvider
  const apiKey = body.apiKey || headerApiKey
  const model = body.model || headerModel
  const temperature = body.temperature
  const maxTokens = body.max_tokens

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const token of streamProductionAI({
          prompt,
          provider,
          apiKey,
          model,
          temperature,
          maxTokens,
        })) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ token })}\n\n`)
          )
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (error) {
        console.error('AI Stream Route Error:', error)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: (error as Error).message || 'Errore durante lo streaming' })}\n\n`
          )
        )
      } finally {
        try {
          controller.close()
        } catch {
          // stream già chiuso dal client
        }
      }
    },
    cancel() {
      // client disconnesso: ferma la generazione
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
