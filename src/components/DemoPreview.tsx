'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Sparkles, Globe, Languages, ChevronRight } from 'lucide-react'
import { DEMO_LANGS, type DemoLang } from '@/lib/demo-subtitles'

// ─── Tipi minimi per YouTube IFrame Player API ───────────────────────────────

declare global {
  interface Window {
    YT?: {
      Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; CUED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

interface YTPlayerOptions {
  videoId: string
  playerVars?: Record<string, string | number | boolean>
  events?: {
    onReady?: (event: { target: YTPlayer }) => void
    onStateChange?: (event: { data: number }) => void
    onError?: (event: { data: number }) => void
  }
}

interface YTPlayer {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead?: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  setVolume(v: number): void
  loadVideoById(videoId: string): void
  cueVideoById(videoId: string): void
  destroy(): void
}

// ─── Animation variants ───────────────────────────────────────────────────────

const subtitleIn: Variants = {
  initial: { opacity: 0, y: 14, filter: 'blur(6px)' },
  animate: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.38, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -10, filter: 'blur(4px)', transition: { duration: 0.22 } },
}

const originalIn: Variants = {
  initial: { opacity: 0, x: -6 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, delay: 0.08 } },
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DemoPreview() {
  const [activeLang, setActiveLang]     = useState<DemoLang>(DEMO_LANGS[0])
  const [position, setPosition]         = useState(0)
  const [isPlaying, setIsPlaying]       = useState(false)
  const [ytReady, setYtReady]           = useState(false)

  const playerRef     = useRef<HTMLDivElement>(null)
  const ytPlayerRef   = useRef<YTPlayer | null>(null)
  const activeLangRef = useRef<DemoLang>(DEMO_LANGS[0])
  const resumePosRef  = useRef<number | null>(null)

  // Segmento corrente in base alla posizione reale del video
  const segs = activeLang.segments
  const first = segs[0]
  const last = segs[segs.length - 1]
  const currentSeg =
    segs.find(s => position >= s.start && position < s.end) ??
    (first && position < first.start ? first : last) ?? null

  const totalDuration = activeLang.segments[activeLang.segments.length - 1]?.end ?? 60

  // ── Carica la YouTube IFrame API (una sola volta) ──
  useEffect(() => {
    if (window.YT?.Player) {
      setYtReady(true)
      return
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      setYtReady(true)
    }
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
    return () => { window.onYouTubeIframeAPIReady = prev }
  }, [])

  // ── Crea il player reale (una volta, quando l'API è pronta) ──
  useEffect(() => {
    if (!ytReady || !playerRef.current) return

    const player = new window.YT!.Player(playerRef.current, {
      videoId: DEMO_LANGS[0].youtubeId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        rel: 0,
        playsinline: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: (e) => {
          ytPlayerRef.current = e.target
          if (activeLangRef.current.youtubeId !== DEMO_LANGS[0].youtubeId) {
            e.target.cueVideoById(activeLangRef.current.youtubeId)
          }
        },
        onStateChange: (e) => {
          // I sottotitoli si vedono solo mentre il video sta riproducendo:
          // nascosti se il video è in pausa, in coda o terminato.
          setIsPlaying(e.data === window.YT!.PlayerState.PLAYING)
          // Al primo play dopo un cambio lingua, riprendi da dove si era interrotta
          if (e.data !== window.YT!.PlayerState.PLAYING) return
          const p = ytPlayerRef.current
          const resume = resumePosRef.current
          if (!p || resume == null) return
          resumePosRef.current = null
          const segs = activeLangRef.current.segments
          const maxEnd = segs[segs.length - 1]?.end ?? 0
          p.seekTo(Math.min(resume, maxEnd), true)
        },
        onError: () => {
          // video non disponibile: resta visibile la miniatura
        },
      },
    })

    return () => {
      ytPlayerRef.current = null
      try { player.destroy() } catch { /* noop */ }
    }
  }, [ytReady]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reset della posizione quando cambia lingua ──
  useEffect(() => {
    activeLangRef.current = activeLang
    setPosition(0)
  }, [activeLang])

  // ── Sincronizzazione: legge il tempo reale del video (sottotitoli = voce) ──
  useEffect(() => {
    if (!ytReady) return
    const iv = setInterval(() => {
      const p = ytPlayerRef.current
      if (!p) return
      const t = p.getCurrentTime()
      const dur = p.getDuration() || 0
      // Se il video è terminato, riporta la posizione alla fine della trascrizione
      setPosition(dur > 0 && t >= dur - 0.5 ? totalDuration : t)
    }, 200)
    return () => clearInterval(iv)
  }, [ytReady, totalDuration])

  const switchLang = (lang: DemoLang) => {
    setActiveLang(lang)
    const p = ytPlayerRef.current
    if (p) {
      resumePosRef.current = p.getCurrentTime()
      p.cueVideoById(lang.youtubeId)
    }
    setPosition(0)
  }

  return (
    <section className="relative py-16 sm:py-24 bg-white overflow-hidden">
      {/* Subtle background texture */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, hsl(210 80% 97%) 0%, transparent 60%), radial-gradient(circle at 70% 80%, hsl(210 80% 97%) 0%, transparent 50%)' }} />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200/50 rounded-full text-xs font-semibold text-primary mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Demo interattiva</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            Guarda CaptionBoost in azione
          </h2>
          <p className="text-slate-500 mt-3 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Scegli una lingua e premi play: i sottotitoli reali del video vengono tradotti in italiano dall&apos;AI, sincronizzati con la voce.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          {/* Language selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {DEMO_LANGS.map(lang => {
              const active = activeLang.code === lang.code
              return (
                <button
                  key={lang.code}
                  onClick={() => switchLang(lang)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-primary/40 hover:text-primary hover:shadow-sm'
                  }`}
                >
                  <span className="text-base leading-none">{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              )
            })}
          </div>

          {/* Translation direction badge */}
          <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-5">
            <Globe className="w-4 h-4 text-primary" />
            <span className="font-medium text-slate-700">{activeLang.nativeName}</span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <Languages className="w-4 h-4 text-emerald-500" />
            <span className="font-medium text-emerald-700">Italiano</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">AI</span>
          </div>

          {/* Player card */}
          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-900/10 bg-slate-950">

            {/* Video area */}
            <div className="relative aspect-video bg-slate-900 overflow-hidden">

              {/* Fallback thumbnail (visibile finché il player non è pronto) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeLang.thumbnail}
                alt={activeLang.videoTitle}
                className="absolute inset-0 w-full h-full object-cover opacity-60"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />

              {/* Real YouTube player */}
              <div ref={playerRef} className="absolute inset-0 w-full h-full" />

              {/* Soft bottom gradient for legibility */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />

              {/* Subtitle overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-16 sm:pb-20 pointer-events-none">
                <div className="flex flex-col items-center gap-1.5">
                  <AnimatePresence mode="wait">
                    {isPlaying && currentSeg && (
                      <motion.div
                        key={`${activeLang.code}-${currentSeg.start}`}
                        variants={subtitleIn}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="max-w-2xl w-full"
                      >
                        {/* Original line */}
                        <motion.div variants={originalIn} initial="initial" animate="animate"
                          className="text-center mb-1.5"
                        >
                          <span className="inline-block bg-black/70 text-slate-400 text-xs sm:text-sm px-4 py-1 rounded-lg leading-relaxed font-normal">
                            {currentSeg.original}
                          </span>
                        </motion.div>
                        {/* Translated line */}
                        <div className="text-center">
                          <span
                            className="inline-block px-5 py-2.5 rounded-xl text-sm sm:text-base md:text-lg font-bold leading-snug drop-shadow-xl"
                            style={{
                              background: 'rgba(0,0,0,0.88)',
                              borderLeft: '3px solid var(--color-primary)',
                              color: '#ffffff',
                            }}
                          >
                            {currentSeg.translated}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>

          </div>

          {/* Bottom note */}
          <p className="text-center text-xs text-slate-400 mt-5">
            Demo con trascrizioni reali dei video e traduzione AI · La qualità nella versione reale è identica.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
