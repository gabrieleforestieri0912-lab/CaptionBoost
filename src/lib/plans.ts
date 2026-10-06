import type { Plan, AnnualPrice } from './types'

export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Start translating with basic features.',
    price: '0',
    interval: 'month',
    cta: 'Get started',
    suggested: false,
    features: [
      '50 translations / month',
      'Supported languages: IT, EN, ES, FR, DE',
      'Basic subtitle presets',
      'Limited SRT/VTT export',
      'Community support',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Starter',
    description:
      'Perfect for creators and translators who publish regularly.',
    price: '4.99',
    interval: 'month',
    cta: 'Choose Starter',
    suggested: false,
    features: [
      'Unlimited translations',
      'AI priority (2x faster processing)',
      'All export formats (SRT, VTT, ASS, SBV)',
      'Cloud storage 180 days',
      'API access + webhooks',
      'Multi-device sync',
      'Priority support 24/7',
    ],
  },
  team: {
    id: 'team',
    name: 'Pro',
    description:
      'For agencies and companies with shared workspaces.',
    price: '9.99',
    interval: 'month',
    cta: 'Choose Pro',
    suggested: true,
    badge: 'Most popular',
    features: [
      'Everything included from Starter',
      '5 users included (add more at $4/month)',
      'Centralized workspace and permissions',
      'Audit logs and advanced reporting',
      'White-label branding',
      'SLA 99.9%',
      'Dedicated support via chat + email',
    ],
  },
}

export const PLANS_ORDERED: Plan[] = [PLANS.pro, PLANS.team]

export function getPlanById(planId: string): Plan {
  return PLANS[planId] || PLANS.free
}

/** Override italiano per i piani (base in inglese). */
const PLANS_IT: Record<string, Partial<Plan>> = {
  free: {
    description: 'Inizia a tradurre con le funzioni base.',
    cta: 'Inizia gratis',
    features: [
      '50 traduzioni / mese',
      'Lingue supportate: IT, EN, ES, FR, DE',
      'Preset sottotitoli base',
      'Export SRT/VTT limitato',
      'Supporto community',
    ],
  },
  pro: {
    description: 'Perfetto per creator e traduttori che pubblicano regolarmente.',
    cta: 'Scegli Starter',
    features: [
      'Traduzioni illimitate',
      'Priorità AI (elaborazione 2x più veloce)',
      'Tutti i formati di export (SRT, VTT, ASS, SBV)',
      'Archiviazione cloud 180 giorni',
      'Accesso API + webhook',
      'Sincronizzazione multi-dispositivo',
      'Supporto prioritario 24/7',
    ],
  },
  team: {
    description: 'Per agenzie e aziende con spazi di lavoro condivisi.',
    cta: 'Scegli Pro',
    badge: 'Più popolare',
    features: [
      'Tutto incluso dallo Starter',
      '5 utenti inclusi (aggiuntivi a $4/mese)',
      'Workspace centralizzato e permessi',
      'Log di audit e report avanzati',
      'Branding white-label',
      'SLA 99,9%',
      'Supporto dedicato via chat + email',
    ],
  },
}

/** Ritorna il piano localizzato: 'it' per l'Italia, inglese per tutti gli altri paesi. */
export function getLocalizedPlan(planId: string, lang: string): Plan {
  const base = getPlanById(planId)
  if (lang !== 'it') return base
  return { ...base, ...PLANS_IT[planId] }
}

export function getLocalizedPlans(lang: string): Plan[] {
  return PLANS_ORDERED.map((p) => getLocalizedPlan(p.id, lang))
}

export function calculateAnnualPrice(
  monthlyPrice: number
): AnnualPrice {
  const annual = monthlyPrice * 12
  const discount = annual * 0.2
  return {
    monthly: monthlyPrice,
    annual: annual - discount,
    monthlyEquivalent: (annual - discount) / 12,
    savings: discount,
    savingsPercent: 20,
  }
}

export const PRICING_CONFIG = {
  stripe: {
    currency: 'EUR',
    currencySymbol: '€',
    freePlanId: 'free',
  },
  limits: {
    free: {
      translationsPerMonth: 50,
      maxCharactersPerTranslation: 5000,
      exportFormats: ['SRT', 'VTT'],
      cloudStorageDays: 30,
      concurrentVideos: 1,
    },
    pro: {
      translationsPerMonth: 'unlimited' as const,
      maxCharactersPerTranslation: 'unlimited' as const,
      exportFormats: ['SRT', 'VTT', 'ASS', 'SBV', 'JSON'],
      cloudStorageDays: 180,
      concurrentVideos: 'unlimited' as const,
    },
    team: {
      translationsPerMonth: 'unlimited' as const,
      maxCharactersPerTranslation: 'unlimited' as const,
      exportFormats: ['SRT', 'VTT', 'ASS', 'SBV', 'JSON', 'CSV'],
      cloudStorageDays: 365,
      concurrentVideos: 'unlimited' as const,
    },
  },
}
