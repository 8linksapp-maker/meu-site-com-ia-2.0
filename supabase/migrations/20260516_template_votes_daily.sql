-- Voto DIARIO (era voto semanal) — incentiva retencao, aluno volta todo dia
-- Cada usuario pode dar 1 voto por solicitacao por DIA (em vez de por semana)

-- 1) Adiciona coluna vote_date (dia do voto)
ALTER TABLE public.template_request_votes
  ADD COLUMN IF NOT EXISTS vote_date date NOT NULL DEFAULT current_date;

-- 2) Backfill: votos existentes recebem vote_date = data de created_at
UPDATE public.template_request_votes
   SET vote_date = created_at::date
 WHERE vote_date IS NULL OR vote_date = current_date;

-- 3) Troca UNIQUE constraint: era (request, user, week) — agora (request, user, day)
ALTER TABLE public.template_request_votes
  DROP CONSTRAINT IF EXISTS template_request_votes_request_id_user_id_week_start_key;

ALTER TABLE public.template_request_votes
  ADD CONSTRAINT template_request_votes_request_user_date_unique UNIQUE (request_id, user_id, vote_date);

CREATE INDEX IF NOT EXISTS template_request_votes_vote_date_idx ON public.template_request_votes(vote_date);
