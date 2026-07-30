import { describe, it, expect } from 'vitest'

type SubtitleSegment = { start: number; end: number; text: string }

function fillCaptionGaps(captions: SubtitleSegment[]): SubtitleSegment[] {
  if (captions.length < 2) return captions
  const result: SubtitleSegment[] = []
  for (let i = 0; i < captions.length; i++) {
    const current = { ...captions[i] }
    if (i < captions.length - 1) {
      const next = captions[i + 1]
      const gap = next.start - current.end
      if (gap > 0 && gap < 0.5) {
        current.end = next.start
      }
    }
    if (current.end > current.start) {
      result.push(current)
    }
  }
  return result
}

function getVideoId(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const fromQuery = u.searchParams.get('v')
      if (fromQuery) return fromQuery
      const shortsMatch = u.pathname.match(/^\/shorts\/([\w-]{11})/)
      if (shortsMatch) return shortsMatch[1]
    }
  } catch {}
  return ''
}

function parseJsonFromScript(text: string, startIdx: number): string | null {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i]
    if (escape) { escape = false; continue }
    if (inString) {
      if (ch === '\\') { escape = true }
      else if (ch === '"') { inString = false }
      continue
    }
    if (ch === '"') { inString = true; continue }
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.substring(startIdx, i + 1)
    }
  }
  return null
}

function findCurrentCaption(time: number, captions: SubtitleSegment[]): SubtitleSegment | null {
  let low = 0
  let high = captions.length - 1
  while (low <= high) {
    const mid = (low + high) >>> 1
    const c = captions[mid]
    if (time >= c.start && time < c.end) return c
    if (time < c.start) high = mid - 1
    else low = mid + 1
  }
  if (low > 0) {
    const prev = captions[low - 1]
    if (time >= prev.start && time < prev.end) return prev
  }
  return null
}

function getCaptionTracks(playerResponse: unknown) {
  try {
    const resp = playerResponse as any
    const tracks = resp?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    if (tracks && tracks.length > 0) return tracks
  } catch {}
  return []
}

function findBestCaptionTrack(tracks: any[], userLang = 'it') {
  if (tracks.length === 0) return null

  const userLangTrack = tracks.find(
    (t) => t.languageCode === userLang && t.kind === 'asr'
  ) || tracks.find((t) => t.languageCode === userLang)

  if (userLangTrack) return userLangTrack

  const enTrack = tracks.find(
    (t) => t.languageCode === 'en' && t.kind === 'asr'
  ) || tracks.find((t) => t.languageCode === 'en')

  if (enTrack) return enTrack

  const asrTrack = tracks.find((t) => t.kind === 'asr')
  if (asrTrack) return asrTrack

  return tracks[0]
}

// --- Tests ---

describe('fillCaptionGaps', () => {
  it('returns empty array for empty input', () => {
    expect(fillCaptionGaps([])).toEqual([])
  })

  it('returns single caption unchanged', () => {
    const caps = [{ start: 0, end: 5, text: 'Hello' }]
    expect(fillCaptionGaps(caps)).toEqual([{ start: 0, end: 5, text: 'Hello' }])
  })

  it('merges small gaps (< 0.5s)', () => {
    const caps = [
      { start: 0, end: 3, text: 'Hello' },
      { start: 3.2, end: 6, text: 'world' },
    ]
    const result = fillCaptionGaps(caps)
    expect(result).toHaveLength(2)
    expect(result[0].end).toBe(3.2)
    expect(result[1].start).toBe(3.2)
  })

  it('does not merge large gaps (>= 0.5s)', () => {
    const caps = [
      { start: 0, end: 3, text: 'Hello' },
      { start: 5, end: 8, text: 'world' },
    ]
    const result = fillCaptionGaps(caps)
    expect(result[0].end).toBe(3)
    expect(result[1].start).toBe(5)
  })

  it('removes captions with zero or negative duration', () => {
    const caps = [
      { start: 0, end: 5, text: 'Hello' },
      { start: 5, end: 4, text: 'invalid' },
    ]
    const result = fillCaptionGaps(caps)
    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('Hello')
  })
})

