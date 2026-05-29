-- ============================================================================
-- 20260528 — Affiliate Questions (wizard configurável)
-- ============================================================================
-- Tabela de perguntas do wizard de candidatura a afiliado. Admin gerencia
-- via /admin/afiliados (aba Perguntas). User responde via /afiliados wizard.
-- Respostas vão pra affiliate_applications.answers (JSONB).
--
-- Pre-popula com 9 perguntas iniciais agrupadas em 4 steps.
-- ============================================================================

-- ─── 1. Tabela questions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.affiliate_questions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text   text NOT NULL,
    question_type   text NOT NULL DEFAULT 'text',  -- text | single_choice | multiple_choice | phone
    options         text[] NOT NULL DEFAULT '{}',
    helper_text     text NOT NULL DEFAULT '',
    placeholder     text NOT NULL DEFAULT '',
    step_group      integer NOT NULL DEFAULT 1,    -- 1, 2, 3, 4 (multi-step)
    step_label      text NOT NULL DEFAULT 'Sobre você',  -- label do step
    display_order   integer NOT NULL DEFAULT 0,
    is_required     boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_questions_step_idx ON public.affiliate_questions(step_group, display_order);

-- ─── 2. ALTER affiliate_applications: add answers JSONB ────────────────────
ALTER TABLE public.affiliate_applications
    ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ─── 3. RLS questions ──────────────────────────────────────────────────────
ALTER TABLE public.affiliate_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_questions" ON public.affiliate_questions;
CREATE POLICY "auth_read_questions" ON public.affiliate_questions
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_write_questions" ON public.affiliate_questions;
CREATE POLICY "admin_write_questions" ON public.affiliate_questions
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── 4. Trigger updated_at ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.affiliate_questions_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS affiliate_questions_updated_at_trigger ON public.affiliate_questions;
CREATE TRIGGER affiliate_questions_updated_at_trigger
    BEFORE UPDATE ON public.affiliate_questions
    FOR EACH ROW
    EXECUTE FUNCTION public.affiliate_questions_set_updated_at();

-- ─── 5. SEED: 9 perguntas em 4 steps ───────────────────────────────────────
INSERT INTO public.affiliate_questions
    (question_text, question_type, options, helper_text, placeholder, step_group, step_label, display_order, is_required)
VALUES
    -- STEP 1: Contato
    ('Telefone com DDD', 'phone', '{}',
     'Pra gente conseguir te encontrar caso precise.', '(11) 99999-9999',
     1, 'Contato', 0, true),

    ('Por que você quer ser afiliado MSIA especificamente?', 'text', '{}',
     'Conta o que te motivou. Ajuda a entender se faz sentido.', 'Ex: uso a plataforma há 6 meses, indico pra todo cliente meu...',
     1, 'Contato', 1, true),

    -- STEP 2: Experiência
    ('Você já vendeu como afiliado antes?', 'single_choice',
     ARRAY['Nunca, será meu primeiro programa', 'Sim, vendi pouco (até R$ 1k/mês)', 'Sim, vendo entre R$ 1k e R$ 10k/mês', 'Sim, vendo mais de R$ 10k/mês'],
     '', '',
     2, 'Experiência', 0, true),

    ('Qual seu objetivo principal com programa de afiliados?', 'single_choice',
     ARRAY['Complementar minha renda', 'Tornar minha fonte principal de renda', 'Explorar e aprender', 'Já é minha fonte principal'],
     '', '',
     2, 'Experiência', 1, true),

    -- STEP 3: Audiência
    ('Onde você vai divulgar a MSIA?', 'multiple_choice',
     ARRAY['Instagram', 'YouTube', 'WhatsApp / Telegram', 'Site / Blog', 'Comunidade própria', 'Email marketing', 'Outro'],
     'Marca todos os canais que vai usar.', '',
     3, 'Audiência', 0, true),

    ('Qual o tamanho da sua audiência principal?', 'single_choice',
     ARRAY['Ainda não tenho audiência', 'Menos de 1.000 seguidores', '1.000 a 10.000', '10.000 a 50.000', 'Mais de 50.000'],
     '', '',
     3, 'Audiência', 1, true),

    ('Conta um pouco do seu público (perfil, contexto, interesses)', 'text', '{}',
     'Quanto mais detalhe, mais rápido aprovamos. Quem te segue? Por que confiariam na sua indicação?',
     'Ex: pequenos empresários locais que querem site profissional sem dor de cabeça...',
     3, 'Audiência', 2, true),

    -- STEP 4: Estratégia + expectativa
    ('Como pretende divulgar? Vídeos, posts, stories, lives, bio?', 'text', '{}',
     'Conta sua estratégia. Ajuda a gente a entender o tipo de venda.',
     'Ex: vou fazer vídeos demonstrando como criar site rápido, com link de afiliado na bio...',
     4, 'Estratégia', 0, true),

    ('Quanto você espera ganhar por mês como afiliado MSIA?', 'single_choice',
     ARRAY['Até R$ 500', 'R$ 500 a R$ 2.000', 'R$ 2.000 a R$ 10.000', 'Mais de R$ 10.000'],
     'Sem pressão — é só pra calibrar expectativa.', '',
     4, 'Estratégia', 1, true)

ON CONFLICT DO NOTHING;

-- ─── Verificação manual ────────────────────────────────────────────────────
-- SELECT step_group, step_label, display_order, question_text FROM public.affiliate_questions ORDER BY step_group, display_order;
