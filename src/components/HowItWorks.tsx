'use client'

import { motion } from 'framer-motion'
import { Play, Globe, Download, ArrowRight, type LucideIcon } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Step {
  icon: LucideIcon
  titleKey: string
  descKey: string
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
}

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
}

const steps: Step[] = [
  { icon: Download, titleKey: 'step1Title', descKey: 'step1Desc' },
  { icon: Play, titleKey: 'step2Title', descKey: 'step2Desc' },
  { icon: Globe, titleKey: 'step3Title', descKey: 'step3Desc' },
]

export default function HowItWorks() {
  const { t } = useLanguage()
  return (
    <section id="how-it-works" className="py-14 sm:py-16 bg-white">

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/15 rounded-full text-xs font-medium text-primary mb-3">
            <Play className="w-3.5 h-3.5" />
            <span>{t("howItWorksBadge")}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {t("howItWorksTitle")}
          </h2>
          <p className="text-slate-500 mt-2 max-w-2xl mx-auto text-sm">
            {t("howItWorksDesc")}
          </p>
        </motion.div>

        <div className="relative">
          <div className="hidden lg:block absolute left-1/2 top-12 bottom-12 w-px bg-primary/20" />

          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="flex flex-col lg:flex-row items-stretch gap-6 mx-auto relative"
          >
            {steps.map((s, i) => (
              <motion.div
                key={i}
                variants={fadeIn}
                className="relative flex-1 lg:px-2 w-full"
              >
                <div className="group relative h-full">
                  <div className="absolute -inset-0.5 bg-primary/10 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className={`relative rounded-2xl border bg-white p-6 sm:p-7 transition-all duration-500 h-full flex flex-col ${
                    i === 1
                      ? 'border-primary/20 shadow-lg shadow-primary/10 ring-1 ring-primary/10'
                      : 'border-slate-100 shadow-sm hover:shadow-lg hover:border-primary/20'
                  }`}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="relative shrink-0">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                          i === 1
                            ? 'bg-primary text-white shadow-md shadow-primary/25'
                            : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white group-hover:shadow-md group-hover:shadow-primary/25'
                        }`}>
                          <s.icon className="w-6 h-6" />
                        </div>
                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 ${
                          i === 1
                            ? 'bg-white text-primary border-primary/20 shadow-sm'
                            : 'bg-primary text-white border-white shadow-sm'
                        }`}>
                          {i + 1}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-lg text-slate-900">
                          {t(s.titleKey)}
                        </h4>
                      </div>
                    </div>

                    <p className="text-slate-500 leading-relaxed text-sm flex-1">{t(s.descKey)}</p>

                    <div className="mt-5 relative">
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${((i + 1) / steps.length) * 100}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, delay: 0.3 + i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className={`h-full rounded-full bg-primary ${
                            i === 0 ? 'w-1/3' : i === 1 ? 'w-2/3' : 'w-full'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {i < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-3 z-10 items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white border-2 border-primary/15 flex items-center justify-center shadow-md group-hover:border-primary/30 transition-colors">
                      <ArrowRight className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
