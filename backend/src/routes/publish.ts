import { FastifyInstance } from 'fastify'
import { PrismaClient, Platform, PlatformStatus } from '@prisma/client'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { enqueuePublishJobs } from '../services/publishing/queue'

const publishSchema = z.object({
  platforms: z.array(z.nativeEnum(Platform)).min(1).max(4),
})

export async function publishRoutes(
  app: FastifyInstance,
  opts: { prisma: PrismaClient },
): Promise<void> {
  const { prisma } = opts

  app.addHook('preHandler', authMiddleware)

  /**
   * POST /listings/:id/publish
   * Creates PlatformListing rows and enqueues BullMQ publish jobs.
   */
  app.post<{ Params: { id: string } }>('/:id/publish', async (request, reply) => {
    const { id } = request.params
    const body = publishSchema.parse(request.body)

    const listing = await prisma.listing.findFirst({
      where: { id, userId: request.userId },
      include: { platformListings: true },
    })

    if (!listing) {
      return reply.status(404).send({ error: 'Listing not found' })
    }

    if (listing.photos.length === 0) {
      return reply.status(422).send({ error: 'At least one photo is required before publishing' })
    }

    // Verify platform accounts are connected
    const accounts = await prisma.platformAccount.findMany({
      where: { userId: request.userId, platform: { in: body.platforms }, isActive: true },
    })

    const connectedPlatforms = new Set(accounts.map((a) => a.platform))
    const missing = body.platforms.filter((p) => !connectedPlatforms.has(p))
    if (missing.length > 0) {
      return reply.status(422).send({
        error: `Platform accounts not connected: ${missing.join(', ')}. Connect them at /platform-accounts.`,
      })
    }

    // Upsert PlatformListing rows
    const platformListings = await Promise.all(
      body.platforms.map((platform) =>
        prisma.platformListing.upsert({
          where: { listingId_platform: { listingId: id, platform } },
          create: { listingId: id, platform, status: PlatformStatus.PENDING },
          update: { status: PlatformStatus.PENDING, errorMsg: null },
        }),
      ),
    )

    // Mark listing as ACTIVE
    await prisma.listing.update({
      where: { id },
      data: { status: 'ACTIVE' },
    })

    // Enqueue BullMQ jobs
    await enqueuePublishJobs(
      id,
      request.userId,
      platformListings.map((pl) => ({ platform: pl.platform, id: pl.id })),
    )

    return reply.status(202).send({
      message: 'Publish jobs enqueued',
      listingId: id,
      platforms: platformListings.map((pl) => ({
        platform: pl.platform,
        status: pl.status,
        platformListingId: pl.id,
      })),
    })
  })

  /**
   * GET /listings/:id/publish-status
   * Returns current publish status per platform.
   */
  app.get<{ Params: { id: string } }>('/:id/publish-status', async (request, reply) => {
    const listing = await prisma.listing.findFirst({
      where: { id: request.params.id, userId: request.userId },
      include: {
        platformListings: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!listing) {
      return reply.status(404).send({ error: 'Listing not found' })
    }

    return reply.send({
      listingId: listing.id,
      listingStatus: listing.status,
      platforms: listing.platformListings.map((pl) => ({
        platform: pl.platform,
        status: pl.status,
        externalId: pl.externalId,
        url: pl.url,
        errorMsg: pl.errorMsg,
        publishedAt: pl.publishedAt,
      })),
    })
  })
}
