import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getPlanById, PRICING_CONFIG } from '@/lib/plans'
import { getAuthenticatedUser } from '@/lib/get-user'

export async function POST(request: Request) {
  const { user } = await getAuthenticatedUser(request)
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured on server' },
      { status: 500 }
    )
  }

  try {
    const { planId, price_data, isAnnual } = await request.json() as {
      planId: string
      price_data?: { unit_amount?: number; currency?: string; product_data?: Record<string, unknown>; recurring?: Record<string, unknown> }
      isAnnual?: boolean
    }
    const plan = getPlanById(planId)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    let lineItem: Record<string, unknown> | null = null
    if (price_data && price_data.unit_amount !== undefined) {
      lineItem = { price_data, quantity: 1 }
    } else {
      const annual = Boolean(isAnnual)
      let candidate: string | null = null

      if (annual && plan.stripePriceAnnualId)
        candidate = plan.stripePriceAnnualId
      if (!candidate && plan.stripePriceId) candidate = plan.stripePriceId

      if (candidate && String(candidate).startsWith('price_')) {
        lineItem = { price: candidate, quantity: 1 }
      } else {
        const envKey = `STRIPE_PRICE_${String(plan.id).toUpperCase()}${annual ? '_ANNUAL' : ''}`
        const envVal = process.env[envKey]
        if (!envVal) {
          return NextResponse.json(
            {
              error: `Missing Stripe price configuration for plan ${plan.id} (tried ${envKey})`,
            },
            { status: 500 }
          )
        }
        lineItem = { price: envVal, quantity: 1 }
      }
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      request.headers.get('origin') ||
      'http://localhost:3000'

    const stripe = new Stripe(secretKey)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [lineItem],
      // Dopo il pagamento si torna alla landing page (con conferma in evidenza),
      // non più alla pagina dei piani: chi ha appena pagato non ha bisogno di
      // rivedere il pricing.
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      metadata: {
        app: 'captionboost',
        planId,
        userId: user.id || '',
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Stripe checkout creation error:', error)
    return NextResponse.json(
      { error: 'Unable to create Stripe checkout session' },
      { status: 500 }
    )
  }
}
