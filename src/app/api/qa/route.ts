import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/get-user'
import { callProductionAI } from '@/lib/ai-provider'
import { languageName } from '@/lib/ai-translation'
import type { User } from '@/lib/types'

interface CaptionSegment {
  start: number
  end: number
  text: string
}

// Q&A è una feature Premium: la verifica del piano avviene server-side
// ad ogni richiesta, mai solo lato UI (spec §7).
function isPremiumUser(user: User): boolean {
  return user.subscriptionStatus === 'active' && user.subscriptionPlan !== 'free'
}

// ── RAG leggero (spec §8): chunking + retrieval per similarità testuale ──────

// Sotto questa lunghezza il transcript va intero al modello (retrieval inutile)
const FULL_TRANSCRIPT_CHAR_LIMIT = 4000
const CHUNK_SIZE = 12 // segmenti per chunk
const TOP_K_CHUNKS = 4

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-zà-ž0-9]+/)
      .filter(Boolean)
  )
}

function scoreChunk(questionTokens: Set<string>, chunkText: string): number {
  const tokens = tokenize(chunkText)
  if (tokens.size === 0) return 0
  let overlap = 0
  for (const t of questionTokens) {
    if (tokens.has(t)) overlap++
  }
  // normalizzazione tipo cosine: penalizza i chunk molto lunghi
  return overlap / Math.sqrt(questionTokens.size * tokens.size)
}

function chunkCaptions(captions: CaptionSegment[]): { start: number; end: number; text: string }[] {
  const chunks: { start: number; end: number; text: string }[] = []
  for (let i = 0; i < captions.length; i += CHUNK_SIZE) {
    const slice = captions.slice(i, i + CHUNK_SIZE)
    chunks.push({
      start: slice[0].start,
      end: slice[slice.length - 1].end,
      text: slice.map((c) => c.text).join(' '),
    })
  }
  return chunks
}

function buildContext(question: string, captions: CaptionSegment[]): {
  context: string
  partial: boolean
} {
  const full = captions.map((c) => c.text).join(' ')

  if (full.length <= FULL_TRANSCRIPT_CHAR_LIMIT) {
    return { context: full, partial: false }
  }

  const questionTokens = tokenize(question)
  const chunks = chunkCaptions(captions)
  const scored = chunks.map((chunk) => ({ chunk, score: scoreChunk(questionTokens, chunk.text) }))
  scored.sort((a, b) => b.score - a.score)

  // Se nessun chunk ha sovrapposizione, ripiega sui primi chunk (intro del video)
  const relevant = scored.slice(0, TOP_K_CHUNKS)
  const context = relevant
    .map((r) => `[${formatTime(r.chunk.start)} → ${formatTime(r.chunk.end)}] ${r.chunk.text}`)
    .join('\n')

  return { context, partial: true }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const { user } = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Non autenticato.' }, { status: 401 })
    }

    if (!isPremiumUser(user)) {
      return NextResponse.json(
        {
          error:
            'La funzione Q&A è disponibile solo per gli abbonati Premium. Passa a un piano a pagamento per usarla.',
        },
        { status: 403 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      captions?: CaptionSegment[]
      question?: string
      targetLanguage?: string
    }

    const question = (body.question || '').trim()
    const captions = (Array.isArray(body.captions) ? body.captions : [])
      .map((c) => ({
        start: Number(c.start) || 0,
        end: Number(c.end) || 0,
        text: (c.text || '').replace(/\s+/g, ' ').trim(),
      }))
      .filter((c) => c.text)
    const targetLanguage = body.targetLanguage || 'it'

    if (!question) {
      return NextResponse.json(
        { error: 'La domanda è obbligatoria.' },
        { status: 400 }
      )
    }

    if (captions.length === 0) {
      return NextResponse.json(
        { error: 'Nessuna trascrizione disponibile.' },
        { status: 400 }
      )
    }

    const { context, partial } = buildContext(question, captions)
    const langName = languageName(targetLanguage)

    const prompt = `Sei un assistente esperto che risponde a domande sul contenuto di un video basandosi sui suoi sottotitoli.
${partial ? 'Il video è lungo: ti vengono forniti solo i passaggi più rilevanti per la domanda. Se la risposta non è tra questi, dì che non hai abbastanza informazioni.' : ''}

SOTTOTITOLI DEL VIDEO:
"${context}"

DOMANDA: "${question}"

Rispondi in ${langName} in modo chiaro e conciso, basandoti SOLO sulle informazioni presenti nei sottotitoli. Se la risposta non è nei sottotitoli, dì che non hai abbastanza informazioni per rispondere.

RISPOSTA:`

    const result = await callProductionAI({ prompt })

    return NextResponse.json({ success: true, answer: result.text })
  } catch (error) {
    console.error('QA API Route Error:', error)
    return NextResponse.json(
      {
        error:
          (error as Error).message ||
          "Errore durante l'elaborazione della domanda",
      },
      { status: 500 }
    )
  }
}
