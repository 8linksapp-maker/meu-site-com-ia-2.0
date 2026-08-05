-- ═══════════════════════════════════════════════════════════════════════════
-- TESTE DE ISOLAMENTO MULTI-TENANT — RLS cloud SSR (chunk cloud-02, Severino)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Prova que um aluno A autenticado NÃO consegue select/update/delete/insert
-- linha de site do aluno B, e que o público (anon) só vê conteúdo publicado
-- de site ativo. Falha = RAISE EXCEPTION aborta a transação (exit != 0 no psql
-- com -v ON_ERROR_STOP=1). Sucesso = imprime "ISOLAMENTO OK" e faz ROLLBACK.
--
-- ─── COMO RODAR (SÓ EM STAGING / AMBIENTE CONTROLADO — NUNCA EM PRODUÇÃO) ───
--
--   1. Aplique as migrations primeiro no banco de staging:
--        psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 \
--          -f supabase/migrations/20260702_cloud_ssr_multitenant.sql \
--          -f supabase/migrations/20260702_cloud_ssr_rls.sql
--
--   2. Crie DOIS usuários de teste no Supabase Auth do staging (aluno A e aluno B)
--      e pegue os UUIDs deles (auth.users.id). Isolamento amarra em auth.users
--      por FK, então precisam ser usuários reais do staging.
--
--   3. Rode este teste passando os dois UUIDs:
--        psql "$STAGING_DB_URL" -v ON_ERROR_STOP=1 \
--          -v uid_a="'00000000-aaaa-...'" -v uid_b="'11111111-bbbb-...'" \
--          -f scripts/test-cloud-rls-isolation.sql
--
--   Tudo roda dentro de UMA transação com ROLLBACK no fim: não persiste nada.
--   (Se preferir, edite os \set abaixo com UUIDs reais e rode sem -v.)
--
-- ─── COMO auth.uid() É SIMULADO ───
--   auth.uid() lê current_setting('request.jwt.claims')::json->>'sub'. O teste
--   faz SET LOCAL role authenticated / anon + SET LOCAL request.jwt.claims p/
--   encenar cada credencial, exatamente como o PostgREST faz em runtime.
-- ═══════════════════════════════════════════════════════════════════════════

-- Fallback dos UUIDs caso não venham via -v (troque por usuários reais do staging):
\if :{?uid_a} \else \set uid_a '\'00000000-0000-4000-a000-0000000000aa\'' \endif
\if :{?uid_b} \else \set uid_b '\'00000000-0000-4000-b000-0000000000bb\'' \endif

BEGIN;

-- ── SEED (como owner das tabelas / superuser -> RLS não se aplica ao seed) ──
-- Garante que os usuários de teste existem em auth.users (idempotente no TX).
-- Em staging real, prefira criar via Supabase Auth; este INSERT é um mínimo p/
-- satisfazer a FK caso os UUIDs de teste ainda não existam.
INSERT INTO auth.users (id, aud, role, email)
VALUES
  (:uid_a, 'authenticated', 'authenticated', 'aluno-a-teste@example.com'),
  (:uid_b, 'authenticated', 'authenticated', 'aluno-b-teste@example.com')
ON CONFLICT (id) DO NOTHING;

-- Site do aluno A (ativo) + site do aluno B (ativo) + 1 site suspenso do A.
INSERT INTO public.sites (id, owner, template, subdomain, status) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', :uid_a, 'clickbanker', 'site-a',       'active'),
  ('bbbbbbbb-0000-4000-8000-000000000001', :uid_b, 'clickbanker', 'site-b',       'active'),
  ('aaaaaaaa-0000-4000-8000-000000000002', :uid_a, 'clickbanker', 'site-a-susp',  'suspended');

INSERT INTO public.site_content (site_id, key, data) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'home', '{"h1":"conteudo secreto do A"}'::jsonb),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'home', '{"h1":"conteudo do B"}'::jsonb);

INSERT INTO public.site_posts (site_id, slug, title, is_published) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'pub-a',   'Post publicado do A', true),
  ('aaaaaaaa-0000-4000-8000-000000000001', 'draft-a', 'Rascunho do A',       false),
  ('bbbbbbbb-0000-4000-8000-000000000001', 'pub-b',   'Post publicado do B', true);

