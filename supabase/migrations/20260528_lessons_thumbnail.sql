-- ============================================================================
-- 20260528 — lessons.thumbnail_url
-- ============================================================================
-- Adiciona campo opcional pra thumbnail da aula. Gerada via ThumbnailGenerator
-- (template Café-da-Tarde) ou upload manual.
--
-- Se NULL, LessonCard em /aulas usa placeholder gradient atual (cream-elevated).
-- Se preenchido, mostra imagem (1280×720 PNG).
--
-- Idempotente. Rode no Supabase Studio.
-- ============================================================================

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- ─── Verificação manual ────────────────────────────────────────────────────
-- SELECT id, title, thumbnail_url FROM public.lessons LIMIT 5;
