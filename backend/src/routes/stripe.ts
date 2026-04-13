import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient, SubscriptionStatus } from '@prisma/client'
import Stripe from 'stripe'
import { env } from '../config/env'
import { authMiddleware } from '../middleware/auth'

const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })

const PLAN_PRICE_ID = process.env.STRIPE_PRICE_ID ?? '' // e.g. price_xxx from Stripe dashboard
const PLAN_AMOUNT = 999 // $9.99 in cents

export async function stripeRoutes(
  app: FastifyInstance,
  opts: { prisma: PrismaClient },
): Promise<void> {
  const { prisma } = opts

  // ── Authenticated routes ──────────────────────────────────────────────────

  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', authMiddleware)

    /**
     * GET /stripe/subscription
     * Returns the user's current subscription status.
     */
    protectedApp.get('/subscription', async (request, reply) => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: request.userId },
      })
      return reply.send(
        sub ?? { status: SubscriptionStatus.FREE, currentPeriodEnd: null },
      )
    })

    /**
     * POST /stripe/checkout
     * Creates a Stripe Checkout Session and returns the URL.
     */
    protectedApp.post('/checkout', async (request, reply) => {
      // Get or create Stripe customer
      let sub = await prisma.subscription.findUnique({
        where: { userId: request.userId },
      })

      let customerId = sub?.stripeCustomerId

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: request.userEmail,
          metadata: { userId: request.userId },
        })
        customerId = customer.id

        // Upsert subscription record
        sub = await prisma.subscription.upsert({
          where: { userId: request.userId },
          create: {
            userId: request.userId,
            stripeCustomerId: customerId,
            status: SubscriptionStatus.FREE,
          },
          update: { stripeCustomerId: customerId },
        })
      }

      if (sub?.status === SubscriptionStatus.ACTIVE) {
        return reply.status(400).send({ error: 'Already subscribed' })
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: PLAN_PRICE_ID
          ? [{ price: PLAN_PRICE_ID, quantity: 1 }]
          : [
              {
                price_data: {
                  currency: 'usd',
                  product_data: { name: 'Home Sale Helper Pro', description: 'Monthly subscription — $9.99/month' },
                  unit_amount: PLAN_AMOUNT,
                  recurring: { interval: 'month' },
                },
                quantity: 1,
              },
            ],
        success_url: `${env.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.APP_URL}/subscription/cancel`,
        subscription_data: {
          metadata: { userId: request.userId },
        },
      })

      return reply.send({ checkoutUrl: session.url, sessionId: session.id })
    })

    /**
     * POST /stripe/portal
     * Creates a Stripe Customer Portal session (manage billing, cancel, etc.)
     */
    protectedApp.post('/portal', async (request, reply) => {
      const sub = await prisma.subscription.findUnique({
        where: { userId: request.userId },
      })

      if (!sub?.stripeCustomerId) {
        return reply.status(400).send({ error: 'No billing account found' })
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${env.APP_URL}/settings`,
      })

      return reply.send({ portalUrl: session.url })
    })
  })

  // ── Stripe Webhook (no auth — verified by signature) ──────────────────────

  /**
   * POST /stripe/webhook
   * Handles Stripe events: subscription created/updated/deleted.
   * Raw body required for signature verification.
   */
  app.post(
    '/webhook',
    {
      config: { rawBody: true },
    },
    async (request: FastifyRequest & { rawBody?: Buffer }, reply) => {
      const sig = request.headers['stripe-signature']
      if (!sig) return reply.status(400).send({ error: 'Missing stripe-signature header' })

      let event: Stripe.Event
      try {
        // rawBody must be enabled in Fastify (handled via addContentTypeParser if needed)
        const body = (request.rawBody ?? Buffer.from(JSON.stringify(request.body))).toString()
        event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Webhook signature verification failed'
        return reply.status(400).send({ error: msg })
      }

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription
          const userId = subscription.metadata?.userId
          if (!userId) break

          const status =
            subscription.status === 'active'
              ? SubscriptionStatus.ACTIVE
              : subscription.status === 'past_due'
                ? SubscriptionStatus.PAST_DUE
                : subscription.status === 'canceled'
                  ? SubscriptionStatus.CANCELLED
                  : SubscriptionStatus.FREE

          await prisma.subscription.upsert({
            where: { userId },
            create: {
              userId,
              stripeSubId: subscription.id,
              status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
            update: {
              stripeSubId: subscription.id,
              status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            },
          })
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          const userId = subscription.metadata?.userId
          if (!userId) break

          await prisma.subscription.updateMany({
            where: { stripeSubId: subscription.id },
            data: { status: SubscriptionStatus.CANCELLED, currentPeriodEnd: null },
          })
          break
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice
          const subId = invoice.subscription as string | null
          if (!subId) break

          await prisma.subscription.updateMany({
            where: { stripeSubId: subId },
            data: { status: SubscriptionStatus.PAST_DUE },
          })
          break
        }

        default:
          // Unhandled event — acknowledge receipt
          break
      }

      return reply.send({ received: true })
    },
  )
}
