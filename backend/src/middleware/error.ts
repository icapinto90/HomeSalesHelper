import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { logger } from '../utils/logger'

export function errorHandler(
  error: FastifyError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  logger.error({ err: error, url: request.url, method: request.method }, 'Request error')

  if (error instanceof ZodError) {
    reply.status(400).send({
      error: 'Validation error',
      details: error.errors,
      statusCode: 400,
    })
    return
  }

  if (error.statusCode) {
    reply.status(error.statusCode).send({
      error: error.message,
      statusCode: error.statusCode,
    })
    return
  }

  reply.status(500).send({
    error: 'Internal Server Error',
    statusCode: 500,
  })
}
