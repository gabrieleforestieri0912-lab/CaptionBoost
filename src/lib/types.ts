export interface User {
  id: string
  email: string
  name: string | null
  image: string | null
  password: string | null
  createdAt: string
  lastLoginAt: string | null
  subscriptionPlan: string
  planMaxVideos: number
  translatedVideosCount?: number
  subscriptionStatus: string | null
  subscriptionId: string | null
  verificationTokens: VerificationToken[]
}

export interface VerificationToken {
  type: string
  code: string
  expiresAt: string
}

export interface UserWithoutPassword {
  id: string
  email: string
  name: string | null
  image: string | null
  createdAt: string
  lastLoginAt: string | null
  subscriptionPlan: string
  planMaxVideos: number
  subscriptionStatus: string | null
  subscriptionId: string | null
}

export interface Subtitle {
  id: string
  userId: string
  videoId: string
  videoTitle: string
  videoUrl: string
  language: string
  lines: SubtitleLine[]
  thumbnail: string
  createdAt: string
  updatedAt: string
}

export interface SubtitleLine {
  id?: string
  start: number
  end: number
  text: string
}

export interface Feedback {
  id: string
  userId: string
  type: string
  message: string
  rating: number | null
  createdAt: string
}

export interface Plan {
  id: string
  name: string
  description: string
  price: string
  interval: string
  cta: string
  suggested: boolean
  badge?: string
  features: string[]
  stripePriceId?: string
  stripePriceAnnualId?: string
}

export interface PlanLimits {
  translationsPerMonth: number | string
  maxCharactersPerTranslation: number | string
  exportFormats: string[]
  cloudStorageDays: number
  concurrentVideos: number | string
}

export interface PlanConfig {
  stripe: {
    currency: string
    currencySymbol: string
    freePlanId: string
  }
  limits: Record<string, PlanLimits>
}

export interface AnnualPrice {
  monthly: number
  annual: number
  monthlyEquivalent: number
  savings: number
  savingsPercent: number
}