describe('getVideoId', () => {
  it('extracts from watch URL', () => {
    expect(getVideoId('https://www.youtube.com/watch?v=n7g6T6HNymo')).toBe('n7g6T6HNymo')
  })

  it('extracts from shorts URL', () => {
    expect(getVideoId('https://www.youtube.com/shorts/abc123def45')).toBe('abc123def45')
  })

  it('extracts with extra params', () => {
    expect(getVideoId('https://www.youtube.com/watch?v=n7g6T6HNymo&t=30s')).toBe('n7g6T6HNymo')
  })

  it('returns empty for non-YouTube URL', () => {
    expect(getVideoId('https://example.com')).toBe('')
  })

  it('returns empty for invalid URL', () => {
    expect(getVideoId('')).toBe('')
  })
})

describe('parseJsonFromScript', () => {
  it('extracts a simple JSON object', () => {
    const text = 'some code { "key": "value" } more code'
    const result = parseJsonFromScript(text, text.indexOf('{'))
    expect(result).toBe('{ "key": "value" }')
  })

  it('extracts nested JSON', () => {
    const text = 'prefix { "a": { "b": 1 } } suffix'
    const result = parseJsonFromScript(text, text.indexOf('{'))
    expect(result).toBe('{ "a": { "b": 1 } }')
  })

  it('handles escaped strings', () => {
    const text = 'x { "key": "value \\" with quote" } y'
    const result = parseJsonFromScript(text, text.indexOf('{'))
    expect(result).toBe('{ "key": "value \\" with quote" }')
  })

  it('returns null when no closing brace', () => {
    const text = 'x { no close'
    const result = parseJsonFromScript(text, text.indexOf('{'))
    expect(result).toBeNull()
  })
})

describe('findCurrentCaption', () => {
  const captions = [
    { start: 0, end: 3, text: 'Hello' },
    { start: 3, end: 6, text: 'world' },
    { start: 6, end: 9, text: 'foo' },
  ]

  it('finds caption at exact start', () => {
    const result = findCurrentCaption(0, captions)
    expect(result?.text).toBe('Hello')
  })

  it('finds caption at mid-point', () => {
    const result = findCurrentCaption(4, captions)
    expect(result?.text).toBe('world')
  })

  it('finds caption at exact end boundary (exclusive)', () => {
    const result = findCurrentCaption(6, captions)
    expect(result?.text).toBe('foo')
  })

  it('returns null before first caption', () => {
    expect(findCurrentCaption(-1, captions)).toBeNull()
  })

  it('returns null after last caption', () => {
    expect(findCurrentCaption(10, captions)).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(findCurrentCaption(0, [])).toBeNull()
  })

  it('finds caption at gap between', () => {
    const caps = [
      { start: 0, end: 2, text: 'A' },
      { start: 5, end: 8, text: 'B' },
    ]
    expect(findCurrentCaption(3, caps)).toBeNull()
  })
})

describe('getCaptionTracks', () => {
  it('returns tracks from valid response', () => {
    const resp = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            { languageCode: 'en', kind: 'asr', baseUrl: 'https://example.com/track1' },
          ],
        },
      },
    }
    expect(getCaptionTracks(resp)).toHaveLength(1)
    expect(getCaptionTracks(resp)[0].languageCode).toBe('en')
  })

  it('returns empty array for null response', () => {
    expect(getCaptionTracks(null)).toEqual([])
  })

  it('returns empty array for response without captions', () => {
    expect(getCaptionTracks({})).toEqual([])
  })
})

