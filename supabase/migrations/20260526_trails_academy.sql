-- ============================================================================
-- 20260526 — Academy v2: trilhas planas (sem módulos)
-- ============================================================================
-- Cria estrutura nova de TRILHAS de aprendizado pra Academy.
-- `modules` table fica deprecated (não é apagada — só ignorada pelo frontend novo).
-- Aulas existentes são preservadas em `lessons`; só passam a ser organizadas
-- via `trail_lessons` em vez de `module_id`.
--
-- Auto-migração: cada `module` existente vira uma `trail`, e suas lessons
-- viram `trail_lessons` preservando display_order.
--
-- Rode passo a passo no Supabase Studio. Se algum bloco falhar, leia o erro
-- e ajuste antes do próximo. Não use BEGIN/COMMIT global aqui — Studio já roda
-- cada statement em transação implícita.
-- ============================================================================

-- ─── 1. Tabela `trails` ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trails (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  title           text NOT NULL,
  description     text,
  icon            text,                                  -- nome de Lucide icon ou emoji
  target_audience text,                                  -- 'iniciantes' | 'afiliados' | 'freelancers' | 'todos'
  display_order   integer NOT NULL DEFAULT 0,
  is_featured     boolean NOT NULL DEFAULT false,
  estimated_hours numeric(4, 1),                         -- ex: 4.5 horas estimadas
  thumbnail_url   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trails_display_order ON public.trails(display_order);
CREATE INDEX IF NOT EXISTS idx_trails_slug ON public.trails(slug);

-- ─── 2. Tabela `trail_lessons` (M:N entre trilhas e aulas) ──────────────────
CREATE TABLE IF NOT EXISTS public.trail_lessons (
  trail_id      uuid NOT NULL REFERENCES public.trails(id) ON DELETE CASCADE,
  lesson_id     uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  chapter       text,                                    -- opcional: agrupamento visual ("Antes de começar")
  display_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (trail_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_trail_lessons_trail ON public.trail_lessons(trail_id, display_order);
CREATE INDEX IF NOT EXISTS idx_trail_lessons_lesson ON public.trail_lessons(lesson_id);

-- ─── 3. RLS — Trilhas são públicas pra read; write só admin ────────────────
ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trails_read_all" ON public.trails;
CREATE POLICY "trails_read_all" ON public.trails
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "trails_admin_write" ON public.trails;
CREATE POLICY "trails_admin_write" ON public.trails
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "trail_lessons_read_all" ON public.trail_lessons;
CREATE POLICY "trail_lessons_read_all" ON public.trail_lessons
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "trail_lessons_admin_write" ON public.trail_lessons;
CREATE POLICY "trail_lessons_admin_write" ON public.trail_lessons
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ─── 4. Auto-migração: cada module antigo vira uma trail ───────────────────
-- Cria uma trail por module existente preservando título e descrição.
-- O slug é derivado do título (lower + replace de espaços + acentos basic).
-- Se já existir trail com mesmo slug, pula (idempotente).

INSERT INTO public.trails (slug, title, description, target_audience, display_order, is_featured, thumbnail_url, icon)
SELECT
  -- slug: lower + replace common chars; em produção ideal seria função unaccent, mas mantém simples
  regexp_replace(
    regexp_replace(
      lower(unaccent(m.title)),
      '[^a-z0-9]+', '-', 'g'
    ),
    '(^-|-$)', '', 'g'
  )                                                  AS slug,
  m.title                                            AS title,
  m.description                                      AS description,
  'todos'                                            AS target_audience,
  m.display_order                                    AS display_order,
  m.is_featured                                      AS is_featured,
  m.thumbnail_url                                    AS thumbnail_url,
  'graduation-cap'                                   AS icon                -- default Lucide
FROM public.modules m
WHERE NOT EXISTS (
  SELECT 1 FROM public.trails t
  WHERE t.slug = regexp_replace(
    regexp_replace(
      lower(unaccent(m.title)),
      '[^a-z0-9]+', '-', 'g'
    ),
    '(^-|-$)', '', 'g'
  )
);

-- ⚠️ NOTA: se `unaccent` não estiver instalada, rode antes:
--   CREATE EXTENSION IF NOT EXISTS unaccent;
-- Se ainda assim falhar, substitua `unaccent(m.title)` por `m.title` no INSERT acima
-- (acentos viram traços no slug — não ideal mas funcional).

-- ─── 5. Popular trail_lessons a partir das lessons existentes ──────────────
-- Cada lesson de um module antigo vira trail_lesson da trail correspondente.
-- chapter fica NULL (admin pode adicionar depois se quiser agrupar).

INSERT INTO public.trail_lessons (trail_id, lesson_id, display_order, chapter)
SELECT
  t.id                AS trail_id,
  l.id                AS lesson_id,
  l.display_order     AS display_order,
  NULL                AS chapter
FROM public.lessons l
JOIN public.modules m ON m.id = l.module_id
JOIN public.trails t ON t.title = m.title           -- match por título (auto-migração 1:1)
ON CONFLICT (trail_id, lesson_id) DO NOTHING;

-- ─── 6. Trigger pra updated_at em trails ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trails_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trails_updated_at_trigger ON public.trails;
CREATE TRIGGER trails_updated_at_trigger
  BEFORE UPDATE ON public.trails
  FOR EACH ROW
  EXECUTE FUNCTION public.trails_set_updated_at();

-- ─── 7. Verificação manual ──────────────────────────────────────────────────
-- Rode os SELECTs abaixo pra conferir que migrou corretamente.
-- Esperado: 1 trail por module antigo + cada trail com suas lessons originais.

-- SELECT id, slug, title, display_order, is_featured FROM public.trails ORDER BY display_order;
-- SELECT t.title AS trail, COUNT(tl.lesson_id) AS aulas
--   FROM public.trails t
--   LEFT JOIN public.trail_lessons tl ON tl.trail_id = t.id
--   GROUP BY t.id, t.title
--   ORDER BY t.display_order;

-- ============================================================================
-- DEPRECATED (não execute agora — só pra referência futura quando estiver
-- confortável de droppar):
--
--   ALTER TABLE public.lessons DROP COLUMN module_id;
--   DROP TABLE public.modules;
--
-- Por enquanto modules + lessons.module_id continuam existindo, ignorados.
-- ============================================================================
