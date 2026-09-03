import { getSupabase } from '@/lib/supabase'
import { PRICING_CONFIG } from '@/lib/plans'
import type { User } from '@/lib/types'

const FREE_TRANSLATIONS_PER_MONTH = Number(
  PRICING_CONFIG.limits.free.translationsPerMonth
)

/** Chiave del mese corrente, es. "2026-08". */
export function monthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/** Un piano è "a pagamento" solo se l'abbonamento risulta attivo. */
export function isPaidUser(user: User): boolean {
  return (
    user.subscriptionStatus === 'active' &&
    !!user.subscriptionPlan &&
    user.subscriptionPlan !== 'free'
  )
}

/** Limite traduzioni/mese: 50 per il piano free, illimitato per i piani a pagamento. */
export function getTranslationLimit(user: User): number | 'unlimited' {
  return isPaidUser(user) ? 'unlimited' : FREE_TRANSLATIONS_PER_MONTH
}

interface UsageRow {
  translatedVideosCount?: number | null
  translationsMonth?: string | null
}

async function readUsageRow(userId: string): Promise<UsageRow> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('users')
    .select('translatedVideosCount, translationsMonth')
    .eq('id', userId)
    .single()
  return (data || {}) as UsageRow
}

/**
 * Legge le traduzioni usate nel mese corrente. Il contatore viene azzerato
 * automaticamente al cambio mese (confronto con la colonna `translationsMonth`).
 */
export async function getTranslationUsage(
  userId: string
): Promise<{ used: number }> {
  const row = await readUsageRow(userId)
  return {
    used:
      row.translationsMonth === monthKey()
        ? Number(row.translatedVideosCount || 0)
        : 0,
  }
}

/**
 * Verifica il limite lato server (spec §7): restituisce se la richiesta è
 * consentita e i valori per la UI (usati, rimanenti, limite).
 */
export async function checkTranslationLimit(user: User): Promise<{
  allowed: boolean
  used: number
  remaining: number | null
  limit: number | 'unlimited'
}> {
  const limit = getTranslationLimit(user)
  if (limit === 'unlimited') {
    return { allowed: true, used: 0, remaining: null, limit }
  }
  const { used } = await getTranslationUsage(user.id)
  return {
    allowed: used < limit,
    used,
    remaining: Math.max(0, limit - used),
    limit,
  }
}

/**
 * Registra una traduzione usata nel mese corrente (resetta il contatore se il
 * mese è cambiato). Da chiamare solo dopo che il check è passato.
 */
export async function incrementTranslationUsage(userId: string): Promise<void> {
  const supabase = getSupabase()
  const row = await readUsageRow(userId)
  const currentMonth = monthKey()
  const base =
    row.translationsMonth === currentMonth
      ? Number(row.translatedVideosCount || 0)
      : 0

  const { error } = await supabase
    .from('users')
    .update({
      translatedVideosCount: base + 1,
      translationsMonth: currentMonth,
    })
    .eq('id', userId)

  if (error) {
    console.error('incrementTranslationUsage error:', error.message)
  }
}
