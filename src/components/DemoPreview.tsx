'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Sparkles, Check, Globe, MessageCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/LanguageContext'
import QAOverlay from './QAOverlay'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'pt', label: 'Português' },
  { code: 'ja', label: '日本語' },
]

const LANGUAGE_VIDEOS: Record<string, string> = {
  en: 'n7g6T6HNymo',
  es: 'dzj0j4KXOZk',
  de: '03mJcLCSaVM',
  fr: 'iarRi5ttZvU',
  pt: 'STkIzO7K57c',
  ja: '8v8gLyky0HM',
}

const LANG_LABELS: Record<string, string> = {
  en: 'Inglese', it: 'Italiano', es: 'Spagnolo',
  fr: 'Francese', de: 'Tedesco', pt: 'Portoghese', ja: 'Giapponese',
}

type SubtitleSegment = { start: number; end: number; text: string }
type SubtitleTrack = SubtitleSegment[]

type YTPlayer = {
  loadVideoById: (videoId: string) => void
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
  playVideo: () => void
  getCurrentTime: () => number
  setOption: (module: string, option: string, value: Record<string, string>) => void
}

type YTNamespace = {
  Player: new (el: HTMLElement | string, options: {
    videoId: string
    playerVars?: Record<string, string | number | undefined>
    events?: { onReady?: (event: { target: YTPlayer }) => void }
  }) => YTPlayer
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const subtitleAnim: Variants = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -12, filter: 'blur(4px)' },
}

let youtubeApiPromise: Promise<YTNamespace> | null = null

function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YT API disponibile solo nel browser'))
  }
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (youtubeApiPromise) return youtubeApiPromise

  youtubeApiPromise = new Promise((resolve, reject) => {
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      tag.onerror = () => reject(new Error('Impossibile caricare YouTube IFrame API'))
      document.head.appendChild(tag)
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      if (window.YT) resolve(window.YT)
      else reject(new Error('YT non disponibile'))
    }
  })
  return youtubeApiPromise
}

function useTypewriter(text: string, speed = 40): string {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    if (!text) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) clearInterval(interval)
    }, speed)
    return () => clearInterval(interval)
  }, [text, speed])

  return displayed
}

const Cursor = ({ len, total }: { len: number; total: number }) =>
  len < total ? <span className="inline-block w-[2px] h-[1em] bg-white/80 ml-0.5 animate-pulse align-middle" /> : null

