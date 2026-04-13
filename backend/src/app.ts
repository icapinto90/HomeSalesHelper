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
import { healthRoutes } from './routes/health'
import { listingRoutes } from './routes/listings'

export async function buildApp(): Promise<ReturnType<typeof Fastify>> {
  const prisma = new PrismaClient()
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })

  const app = Fastify({ logger: logger as any })

  // ── Plugins ───────────────────────────────────────────────────────────────
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
  await app.register(listingRoutes, { prefix: '/listings', prisma })

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
