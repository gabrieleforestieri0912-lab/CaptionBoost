import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { PLANS, getPlanById, calculateAnnualPrice, PRICING_CONFIG } from '@/lib/plans'
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
    // NOTA: importo e validità prezzo sono calcolati qui sul server a partire
    // dal piano: non si accettano mai unit_amount dal client (manomissione).
    const { planId, isAnnual } = (await request.json()) as {
      planId: string
      isAnnual?: boolean
    }
    const plan = PLANS[planId] || getPlanById(planId)
    const monthlyPrice = parseFloat(plan?.price || '0')
    if (!plan || !PLANS[planId] || planId === 'free' || !(monthlyPrice > 0)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const annual = Boolean(isAnnual)
    const priceInfo = calculateAnnualPrice(monthlyPrice)
    const displayPrice = annual ? priceInfo.annual : monthlyPrice
    const unitAmount = Math.round(displayPrice * 100)
    if (!(unitAmount > 0)) {
      return NextResponse.json({ error: 'Invalid plan price' }, { status: 400 })
    }
    const interval = annual ? 'year' : 'month'
    const currency = (PRICING_CONFIG?.stripe?.currency || 'EUR').toLowerCase()

    // Override opzionale: se esistono Price catalogati su Stripe, usali.
    // Env: STRIPE_PRICE_PRO, STRIPE_PRICE_PRO_ANNUAL, STRIPE_PRICE_TEAM, ...
    const envKey = `STRIPE_PRICE_${plan.id.toUpperCase()}${annual ? '_ANNUAL' : ''}`
    const envPriceId = process.env[envKey]
    const lineItem: Record<string, unknown> =
      envPriceId && envPriceId.startsWith('price_')
        ? { price: envPriceId, quantity: 1 }
        : {
            price_data: {
              currency,
              product_data: {
                name: `CaptionBoost ${plan.name}`,
                description: plan.description,
              },
              unit_amount: unitAmount,
              recurring: { interval },
            },
            quantity: 1,
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
      // Propaga i metadati alla Subscription: così il webhook può associare
      // gli eventi customer.subscription.* all'utente anche ai rinnovi.
      subscription_data: {
        metadata: {
          app: 'captionboost',
          planId,
          userId: user.id || '',
        },
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
