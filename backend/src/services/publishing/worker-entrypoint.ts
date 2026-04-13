/**
 * Worker entrypoint — run separately from the API server on Railway.
 * Starts BullMQ workers for each marketplace publish queue.
 */
import { Redis } from 'ioredis'
import { Worker } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'
import { QUEUES, PublishJobData } from './queue'
import { handleEbayPublish } from './handlers/ebay.handler'
import { handleFacebookPublish } from './handlers/facebook.handler'

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
const prisma = new PrismaClient()

const ebayWorker = new Worker<PublishJobData>(
  QUEUES.EBAY_PUBLISH,
  async (job) => handleEbayPublish(job.data, prisma),
  { connection, concurrency: 5 },
)

const facebookWorker = new Worker<PublishJobData>(
  QUEUES.FACEBOOK_PUBLISH,
  async (job) => handleFacebookPublish(job.data, prisma),
  { connection, concurrency: 3 },
)

for (const worker of [ebayWorker, facebookWorker]) {
  worker.on('completed', (job) => logger.info({ jobId: job.id }, 'Job completed'))
  worker.on('failed', (job, err) => logger.error({ jobId: job?.id, err }, 'Job failed'))
}

logger.info('BullMQ workers started (eBay x5, Facebook x3)')

const shutdown = async (): Promise<void> => {
  await Promise.all([ebayWorker.close(), facebookWorker.close()])
  await prisma.$disconnect()
  connection.disconnect()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