export default function DemoPreview() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const [selectedLang, setSelectedLang] = useState('en')
  const [currentSegment, setCurrentSegment] = useState<SubtitleSegment | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)
  const [originalTrack, setOriginalTrack] = useState<SubtitleTrack>([])
  const [translatedTrack, setTranslatedTrack] = useState<SubtitleTrack>([])
  const [loading, setLoading] = useState(false)
  const [bridgeReady, setBridgeReady] = useState(false)
  const [qaOpen, setQaOpen] = useState(false)

  const isTeam = session?.user?.subscriptionPlan === 'team'
  const playerContainerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.source !== 'captionboost-extension') return
      if (event.data.action === 'bridgeReady') setBridgeReady(true)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  const fetchCaptions = useCallback(async (videoId: string, lang: string, sourceLang?: string) => {
    if (bridgeReady) {
      try {
        const result = await new Promise<{ success: boolean; captions?: SubtitleTrack }>((resolve) => {
          const requestId = Date.now()
          const handler = (event: MessageEvent) => {
            if (event.data?.source !== 'captionboost-extension' || event.data.action !== 'captionsResult' || event.data.requestId !== requestId) return
            window.removeEventListener('message', handler)
            resolve(event.data)
          }
          window.addEventListener('message', handler)
          window.postMessage({ source: 'captionboost-webapp', action: 'fetchCaptions', requestId, videoId, lang, sourceLang }, '*')
          setTimeout(() => { window.removeEventListener('message', handler); resolve({ success: false }) }, 10000)
        })
        if (result.success && result.captions) return result.captions
      } catch { /* ignore */ }
    }

    try {
      const params = new URLSearchParams({ videoId, lang })
      if (sourceLang) params.set('sourceLang', sourceLang)
      const resp = await fetch(`/api/captions?${params}`)
      if (!resp.ok) return null
      const data = await resp.json()
      return data.captions as SubtitleTrack
    } catch { return null }
  }, [bridgeReady])

  useEffect(() => {
    let cancelled = false
    const videoId = LANGUAGE_VIDEOS[selectedLang]

    async function load() {
      setLoading(true)
      const [orig, trans] = await Promise.all([
        fetchCaptions(videoId, selectedLang),
        fetchCaptions(videoId, 'it', selectedLang),
      ])
      if (cancelled) return
      setOriginalTrack(orig || [])
      setTranslatedTrack(trans || [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [selectedLang, fetchCaptions])

  useEffect(() => {
    let cancelled = false

    loadYouTubeApi().then((YT) => {
      if (cancelled || !playerContainerRef.current || playerRef.current) return
      playerRef.current = new YT.Player(playerContainerRef.current, {
        videoId: LANGUAGE_VIDEOS[selectedLang],
        playerVars: { autoplay: 0, controls: 1, rel: 0, modestbranding: 1, playsinline: 1, cc_load_policy: 1, cc_lang_pref: selectedLang },
        events: { onReady: () => { if (!cancelled) setIsReady(true) } },
      })
    }).catch((err) => console.error('YouTube API error:', err))

    return () => { cancelled = true; if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }
  }, [])

  useEffect(() => {
    const player = playerRef.current
    if (!player || !isReady) return
    player.loadVideoById(LANGUAGE_VIDEOS[selectedLang])
    try { player.setOption('captions', 'track', { languageCode: selectedLang }) } catch { /* */ }
    setCurrentSegment(null)
  }, [selectedLang, isReady])

  useEffect(() => {
    if (!isReady || originalTrack.length === 0) return

    pollRef.current = setInterval(() => {
      const player = playerRef.current
      if (!player) return
      let time = 0
      try { time = player.getCurrentTime() } catch { return }
      const seg = originalTrack.find((s) => time >= s.start && time < s.end) || null
      setCurrentSegment((prev) => {
        if (prev && seg && prev.start === seg.start && prev.end === seg.end) return prev
        return seg
      })
    }, 200)

    return () => { clearInterval(pollRef.current!); pollRef.current = null }
  }, [isReady, selectedLang, originalTrack])

  const originalText = currentSegment?.text || ''
  const translatedSeg = translatedTrack.find((s) => s.start === currentSegment?.start && s.end === currentSegment?.end)
  const translationText = translatedSeg?.text || ''
  const showOrig = showOriginal && originalText !== translationText

  const typedOriginal = useTypewriter(originalText, 30)
  const typedTranslated = useTypewriter(translationText, 25)

  const currentIndex = originalTrack.findIndex((s) => s.start === currentSegment?.start && s.end === currentSegment?.end)

  return (
    <section className="relative py-14 sm:py-16 bg-white">
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200/50 rounded-full text-xs font-medium text-primary mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('demoLivePreview')}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 underline decoration-blue-400/60 decoration-2 underline-offset-4">
            {t('demoTitle')}
          </h2>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl mx-auto">
            {t('demoDesc')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.code
              return (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLang(lang.code)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isSelected
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/30 hover:text-primary hover:shadow-sm'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  <span>{lang.label}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-3">
            <Globe className="w-4 h-4 text-primary" />
            <span>{LANG_LABELS[selectedLang]} → Italiano</span>
          </div>

          <div className="relative max-w-3xl mx-auto rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-2xl shadow-slate-900/10">
            <div className="relative aspect-video bg-slate-900">
              <div ref={playerContainerRef} className="absolute inset-0 w-full h-full" />

              <AnimatePresence>
                {qaOpen && (
                  <QAOverlay
                    videoTitle={`Video ${LANG_LABELS[selectedLang]}`}
                    captionsContext={originalTrack.map((s) => s.text).join(' ')}
                    onClose={() => setQaOpen(false)}
                  />
                )}
              </AnimatePresence>

              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pointer-events-none z-10">
                <div className="max-w-[90%] mx-auto text-center flex flex-col items-center justify-end gap-1.5">
                  {loading && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 text-white text-xs">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                      </span>
                      Caricamento sottotitoli...
                    </div>
                  )}
                  {!loading && !bridgeReady && originalTrack.length === 0 && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-900/60 text-red-200 text-xs border border-red-500/30">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span>Apri il video su YouTube e ricarica l'estensione</span>
                    </div>
                  )}
                  <AnimatePresence mode="wait">
                    {currentSegment && (
                      <motion.div
                        key={`${selectedLang}-${currentSegment.start}`}
                        variants={subtitleAnim}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="inline-block bg-black/90 rounded-xl px-6 py-3 border-l-4 border-primary shadow-lg shadow-primary/20 font-sans"
                      >
                        {showOrig && (
                          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-0.5 min-h-[1.25em]">
                            {typedOriginal}
                            <Cursor len={typedOriginal.length} total={originalText.length} />
                          </p>
                        )}
                        <p className="text-white text-sm sm:text-base md:text-lg font-semibold leading-relaxed drop-shadow-lg min-h-[1.25em]">
                          {typedTranslated}
                          <Cursor len={typedTranslated.length} total={translationText.length} />
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="absolute bottom-2 right-2 pointer-events-auto">
                  <button
                    onClick={() => {
                      if (isTeam) {
                        setQaOpen((prev) => !prev)
                      } else {
                        document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shadow-lg ${
                      isTeam
                        ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/25'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-600/50'
                    }`}
                    title={isTeam ? 'Q&A con AI' : 'Disponibile con abbonamento Pro'}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Q&A</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {originalTrack.length > 0 && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>AI Transcript · {LANG_LABELS[selectedLang]} → Italiano</span>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showOriginal}
                    onChange={(e) => setShowOriginal(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary/30"
                  />
                  Mostra originale
                </label>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {originalTrack.map((seg, i) => {
                  const transSeg = translatedTrack.find((o) => o.start === seg.start)
                  return (
                    <button
                      key={seg.start}
                      onClick={() => {
                        const player = playerRef.current
                        if (!player) return
                        try { player.seekTo(seg.start, true); player.playVideo() } catch { /* */ }
                      }}
                      className={`w-full text-left grid grid-cols-1 sm:grid-cols-[4rem_1fr_1fr] gap-2 sm:gap-4 px-5 py-3 transition-colors ${
                        i === currentIndex
                          ? 'bg-sky-50/80 border-l-4 border-primary'
                          : 'hover:bg-slate-50/50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="text-xs font-mono text-slate-400 sm:pt-0.5">
                        {String(Math.floor(seg.start)).padStart(2, '0')}:{String(Math.round((seg.start % 1) * 60)).padStart(2, '0')}
                      </div>
                      <div className="text-sm text-slate-600 leading-relaxed text-left">{seg.text}</div>
                      <div className="text-sm font-semibold text-slate-900 leading-relaxed text-left">{transSeg?.text || ''}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
