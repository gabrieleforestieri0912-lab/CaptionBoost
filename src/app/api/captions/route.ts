import { NextResponse } from 'next/server'

async function fetchCaptionXML(videoId: string, lang: string) {
  const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json`
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US',
    },
  })
  if (!resp.ok) return null
  const text = await resp.text()
  if (!text || text.startsWith('<?xml') || text.startsWith('<')) {
    const regex = /<p\s+t="([\d.]+)"\s+d="([\d.]+)"[^>]*>([^<]*)<\/p>/g
    const captions: { start: number; end: number; text: string }[] = []
    let m
    while ((m = regex.exec(text)) !== null) {
      const t = m[3].trim()
      if (t) captions.push({ start: parseFloat(m[1]), end: parseFloat(m[1]) + parseFloat(m[2] || '2'), text: t })
    }
    return captions.length > 0 ? captions : null
  }
  try {
    const json = JSON.parse(text)
    if (Array.isArray(json)) {
      return json
        .filter((e: { text?: string }) => e.text?.trim())
        .map((e: { start: number; dur?: number; text: string }) => ({
          start: e.start,
          end: e.start + (e.dur || 2),
          text: e.text.trim(),
        }))
    }
    if (json.events) {
      return json.events
        .filter((e: { segs?: { utf8: string }[] }) => e.segs?.[0]?.utf8?.trim())
        .map((e: { tStartMs: number; dDurationMs?: number; segs: { utf8: string }[] }) => ({
          start: e.tStartMs / 1000,
          end: (e.tStartMs + (e.dDurationMs || 2000)) / 1000,
          text: e.segs.map((s: { utf8: string }) => s.utf8).join(' ').trim(),
        }))
    }
  } catch {}
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')
  const lang = searchParams.get('lang')
  const sourceLang = searchParams.get('sourceLang')

  if (!videoId || !lang) {
    return NextResponse.json({ error: 'videoId and lang are required' }, { status: 400 })
  }

  try {
    const directCaptions = await fetchCaptionXML(videoId, lang)
    if (directCaptions && directCaptions.length > 0) {
      return NextResponse.json({ captions: directCaptions, language: lang })
    }

    if (sourceLang) {
      const sourceCaptions = await fetchCaptionXML(videoId, sourceLang)
      if (sourceCaptions && sourceCaptions.length > 0) {
        const { translateCaptionsWithAI } = await import('@/lib/ai-translation')
        const { callProductionAI } = await import('@/lib/ai-provider')
        try {
          const translated = await translateCaptionsWithAI(
            sourceCaptions,
            'it',
            sourceLang,
            async (prompt) => {
              const res = await callProductionAI({ prompt })
              return res.text
            },
            { windowSize: 10, contextBefore: 3, contextAfter: 2 }
          )
          return NextResponse.json({
            captions: translated.captions,
            language: 'it',
            translated: true,
          })
        } catch (aiErr) {
          console.warn('AI translation failed, returning source captions:', aiErr)
          return NextResponse.json({ captions: sourceCaptions, language: sourceLang, note: 'AI Translation failed, showing source' })
        }
      }
    }

    return NextResponse.json({ captions: [], language: lang, note: 'No captions available' })
  } catch (error) {
    console.error('Captions fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch captions' }, { status: 500 })
  }
}
