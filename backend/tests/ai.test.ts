import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, makeMockPrisma } from './helpers/app'

const AUTH_HEADER = { authorization: 'Bearer test-token' }

describe('AI routes', () => {
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

  it('POST /ai/identify — returns attributes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/identify',
      headers: AUTH_HEADER,
      payload: { imageUrl: 'https://example.com/photo.jpg' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.attributes).toBeDefined()
    expect(body.attributes.labels).toContain('Shirt')
    expect(body.attributes.detectedText).toBe('Nike')
  })

  it('POST /ai/identify — 400 for invalid URL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/identify',
      headers: AUTH_HEADER,
      payload: { imageUrl: 'not-a-url' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST /ai/generate — generates content and updates listing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/ai/generate',
      headers: AUTH_HEADER,
      payload: { listingId: 'listing-uuid-1', language: 'en', tone: 'casual' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.generated.title).toBe('Test Title')
    expect(body.tokensUsed).toBe(200)
  })

  it('POST /ai/generate — 404 when listing not found', async () => {
    prisma.listing.findFirst.mockResolvedValueOnce(null)
    const res = await app.inject({
      method: 'POST',
      url: '/ai/generate',
      headers: AUTH_HEADER,
      payload: { listingId: 'nonexistent-uuid' },
    })
    expect(res.statusCode).toBe(404)
  })
})
