import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, makeMockPrisma } from './helpers/app'

const AUTH_HEADER = { authorization: 'Bearer test-token' }

describe('Stripe routes', () => {
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

  it('GET /stripe/subscription — returns FREE status when no subscription', async () => {
    const res = await app.inject({ method: 'GET', url: '/stripe/subscription', headers: AUTH_HEADER })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('FREE')
  })

  it('POST /stripe/checkout — returns checkout URL', async () => {
    const res = await app.inject({ method: 'POST', url: '/stripe/checkout', headers: AUTH_HEADER })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.checkoutUrl).toContain('stripe.com')
  })

  it('POST /stripe/webhook — returns received:true for valid event', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/stripe/webhook',
      headers: { 'stripe-signature': 'test-sig', 'content-type': 'application/json' },
      payload: JSON.stringify({ type: 'test.event', data: { object: {} } }),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().received).toBe(true)
  })

  it('POST /stripe/webhook — 400 without signature', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/stripe/webhook',
      headers: { 'content-type': 'application/json' },
      payload: '{}',
    })
    expect(res.statusCode).toBe(400)
  })
})
