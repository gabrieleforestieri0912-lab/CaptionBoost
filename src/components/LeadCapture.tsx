'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function LeadCapture() {
  return (
    <section className="py-14 sm:py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl p-6 sm:p-8 border border-slate-200 bg-white shadow-sm"
        >

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200/50 rounded-full text-xs font-medium text-primary mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prova gratuita</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Prova CaptionBoost — 14 giorni gratis
            </h3>
            <p className="text-slate-500 mt-2 mb-6 text-sm max-w-lg mx-auto">
              Nessuna carta di credito richiesta. Inizia ora con un account
              gratuito e scopri la potenza dell&apos;AI applicata ai sottotitoli.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary text-white font-semibold transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 text-sm"
              >
                Crea account gratuito
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-all text-sm"
              >
                Vedi piani
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
