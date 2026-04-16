import { FastifyInstance } from 'fastify'
import { PrismaClient, ListingStatus } from '@prisma/client'
import { PostHog } from 'posthog-node'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'

const createListingSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(5000),
  price: z.number().positive(),
  currency: z.enum(['USD', 'EUR', 'CAD', 'GBP']).default('USD'),
  category: z.string().optional(),
  language: z.enum(['en', 'fr', 'es']).default('en'),
})

const updateListingSchema = createListingSchema.partial()

export async function listingRoutes(
  app: FastifyInstance,
  opts: { prisma: PrismaClient; posthog: PostHog | null },
): Promise<void> {
  const { prisma, posthog } = opts

  // Protect all routes
  app.addHook('preHandler', authMiddleware)

  // GET /listings
  app.get('/', async (request) => {
    return prisma.listing.findMany({
      where: { userId: request.userId },
      include: { platformListings: true },
      orderBy: { createdAt: 'desc' },
    })
  })

  // POST /listings
  app.post('/', async (request, reply) => {
    const body = createListingSchema.parse(request.body)
    const listing = await prisma.listing.create({
      data: {
        userId: request.userId,
        title: body.title,
        description: body.description,
        price: body.price,
        currency: body.currency,
        language: body.language,
        category: body.category,
        status: ListingStatus.DRAFT,
      },
    })

    posthog?.capture({
      distinctId: request.userId,
      event: 'listing_created',
      properties: { listingId: listing.id, category: listing.category, currency: listing.currency, language: listing.language },
    })

    return reply.status(201).send(listing)
  })

  // GET /listings/:id
  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const listing = await prisma.listing.findFirst({
      where: { id: request.params.id, userId: request.userId },
      include: { platformListings: true, messages: { orderBy: { createdAt: 'asc' } } },
    })
    if (!listing) return reply.status(404).send({ error: 'Listing not found' })
    return listing
  })

  // PATCH /listings/:id
  app.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const existing = await prisma.listing.findFirst({
      where: { id: request.params.id, userId: request.userId },
    })
    if (!existing) return reply.status(404).send({ error: 'Listing not found' })

    const body = updateListingSchema.parse(request.body)
    const updated = await prisma.listing.update({
      where: { id: request.params.id },
      data: body,
    })
    return updated
  })

  // DELETE /listings/:id (archive)
  app.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const existing = await prisma.listing.findFirst({
      where: { id: request.params.id, userId: request.userId },
    })
    if (!existing) return reply.status(404).send({ error: 'Listing not found' })

    await prisma.listing.update({
      where: { id: request.params.id },
      data: { status: ListingStatus.ARCHIVED },
    })
    return reply.status(204).send()
  })

  // PATCH /listings/:id/sold
  app.patch<{ Params: { id: string } }>('/:id/sold', async (request, reply) => {
    const existing = await prisma.listing.findFirst({
      where: { id: request.params.id, userId: request.userId },
    })
    if (!existing) return reply.status(404).send({ error: 'Listing not found' })

    const updated = await prisma.listing.update({
      where: { id: request.params.id },
      data: {
        status: ListingStatus.SOLD,
        platformListings: {
          updateMany: { where: { listingId: request.params.id }, data: { status: 'SOLD' } },
        },
      },
      include: { platformListings: true },
    })
    return updated
  })
}
