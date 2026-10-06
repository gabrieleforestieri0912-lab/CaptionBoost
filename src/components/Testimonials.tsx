'use client'

import { motion } from 'framer-motion'
import { Quote, Sparkles } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Testimonials() {
  const { t } = useLanguage()
  const testimonials = [
    { name: 'Laura R.', roleKey: 'roleYoutuber', quoteKey: 'testimonial1' },
    { name: 'Marco S.', roleKey: 'roleAgency', quoteKey: 'testimonial2' },
    { name: 'Giulia P.', roleKey: 'roleEducator', quoteKey: 'testimonial3' },
  ]

  return (
    <section className="py-20 sm:py-28 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-200/50 rounded-full text-sm font-medium text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span>{t("testimonialsBadge")}</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
            {t("testimonialsTitle")}
          </h2>
          <p className="text-slate-500 mt-4 text-lg">
            {t("testimonialsDesc")}
          </p>
        </motion.div>
        <div className="grid gap-8 sm:grid-cols-3">
          {testimonials.map((item, i) => (
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
                &ldquo;{t(item.quoteKey)}&rdquo;
              </p>
              <footer className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {item.name[0]}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{item.name}</div>
                  <div className="text-sm text-slate-500 font-medium">
                    {t(item.roleKey)}
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