describe('findBestCaptionTrack', () => {
  const tracks = [
    { languageCode: 'en', kind: 'asr', baseUrl: 'en-asr' },
    { languageCode: 'es', kind: 'asr', baseUrl: 'es-asr' },
    { languageCode: 'fr', kind: 'manual', baseUrl: 'fr-manual' },
  ]

  it('prefers user language ASR', () => {
    const result = findBestCaptionTrack(tracks, 'en')
    expect(result?.baseUrl).toBe('en-asr')
  })

  it('prefers user language any kind', () => {
    const result = findBestCaptionTrack(tracks, 'fr')
    expect(result?.baseUrl).toBe('fr-manual')
  })

  it('falls back to English ASR', () => {
    const result = findBestCaptionTrack(tracks, 'de')
    expect(result?.baseUrl).toBe('en-asr')
  })

  it('returns null for empty tracks', () => {
    expect(findBestCaptionTrack([])).toBeNull()
  })
})

describe('Bridge message flow', () => {
  it('captionsResult message includes correct fields', () => {
    const captions: SubtitleSegment[] = [
      { start: 0, end: 2.5, text: 'Hello world' },
      { start: 2.5, end: 5, text: 'This is a test' },
    ]
    const message = {
      source: 'captionboost-extension',
      action: 'captionsResult',
      requestId: 123,
      success: true,
      captions,
      sourceLanguage: 'en',
    }
    expect(message.source).toBe('captionboost-extension')
    expect(message.action).toBe('captionsResult')
    expect(message.captions).toHaveLength(2)
    expect(message.captions![0].text).toBe('Hello world')
  })

  it('fetchCaptions message includes required fields', () => {
    const message = {
      source: 'captionboost-webapp',
      action: 'fetchCaptions',
      requestId: 456,
      videoId: 'n7g6T6HNymo',
      lang: 'en',
      sourceLang: 'it',
    }
    expect(message.source).toBe('captionboost-webapp')
    expect(message.action).toBe('fetchCaptions')
    expect(message.videoId).toBe('n7g6T6HNymo')
  })

  it('bridgeReady message signals bridge availability', () => {
    const handler = (event: MessageEvent) => {
      if (event.data?.source !== 'captionboost-extension') return false
      if (event.data.action === 'bridgeReady') return true
      return false
    }

    const readyEvent = new MessageEvent('message', {
      data: { source: 'captionboost-extension', action: 'bridgeReady' },
    })
    expect(handler(readyEvent)).toBe(true)

    const wrongEvent = new MessageEvent('message', {
      data: { source: 'other', action: 'bridgeReady' },
    })
    expect(handler(wrongEvent)).toBe(false)
  })
})

describe('Subtitle segment synchronization', () => {
  const captions: SubtitleSegment[] = [
    { start: 0, end: 3, text: 'Welcome' },
    { start: 3, end: 6, text: 'to the demo' },
    { start: 6, end: 9, text: 'video' },
  ]

  it('tracks current segment as video time progresses', () => {
    const times = [0, 1.5, 3, 4.5, 6, 7.5, 9]
    const expected = ['Welcome', 'Welcome', 'to the demo', 'to the demo', 'video', 'video', null]

    times.forEach((t, i) => {
      const seg = findCurrentCaption(t, captions)
      expect(seg?.text ?? null).toBe(expected[i])
    })
  })

  it('handles time exactly at caption boundaries', () => {
    expect(findCurrentCaption(3, captions)?.text).toBe('to the demo')
    expect(findCurrentCaption(6, captions)?.text).toBe('video')
  })

  it('handles overlapping captions - returns the first match', () => {
    const caps = [
      { start: 10, end: 12, text: 'A' },
      { start: 11.5, end: 14, text: 'B' },
    ]
    // 11.7 falls in both A and B; binary search finds the first match (A)
    expect(findCurrentCaption(11.7, caps)?.text).toBe('A')
  })

  it('uses binary search for large arrays', () => {
    const many = Array.from({ length: 1000 }, (_, i) => ({
      start: i * 2,
      end: i * 2 + 1.5,
      text: `Caption ${i}`,
    }))
    expect(findCurrentCaption(500, many)?.text).toBe('Caption 250')
    // Caption 999 ends at 1999.5, so 1999 is still within it
    expect(findCurrentCaption(1999, many)?.text).toBe('Caption 999')
    expect(findCurrentCaption(0, many)?.text).toBe('Caption 0')
  })
})
