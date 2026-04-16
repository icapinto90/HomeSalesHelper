import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { PrismaClient } from '@prisma/client'
import { Redis } from 'ioredis'
import { env } from './config/env'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/error'
import { posthogPlugin } from './plugins/posthog'
import { healthRoutes } from './routes/health'
import { authRoutes } from './routes/auth'
import { listingRoutes } from './routes/listings'
import { photoRoutes } from './routes/photos'
import { aiRoutes } from './routes/ai'
import { pricingRoutes } from './routes/pricing'
import { publishRoutes } from './routes/publish'
import { platformAccountRoutes } from './routes/platform-accounts'
import { messageRoutes } from './routes/messages'
import { stripeRoutes } from './routes/stripe'

export async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const prisma = new PrismaClient()
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })

  const app = Fastify({
    logger: logger as any,
    // Expose rawBody for Stripe webhook signature verification
    bodyLimit: 10 * 1024 * 1024, // 10 MB
  })

  // Store raw body for Stripe webhook
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    (req as any).rawBody = body
    try {
      done(null, JSON.parse(body.toString()))
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  // ── Plugins ───────────────────────────────────────────────────────────────
  await app.register(posthogPlugin)
  await app.register(helmet)
  await app.register(cors, { origin: true })
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } }) // 20 MB
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (req) => req.headers['x-forwarded-for']?.toString() ?? req.ip,
  })

  // ── Error handler ─────────────────────────────────────────────────────────
  app.setErrorHandler(errorHandler)

  // ── Routes ────────────────────────────────────────────────────────────────
  await app.register(healthRoutes)
  await app.register(authRoutes, { prefix: '/auth', prisma, posthog: app.posthog })
  await app.register(listingRoutes, { prefix: '/listings', prisma, posthog: app.posthog })
  await app.register(photoRoutes, { prefix: '/photos', prisma })
  await app.register(aiRoutes, { prefix: '/ai', prisma, posthog: app.posthog })
  await app.register(pricingRoutes, { prefix: '/pricing', prisma })
  await app.register(publishRoutes, { prefix: '/listings', prisma })
  await app.register(platformAccountRoutes, { prefix: '/platform-accounts', prisma })
  await app.register(messageRoutes, { prefix: '/messages', prisma })
  await app.register(stripeRoutes, { prefix: '/stripe', prisma, posthog: app.posthog })

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down...')
    await app.close()
    await prisma.$disconnect()
    redis.disconnect()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return app
}
