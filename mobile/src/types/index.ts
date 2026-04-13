// ─── Enums ────────────────────────────────────────────────────────────────────

export type ListingStatus = 'DRAFT' | 'ACTIVE' | 'SOLD' | 'ARCHIVED';
export type PlatformStatus = 'PENDING' | 'ACTIVE' | 'FAILED' | 'SOLD' | 'REMOVED';
export type Platform = 'EBAY' | 'FACEBOOK' | 'POSHMARK' | 'OFFERUP';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type SubscriptionPlan = 'FREE' | 'SUBSCRIPTION' | 'COMMISSION';

// ─── Listing ──────────────────────────────────────────────────────────────────

export interface Photo {
  id: string;
  url: string;
  order: number;
}

export interface PlatformListing {
  id: string;
  platform: Platform;
  status: PlatformStatus;
  externalId?: string;
  externalUrl?: string;
  failureReason?: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  status: ListingStatus;
  category?: string;
  condition?: string;
  brand?: string;
  photos: Photo[];
  platforms: PlatformListing[];
  detectedAttributes?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListingInput {
  title?: string;
  description?: string;
  price?: number;
  category?: string;
  condition?: string;
  brand?: string;
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
  buyerName?: string;
  buyerAvatar?: string;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  listingId: string;
  listing: Pick<Listing, 'id' | 'title' | 'price' | 'photos' | 'status'>;
  platform: Platform;
  buyerName: string;
  buyerAvatar?: string;
  lastMessage: string;
  unreadCount: number;
  updatedAt: string;
  messages: Message[];
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

export interface PlatformAccount {
  platform: Platform;
  connected: boolean;
  username?: string;
  connectedAt?: string;
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
