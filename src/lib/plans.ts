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
      'Perfetto per creator e traduttori che pubblicano regolarmente.',
    price: '9.99',
    interval: 'month',
    stripePriceId: 'price_pro_monthly_usd',
    stripePriceAnnualId: 'price_pro_annual_usd',
    cta: 'Scegli Starter',
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
      'Per agenzie e aziende con spazi di lavoro condivisi.',
    price: '24.99',
    interval: 'month',
    stripePriceId: 'price_team_monthly_usd',
    stripePriceAnnualId: 'price_team_annual_usd',
    cta: 'Scegli Pro',
    suggested: true,
    badge: 'Più popolare',
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
    currency: 'USD',
    currencySymbol: '$',
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
