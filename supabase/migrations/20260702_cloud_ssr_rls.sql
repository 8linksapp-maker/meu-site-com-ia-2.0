-- Cloud SSR multi-tenant — POLICIES RLS (chunk cloud-02, Severino)
-- Gate de segurança CRÍTICO. Amarra a posse de todo conteúdo por `sites.owner`.
-- Um erro aqui = aluno A lê/edita o site do aluno B (vazamento entre tenants — risco R2).
--
-- Roda EM CIMA do shape do chunk cloud-01 (20260702_cloud_ssr_multitenant.sql), que já
-- criou sites/site_content/site_posts com RLS habilitada fail-closed e SEM policies.
--
-- ADITIVO e IDEMPOTENTE: cada policy tem DROP POLICY IF EXISTS antes do CREATE
-- (Postgres não suporta CREATE POLICY IF NOT EXISTS). Re-rodar não quebra.
-- NÃO altera profiles/user_sites (RLS legacy intocada). NÃO aplicar em produção —
-- aplicação é decisão do Bruno/Tião num ambiente controlado (staging).
--
-- ─────────────────────────────────────────────────────────────
-- Modelo de acesso (3 credenciais):
--
--   service_role (Worker SSR + driver)  -> BYPASSA RLS. Lê/escreve qualquer site_id.
--                                          Isolamento por tenant é responsabilidade da
--                                          APP-LAYER (Francis, cloud-04): scopar toda query
--                                          pelo site_id da request. RLS é só backstop aqui.
--   authenticated (aluno logado no admin) -> vê/edita SÓ o conteúdo dos sites que ele possui
--                                          (sites.owner = auth.uid()). Admin da plataforma
--                                          (profiles.role='admin') enxerga tudo.
--   anon (cliente público direto)        -> SELECT só de conteúdo PUBLICADO de site ATIVO.
--                                          Nunca escreve. Defesa em profundidade — o render
--                                          público real passa pelo Worker (service_role).
--
-- Nota sobre `TO`: usamos cláusulas TO explícitas (anon vs authenticated) de propósito.
-- Policies permissivas são OR'd; sem TO, a leitura pública (default role `public`) vazaria
-- pra authenticated e um aluno B leria o conteúdo publicado do aluno A. Escopando a leitura
-- pública SÓ pra `anon`, o authenticated fica restrito a owner+admin — isolamento cirúrgico.
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- sites — registro-mestre (1 linha = 1 tenant). Posse direta via owner.
-- ─────────────────────────────────────────────────────────────

-- Dono: ALL só nos próprios sites.
DROP POLICY IF EXISTS sites_owner_all ON public.sites;
CREATE POLICY sites_owner_all ON public.sites
  FOR ALL
  TO authenticated
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());

-- Admin da plataforma: enxerga/gerencia tudo.
DROP POLICY IF EXISTS sites_admin_all ON public.sites;
CREATE POLICY sites_admin_all ON public.sites
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Público: SELECT só de site ativo (defesa em profundidade; Worker usa service_role).
DROP POLICY IF EXISTS sites_public_read ON public.sites;
CREATE POLICY sites_public_read ON public.sites
  FOR SELECT
  TO anon
  USING (status = 'active');

-- ─────────────────────────────────────────────────────────────
-- site_content — singletons por site. Posse via join em sites.owner.
-- ─────────────────────────────────────────────────────────────

-- Dono: ALL só no conteúdo dos próprios sites.
DROP POLICY IF EXISTS site_content_owner_all ON public.site_content;
CREATE POLICY site_content_owner_all ON public.site_content
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_content.site_id AND s.owner = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_content.site_id AND s.owner = auth.uid())
  );

-- Admin: tudo.
DROP POLICY IF EXISTS site_content_admin_all ON public.site_content;
CREATE POLICY site_content_admin_all ON public.site_content
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Público: SELECT só de conteúdo de site ativo.
DROP POLICY IF EXISTS site_content_public_read ON public.site_content;
CREATE POLICY site_content_public_read ON public.site_content
  FOR SELECT
  TO anon
  USING (
    EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_content.site_id AND s.status = 'active')
  );

-- ─────────────────────────────────────────────────────────────
-- site_posts — posts por site. Posse via join em sites.owner.
-- ─────────────────────────────────────────────────────────────

-- Dono: ALL só nos posts dos próprios sites (inclui rascunhos).
DROP POLICY IF EXISTS site_posts_owner_all ON public.site_posts;
CREATE POLICY site_posts_owner_all ON public.site_posts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_posts.site_id AND s.owner = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_posts.site_id AND s.owner = auth.uid())
  );

-- Admin: tudo.
DROP POLICY IF EXISTS site_posts_admin_all ON public.site_posts;
CREATE POLICY site_posts_admin_all ON public.site_posts
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Público: SELECT só de post PUBLICADO de site ATIVO (rascunho nunca vaza).
DROP POLICY IF EXISTS site_posts_public_read ON public.site_posts;
CREATE POLICY site_posts_public_read ON public.site_posts
  FOR SELECT
  TO anon
  USING (
    is_published = true
    AND EXISTS (SELECT 1 FROM public.sites s WHERE s.id = site_posts.site_id AND s.status = 'active')
  );

-- ─────────────────────────────────────────────────────────────
-- Rollback:
--   DROP POLICY IF EXISTS sites_owner_all          ON public.sites;
--   DROP POLICY IF EXISTS sites_admin_all          ON public.sites;
--   DROP POLICY IF EXISTS sites_public_read        ON public.sites;
--   DROP POLICY IF EXISTS site_content_owner_all   ON public.site_content;
--   DROP POLICY IF EXISTS site_content_admin_all   ON public.site_content;
--   DROP POLICY IF EXISTS site_content_public_read ON public.site_content;
--   DROP POLICY IF EXISTS site_posts_owner_all     ON public.site_posts;
--   DROP POLICY IF EXISTS site_posts_admin_all     ON public.site_posts;
--   DROP POLICY IF EXISTS site_posts_public_read   ON public.site_posts;
--   -- (as tabelas voltam a fail-closed: RLS on, sem policies = tudo negado p/ anon/authenticated)
