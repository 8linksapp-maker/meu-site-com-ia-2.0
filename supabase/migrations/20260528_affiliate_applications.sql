-- ============================================================================
-- 20260528 — Affiliate Applications (programa de afiliados)
-- ============================================================================
-- Aluno preenche form em /afiliados solicitando virar afiliado.
-- Admin aprova manualmente via SQL ou painel futuro, define affiliate_code.
-- 1 application por user (UNIQUE constraint).
--
-- Rode no Supabase Studio. Idempotente.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.affiliate_applications (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_email            text NOT NULL,
    user_name             text DEFAULT '',

    -- Form fields
    phone                 text NOT NULL DEFAULT '',
    audience_description  text NOT NULL DEFAULT '',
    promotion_channels    text[] NOT NULL DEFAULT '{}',

    -- Workflow
    status                text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    admin_note            text DEFAULT '',
    affiliate_code        text,

    created_at            timestamptz NOT NULL DEFAULT now(),
    reviewed_at           timestamptz
);

CREATE INDEX IF NOT EXISTS affiliate_applications_status_idx ON public.affiliate_applications(status);
CREATE INDEX IF NOT EXISTS affiliate_applications_user_idx ON public.affiliate_applications(user_id);

-- ─── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_view_own_application" ON public.affiliate_applications;
CREATE POLICY "user_view_own_application" ON public.affiliate_applications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_create_own_application" ON public.affiliate_applications;
CREATE POLICY "user_create_own_application" ON public.affiliate_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_all_applications" ON public.affiliate_applications;
CREATE POLICY "admin_all_applications" ON public.affiliate_applications
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── Verificação manual ────────────────────────────────────────────────────
-- SELECT id, user_email, status, created_at FROM public.affiliate_applications ORDER BY created_at DESC;
