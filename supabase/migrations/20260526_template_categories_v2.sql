-- ============================================================================
-- 20260526 — Vitrine v2: categorias de templates consolidadas
-- ============================================================================
-- Garante que as 4 categorias canônicas existam: Blogs, Negócios Locais,
-- Landing Pages, Portfolio.
--
-- NÃO deleta categorias antigas — preserva atribuições existentes via
-- templates.category_ids. Se você quiser limpar categorias órfãs depois,
-- rode o SELECT no fim pra identificar e DELETE manual.
-- ============================================================================

-- Garante tabela existe (se não foi criada via Studio, cria com schema esperado)
CREATE TABLE IF NOT EXISTS public.template_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  description     text,
  icon            text,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Se a tabela já existia sem coluna slug/icon/description, adiciona
ALTER TABLE public.template_categories ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.template_categories ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.template_categories ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.template_categories ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

-- Tenta criar constraint UNIQUE no slug (idempotente)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'template_categories_slug_key'
  ) THEN
    BEGIN
      ALTER TABLE public.template_categories ADD CONSTRAINT template_categories_slug_key UNIQUE (slug);
    EXCEPTION WHEN duplicate_table OR unique_violation THEN
      -- Já existe constraint OU dados duplicados; admin resolve manualmente
      NULL;
    END;
  END IF;
END $$;

-- ─── UPSERT das 4 categorias canônicas ──────────────────────────────────────
-- ON CONFLICT por slug: atualiza name/icon/description/display_order se já existir.
INSERT INTO public.template_categories (slug, name, description, icon, display_order)
VALUES
  ('blogs',          'Blogs',          'Blogs de conteúdo, afiliados, AdSense, autoridade de nicho.', 'book-open',     1),
  ('negocios-locais','Negócios Locais','Sites pra médico, advogado, salão, loja, clínica — presença digital institucional.', 'store', 2),
  ('landing-pages',  'Landing Pages',  'Páginas focadas em conversão: infoproduto, captura de lead, evento, lançamento.', 'target', 3),
  ('portfolio',      'Portfolio',      'Vitrine pessoal: designer, fotógrafo, freelancer, criador.', 'briefcase', 4)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      icon = EXCLUDED.icon,
      display_order = EXCLUDED.display_order;

-- ─── Verificação ────────────────────────────────────────────────────────────
-- Rode os SELECTs abaixo pra conferir:

-- SELECT id, slug, name, display_order, icon FROM public.template_categories ORDER BY display_order;
--
-- -- Templates sem categoria nenhuma:
-- SELECT id, name FROM public.templates
--   WHERE category_ids IS NULL OR array_length(category_ids, 1) IS NULL OR cardinality(category_ids) = 0;
--
-- -- Templates por categoria:
-- SELECT tc.name AS categoria, COUNT(t.id) AS templates
--   FROM public.template_categories tc
--   LEFT JOIN public.templates t ON tc.id = ANY(t.category_ids)
--   GROUP BY tc.id, tc.name
--   ORDER BY tc.display_order;

-- ─── PÓS-MIGRAÇÃO: atribuir templates às categorias novas ───────────────────
-- O frontend já mostra os filtros, mas templates que não estão em nenhuma das
-- 4 categorias canônicas não aparecem no filtro. Você precisa atribuir via:
--   (a) admin de templates existente (TemplatesManager), OU
--   (b) UPDATE direto no SQL:
--
-- UPDATE public.templates
--   SET category_ids = array_append(category_ids,
--     (SELECT id FROM public.template_categories WHERE slug = 'blogs'))
--   WHERE id IN ('<template-uuid-1>', '<template-uuid-2>');
--
-- (substitua os UUIDs pelos templates que devem ir pra "Blogs")
-- ============================================================================
