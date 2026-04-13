/**
 * GET /health — liveness + readiness probe
 * Used by Railway health-check, Docker HEALTHCHECK, and CD pipelines.
 */

import type { FastifyInstance } from 'fastify'

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async (_request, reply) => {
    reply.status(200).send({
      status: 'ok',
      env: process.env.NODE_ENV,
      version: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'local',
      timestamp: new Date().toISOString(),
    })
  })
}
