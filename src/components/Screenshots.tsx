'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export default function Screenshots() {
  const imgs = ['/screens/shot1.png', '/screens/shot1.png', '/screens/shot1.png']

  return (
    <section className="py-14 sm:py-16 bg-slate-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Vedi l&apos;app in azione
          </h2>
          <p className="text-slate-500 mt-2 text-sm max-w-2xl mx-auto">
            Screenshot reali del flusso di lavoro: cattura, traduci ed esporta.
            Progettato per velocità e facilità d&apos;uso.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          {imgs.map((src, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="group rounded-2xl border border-slate-100 bg-white p-2 shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 hover:-translate-y-2"
            >
              <div className="relative w-full h-64 overflow-hidden rounded-xl">
                <Image
                  src={src}
                  alt={`screenshot ${i + 1}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
