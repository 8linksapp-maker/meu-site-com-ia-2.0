-- Sistema de votação semanal das solicitações de template
-- Roda APOS 20260515_template_requests.sql

-- 1) Adiciona campos pra rastrear vencedor semanal
ALTER TABLE public.template_requests
  ADD COLUMN IF NOT EXISTS won_week_start date,
  ADD COLUMN IF NOT EXISTS production_target_date date;

CREATE INDEX IF NOT EXISTS template_requests_won_week_idx ON public.template_requests(won_week_start);

-- 2) Tabela de votos (1 voto por aluno por solicitação por semana)
CREATE TABLE IF NOT EXISTS public.template_request_votes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES public.template_requests(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL DEFAULT date_trunc('week', current_date)::date,
  created_at timestamptz DEFAULT now(),
  UNIQUE (request_id, user_id, week_start)
);

CREATE INDEX IF NOT EXISTS template_request_votes_request_idx ON public.template_request_votes(request_id);
CREATE INDEX IF NOT EXISTS template_request_votes_user_idx ON public.template_request_votes(user_id);
CREATE INDEX IF NOT EXISTS template_request_votes_week_idx ON public.template_request_votes(week_start);

ALTER TABLE public.template_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view votes" ON public.template_request_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can vote as themselves" ON public.template_request_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own votes" ON public.template_request_votes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins do anything on votes" ON public.template_request_votes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3) Trocar RLS de template_requests — agora TODOS alunos veem as solicitacoes (era so a propria)
DROP POLICY IF EXISTS "Users can view own requests" ON public.template_requests;
CREATE POLICY "Authenticated users can view all requests" ON public.template_requests
  FOR SELECT USING (auth.uid() IS NOT NULL);
