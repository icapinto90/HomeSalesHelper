import { Queue, Worker, QueueEvents } from 'bullmq'
import { Redis } from 'ioredis'
import { env } from '../../config/env'
import { logger } from '../../utils/logger'

export const QUEUES = {
  EBAY_PUBLISH: 'ebay-publish',
  FACEBOOK_PUBLISH: 'facebook-publish',
} as const

export interface PublishJobData {
  listingId: string
  platformListingId: string
  userId: string
}

const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 1000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
}

export const ebayPublishQueue = new Queue<PublishJobData>(QUEUES.EBAY_PUBLISH, {
  connection,
  defaultJobOptions,
})

export const facebookPublishQueue = new Queue<PublishJobData>(QUEUES.FACEBOOK_PUBLISH, {
  connection,
  defaultJobOptions,
})

export async function enqueuePublishJobs(
  listingId: string,
  userId: string,
  platformListingIds: { platform: string; id: string }[],
): Promise<void> {
  const jobs = platformListingIds.map(({ platform, id }) => {
    const queue = platform === 'EBAY' ? ebayPublishQueue : facebookPublishQueue
    return queue.add(
      `publish-${listingId}-${platform.toLowerCase()}`,
      { listingId, platformListingId: id, userId },
      { jobId: `${listingId}:${platform}` },
    )
  })

  await Promise.all(jobs)
  logger.info({ listingId, platforms: platformListingIds.map((p) => p.platform) }, 'Publish jobs enqueued')
}
