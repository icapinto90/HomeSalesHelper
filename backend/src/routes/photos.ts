import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'
import { authMiddleware } from '../middleware/auth'
import { randomUUID } from 'crypto'
import path from 'path'

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const BUCKET = 'listing-photos'
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
const MAX_FILES = 10

export async function photoRoutes(
  app: FastifyInstance,
  opts: { prisma: PrismaClient },
): Promise<void> {
  const { prisma } = opts

  app.addHook('preHandler', authMiddleware)

  /**
   * POST /photos/upload
   * Multipart form-data: up to 10 images per request.
   * Returns array of Supabase Storage public URLs.
   */
  app.post('/upload', async (request, reply) => {
    const parts = request.files()
    const urls: string[] = []
    let count = 0

    for await (const part of parts) {
      if (count >= MAX_FILES) break

      if (!ALLOWED_MIME.includes(part.mimetype)) {
        return reply.status(400).send({
          error: `Unsupported file type: ${part.mimetype}. Allowed: ${ALLOWED_MIME.join(', ')}`,
        })
      }

      const ext = path.extname(part.filename || '.jpg') || '.jpg'
      const storagePath = `${request.userId}/${randomUUID()}${ext}`

      const buffer = await part.toBuffer()

      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: part.mimetype,
        upsert: false,
      })

      if (error) {
        return reply.status(500).send({ error: `Storage upload failed: ${error.message}` })
      }

      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
      urls.push(publicData.publicUrl)
      count++
    }

    if (urls.length === 0) {
      return reply.status(400).send({ error: 'No valid files uploaded' })
    }

    return reply.status(201).send({ urls })
  })

  /**
   * DELETE /photos
   * Body: { urls: string[] }
   * Deletes photos from Supabase Storage (only files owned by the user).
   */
  app.delete('/', async (request, reply) => {
    const body = request.body as { urls?: string[] }
    if (!Array.isArray(body?.urls) || body.urls.length === 0) {
      return reply.status(400).send({ error: 'urls array is required' })
    }

    // Extract storage paths from public URLs and verify ownership
    const storagePaths: string[] = []
    for (const url of body.urls) {
      try {
        const parsed = new URL(url)
        // Public URL format: .../storage/v1/object/public/{bucket}/{path}
        const marker = `/object/public/${BUCKET}/`
        const idx = parsed.pathname.indexOf(marker)
        if (idx === -1) continue
        const storagePath = decodeURIComponent(parsed.pathname.slice(idx + marker.length))
        // Only allow deleting own files
        if (storagePath.startsWith(`${request.userId}/`)) {
          storagePaths.push(storagePath)
        }
      } catch {
        // Skip malformed URLs
      }
    }

    if (storagePaths.length > 0) {
      const { error } = await supabase.storage.from(BUCKET).remove(storagePaths)
      if (error) {
        return reply.status(500).send({ error: `Storage delete failed: ${error.message}` })
      }
    }

    return reply.status(204).send()
  })
}
