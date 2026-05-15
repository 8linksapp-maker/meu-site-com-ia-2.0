-- Template Requests — coleta demanda dos alunos por novos tipos de site
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.template_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  user_name text DEFAULT '',

  -- Step 1: Nicho / segmento
  business_type text NOT NULL,
  niche text NOT NULL DEFAULT '',
  target_audience text NOT NULL DEFAULT '',

  -- Step 2: Funcionalidades
  features text[] NOT NULL DEFAULT '{}',
  content_scale text NOT NULL DEFAULT '',

  -- Step 3: Inspirações + timing
  reference_urls text[] NOT NULL DEFAULT '{}',
  style_preference text NOT NULL DEFAULT '',
  urgency text NOT NULL DEFAULT '',
  extra_notes text NOT NULL DEFAULT '',

  -- Admin workflow
  status text NOT NULL DEFAULT 'new',
  admin_note text NOT NULL DEFAULT '',

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS template_requests_user_idx ON public.template_requests(user_id);
CREATE INDEX IF NOT EXISTS template_requests_status_idx ON public.template_requests(status);
CREATE INDEX IF NOT EXISTS template_requests_business_type_idx ON public.template_requests(business_type);

ALTER TABLE public.template_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own requests" ON public.template_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests" ON public.template_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can do anything on requests" ON public.template_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
