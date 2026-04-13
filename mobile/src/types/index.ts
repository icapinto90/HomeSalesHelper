// ─── Enums ────────────────────────────────────────────────────────────────────

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED';
export type PlatformStatus = 'PENDING' | 'ACTIVE' | 'FAILED' | 'SOLD' | 'REMOVED';
export type Platform = 'EBAY' | 'FACEBOOK' | 'POSHMARK' | 'OFFERUP';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type SubscriptionPlan = 'FREE' | 'SUBSCRIPTION' | 'COMMISSION';
export type Language = 'en' | 'fr' | 'es';
export type Currency = 'USD' | 'EUR' | 'CAD' | 'GBP';

// ─── Listing ──────────────────────────────────────────────────────────────────

/** Per openapi.yaml — photos is a flat array of URLs */
export interface PlatformListing {
  id: string;
  platform: Platform;
  status: PlatformStatus;
  externalId?: string | null;
  /** External listing URL on the marketplace */
  url?: string | null;
  errorMsg?: string | null;
  publishedAt?: string | null;
}

export interface Listing {
  id: string;
  userId: string;
  title: string;
  description: string;
  price: number;
  currency: Currency;
  /** Flat array of photo URLs (Supabase Storage) */
  photos: string[];
  category?: string | null;
  detectedAttributes?: Record<string, unknown> | null;
  status: ListingStatus;
  language: Language;
  createdAt: string;
  updatedAt: string;
  platformListings: PlatformListing[];
}

export interface CreateListingInput {
  title: string;
  description: string;
  price: number;
  currency?: Currency;
  category?: string;
  language?: Language;
  /** Pre-uploaded photo URLs from /photos/upload */
  photos?: string[];
}

// ─── Photos ───────────────────────────────────────────────────────────────────

export interface PhotoUploadResult {
  urls: string[];
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface AIIdentifyResult {
  category: string;
  brand?: string;
  condition?: string;
  color?: string;
  attributes: Record<string, string>;
  confidence: number;
}

export interface AIGenerateResult {
  title: string;
  description: string;
}

export type ReplyTone = 'friendly' | 'professional' | 'firm';

// ─── Pricing ──────────────────────────────────────────────────────────────────

export interface PriceSuggestion {
  low: number;
  recommended: number;
  high: number;
  comparableCount: number;
  source: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  listingId: string;
  platform: Platform;
  direction: MessageDirection;
  content: string;
  buyerName?: string | null;
  buyerId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

/** Thread returned by GET /messages/threads */
export interface MessageThread {
  listingId: string;
  listing: Pick<Listing, 'id' | 'title' | 'price' | 'photos' | 'status'>;
  platform: Platform;
  buyerName: string;
  buyerId?: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export interface PlatformAccount {
  id: string;
  platform: Platform;
  platformUserId?: string | null;
  platformUsername?: string | null;
  tokenExpiry?: string | null;
  isActive: boolean;
}

// ─── Auth / User ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  subscriptionPlan: SubscriptionPlan;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardStats {
  monthlyRevenue: number;
  activeListings: number;
  soldListings: number;
  unreadMessages: number;
}
