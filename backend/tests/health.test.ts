import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildTestApp, makeMockPrisma } from './helpers/app'

describe('GET /health', () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>

  beforeAll(async () => {
    app = await buildTestApp(makeMockPrisma())
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('returns 200 with status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ok')
    expect(body.timestamp).toBeDefined()
  })
})
