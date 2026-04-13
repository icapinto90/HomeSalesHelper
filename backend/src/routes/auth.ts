import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100).optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function authRoutes(
  app: FastifyInstance,
  opts: { prisma: PrismaClient },
): Promise<void> {
  const { prisma } = opts

  // POST /auth/signup
  app.post('/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body)

    const { data, error } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Skip email confirmation for MVP
    })

    if (error || !data.user) {
      return reply.status(400).send({ error: error?.message ?? 'Signup failed' })
    }

    // Upsert user profile in our DB
    const user = await prisma.user.upsert({
      where: { id: data.user.id },
      create: {
        id: data.user.id,
        email: body.email,
        name: body.name ?? null,
      },
      update: { name: body.name ?? undefined },
    })

    // Sign in immediately to return a session token
    const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (signInError || !session.session) {
      return reply.status(201).send({ user, token: null })
    }

    return reply.status(201).send({
      user,
      token: session.session.access_token,
      refreshToken: session.session.refresh_token,
      expiresAt: session.session.expires_at,
    })
  })

  // POST /auth/login
  app.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (error || !data.session) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    // Ensure user row exists (may have been created externally via Supabase dashboard)
    const user = await prisma.user.upsert({
      where: { id: data.user.id },
      create: { id: data.user.id, email: data.user.email! },
      update: {},
    })

    return reply.send({
      user,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    })
  })

  // POST /auth/logout
  app.post('/logout', async (request, reply) => {
    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      await supabase.auth.admin.signOut(token)
    }
    return reply.status(204).send()
  })

  // POST /auth/refresh
  app.post('/refresh', async (request, reply) => {
    const body = z.object({ refreshToken: z.string() }).parse(request.body)

    const { data, error } = await supabase.auth.refreshSession({ refresh_token: body.refreshToken })

    if (error || !data.session) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' })
    }

    return reply.send({
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
    })
  })
}
