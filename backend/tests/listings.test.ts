import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, makeMockPrisma } from './helpers/app'

const AUTH_HEADER = { authorization: 'Bearer test-token' }

describe('Listings routes', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>
  let prisma: ReturnType<typeof makeMockPrisma>

  beforeAll(async () => {
    prisma = makeMockPrisma()
    app = await buildTestApp(prisma)
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /listings — returns list', async () => {
    const res = await app.inject({ method: 'GET', url: '/listings', headers: AUTH_HEADER })
    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.json())).toBe(true)
  })

  it('POST /listings — creates listing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/listings',
      headers: AUTH_HEADER,
      payload: { title: 'Nike Shirt', description: 'A great shirt in good condition.', price: 15.99 },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.title).toBeDefined()
  })

  it('POST /listings — rejects missing price', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/listings',
      headers: AUTH_HEADER,
      payload: { title: 'No price' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /listings/:id — returns listing', async () => {
    const res = await app.inject({ method: 'GET', url: '/listings/listing-uuid-1', headers: AUTH_HEADER })
    expect(res.statusCode).toBe(200)
  })

  it('GET /listings/:id — 404 when not found', async () => {
    prisma.listing.findFirst.mockResolvedValueOnce(null)
    const res = await app.inject({ method: 'GET', url: '/listings/not-found', headers: AUTH_HEADER })
    expect(res.statusCode).toBe(404)
  })

  it('PATCH /listings/:id — updates listing', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/listings/listing-uuid-1',
      headers: AUTH_HEADER,
      payload: { price: 12.99 },
    })
    expect(res.statusCode).toBe(200)
  })

  it('DELETE /listings/:id — archives listing', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/listings/listing-uuid-1', headers: AUTH_HEADER })
    expect(res.statusCode).toBe(204)
  })

  it('PATCH /listings/:id/sold — marks as sold', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/listings/listing-uuid-1/sold', headers: AUTH_HEADER })
    expect(res.statusCode).toBe(200)
  })

  it('GET /listings/:id/publish-status — returns platform statuses', async () => {
    const res = await app.inject({ method: 'GET', url: '/listings/listing-uuid-1/publish-status', headers: AUTH_HEADER })
    expect(res.statusCode).toBe(200)
    expect(res.json().platforms).toBeDefined()
  })

  it('POST /listings/:id/publish — enqueues jobs', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/listings/listing-uuid-1/publish',
      headers: AUTH_HEADER,
      payload: { platforms: ['EBAY'] },
    })
    expect(res.statusCode).toBe(202)
  })

  it('POST /listings/:id/publish — 422 when no photos', async () => {
    prisma.listing.findFirst.mockResolvedValueOnce({
      id: 'listing-uuid-1',
      userId: 'user-uuid-1',
      title: 'No photos',
      description: 'desc',
      price: '10.00',
      currency: 'USD',
      photos: [],
      status: 'DRAFT',
      category: null,
      detectedAttributes: null,
      language: 'en',
      createdAt: new Date(),
      updatedAt: new Date(),
      platformListings: [],
      messages: [],
    })
    const res = await app.inject({
      method: 'POST',
      url: '/listings/listing-uuid-1/publish',
      headers: AUTH_HEADER,
      payload: { platforms: ['EBAY'] },
    })
    expect(res.statusCode).toBe(422)
  })
})