-- ═══════════════════════════════════════════════════════════════════════════
-- CENÁRIO 1 — Aluno B autenticado NÃO enxerga NADA do aluno A
-- ═══════════════════════════════════════════════════════════════════════════
SET LOCAL role authenticated;
-- auth.uid() lê request.jwt.claims->>'sub'. Montamos o JSON com o UUID do B:
SELECT set_config('request.jwt.claims', json_build_object('sub', trim(both '''' from :'uid_b'))::text, true);

DO $$
DECLARE n int;
BEGIN
  -- B NÃO enxerga o site do A.
  SELECT count(*) INTO n FROM public.sites s WHERE s.id = 'aaaaaaaa-0000-4000-8000-000000000001';
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA: B enxergou o site do A (esperado 0, veio %)', n; END IF;

  SELECT count(*) INTO n FROM public.sites;  -- só o(s) do B
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA: B enxergou % sites (esperado 1, só o dele)', n; END IF;

  -- B não lê site_content do A.
  SELECT count(*) INTO n FROM public.site_content
    WHERE site_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA: B leu site_content do A (esperado 0, veio %)', n; END IF;

  -- B não lê site_posts do A (nem o publicado — authenticated não tem leitura pública).
  SELECT count(*) INTO n FROM public.site_posts
    WHERE site_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA: B leu site_posts do A (esperado 0, veio %)', n; END IF;

  RAISE NOTICE '[1] B nao le nada do A ....... OK';
END $$;

-- ── UPDATE / DELETE do B contra dados do A: 0 linhas afetadas (RLS filtra) ──
DO $$
DECLARE n int;
BEGIN
  WITH upd AS (
    UPDATE public.site_content SET data = '{"h1":"HACKED"}'::jsonb
    WHERE site_id = 'aaaaaaaa-0000-4000-8000-000000000001' RETURNING 1
  ) SELECT count(*) INTO n FROM upd;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA: B atualizou % linhas de site_content do A', n; END IF;

  WITH del AS (
    DELETE FROM public.site_posts
    WHERE site_id = 'aaaaaaaa-0000-4000-8000-000000000001' RETURNING 1
  ) SELECT count(*) INTO n FROM del;
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA: B deletou % posts do A', n; END IF;

  RAISE NOTICE '[2] B nao escreve/deleta no A .. OK';
END $$;

-- ── INSERT do B com site_id do A: WITH CHECK deve BARRAR (exceção esperada) ──
DO $$
BEGIN
  BEGIN
    INSERT INTO public.site_posts (site_id, slug, title, is_published)
    VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'injetado', 'injetado por B', true);
    RAISE EXCEPTION 'FALHA: B conseguiu INSERT em site do A (WITH CHECK nao barrou)';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE '[3] B nao insere no site do A ... OK (RLS barrou)';
  END;
END $$;

-- ── Sanity: B CONSEGUE mexer no PRÓPRIO site (não pode ter travado geral) ──
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.site_posts
    WHERE site_id = 'bbbbbbbb-0000-4000-8000-000000000001';
  IF n < 1 THEN RAISE EXCEPTION 'FALHA: B nao le o proprio post (RLS restritiva demais)'; END IF;
  RAISE NOTICE '[4] B le o proprio conteudo ... OK';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- CENÁRIO 2 — Público (anon) só vê publicado de site ativo
-- ═══════════════════════════════════════════════════════════════════════════
RESET role;
SET LOCAL role anon;
SELECT set_config('request.jwt.claims', NULL, true);

DO $$
DECLARE n int;
BEGIN
  -- anon vê post publicado de site ativo.
  SELECT count(*) INTO n FROM public.site_posts WHERE slug = 'pub-a';
  IF n <> 1 THEN RAISE EXCEPTION 'FALHA: anon nao viu post publicado de site ativo (veio %)', n; END IF;

  -- anon NÃO vê rascunho.
  SELECT count(*) INTO n FROM public.site_posts WHERE slug = 'draft-a';
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA: anon viu RASCUNHO (esperado 0, veio %)', n; END IF;

  -- anon NÃO vê conteúdo de site suspenso.
  SELECT count(*) INTO n FROM public.sites WHERE status <> 'active';
  IF n <> 0 THEN RAISE EXCEPTION 'FALHA: anon viu site nao-ativo (esperado 0, veio %)', n; END IF;

  -- anon não escreve nada.
  BEGIN
    INSERT INTO public.site_posts (site_id, slug, title, is_published)
    VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'anon-inj', 'anon', true);
    RAISE EXCEPTION 'FALHA: anon conseguiu INSERT';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RAISE NOTICE '[5] anon so ve publicado+ativo . OK';
END $$;

RESET role;

DO $$ BEGIN RAISE NOTICE '════════ ISOLAMENTO OK — todas as assercoes passaram ════════'; END $$;

-- Não persiste NADA — teste é read-only por design.
ROLLBACK;
