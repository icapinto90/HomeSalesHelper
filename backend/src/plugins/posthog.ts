import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import { PostHog } from 'posthog-node'

declare module 'fastify' {
  interface FastifyInstance {
    posthog: PostHog | null
  }
}

export const posthogPlugin = fp(async (app: FastifyInstance) => {
  const apiKey = process.env.POSTHOG_API_KEY
  const host = process.env.POSTHOG_HOST ?? 'https://app.posthog.com'

  if (!apiKey) {
    app.log.warn('POSTHOG_API_KEY is not set — PostHog tracking disabled')
    app.decorate('posthog', null)
    return
  }

  const client = new PostHog(apiKey, { host, flushAt: 20, flushInterval: 10_000 })

  app.decorate('posthog', client)

  app.addHook('onClose', async () => {
    await client.shutdown()
  })
})
