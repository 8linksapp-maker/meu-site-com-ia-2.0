-- ============================================================================
-- 20260527 — Trails gating: kiwify_product_ids + release_at
-- ============================================================================
-- Adiciona em `trails` as duas colunas que existiam em `courses` (schema antigo)
-- e migra valores existentes via match de title (mesma estratégia da γ.5a).
--
-- Após esta migration, TrailsManager (novo admin) consegue gerenciar gating
-- diretamente em trails — sem depender de courses.
--
-- Rode passo a passo no Supabase Studio. Idempotente.
-- ============================================================================

-- ─── 1. Adiciona colunas (idempotente) ─────────────────────────────────────
ALTER TABLE public.trails
  ADD COLUMN IF NOT EXISTS kiwify_product_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS release_at timestamptz;

-- ─── 2. Auto-migra valores existentes de courses → trails ──────────────────
-- Estratégia: cada trail veio de um module (via auto-migrate γ.5a). Cada module
-- pertence a um course. Copia kiwify_product_ids e release_at do course pai
-- pra trail correspondente — só se trail ainda estiver com valores default.
--
-- Match: trail.title = module.title (mesmo critério da γ.5a).
-- Idempotência: só sobrescreve se kiwify_product_ids estiver vazio.

UPDATE public.trails t
SET
  kiwify_product_ids = COALESCE(c.kiwify_product_ids, '{}'),
  release_at         = c.release_at
FROM public.modules m
JOIN public.courses c ON c.id = m.course_id
WHERE t.title = m.title
  AND (array_length(t.kiwify_product_ids, 1) IS NULL OR cardinality(t.kiwify_product_ids) = 0);

-- ─── 3. Verificação manual ──────────────────────────────────────────────────
-- SELECT id, slug, title, kiwify_product_ids, release_at FROM public.trails ORDER BY display_order;
