import { PrismaClient, PlatformStatus } from '@prisma/client'
import { PublishJobData } from '../queue'
import { logger } from '../../../utils/logger'
import { decrypt } from '../../../utils/crypto'

/**
 * Publishes a listing to eBay via the eBay Sell API.
 * Updates PlatformListing status in DB on success or failure.
 */
export async function handleEbayPublish(
  data: PublishJobData,
  prisma: PrismaClient,
): Promise<void> {
  const { listingId, platformListingId, userId } = data

  const [platformListing, listing, account] = await Promise.all([
    prisma.platformListing.findUnique({ where: { id: platformListingId } }),
    prisma.listing.findUnique({ where: { id: listingId } }),
    prisma.platformAccount.findUnique({ where: { userId_platform: { userId, platform: 'EBAY' } } }),
  ])

  if (!platformListing || !listing || !account) {
    throw new Error(`Missing data for eBay publish job: listingId=${listingId}`)
  }

  const accessToken = decrypt(account.accessToken)

  try {
    // ── Step 1: Create/Replace Inventory Item ────────────────────────────────
    const sku = `hsh-${listing.id}`
    const inventoryRes = await fetch(
      `https://api.ebay.com/sell/inventory/v1/inventory_item/${sku}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Language': listing.language,
        },
        body: JSON.stringify({
          product: {
            title: listing.title,
            description: listing.description,
            imageUrls: listing.photos,
            aspects: listing.detectedAttributes ?? {},
          },
          condition: 'USED_EXCELLENT',
          availability: { shipToLocationAvailability: { quantity: 1 } },
        }),
      },
    )

    if (!inventoryRes.ok) {
      const err = await inventoryRes.text()
      throw new Error(`eBay inventory API error: ${inventoryRes.status} ${err}`)
    }

    // ── Step 2: Create Offer ─────────────────────────────────────────────────
    const offerRes = await fetch('https://api.ebay.com/sell/inventory/v1/offer', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku,
        marketplaceId: 'EBAY_US',
        format: 'FIXED_PRICE',
        availableQuantity: 1,
        pricingSummary: {
          price: { value: listing.price.toString(), currency: listing.currency },
        },
        listingDuration: 'GTC',
      }),
    })

    if (!offerRes.ok) {
      const err = await offerRes.text()
      throw new Error(`eBay offer creation error: ${offerRes.status} ${err}`)
    }

    const { offerId } = (await offerRes.json()) as { offerId: string }

    // ── Step 3: Publish Offer ─────────────────────────────────────────────────
    const publishRes = await fetch(
      `https://api.ebay.com/sell/inventory/v1/offer/${offerId}/publish`,
      { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!publishRes.ok) {
      const err = await publishRes.text()
      throw new Error(`eBay publish offer error: ${publishRes.status} ${err}`)
    }

    const { listingId: ebayListingId } = (await publishRes.json()) as { listingId: string }

    await prisma.platformListing.update({
      where: { id: platformListingId },
      data: {
        status: PlatformStatus.ACTIVE,
        externalId: ebayListingId,
        url: `https://www.ebay.com/itm/${ebayListingId}`,
        publishedAt: new Date(),
        errorMsg: null,
      },
    })

    logger.info({ listingId, ebayListingId }, 'eBay listing published successfully')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    await prisma.platformListing.update({
      where: { id: platformListingId },
      data: { status: PlatformStatus.FAILED, errorMsg },
    })
    throw error // Let BullMQ handle retry
  }
}
