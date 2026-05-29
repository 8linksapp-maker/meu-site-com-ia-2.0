-- ============================================================================
-- 20260528 — FAQ Articles (perguntas frequentes do aluno)
-- ============================================================================
-- Tabela única, simples. Categoria como text (não FK) — admin define livre.
-- Seed com 12 perguntas iniciais cobrindo Conta, Site, Domínio, Afiliados.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.faq_articles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category        text NOT NULL DEFAULT 'Geral',
    question        text NOT NULL,
    answer          text NOT NULL DEFAULT '',
    display_order   integer NOT NULL DEFAULT 0,
    is_published    boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS faq_articles_category_idx
    ON public.faq_articles(category, display_order);

CREATE INDEX IF NOT EXISTS faq_articles_published_idx
    ON public.faq_articles(is_published) WHERE is_published = true;

-- RLS
ALTER TABLE public.faq_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_faq" ON public.faq_articles;
CREATE POLICY "auth_read_faq" ON public.faq_articles
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "admin_write_faq" ON public.faq_articles;
CREATE POLICY "admin_write_faq" ON public.faq_articles
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.faq_articles_set_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS faq_articles_updated_at_trigger ON public.faq_articles;
CREATE TRIGGER faq_articles_updated_at_trigger
    BEFORE UPDATE ON public.faq_articles
    FOR EACH ROW EXECUTE FUNCTION public.faq_articles_set_updated_at();

-- ─── SEED ──────────────────────────────────────────────────────────────────
INSERT INTO public.faq_articles (category, question, answer, display_order, is_published) VALUES

-- CONTA
('Conta',
 'Como troco a senha do admin do meu site?',
 'Entra na área **/admin** do seu site (ex: `meusite.com.br/admin`), clica no seu avatar no canto superior direito e escolhe **Trocar senha**. Define a nova senha e salva.

Se você esqueceu a senha atual, vê a próxima pergunta.',
 0, true),

('Conta',
 'Esqueci a senha do admin do meu site, o que fazer?',
 'Como cada site tem seu próprio admin independente da MSIA, a recuperação é manual:

1. Vai em **/meus-sites** na MSIA
2. Clica no site em questão
3. Aba **Configurações** → seção **Redefinir senha do admin**
4. Define uma nova senha — substitui a anterior

A nova senha já funciona em até 1 minuto.',
 1, true),

('Conta',
 'Como mudo meu email ou nome de cadastro?',
 'Vai em **/configuracoes** → aba **Conta**. Você pode atualizar seu nome livremente. Pra trocar o email, é preciso confirmar pelo email novo — segue as instruções que vão chegar lá.',
 2, true),

-- SITE (conteúdo)
('Site',
 'Como troco o texto, fotos e cores do meu site?',
 'Tudo é editado no **admin do seu site**, não na MSIA.

1. Acessa `seusite.com.br/admin` (ou `seusite.vercel.app/admin`)
2. Faz login com a senha que você criou no deploy
3. Navega pelas seções — texto, imagens, cores, blog, etc

As mudanças aparecem no site em ~30 segundos. Não precisa fazer deploy de novo manualmente.',
 0, true),

('Site',
 'Como adiciono um post no blog?',
 'No admin do seu site, vai em **Blog** → **Novo post**.

Você preenche:
- Título
- Conteúdo (com formatação rica)
- Imagem de capa
- Categoria

Click **Publicar** e ele já aparece no site em segundos.',
 1, true),

('Site',
 'Posso ter mais de um site na mesma conta?',
 'Sim, sem limite. Cada site que você cria fica em **/meus-sites** e cada um tem seu próprio admin independente. Você pode publicar quantos quiser — pra você, pra clientes (se for freelancer), pra projetos diferentes.',
 2, true),

-- DOMÍNIO
('Domínio',
 'Como conecto meu domínio próprio (ex: meusite.com.br)?',
 'No painel da MSIA:

1. Vai em **/meus-sites** → clica no site → aba **Domínio**
2. Cola o domínio que você comprou
3. A MSIA mostra 2 registros DNS pra você configurar no provedor (Registro.br, GoDaddy, etc):
   - Um `A record` apontando pro IP
   - Um `CNAME` pra `www`

Depois de configurar lá, o domínio começa a funcionar em até 24h.',
 0, true),

('Domínio',
 'Quanto tempo demora pro meu domínio funcionar depois de configurar?',
 'Geralmente entre **30 minutos e 4 horas**. Em casos raros pode levar até 24h pra propagar 100% mundialmente.

Pra checar status: acessa [dnschecker.org](https://dnschecker.org) e digita seu domínio. Se aparecer verde em vários países, tá propagado.',
 1, true),

('Domínio',
 'O domínio que comprei não tá funcionando, e agora?',
 'Causas mais comuns:

- **DNS ainda propagando** — espera mais algumas horas
- **Registros DNS errados** — confere se você colocou exatamente o IP e CNAME que a MSIA mostrou
- **Domínio expirado** — verifica se você pagou a anuidade no Registro.br
- **Cache do browser** — abre em aba anônima

Se nada disso resolver, abre um ticket no **Suporte** com o nome do domínio.',
 2, true),

-- AFILIADOS
('Afiliados',
 'Como me torno afiliado MSIA?',
 'Vai em **/afiliados** no menu, preenche o wizard de candidatura (3 etapas rápidas) e depois finaliza seu cadastro na Kiwify (que gerencia os pagamentos).

A comissão é de **30% por venda** indicada, recorrente enquanto o aluno pagar mensalidade.',
 0, true),

('Afiliados',
 'Quanto tempo demora pra aprovarem minha candidatura?',
 'Avaliamos cada candidatura em **até 3 dias úteis**. Olhamos sua audiência, canais de divulgação e estratégia.

Enquanto isso, você já pode finalizar o cadastro na Kiwify (que é a parte que gera seu link real de afiliado).',
 1, true),

('Afiliados',
 'Onde acompanho minhas comissões?',
 'Diretamente no **dashboard.kiwify.com** com sua conta de afiliado. Lá você vê:

- Cliques no seu link
- Conversões
- Comissões pendentes e pagas
- Datas de saque

A MSIA não gerencia o financeiro — toda essa parte é via Kiwify.',
 2, true);
