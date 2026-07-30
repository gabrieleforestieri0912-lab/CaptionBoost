import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  getSupabase: vi.fn(),
}))

import { calculateAnnualPrice } from '@/lib/plans'

describe('Database utilities', () => {
  it('calculateAnnualPrice computes correctly', () => {
    const r = calculateAnnualPrice(9.99)
    expect(r.annual).toBeCloseTo(95.9, 1)
    expect(r.savingsPercent).toBe(20)
  })
})
