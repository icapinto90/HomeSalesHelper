import { PrismaClient, PlatformStatus } from '@prisma/client'
import { PublishJobData } from '../queue'
import { logger } from '../../../utils/logger'
import { decrypt } from '../../../utils/crypto'

/**
 * Publishes a listing to Facebook Marketplace via the Graph API.
 * NOTE: Requires Meta Business Verification — use eBay first for MVP.
 */
export async function handleFacebookPublish(
  data: PublishJobData,
  prisma: PrismaClient,
): Promise<void> {
  const { listingId, platformListingId, userId } = data

  const [platformListing, listing, account] = await Promise.all([
    prisma.platformListing.findUnique({ where: { id: platformListingId } }),
    prisma.listing.findUnique({ where: { id: listingId } }),
    prisma.platformAccount.findUnique({ where: { userId_platform: { userId, platform: 'FACEBOOK' } } }),
  ])

  if (!platformListing || !listing || !account) {
    throw new Error(`Missing data for Facebook publish job: listingId=${listingId}`)
  }

  const accessToken = decrypt(account.accessToken)

  try {
    const res = await fetch('https://graph.facebook.com/v21.0/me/marketplace_listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        title: listing.title,
        description: listing.description,
        price: Math.round(Number(listing.price) * 100), // cents
        currency: listing.currency,
        images: listing.photos.map((url) => ({ url })),
        category_id: '197002364014635', // General merchandise fallback
        listing_type: 'ITEM_FOR_SALE',
        availability: 'IN_STOCK',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Facebook Graph API error: ${res.status} ${err}`)
    }

    const { id: fbListingId } = (await res.json()) as { id: string }

    await prisma.platformListing.update({
      where: { id: platformListingId },
      data: {
        status: PlatformStatus.ACTIVE,
        externalId: fbListingId,
        url: `https://www.facebook.com/marketplace/item/${fbListingId}`,
        publishedAt: new Date(),
        errorMsg: null,
      },
    })

    logger.info({ listingId, fbListingId }, 'Facebook Marketplace listing published successfully')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await prisma.platformListing.update({
      where: { id: platformListingId },
      data: { status: PlatformStatus.FAILED, errorMsg },
    })
    throw error
  }
}
