-- Cloud SSR multi-tenant — camada de dados do piloto (chunk cloud-01)
-- Sites NOVOS (plano cloud) deixam de ser repo git: leem conteúdo do Supabase
-- por site_id em runtime, servidos por um Worker SSR na Cloudflare.
--
-- ADITIVO e IDEMPOTENTE (CREATE TABLE IF NOT EXISTS). NÃO altera profiles/user_sites.
-- NÃO aplicar em produção — o banco é compartilhado com os 100 sites antigos.
-- Aplicação é decisão do Bruno/Tião.
--
-- RLS: habilitada fail-closed (deny-all pra anon/authenticated; service_role bypassa).
-- As POLICIES reais são desenhadas pelo Severino no chunk cloud-02, EM CIMA deste shape.
-- O dono de todo dado é `sites.owner` — é por ele que a RLS deve amarrar.

-- ─────────────────────────────────────────────────────────────
-- sites — registro-mestre de cada site cloud (1 linha = 1 tenant)
-- id É o site_id usado por todas as tabelas de conteúdo.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sites (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,   -- = site_id (tenant key)
  owner      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,  -- dono (RLS amarra aqui)
  template   text NOT NULL,                                -- ex: 'clickbanker'
  subdomain  text UNIQUE,                                  -- ex: 'meublog' -> meublog.<dominio-rede>
  status     text NOT NULL DEFAULT 'active',               -- active | suspended | deleted
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sites_owner_idx     ON public.sites(owner);
CREATE INDEX IF NOT EXISTS sites_status_idx    ON public.sites(status);
CREATE INDEX IF NOT EXISTS sites_subdomain_idx ON public.sites(subdomain);

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- site_content — singletons de conteúdo por site (key/value JSON)
-- Cobre siteConfig / home / sobre / contato / menu / categories / authors.
-- Espelha src/data/*.json do clickbanker. 1 linha por (site_id, key).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_content (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id    uuid REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  key        text NOT NULL,                                -- 'siteConfig' | 'home' | 'sobre' | 'contato' | 'menu' | 'categories' | 'authors'
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,           -- payload espelhando o JSON do template
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (site_id, key)
);

CREATE INDEX IF NOT EXISTS site_content_site_idx ON public.site_content(site_id);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- site_posts — posts de blog por site (espelha src/content/blog/*.md)
-- body_md guarda o corpo do post (markdown/HTML pré-renderizado).
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_posts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id         uuid REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  slug            text NOT NULL,
  title           text NOT NULL,
  description     text,
  body_md         text NOT NULL DEFAULT '',               -- corpo (markdown/HTML)
  category        text,                                   -- nome da categoria (ver site_content.key='categories')
  author          text,                                   -- nome/id do autor  (ver site_content.key='authors')
  hero_image_path text,                                   -- path da capa no R2 (banco guarda só o path)
  is_published    boolean NOT NULL DEFAULT true,          -- false = rascunho
  published_at    timestamptz,
  updated_at      timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS site_posts_site_idx      ON public.site_posts(site_id);
CREATE INDEX IF NOT EXISTS site_posts_published_idx ON public.site_posts(site_id, is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS site_posts_category_idx  ON public.site_posts(site_id, category);

ALTER TABLE public.site_posts ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Nota pro Severino (cloud-02):
--   RLS está habilitada mas SEM policies -> tudo negado pra anon/authenticated
--   (fail-closed). O runtime SSR do Worker lê via service_role (bypassa RLS).
--   Ao desenhar as policies, amarre a posse por sites.owner, ex:
--     - SELECT público de conteúdo publicado (site status='active', post is_published)
--     - ALL do dono: EXISTS(SELECT 1 FROM public.sites s WHERE s.id = <tbl>.site_id AND s.owner = auth.uid())
--   Use CREATE POLICY IF NOT EXISTS ou guarde com DROP POLICY antes, pra manter idempotência.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.site_posts;
--   DROP TABLE IF EXISTS public.site_content;
--   DROP TABLE IF EXISTS public.sites;
