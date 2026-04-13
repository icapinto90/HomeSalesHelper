import { FastifyInstance } from 'fastify'
import { PrismaClient, MessageDirection, Platform } from '@prisma/client'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'

const sendMessageSchema = z.object({
  listingId: z.string().uuid(),
  platform: z.nativeEnum(Platform),
  buyerName: z.string().optional(),
  buyerId: z.string().optional(),
  content: z.string().min(1).max(2000),
  externalId: z.string().optional(),
})

export async function messageRoutes(
  app: FastifyInstance,
  opts: { prisma: PrismaClient },
): Promise<void> {
  const { prisma } = opts

  app.addHook('preHandler', authMiddleware)

  /**
   * GET /messages
   * Returns aggregated inbox across all platforms for the authenticated user.
   * Groups by listing, sorted by most recent message.
   */
  app.get('/', async (request) => {
    const { unread, platform, listingId } = request.query as {
      unread?: string
      platform?: string
      listingId?: string
    }

    const where: Parameters<typeof prisma.message.findMany>[0]['where'] = {
      userId: request.userId,
    }
    if (unread === 'true') where.readAt = null
    if (platform) where.platform = platform.toUpperCase() as Platform
    if (listingId) where.listingId = listingId

    const messages = await prisma.message.findMany({
      where,
      include: {
        listing: {
          select: { id: true, title: true, photos: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return messages
  })

  /**
   * GET /messages/threads
   * Returns conversation threads grouped by listing + buyer.
   */
  app.get('/threads', async (request) => {
    const messages = await prisma.message.findMany({
      where: { userId: request.userId },
      include: {
        listing: { select: { id: true, title: true, photos: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by listingId + buyerId (or buyerName fallback)
    const threads = new Map<
      string,
      {
        key: string
        listingId: string
        listing: { id: string; title: string; photos: string[] }
        platform: string
        buyerId: string | null
        buyerName: string | null
        lastMessage: (typeof messages)[0]
        unreadCount: number
        messageCount: number
      }
    >()

    for (const msg of messages) {
      const key = `${msg.listingId}:${msg.platform}:${msg.buyerId ?? msg.buyerName ?? 'unknown'}`
      const existing = threads.get(key)
      if (!existing) {
        threads.set(key, {
          key,
          listingId: msg.listingId,
          listing: msg.listing,
          platform: msg.platform,
          buyerId: msg.buyerId,
          buyerName: msg.buyerName,
          lastMessage: msg,
          unreadCount: msg.readAt === null && msg.direction === MessageDirection.INBOUND ? 1 : 0,
          messageCount: 1,
        })
      } else {
        existing.messageCount++
        if (msg.readAt === null && msg.direction === MessageDirection.INBOUND) {
          existing.unreadCount++
        }
      }
    }

    return Array.from(threads.values())
  })

  /**
   * GET /messages/listing/:listingId
   * Returns all messages for a specific listing (conversation thread).
   */
  app.get<{ Params: { listingId: string } }>('/listing/:listingId', async (request, reply) => {
    const listing = await prisma.listing.findFirst({
      where: { id: request.params.listingId, userId: request.userId },
    })
    if (!listing) return reply.status(404).send({ error: 'Listing not found' })

    const messages = await prisma.message.findMany({
      where: { listingId: request.params.listingId, userId: request.userId },
      orderBy: { createdAt: 'asc' },
    })

    // Mark inbound messages as read
    await prisma.message.updateMany({
      where: {
        listingId: request.params.listingId,
        userId: request.userId,
        direction: MessageDirection.INBOUND,
        readAt: null,
      },
      data: { readAt: new Date() },
    })

    return messages
  })

  /**
   * POST /messages
   * Records an inbound message (from platform webhook) or sends outbound.
   */
  app.post('/', async (request, reply) => {
    const body = sendMessageSchema.parse(request.body)

    const listing = await prisma.listing.findFirst({
      where: { id: body.listingId, userId: request.userId },
    })
    if (!listing) return reply.status(404).send({ error: 'Listing not found' })

    const message = await prisma.message.create({
      data: {
        listingId: body.listingId,
        userId: request.userId,
        platform: body.platform,
        buyerName: body.buyerName ?? null,
        buyerId: body.buyerId ?? null,
        content: body.content,
        direction: MessageDirection.INBOUND,
        externalId: body.externalId ?? null,
      },
    })

    return reply.status(201).send(message)
  })

  /**
   * PATCH /messages/:id/read
   * Marks a message as read.
   */
  app.patch<{ Params: { id: string } }>('/:id/read', async (request, reply) => {
    const message = await prisma.message.findFirst({
      where: { id: request.params.id, userId: request.userId },
    })
    if (!message) return reply.status(404).send({ error: 'Message not found' })

    const updated = await prisma.message.update({
      where: { id: request.params.id },
      data: { readAt: new Date() },
    })
    return updated
  })

  /**
   * GET /messages/unread-count
   * Returns total unread inbound message count.
   */
  app.get('/unread-count', async (request) => {
    const count = await prisma.message.count({
      where: {
        userId: request.userId,
        direction: MessageDirection.INBOUND,
        readAt: null,
      },
    })
    return { unreadCount: count }
  })
}
