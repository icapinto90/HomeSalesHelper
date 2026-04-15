-- ─────────────────────────────────────────────────────────────────────────────
-- Home Sale Helper — Initial Schema
-- Migration: 20260415000000_initial_schema
-- Applied against: Supabase project qngkdkgdvgvmucdwcbef
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ─────────────────────────────────────────────────────────────────────
CREATE TYPE listing_status AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED');
CREATE TYPE platform_status AS ENUM ('PENDING', 'ACTIVE', 'FAILED', 'SOLD', 'REMOVED');
CREATE TYPE platform AS ENUM ('EBAY', 'FACEBOOK', 'POSHMARK', 'OFFERUP');
CREATE TYPE message_direction AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE subscription_status AS ENUM ('FREE', 'ACTIVE', 'CANCELLED', 'PAST_DUE');

-- ── Tables ────────────────────────────────────────────────────────────────────

-- User profiles — synced from auth.users via trigger below
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Listings (items for sale)
CREATE TABLE listings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL,
  price               NUMERIC(10,2) NOT NULL,
  currency            VARCHAR(3) NOT NULL DEFAULT 'USD',
  photos              TEXT[] NOT NULL DEFAULT '{}',   -- Supabase Storage URLs
  category            TEXT,
  detected_attributes JSONB,                          -- { brand, condition, color, size, ... }
  status              listing_status NOT NULL DEFAULT 'DRAFT',
  language            VARCHAR(5) NOT NULL DEFAULT 'en',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_listings_user_status ON listings(user_id, status);

-- Cross-platform publishing status
CREATE TABLE platform_listings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  platform     platform NOT NULL,
  external_id  TEXT,                 -- ID assigned by the external marketplace
  status       platform_status NOT NULL DEFAULT 'PENDING',
  url          TEXT,                 -- Public URL on the marketplace
  error_msg    TEXT,                 -- Last error (if any)
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, platform)
);

CREATE INDEX idx_platform_listings_listing ON platform_listings(listing_id);

-- Connected marketplace accounts (tokens stored AES-256-GCM encrypted as iv:authTag:ciphertext)
CREATE TABLE platform_accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform          platform NOT NULL,
  access_token      TEXT NOT NULL,   -- Encrypted
  refresh_token     TEXT,            -- Encrypted
  token_expiry      TIMESTAMPTZ,
  platform_user_id  TEXT,
  platform_username TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_platform_accounts_user ON platform_accounts(user_id);

-- Unified inbox messages
CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform    platform NOT NULL,
  buyer_name  TEXT,
  buyer_id    TEXT,              -- Buyer's ID on the external platform
  content     TEXT NOT NULL,
  direction   message_direction NOT NULL,
  external_id TEXT,             -- Message ID on the external platform
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_listing_created ON messages(listing_id, created_at);
CREATE INDEX idx_messages_user_read ON messages(user_id, read_at);

-- Stripe subscriptions
CREATE TABLE subscriptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  stripe_sub_id      TEXT UNIQUE,
  status             subscription_status NOT NULL DEFAULT 'FREE',
  current_period_end TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Triggers ──────────────────────────────────────────────────────────────────

-- Auto-update updated_at on mutations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_listings_updated_at
  BEFORE UPDATE ON listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_platform_listings_updated_at
  BEFORE UPDATE ON platform_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_platform_accounts_updated_at
  BEFORE UPDATE ON platform_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sync public.users from auth.users on signup / profile update
-- Note: raw_user_meta_data is NOT used for authorization (user-editable). Only display fields here.
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        name       = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_select_own"   ON users FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_update_own"   ON users FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_service_all"  ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- listings
CREATE POLICY "listings_select_own"  ON listings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "listings_insert_own"  ON listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "listings_update_own"  ON listings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "listings_delete_own"  ON listings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "listings_service_all" ON listings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- platform_listings (indirect ownership via listing)
CREATE POLICY "platform_listings_select_own" ON platform_listings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM listings WHERE listings.id = listing_id AND listings.user_id = auth.uid()));
CREATE POLICY "platform_listings_service_all" ON platform_listings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- platform_accounts
CREATE POLICY "platform_accounts_select_own" ON platform_accounts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "platform_accounts_insert_own" ON platform_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "platform_accounts_update_own" ON platform_accounts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "platform_accounts_delete_own" ON platform_accounts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "platform_accounts_service_all" ON platform_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- messages
CREATE POLICY "messages_select_own"  ON messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "messages_service_all" ON messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- subscriptions
CREATE POLICY "subscriptions_select_own"  ON subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_service_all" ON subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Storage ───────────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE
  SET public             = false,
      file_size_limit    = 10485760,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- Storage access: files are stored under {user_id}/{filename}
CREATE POLICY "listing_photos_select_owner" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "listing_photos_insert_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "listing_photos_update_owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "listing_photos_delete_owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "listing_photos_service_all" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'listing-photos') WITH CHECK (bucket_id = 'listing-photos');
