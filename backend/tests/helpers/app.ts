/**
 * Test helper — builds a Fastify app with mocked Prisma and external services.
 * Does NOT require a real database or Redis.
 */
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import multipart from '@fastify/multipart'
import { vi } from 'vitest'

// ── Mock heavy deps before importing routes ───────────────────────────────
vi.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    LOG_LEVEL: 'silent',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    SUPABASE_JWT_SECRET: 'test-jwt-secret',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    DIRECT_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379',
    GOOGLE_VISION_API_KEY: 'test-vision-key',
    OPENAI_API_KEY: 'test-openai-key',
    EBAY_CLIENT_ID: 'test-ebay-client',
    EBAY_CLIENT_SECRET: 'test-ebay-secret',
    EBAY_REDIRECT_URI: 'http://localhost:3001/oauth/ebay/callback',
    FACEBOOK_APP_ID: 'test-fb-id',
    FACEBOOK_APP_SECRET: 'test-fb-secret',
    STRIPE_SECRET_KEY: 'sk_test_xxx',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
    TOKEN_ENCRYPTION_KEY: 'a'.repeat(64),
    FIREBASE_PROJECT_ID: 'test-project',
    FIREBASE_PRIVATE_KEY: 'test-private-key',
    FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
    APP_URL: 'http://localhost:3001',
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-uuid-1', email: 'test@example.com' } },
        error: null,
      }),
      admin: {
        createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-uuid-1' } }, error: null }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      signInWithPassword: vi.fn().mockResolvedValue({
        data: {
          user: { id: 'user-uuid-1', email: 'test@example.com' },
          session: { access_token: 'test-token', refresh_token: 'test-refresh', expires_at: 9999999999 },
        },
        error: null,
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'new-token', refresh_token: 'new-refresh', expires_at: 9999999999 } },
        error: null,
      }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/photo.jpg' } }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  }),
}))

vi.mock('ioredis', () => ({
  Redis: vi.fn().mockReturnValue({
    disconnect: vi.fn(),
  }),
}))

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockReturnValue({ add: vi.fn().mockResolvedValue({}) }),
  Worker: vi.fn(),
  QueueEvents: vi.fn(),
}))

vi.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: vi.fn().mockReturnValue({
    annotateImage: vi.fn().mockResolvedValue([{
      labelAnnotations: [{ description: 'Shirt' }],
      localizedObjectAnnotations: [{ name: 'Shirt' }],
      textAnnotations: [{ description: 'Nike' }],
      imagePropertiesAnnotation: {
        dominantColors: { colors: [{ color: { red: 255, green: 255, blue: 255 }, score: 1.0 }] },
      },
    }]),
  }),
}))

vi.mock('openai', () => ({
  default: vi.fn().mockReturnValue({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ title: 'Test Title', description: 'Test description.', suggestedTags: ['tag1'] }) } }],
          usage: { total_tokens: 200 },
        }),
      },
    },
  }),
}))

vi.mock('stripe', () => ({
  default: vi.fn().mockReturnValue({
    customers: {
      create: vi.fn().mockResolvedValue({ id: 'cus_test' }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/test', id: 'cs_test' }),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://billing.stripe.com/test' }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({ type: 'unknown', data: { object: {} } }),
    },
  }),
}))

export function makeMockPrisma() {
  const mockListing = {
    id: 'listing-uuid-1',
    userId: 'user-uuid-1',
    title: 'Test Listing',
    description: 'A test listing',
    price: '10.00',
    currency: 'USD',
    photos: ['https://example.com/photo.jpg'],
    category: 'Clothing',
    detectedAttributes: null,
    status: 'DRAFT',
    language: 'en',
    createdAt: new Date(),
    updatedAt: new Date(),
    platformListings: [],
    messages: [],
  }

  return {
    listing: {
      findMany: vi.fn().mockResolvedValue([mockListing]),
      findFirst: vi.fn().mockResolvedValue(mockListing),
      findUnique: vi.fn().mockResolvedValue(mockListing),
      create: vi.fn().mockResolvedValue({ ...mockListing, id: 'listing-uuid-2' }),
      update: vi.fn().mockResolvedValue(mockListing),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      upsert: vi.fn().mockResolvedValue(mockListing),
    },
    user: {
      upsert: vi.fn().mockResolvedValue({ id: 'user-uuid-1', email: 'test@example.com', name: null }),
      findUnique: vi.fn().mockResolvedValue({ id: 'user-uuid-1', email: 'test@example.com' }),
    },
    platformListing: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'pl-uuid-1', platform: 'EBAY', status: 'PENDING' }),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    platformAccount: {
      findMany: vi.fn().mockResolvedValue([{ platform: 'EBAY', isActive: true }]),
      findUnique: vi.fn().mockResolvedValue({ id: 'pa-uuid-1', platform: 'EBAY', isActive: true }),
      upsert: vi.fn().mockResolvedValue({ id: 'pa-uuid-1', platform: 'EBAY', isActive: true }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    message: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'msg-uuid-1', content: 'Test', direction: 'INBOUND' }),
      update: vi.fn().mockResolvedValue({ id: 'msg-uuid-1', readAt: new Date() }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      count: vi.fn().mockResolvedValue(0),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'sub-uuid-1', status: 'FREE' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $disconnect: vi.fn(),
  }
}

export async function buildTestApp(prisma: ReturnType<typeof makeMockPrisma>) {
  const { healthRoutes } = await import('../../src/routes/health')
  const { authRoutes } = await import('../../src/routes/auth')
  const { listingRoutes } = await import('../../src/routes/listings')
  const { photoRoutes } = await import('../../src/routes/photos')
  const { aiRoutes } = await import('../../src/routes/ai')
  const { pricingRoutes } = await import('../../src/routes/pricing')
  const { publishRoutes } = await import('../../src/routes/publish')
  const { platformAccountRoutes } = await import('../../src/routes/platform-accounts')
  const { messageRoutes } = await import('../../src/routes/messages')
  const { stripeRoutes } = await import('../../src/routes/stripe')

  const app = Fastify({ logger: false })

  await app.register(helmet)
  await app.register(cors, { origin: true })
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } })

  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    ;(req as any).rawBody = body
    try {
      done(null, JSON.parse(body.toString()))
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  await app.register(healthRoutes)
  await app.register(authRoutes, { prefix: '/auth', prisma: prisma as any })
  await app.register(listingRoutes, { prefix: '/listings', prisma: prisma as any })
  await app.register(photoRoutes, { prefix: '/photos', prisma: prisma as any })
  await app.register(aiRoutes, { prefix: '/ai', prisma: prisma as any })
  await app.register(pricingRoutes, { prefix: '/pricing', prisma: prisma as any })
  await app.register(publishRoutes, { prefix: '/listings', prisma: prisma as any })
  await app.register(platformAccountRoutes, { prefix: '/platform-accounts', prisma: prisma as any })
  await app.register(messageRoutes, { prefix: '/messages', prisma: prisma as any })
  await app.register(stripeRoutes, { prefix: '/stripe', prisma: prisma as any })

  return app
}
