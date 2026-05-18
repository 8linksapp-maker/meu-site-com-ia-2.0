-- Functions SQL pra retencao: streak de voto diario + contagem de votantes do dia
-- Baseia-se em template_request_votes.vote_date (adicionada em 20260516_template_votes_daily.sql)
-- Roda APOS 20260516_template_votes_daily.sql

-- =============================================================================
-- Function 1: get_user_voting_streak(p_user_id)
-- Retorna streak atual (grace 24h), maior streak historico, ultima data, total de dias.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_voting_streak(p_user_id uuid)
RETURNS TABLE (
  current_streak int,
  longest_streak int,
  last_vote_date date,
  total_vote_days int
) AS $$
DECLARE
  v_today_br date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_last_vote_date date;
  v_total int := 0;
  v_current int := 0;
  v_longest int := 0;
BEGIN
  -- Tecnica "gaps and islands": pra cada data distinta votada, calcula
  -- grp = data - row_number(ordem crescente). Datas consecutivas caem no
  -- mesmo grupo, entao COUNT por grupo = tamanho da sequencia.
  WITH vote_days AS (
    SELECT DISTINCT vote_date AS d
    FROM public.template_request_votes
    WHERE user_id = p_user_id
  ),
  ordered AS (
    SELECT d, ROW_NUMBER() OVER (ORDER BY d)::int AS rn
    FROM vote_days
  ),
  groups AS (
    SELECT d, (d - rn) AS grp
    FROM ordered
  ),
  group_sizes AS (
    SELECT grp, COUNT(*)::int AS sz, MAX(d) AS end_date
    FROM groups
    GROUP BY grp
  )
  SELECT
    (SELECT MAX(end_date) FROM group_sizes),
    (SELECT COUNT(*)::int FROM vote_days),
    -- current_streak: tamanho do grupo cujo end_date eh hoje ou ontem (grace 24h).
    -- Se nao existir grupo nessa janela, streak quebrou — 0.
    COALESCE(
      (SELECT sz FROM group_sizes
        WHERE end_date BETWEEN v_today_br - 1 AND v_today_br
        ORDER BY end_date DESC
        LIMIT 1),
      0
    ),
    COALESCE((SELECT MAX(sz) FROM group_sizes), 0)
  INTO v_last_vote_date, v_total, v_current, v_longest;

  RETURN QUERY SELECT v_current, v_longest, v_last_vote_date, v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_voting_streak(uuid) TO authenticated;


-- =============================================================================
-- Function 2: get_today_voters_count()
-- Conta usuarios distintos que votaram hoje (BRT), excluindo admins.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_today_voters_count()
RETURNS int AS $$
  SELECT COUNT(DISTINCT v.user_id)::int
  FROM public.template_request_votes v
  LEFT JOIN public.profiles p ON p.id = v.user_id
  WHERE v.vote_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND (p.role IS NULL OR p.role <> 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_today_voters_count() TO authenticated;
