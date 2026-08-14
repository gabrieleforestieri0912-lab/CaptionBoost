'use client'

import { motion } from 'framer-motion'
import { Quote, Sparkles } from 'lucide-react'

interface Testimonial {
  name: string
  role: string
  quote: string
}

export default function Testimonials() {
  const testimonials: Testimonial[] = [
    {
      name: 'Laura R.',
      role: 'YouTuber',
      quote: "Ho aumentato la portata del 30% — sottotitoli perfetti in pochi clic. L'AI è incredibilmente accurata.",
    },
    {
      name: 'Marco S.',
      role: 'Agenzia',
      quote: 'Flusso di lavoro stabile e facile integrazione con il nostro CMS. Ci ha risparmiato centinaia di ore di lavoro manuale.',
    },
    {
      name: 'Giulia P.',
      role: 'Educatrice',
      quote: 'Gli studenti capiscono meglio ora: accessibilità migliorata. Uno strumento indispensabile per ogni creatore di corsi online.',
    },
  ]

  return (
    <section className="py-20 sm:py-28 bg-slate-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-200/50 rounded-full text-sm font-medium text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Testimonianze</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
            Cosa dicono gli utenti
          </h2>
          <p className="text-slate-500 mt-4 text-lg">
            Feedback reali da creator, agenzie e educatori.
          </p>
        </motion.div>
        <div className="grid gap-8 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.blockquote
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative rounded-3xl p-8 bg-white border border-slate-100 shadow-lg shadow-slate-200/40 flex flex-col h-full hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1"
            >
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/20" />
              <p className="text-slate-600 text-lg leading-relaxed grow relative z-10">
                &ldquo;{t.quote}&rdquo;
              </p>
              <footer className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{t.name}</div>
                  <div className="text-sm text-slate-500 font-medium">
                    {t.role}
                  </div>
                </div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}
