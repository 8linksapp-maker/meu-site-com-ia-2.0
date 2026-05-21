-- Marketplace MVP V1 (Bruno-only) — schema preparado pra V2 (aluno-vendedor)
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid REFERENCES auth.users(id) NOT NULL,  -- V1=Bruno, V2=aluno
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  price_cents int NOT NULL CHECK (price_cents >= 0),  -- 0 = gratis
  thumbnail_url text NOT NULL,
  gallery_urls text[] DEFAULT '{}',
  zip_storage_path text,
  github_repo text,
  status text NOT NULL DEFAULT 'published',  -- V1: published direto. V2: pending|published|rejected|paused|removed
  total_sales int DEFAULT 0,
  total_revenue_cents int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  published_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_listings_status_idx ON public.marketplace_listings(status);
CREATE INDEX IF NOT EXISTS marketplace_listings_category_idx ON public.marketplace_listings(category);
CREATE INDEX IF NOT EXISTS marketplace_listings_seller_idx ON public.marketplace_listings(seller_id);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Publico ve listings publicados
CREATE POLICY "Public can view published listings" ON public.marketplace_listings
  FOR SELECT USING (status = 'published');

-- Admin (Bruno) ve tudo + ALL
CREATE POLICY "Admins can do anything on listings" ON public.marketplace_listings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Compras
CREATE TABLE IF NOT EXISTS public.marketplace_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid REFERENCES auth.users(id),  -- NULL = visitante publico
  buyer_email text NOT NULL,
  listing_id uuid REFERENCES public.marketplace_listings(id) NOT NULL,
  price_paid_cents int NOT NULL,
  stripe_payment_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',  -- pending|paid|refunded
  refunded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS marketplace_purchases_buyer_listing_idx
  ON public.marketplace_purchases(buyer_email, listing_id)
  WHERE status != 'refunded';

CREATE INDEX IF NOT EXISTS marketplace_purchases_buyer_idx ON public.marketplace_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS marketplace_purchases_listing_idx ON public.marketplace_purchases(listing_id);
CREATE INDEX IF NOT EXISTS marketplace_purchases_status_idx ON public.marketplace_purchases(status);

ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;

-- Comprador ve so as proprias compras
CREATE POLICY "Buyers can view own purchases" ON public.marketplace_purchases
  FOR SELECT USING (auth.uid() = buyer_id);

-- Admin ve tudo
CREATE POLICY "Admins can do anything on purchases" ON public.marketplace_purchases
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Tokens de download (expira 7d, renova ilimitado)
CREATE TABLE IF NOT EXISTS public.marketplace_download_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id uuid REFERENCES public.marketplace_purchases(id) NOT NULL,
  token text UNIQUE NOT NULL,  -- nanoid 32 chars
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketplace_download_tokens_token_idx ON public.marketplace_download_tokens(token);
CREATE INDEX IF NOT EXISTS marketplace_download_tokens_purchase_idx ON public.marketplace_download_tokens(purchase_id);

ALTER TABLE public.marketplace_download_tokens ENABLE ROW LEVEL SECURITY;

-- Tokens NUNCA expostos via RLS — so service key acessa
-- ninguem ve via anon. Service role bypassa RLS por default.
CREATE POLICY "Service role only on tokens" ON public.marketplace_download_tokens
  FOR ALL USING (false);

-- Storage bucket marketplace (privado — ZIPs acessados so via signed URL)
-- Rollback: DROP TABLE public.marketplace_download_tokens; DROP TABLE public.marketplace_purchases; DROP TABLE public.marketplace_listings;
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace', 'marketplace', false)
ON CONFLICT (id) DO NOTHING;

-- Storage bucket marketplace-public (publico — thumbs e gallery servidos diretamente pelo CDN)
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketplace-public', 'marketplace-public', true)
ON CONFLICT (id) DO NOTHING;
