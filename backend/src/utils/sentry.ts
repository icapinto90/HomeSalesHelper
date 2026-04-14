/**
 * Sentry Fastify plugin wiring.
 * Register this plugin in server.ts after initSentry() is called.
 */

import * as Sentry from '@sentry/node'
import type { FastifyInstance } from 'fastify'

/** Adds Sentry request tracing and error capturing to Fastify. */
export async function sentryPlugin(app: FastifyInstance): Promise<void> {
  // 🚨 Les hooks 'onRequest' et 'onResponse' ont été supprimés.
  // Sentry v8 intercepte automatiquement les requêtes HTTP pour le tracing.
  
  // ✅ On garde uniquement la capture des erreurs avec ton format personnalisé
  app.setErrorHandler(async (error, request, reply) => {
    // Sentry capture l'erreur et y attache le contexte de la requête
    Sentry.captureException(error, {
      extra: {
        url: request.url,
        method: request.method,
        params: request.params,
      },
    })

    // Ta logique de réponse personnalisée reste intacte
    const status = error.statusCode ?? 500
    reply.status(status).send({
      error: status >= 500 ? 'Internal Server Error' : error.message,
    })
  })
}
