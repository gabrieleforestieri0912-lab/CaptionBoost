import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { updateUser } from '@/lib/db'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    )
  }

  const buf = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !endpointSecret) {
    return NextResponse.json(
      { error: 'Missing signature or webhook secret' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig, endpointSecret)
  } catch (err) {
    console.error(
      `Webhook signature verification failed: ${(err as Error).message}`
    )
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const planId = session.metadata?.planId

        if (userId) {
          const planLimits: Record<string, { maxVideos: number }> = {
            free: { maxVideos: 10 },
            starter: { maxVideos: 500 },
            pro: { maxVideos: 999999 },
            team: { maxVideos: 999999 },
          }

          const limits = planLimits[planId || 'free'] || planLimits.free

          await updateUser(userId, {
            subscriptionPlan: planId,
            planMaxVideos: limits.maxVideos,
            subscriptionStatus: 'active',
            subscriptionId: session.subscription as string,
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId && subscription.status !== 'active') {
          await updateUser(userId, {
            subscriptionStatus: subscription.status,
          })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (userId) {
          await updateUser(userId, {
            subscriptionPlan: 'free',
            planMaxVideos: 10,
            subscriptionStatus: 'canceled',
            subscriptionId: null,
          })
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
