import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth'
import { env } from '../config/env'

const suggestSchema = z.object({
  listingId: z.string().uuid().optional(),
  keywords: z.string().min(1).max(200),
  condition: z.enum(['New', 'Like New', 'Very Good', 'Good', 'Acceptable']).default('Good'),
  currency: z.enum(['USD', 'EUR', 'CAD', 'GBP']).default('USD'),
})

interface EbayItem {
  title: string[]
  sellingStatus: Array<{
    currentPrice: Array<{ __value__: string; '@currencyId': string }>
    sellingState: string[]
  }>
  condition?: Array<{ conditionDisplayName: string[] }>
}

interface EbaySearchResponse {
  findItemsByKeywordsResponse?: Array<{
    searchResult?: Array<{
      item?: EbayItem[]
    }>
  }>
}

export async function pricingRoutes(
  app: FastifyInstance,
  opts: { prisma: PrismaClient },
): Promise<void> {
  const { prisma } = opts

  app.addHook('preHandler', authMiddleware)

  /**
   * POST /pricing/suggest
   * Queries eBay Finding API for sold/active listings to suggest a price.
   * Returns median, min, max, and a recommended price.
   */
  app.post('/suggest', async (request, reply) => {
    const body = suggestSchema.parse(request.body)

    // Resolve keywords from listing if listingId provided
    let keywords = body.keywords
    if (body.listingId) {
      const listing = await prisma.listing.findFirst({
        where: { id: body.listingId, userId: request.userId },
      })
      if (listing) {
        keywords = `${listing.title} ${listing.category ?? ''}`.trim()
      }
    }

    // eBay Finding API — findCompletedItems (sold items = best signal for pricing)
    const ebayApiUrl = 'https://svcs.ebay.com/services/search/FindingService/v1'
    const params = new URLSearchParams({
      'OPERATION-NAME': 'findCompletedItems',
      'SERVICE-VERSION': '1.0.0',
      'SECURITY-APPNAME': env.EBAY_CLIENT_ID,
      'RESPONSE-DATA-FORMAT': 'JSON',
      'REST-PAYLOAD': '',
      'keywords': keywords,
      'itemFilter(0).name': 'SoldItemsOnly',
      'itemFilter(0).value': 'true',
      'itemFilter(1).name': 'Condition',
      'itemFilter(1).value': body.condition,
      'paginationInput.entriesPerPage': '50',
      'sortOrder': 'EndTimeSoonest',
    })

    const res = await fetch(`${ebayApiUrl}?${params.toString()}`)
    if (!res.ok) {
      return reply.status(502).send({ error: 'eBay API request failed' })
    }

    const data = (await res.json()) as EbaySearchResponse
    const items =
      data?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item ?? []

    if (items.length === 0) {
      // Fallback: try active listings
      const activeParams = new URLSearchParams(params)
      activeParams.set('OPERATION-NAME', 'findItemsByKeywords')
      activeParams.delete('itemFilter(0).name')
      activeParams.delete('itemFilter(0).value')

      const activeRes = await fetch(`${ebayApiUrl}?${activeParams.toString()}`)
      const activeData = activeRes.ok ? ((await activeRes.json()) as EbaySearchResponse) : null
      const activeItems =
        activeData?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item ?? []

      if (activeItems.length === 0) {
        return reply.status(200).send({
          keywords,
          sampleSize: 0,
          prices: [],
          suggested: null,
          note: 'No comparable items found on eBay',
        })
      }

      items.push(...activeItems)
    }

    // Extract prices
    const prices = items
      .map((item) => parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.['__value__'] ?? '0'))
      .filter((p) => p > 0)
      .sort((a, b) => a - b)

    if (prices.length === 0) {
      return reply.send({ keywords, sampleSize: 0, prices: [], suggested: null })
    }

    const min = prices[0]
    const max = prices[prices.length - 1]
    const median = prices[Math.floor(prices.length / 2)]
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length
    // Suggest slightly below median to be competitive
    const suggested = Math.round(median * 0.95 * 100) / 100

    return reply.send({
      keywords,
      sampleSize: prices.length,
      currency: body.currency,
      prices: { min, max, median: Math.round(median * 100) / 100, avg: Math.round(avg * 100) / 100 },
      suggested,
    })
  })
}
