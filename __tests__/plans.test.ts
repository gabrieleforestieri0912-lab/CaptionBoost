import { describe, it, expect } from 'vitest'
import { getPlanById, calculateAnnualPrice, PLANS, PRICING_CONFIG } from '@/lib/plans'

describe('Plans', () => {
  it('getPlanById returns correct plan', () => {
    expect(getPlanById('free').name).toBe('Free')
    expect(getPlanById('pro').name).toBe('Starter')
    expect(getPlanById('team').name).toBe('Pro')
  })

  it('getPlanById falls back to free for unknown', () => {
    expect(getPlanById('unknown').id).toBe('free')
  })

  it('calculateAnnualPrice gives 20% discount', () => {
    const result = calculateAnnualPrice(10)
    expect(result.monthly).toBe(10)
    expect(result.annual).toBe(96)
    expect(result.monthlyEquivalent).toBe(8)
    expect(result.savings).toBe(24)
    expect(result.savingsPercent).toBe(20)
  })

  it('PRICING_CONFIG has required fields', () => {
    expect(PRICING_CONFIG.stripe.currency).toBe('USD')
    expect(PRICING_CONFIG.stripe.freePlanId).toBe('free')
    expect(PRICING_CONFIG.limits.free.translationsPerMonth).toBe(50)
    expect(PRICING_CONFIG.limits.pro.translationsPerMonth).toBe('unlimited')
  })
})
