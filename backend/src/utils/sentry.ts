/**
 * Sentry Fastify plugin wiring.
 * Register this plugin in server.ts after initSentry() is called.
 */

import * as Sentry from '@sentry/node'
import type { FastifyInstance } from 'fastify'

/** Adds Sentry request tracing and error capturing to Fastify. */
export async function sentryPlugin(app: FastifyInstance): Promise<void> {
  // Attach Sentry trace headers to every request
  app.addHook('onRequest', async (request) => {
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${request.method} ${request.routerPath ?? request.url}`,
    })
    ;(request as unknown as { sentryTransaction: Sentry.Transaction }).sentryTransaction =
      transaction
    Sentry.getCurrentHub().configureScope((scope) => {
      scope.setSpan(transaction)
    })
  })

  // Finish the transaction on response
  app.addHook('onResponse', async (request, reply) => {
    const tx = (
      request as unknown as { sentryTransaction?: Sentry.Transaction }
    ).sentryTransaction
    if (tx) {
      tx.setHttpStatus(reply.statusCode)
      tx.finish()
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
