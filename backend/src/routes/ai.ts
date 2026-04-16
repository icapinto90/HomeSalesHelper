import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { PostHog } from 'posthog-node'
import { z } from 'zod'
import { ImageAnnotatorClient } from '@google-cloud/vision'
import OpenAI from 'openai'
import { env } from '../config/env'
import { authMiddleware } from '../middleware/auth'

const visionClient = new ImageAnnotatorClient({
  apiKey: env.GOOGLE_VISION_API_KEY,
})

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

const identifySchema = z.object({
  imageUrl: z.string().url(),
})

const generateSchema = z.object({
  listingId: z.string().uuid(),
  language: z.enum(['en', 'fr', 'es']).default('en'),
  tone: z.enum(['casual', 'professional']).default('casual'),
})

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
}

export async function aiRoutes(
  app: FastifyInstance,
  opts: { prisma: PrismaClient; posthog: PostHog | null },
): Promise<void> {
  const { prisma, posthog } = opts

  app.addHook('preHandler', authMiddleware)

  /**
   * POST /ai/identify
   * Sends an image URL to Google Vision API for object detection.
   * Returns detected labels, objects, and extracted attributes.
   */
  app.post('/identify', async (request, reply) => {
    const body = identifySchema.parse(request.body)

    const [result] = await visionClient.annotateImage({
      image: { source: { imageUri: body.imageUrl } },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 10 },
        { type: 'OBJECT_LOCALIZATION', maxResults: 5 },
        { type: 'TEXT_DETECTION' },
        { type: 'IMAGE_PROPERTIES' },
      ],
    })

    // Extract dominant colors
    const colors =
      result.imagePropertiesAnnotation?.dominantColors?.colors
        ?.slice(0, 3)
        .map((c) => {
          const r = Math.round(c.color?.red ?? 0)
          const g = Math.round(c.color?.green ?? 0)
          const b = Math.round(c.color?.blue ?? 0)
          return `rgb(${r},${g},${b})`
        }) ?? []

    // Extract text (brand detection)
    const detectedText = result.textAnnotations?.[0]?.description?.trim() ?? null

    // Build attributes
    const labels = result.labelAnnotations?.map((l) => l.description).filter(Boolean) ?? []
    const objects = result.localizedObjectAnnotations?.map((o) => o.name).filter(Boolean) ?? []

    const attributes = {
      labels,
      objects,
      colors,
      detectedText,
      // Simple heuristic for category suggestion
      suggestedCategory: objects[0] ?? labels[0] ?? null,
    }

    return reply.send({ attributes })
  })

  /**
   * POST /ai/generate
   * Generates a listing title + description using GPT-4o.
   * Patches the listing with the generated content.
   */
  app.post('/generate', async (request, reply) => {
    const body = generateSchema.parse(request.body)

    const listing = await prisma.listing.findFirst({
      where: { id: body.listingId, userId: request.userId },
    })

    if (!listing) {
      return reply.status(404).send({ error: 'Listing not found' })
    }

    posthog?.capture({
      distinctId: request.userId,
      event: 'ai_analysis_requested',
      properties: { listingId: listing.id, language: body.language, tone: body.tone },
    })

    const attributes = listing.detectedAttributes as Record<string, unknown> | null
    const langName = LANGUAGE_NAMES[body.language] ?? 'English'

    const systemPrompt = `You are an expert e-commerce copywriter. Generate compelling marketplace listings that sell items quickly. Always respond with valid JSON only, no markdown.`

    const userPrompt = `Generate a marketplace listing for this item.

Item details:
- Current title: ${listing.title}
- Current description: ${listing.description}
- Price: ${listing.price} ${listing.currency}
- Category: ${listing.category ?? 'Unknown'}
- AI detected attributes: ${JSON.stringify(attributes ?? {})}

Requirements:
- Language: ${langName}
- Tone: ${body.tone}
- Title: 60-80 chars, punchy, SEO-friendly
- Description: 150-400 words, include condition, shipping policy note, and call to action
- Output JSON: { "title": "...", "description": "...", "suggestedTags": ["..."] }`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    })

    const raw = completion.choices[0]?.message?.content ?? '{}'
    let generated: { title?: string; description?: string; suggestedTags?: string[] }
    try {
      generated = JSON.parse(raw)
    } catch {
      return reply.status(500).send({ error: 'AI returned invalid JSON' })
    }

    // Patch the listing with the generated content
    const updated = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        title: generated.title ?? listing.title,
        description: generated.description ?? listing.description,
        language: body.language,
      },
    })

    posthog?.capture({
      distinctId: request.userId,
      event: 'ai_analysis_completed',
      properties: { listingId: listing.id, tokensUsed: completion.usage?.total_tokens ?? 0 },
    })

    return reply.send({
      listing: updated,
      generated,
      tokensUsed: completion.usage?.total_tokens,
    })
  })

  /**
   * POST /ai/suggest-reply
   * Suggests a reply to a buyer message using GPT-4o.
   */
  app.post('/suggest-reply', async (request, reply) => {
    const body = z
      .object({
        messageId: z.string().uuid(),
        tone: z.enum(['friendly', 'professional', 'firm']).default('friendly'),
      })
      .parse(request.body)

    const message = await prisma.message.findUnique({
      where: { id: body.messageId },
      include: { listing: true },
    })

    if (!message || message.userId !== request.userId) {
      return reply.status(404).send({ error: 'Message not found' })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful marketplace seller. Write a concise, ${body.tone} reply to a buyer message. Return only the reply text, no extra formatting.`,
        },
        {
          role: 'user',
          content: `Listing: "${message.listing.title}" priced at ${message.listing.price} ${message.listing.currency}\n\nBuyer message: "${message.content}"\n\nWrite a reply:`,
        },
      ],
      temperature: 0.6,
      max_tokens: 300,
    })

    const suggestedReply = completion.choices[0]?.message?.content?.trim() ?? ''
    return reply.send({ suggestedReply })
  })
}
