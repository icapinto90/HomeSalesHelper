import { FastifyInstance } from 'fastify'
import { PrismaClient, Platform } from '@prisma/client'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { encrypt, decrypt } from '../utils/crypto'
import { env } from '../config/env'

const EBAY_TOKEN_URL = 'https://api.ebay.com/identity/v1/oauth2/token'
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v21.0/oauth/access_token'

export async function platformAccountRoutes(
  app: FastifyInstance,
  opts: { prisma: PrismaClient },
): Promise<void> {
  const { prisma } = opts

  app.addHook('preHandler', authMiddleware)

  // GET /platform-accounts — list connected accounts
  app.get('/', async (request) => {
    const accounts = await prisma.platformAccount.findMany({
      where: { userId: request.userId },
      select: {
        id: true,
        platform: true,
        platformUserId: true,
        platformUsername: true,
        tokenExpiry: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Never return raw tokens
      },
    })
    return accounts
  })

  /**
   * GET /platform-accounts/oauth/ebay/url
   * Returns the eBay OAuth authorization URL for the user to redirect to.
   */
  app.get('/oauth/ebay/url', async (request, reply) => {
    const state = Buffer.from(
      JSON.stringify({ userId: request.userId, ts: Date.now() }),
    ).toString('base64url')

    const params = new URLSearchParams({
      client_id: env.EBAY_CLIENT_ID,
      redirect_uri: env.EBAY_REDIRECT_URI,
      response_type: 'code',
      scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account',
      state,
    })

    const authUrl = `https://auth.ebay.com/oauth2/authorize?${params.toString()}`
    return reply.send({ authUrl, state })
  })

  /**
   * POST /platform-accounts/oauth/ebay/callback
   * Exchanges eBay auth code for tokens and stores them encrypted.
   */
  app.post('/oauth/ebay/callback', async (request, reply) => {
    const body = z.object({ code: z.string(), state: z.string().optional() }).parse(request.body)

    const credentials = Buffer.from(`${env.EBAY_CLIENT_ID}:${env.EBAY_CLIENT_SECRET}`).toString('base64')

    const tokenRes = await fetch(EBAY_TOKEN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: env.EBAY_REDIRECT_URI,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      return reply.status(400).send({ error: `eBay token exchange failed: ${err}` })
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
      token_type: string
    }

    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)

    const account = await prisma.platformAccount.upsert({
      where: { userId_platform: { userId: request.userId, platform: Platform.EBAY } },
      create: {
        userId: request.userId,
        platform: Platform.EBAY,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiry,
        isActive: true,
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiry,
        isActive: true,
      },
      select: {
        id: true, platform: true, platformUserId: true, platformUsername: true,
        tokenExpiry: true, isActive: true,
      },
    })

    return reply.status(201).send(account)
  })

  /**
   * GET /platform-accounts/oauth/facebook/url
   * Returns Facebook OAuth URL.
   */
  app.get('/oauth/facebook/url', async (request, reply) => {
    const state = Buffer.from(
      JSON.stringify({ userId: request.userId, ts: Date.now() }),
    ).toString('base64url')

    const params = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      redirect_uri: `${env.APP_URL}/platform-accounts/oauth/facebook/callback`,
      scope: 'marketplace_listing_manage',
      state,
      response_type: 'code',
    })

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`
    return reply.send({ authUrl, state })
  })

  /**
   * POST /platform-accounts/oauth/facebook/callback
   * Exchanges Facebook auth code for a long-lived token and stores it.
   */
  app.post('/oauth/facebook/callback', async (request, reply) => {
    const body = z.object({ code: z.string() }).parse(request.body)

    const shortTokenParams = new URLSearchParams({
      client_id: env.FACEBOOK_APP_ID,
      client_secret: env.FACEBOOK_APP_SECRET,
      redirect_uri: `${env.APP_URL}/platform-accounts/oauth/facebook/callback`,
      code: body.code,
    })

    const shortRes = await fetch(`${FACEBOOK_TOKEN_URL}?${shortTokenParams.toString()}`)
    if (!shortRes.ok) {
      const err = await shortRes.text()
      return reply.status(400).send({ error: `Facebook token exchange failed: ${err}` })
    }
    const shortData = (await shortRes.json()) as { access_token: string }

    // Exchange for long-lived token (60 days)
    const longTokenParams = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: env.FACEBOOK_APP_ID,
      client_secret: env.FACEBOOK_APP_SECRET,
      fb_exchange_token: shortData.access_token,
    })

    const longRes = await fetch(`${FACEBOOK_TOKEN_URL}?${longTokenParams.toString()}`)
    if (!longRes.ok) {
      return reply.status(400).send({ error: 'Failed to exchange for long-lived Facebook token' })
    }
    const longData = (await longRes.json()) as { access_token: string; expires_in?: number }

    const tokenExpiry = longData.expires_in
      ? new Date(Date.now() + longData.expires_in * 1000)
      : new Date(Date.now() + 60 * 24 * 3600 * 1000) // 60 days fallback

    const account = await prisma.platformAccount.upsert({
      where: { userId_platform: { userId: request.userId, platform: Platform.FACEBOOK } },
      create: {
        userId: request.userId,
        platform: Platform.FACEBOOK,
        accessToken: encrypt(longData.access_token),
        tokenExpiry,
        isActive: true,
      },
      update: {
        accessToken: encrypt(longData.access_token),
        tokenExpiry,
        isActive: true,
      },
      select: {
        id: true, platform: true, platformUserId: true, platformUsername: true,
        tokenExpiry: true, isActive: true,
      },
    })

    return reply.status(201).send(account)
  })

  /**
   * DELETE /platform-accounts/:platform
   * Disconnects a marketplace account.
   */
  app.delete<{ Params: { platform: string } }>('/:platform', async (request, reply) => {
    const platform = request.params.platform.toUpperCase() as Platform
    if (!Object.values(Platform).includes(platform)) {
      return reply.status(400).send({ error: 'Invalid platform' })
    }

    await prisma.platformAccount.updateMany({
      where: { userId: request.userId, platform },
      data: { isActive: false },
    })

    return reply.status(204).send()
  })
}
