import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, makeMockPrisma } from './helpers/app'

describe('Auth routes', () => {
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

  describe('POST /auth/signup', () => {
    it('creates a user and returns a token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: { email: 'new@example.com', password: 'password123', name: 'Test User' },
      })
      expect(res.statusCode).toBe(201)
      const body = res.json()
      expect(body.user).toBeDefined()
      expect(body.token).toBeDefined()
    })

    it('returns 400 for missing password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: { email: 'new@example.com' },
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('POST /auth/login', () => {
    it('returns a token for valid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'test@example.com', password: 'password123' },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.token).toBe('test-token')
      expect(body.user).toBeDefined()
    })
  })

  describe('POST /auth/refresh', () => {
    it('returns new tokens for a valid refresh token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: { refreshToken: 'test-refresh' },
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.token).toBe('new-token')
    })
  })

  describe('POST /auth/logout', () => {
    it('returns 204', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: { authorization: 'Bearer test-token' },
      })
      expect(res.statusCode).toBe(204)
    })
  })
})
