'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { Check, Loader2, Zap, Star, Users, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  getLocalizedPlan,
  getLocalizedPlans,
  calculateAnnualPrice,
} from '@/lib/plans'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PricingSection({
  compact = false,
  checkoutStatus = '',
}: {
  compact?: boolean
  checkoutStatus?: string
}) {
  const { status } = useAuth()
  const { t, language } = useLanguage()
  const router = useRouter()
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isAnnual, setIsAnnual] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('captionboost-annual-plan')
    if (saved) setIsAnnual(saved === 'true')
  }, [])

  const toggleBilling = () => {
    const newVal = !isAnnual
    setIsAnnual(newVal)
    localStorage.setItem('captionboost-annual-plan', newVal.toString())
  }

  async function handleSubscribe(planId: string) {
    setError('')

    if (planId === 'free') {
      window.location.href = '/welcome'
      return
    }

    if (status !== 'authenticated') {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/pricing?plan=${planId}`)}`)
      return
    }

    try {
      setLoadingPlanId(planId)
      // Il prezzo è calcolato sul server dal piano: il client invia solo
      // planId e billing, mai importi (anti-manomissione).
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, isAnnual }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to create checkout session')
      }
      if (!data.url) {
        throw new Error('Stripe checkout URL not returned')
      }
      window.location.href = data.url
    } catch (err) {
      setError((err as Error).message || 'Stripe checkout failed')
      setLoadingPlanId(null)
    }
  }

  const freePlan = getLocalizedPlan('free', language)
  const plans = compact ? [getLocalizedPlan('pro', language)] : [freePlan, ...getLocalizedPlans(language)]

  return (
    <section id="pricing" className={compact ? 'py-8' : 'py-14 sm:py-16'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {!compact && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200/50 rounded-full text-xs font-medium text-primary mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t("pricingBadge")}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {t("pricingTitle")}
              </h2>
              <p className="text-slate-500 mt-2 text-sm max-w-2xl mx-auto">
                {t("pricingDesc")}
              </p>
            </motion.div>

            <div className="flex justify-center items-center gap-4 mb-8">
              <span
                className={`text-sm font-semibold transition-colors ${!isAnnual ? 'text-primary' : 'text-slate-400'}`}
              >
                {t("monthly")}
              </span>
              <button
                onClick={toggleBilling}
                className="relative w-14 h-8 bg-slate-200 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 hover:bg-slate-300"
                style={{ backgroundColor: isAnnual ? '#4C94FF' : '' }}
                aria-label={t("switchAnnualBilling")}
              >
                <span
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transform transition-transform duration-200 ${
                    isAnnual ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
              <span
                className={`text-sm font-semibold transition-colors ${
                  isAnnual ? 'text-primary' : 'text-slate-400'
                } flex items-center gap-2`}
              >
                {t("annual")}
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary">
                  -20%
                </span>
              </span>
            </div>
          </>
        )}

        {/* Nota: dopo il pagamento si viene reindirizzati alla landing page
            (?checkout=success su /), non più qui: niente banner di successo. */}
        {checkoutStatus === 'cancel' && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm text-center font-medium shadow-sm">
            {t("checkoutCancel")}
          </div>
        )}
        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm text-center font-medium shadow-sm">
            {error}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => {
            const priceInfo =
              plan.price > '0'
                ? calculateAnnualPrice(parseFloat(plan.price))
                : {
                    monthly: 0,
                    annual: 0,
                    monthlyEquivalent: 0,
                    savings: 0,
                    savingsPercent: 20,
                  }

            const displayPrice = isAnnual
              ? priceInfo.annual
              : parseFloat(plan.price)

            return (
              <motion.article
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={`rounded-2xl border p-6 bg-white shadow-sm transition-all duration-500 flex flex-col ${
                  plan.suggested
                    ? 'border-primary ring-4 ring-primary-50 shadow-lg shadow-primary/10 relative scale-[1.02] z-10'
                    : 'border-slate-100 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1'
                }`}
              >
                {plan.suggested && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-primary text-white shadow-lg shadow-primary/30">
                    <Star className="w-3 h-3 fill-current" />
                    {plan.badge || t("recommendedBadge")}
                  </div>
                )}

                <div className="mb-6 text-center">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-slate-900 tracking-tight">
                      {plan.price === '0'
                        ? '0'
                        : displayPrice.toFixed(2)}
                    </span>
                    <span className="text-xl font-bold text-slate-900">
                      €
                    </span>
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-1">
                    {t("per")} {plan.interval}
                  </div>
                  {isAnnual && plan.price > '0' && (
                    <div className="mt-2 text-xs text-primary font-bold bg-primary-50 py-1 px-2.5 rounded-full inline-block">
                      {t("saveAnnual")} {priceInfo.savings.toFixed(2)}€ {t("perYear")}
                    </div>
                  )}
                  {plan.id === 'free' && (
                    <div className="mt-2 text-xs text-slate-400 font-medium">
                      {t("freeForever")}
                    </div>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 grow">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-xs text-slate-600"
                    >
                      <div className="mt-0.5 rounded-full bg-primary-50 p-0.5 shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingPlanId === plan.id}
                  className={`w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold transition-all duration-300 text-sm shadow-sm ${
                    loadingPlanId === plan.id ? 'cursor-wait' : ''
                  } ${
                    plan.id === 'free'
                      ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                      : plan.suggested
                        ? 'bg-primary hover:bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50'
                        : 'bg-white hover:bg-primary-50 text-primary border-2 border-primary/30 hover:border-primary shadow-sm'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {loadingPlanId === plan.id && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {plan.cta}
                </button>

                {isAnnual && plan.price > '0' && (
                  <div className="mt-3 text-center">
                    <span className="text-xs text-slate-400 font-medium">
                      {t("billedAnnually")}
                    </span>
                  </div>
                )}
              </motion.article>
            )
          })}
        </div>

        {!compact && (
          <div className="mt-12 p-6 bg-white rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/20">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {t("guarantee")}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {t("guaranteeDesc")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {t("teamDiscount")}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {t("teamDiscountDesc")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
