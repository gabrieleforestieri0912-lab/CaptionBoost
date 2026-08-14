'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'

interface FAQItem {
  q: string
  a: string
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs: FAQItem[] = [
    {
      q: 'Quanto costa CaptionBoost?',
      a: 'Offriamo un piano gratuito e piani a pagamento con fatturazione mensile o annuale. Consulta la sezione Prezzi per i dettagli.',
    },
    {
      q: 'Posso usare CaptionBoost offline?',
      a: 'CaptionBoost è un servizio cloud e richiede una connessione internet per funzionare.',
    },
    {
      q: 'Quali formati di esportazione sono supportati?',
      a: 'SRT, VTT, ASS, SBV e JSON per integrazioni personalizzate.',
    },
    {
      q: 'Come proteggere la mia privacy?',
      a: "L'elaborazione locale è disponibile; nel cloud minimizziamo i log e seguiamo le migliori pratiche di sicurezza.",
    },
    {
      q: 'I sottotitoli vengono salvati automaticamente?',
      a: "Sì! Ogni volta che abiliti i sottotitoli su un video YouTube, vengono salvati automaticamente nel tuo account nella sezione 'I miei sottotitoli'.",
    },
  ]

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i)

  return (
    <section className="py-14 sm:py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200/50 rounded-full text-xs font-medium text-primary mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Domande frequenti
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            Risposte alle domande pi&ugrave; comuni su piani, privacy e utilizzo.
          </p>
        </motion.div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-slate-100 bg-white overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-sm hover:shadow-primary/5"
            >
              <button
                onClick={() => toggle(i)}
                className="flex justify-between items-center w-full p-4 cursor-pointer text-left focus:outline-none"
              >
                <h3 className="font-semibold text-slate-900 text-sm pr-4">
                  {f.q}
                </h3>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0"
                >
                  <svg
                    className="w-4 h-4 text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 text-slate-500 text-xs leading-relaxed border-t border-slate-50 pt-3">
                      {f.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
