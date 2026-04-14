/**
 * Sentry Fastify plugin wiring.
 * Register this plugin in server.ts after initSentry() is called.
 */

import * as Sentry from '@sentry/node'
import type { FastifyInstance } from 'fastify'

type Span = ReturnType<typeof Sentry.startInactiveSpan>
type RequestWithSpan = { _sentrySpan?: Span }

/** Adds Sentry request tracing and error capturing to Fastify. */
export async function sentryPlugin(app: FastifyInstance): Promise<void> {
  // Attach Sentry trace span to every request
  app.addHook('onRequest', async (request) => {
    const span = Sentry.startInactiveSpan({
      op: 'http.server',
      name: `${request.method} ${request.routerPath ?? request.url}`,
    })
    ;(request as unknown as RequestWithSpan)._sentrySpan = span
  })

  // Finish the span on response
  app.addHook('onResponse', async (request, reply) => {
    const span = (request as unknown as RequestWithSpan)._sentrySpan
    if (span) {
      span.setAttribute('http.response.status_code', reply.statusCode)
      span.end()
    }
  })

  // Capture unhandled errors
  app.setErrorHandler(async (error, request, reply) => {
    Sentry.captureException(error, {
      extra: {
        url: request.url,
        method: request.method,
        params: request.params,
      },
    })
    const status = error.statusCode ?? 500
    reply.status(status).send({
      error: status >= 500 ? 'Internal Server Error' : error.message,
    })
  })
}
