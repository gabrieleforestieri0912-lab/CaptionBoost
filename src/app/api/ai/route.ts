import { NextResponse } from 'next/server'
import { callProductionAI, AiProvider } from '@/lib/ai-provider'

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

    // Se non viene specificato, il server usa il provider predefinito (DEFAULT_AI_PROVIDER,
    // di default Ollama locale con deepseek-r1).
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

    return NextResponse.json({
      response: result.text,
      provider: result.provider,
      model: result.model,
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
