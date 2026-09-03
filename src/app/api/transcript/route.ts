import { NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'

// Fallback server-side per la trascrizione (spec §3 step 2): quando il client
// non trova captions su YouTube, il background chiede qui la trascrizione
// tramite la libreria youtube-transcript.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId') || ''

    if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
      return NextResponse.json(
        { error: 'Parametro "videoId" mancante o non valido.' },
        { status: 400 }
      )
    }

    const items = await YoutubeTranscript.fetchTranscript(videoId)

    const captions = items
      .map((item) => {
        const start = (item.offset || 0) / 1000
        const duration = (item.duration || 0) / 1000
        return {
          start,
          end: start + (duration > 0 ? duration : 3),
          text: item.text.replace(/\s+/g, ' ').trim(),
        }
      })
      .filter((c) => c.text)

    if (captions.length === 0) {
      return NextResponse.json(
        { error: 'Trascrizione non disponibile per questo video.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, captions })
  } catch (error) {
    console.error('Transcript API Route Error:', error)
    const message = (error as Error).message || 'Impossibile recuperare la trascrizione.'
    // Errori noti della libreria → rispondi 404 con messaggio leggibile
    const notAvailable = /unavailable|disabled|not available|no transcript|not found/i.test(message)
    return NextResponse.json(
      {
        error: notAvailable
          ? 'Trascrizione non disponibile per questo video.'
          : message,
      },
      { status: notAvailable ? 404 : 500 }
    )
  }
}
