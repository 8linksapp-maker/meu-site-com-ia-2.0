-- ============================================================================
-- 20260529 — Seed inicial: 6 trilhas + 39 aulas
-- ============================================================================
-- Trilhas pensadas pelos 4 personas MSIA: iniciantes, freelancers, afiliados, PMEs.
-- 2 trilhas universais featured (Primeiro site, Domínio+SEO) +
-- 1 universal opcional (Leads+WhatsApp) +
-- 3 trilhas por persona (Freelancer, Afiliados, PME).
--
-- Idempotente: ON CONFLICT em trilhas/trail_lessons + WHERE NOT EXISTS em lessons.
-- Pode rodar várias vezes sem duplicar.
-- ============================================================================

-- ─── 1. TRILHAS ───────────────────────────────────────────────────────────
INSERT INTO public.trails
    (slug, title, description, icon, target_audience, display_order, is_featured, estimated_hours)
VALUES
    ('primeiro-site',
     'Primeiro site no ar',
     'Do zero ao seu site publicado. Sem código, sem dor de cabeça.',
     'rocket', 'iniciantes', 0, true, 1.5),

    ('dominio-e-seo',
     'Domínio próprio e SEO básico',
     'Conecte seu domínio e seja encontrado no Google.',
     'globe', 'todos', 1, true, 1.0),

    ('leads-e-whatsapp',
     'Captação de leads e WhatsApp',
     'Capture contatos e converse pelo WhatsApp direto do seu site.',
     'message-circle', 'todos', 2, false, 0.83),

    ('freelancer-profissional',
     'Freelancer profissional',
     'Como vender sites como freelancer — precificação, propostas, clientes.',
     'briefcase', 'freelancers', 3, false, 2.0),

    ('afiliados-que-vendem',
     'Afiliados que vendem',
     'Conteúdo que converte, tracking de comissão e cases reais.',
     'dollar-sign', 'afiliados', 4, false, 1.5),

    ('pme-local',
     'PME local virando online',
     'Pra pequeno negócio físico que precisa aparecer no Google e captar via WhatsApp.',
     'store', 'pmes', 5, false, 1.0)
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. AULAS (lessons) ──────────────────────────────────────────────────
-- Cada INSERT verifica se já existe lesson com mesmo título antes de criar.

-- TRILHA 1: Primeiro site (8 aulas)
INSERT INTO public.lessons (title, description) SELECT 'O que é um site e como a MSIA simplifica', 'Visão geral da plataforma e do que você vai conquistar nesta trilha.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'O que é um site e como a MSIA simplifica');
INSERT INTO public.lessons (title, description) SELECT 'Criando sua conta no GitHub (passo a passo)', 'Por que precisa, como criar, onde encontrar as configurações.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Criando sua conta no GitHub (passo a passo)');
INSERT INTO public.lessons (title, description) SELECT 'Criando sua conta na Vercel', 'Vinculando com GitHub e configurando o ambiente de publicação.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Criando sua conta na Vercel');
INSERT INTO public.lessons (title, description) SELECT 'Escolhendo seu primeiro template', 'Critérios pra escolher bem: nicho, visual, complexidade.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Escolhendo seu primeiro template');
INSERT INTO public.lessons (title, description) SELECT 'Publicando seu site em 2 minutos', 'O processo de deploy automático — o que acontece nos bastidores.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Publicando seu site em 2 minutos');
INSERT INTO public.lessons (title, description) SELECT 'Editando texto, imagens e cores no admin', 'Painel de edição: navegação, salvamento, preview ao vivo.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Editando texto, imagens e cores no admin');
INSERT INTO public.lessons (title, description) SELECT 'Adicionando seu primeiro post de blog', 'Criando, formatando e publicando conteúdo no blog do site.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Adicionando seu primeiro post de blog');
INSERT INTO public.lessons (title, description) SELECT 'O que fazer se o deploy der erro', 'Erros comuns do deploy e como resolver cada um.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'O que fazer se o deploy der erro');

-- TRILHA 2: Domínio e SEO (6 aulas)
INSERT INTO public.lessons (title, description) SELECT 'Comprando seu domínio (.com.br ou .com)', 'Onde comprar, qual extensão escolher, quanto custa.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Comprando seu domínio (.com.br ou .com)');
INSERT INTO public.lessons (title, description) SELECT 'Conectando o domínio na MSIA', 'Configurando os DNS — passo a passo visual.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Conectando o domínio na MSIA');
INSERT INTO public.lessons (title, description) SELECT 'Esperando o DNS propagar (e o que checar)', 'Por que demora, como verificar status, ferramentas que ajudam.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Esperando o DNS propagar (e o que checar)');
INSERT INTO public.lessons (title, description) SELECT 'Configurando título, descrição e favicon', 'Identidade básica do site no Google e no browser.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Configurando título, descrição e favicon');
INSERT INTO public.lessons (title, description) SELECT 'SEO básico: o que é, por que importa', 'Conceitos fundamentais sem jargão técnico.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'SEO básico: o que é, por que importa');
INSERT INTO public.lessons (title, description) SELECT 'Conectando Google Search Console', 'Como cadastrar seu site no Google e enviar sitemap.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Conectando Google Search Console');

-- TRILHA 3: Leads e WhatsApp (5 aulas)
INSERT INTO public.lessons (title, description) SELECT 'Por que capturar email e WhatsApp do visitante', 'Conversão e relacionamento — a base do crescimento.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Por que capturar email e WhatsApp do visitante');
INSERT INTO public.lessons (title, description) SELECT 'Configurando formulário de newsletter', 'Onde colocar, o que pedir, o que prometer em troca.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Configurando formulário de newsletter');
INSERT INTO public.lessons (title, description) SELECT 'Integrando botão WhatsApp flutuante', 'Botão sempre visível com link direto e mensagem pré-pronta.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Integrando botão WhatsApp flutuante');
INSERT INTO public.lessons (title, description) SELECT 'Recebendo notificação de cada novo contato', 'Email, Slack, planilha — escolhendo seu canal.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Recebendo notificação de cada novo contato');
INSERT INTO public.lessons (title, description) SELECT 'Primeiros passos com email marketing', 'Ferramentas gratuitas, primeira sequência, evitando spam.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Primeiros passos com email marketing');

-- TRILHA 4: Freelancer (7 aulas)
INSERT INTO public.lessons (title, description) SELECT 'Como precificar: R$ 800 a R$ 6.000 por site', 'Fatores que definem o preço, faixas por tipo de cliente.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Como precificar: R$ 800 a R$ 6.000 por site');
INSERT INTO public.lessons (title, description) SELECT 'Modelo de proposta comercial que fecha', 'Estrutura, escopo claro, justificativa de valor.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Modelo de proposta comercial que fecha');
INSERT INTO public.lessons (title, description) SELECT 'Coletando conteúdo do cliente sem retrabalho', 'Checklist de coleta, formulário organizado, prazos.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Coletando conteúdo do cliente sem retrabalho');
INSERT INTO public.lessons (title, description) SELECT 'Briefing visual: alinhando expectativa', 'Mood board, referências, validação antes de começar.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Briefing visual: alinhando expectativa');
INSERT INTO public.lessons (title, description) SELECT 'Onboarding do cliente após entrega', 'Treinamento, documentação, evitando suporte infinito.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Onboarding do cliente após entrega');
INSERT INTO public.lessons (title, description) SELECT 'Manutenção mensal: pacote recorrente', 'Como estruturar mensalidade que vale a pena pros dois lados.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Manutenção mensal: pacote recorrente');
INSERT INTO public.lessons (title, description) SELECT 'Conseguindo seus 3 primeiros clientes', 'Onde prospectar, como abordar, fechando o primeiro.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Conseguindo seus 3 primeiros clientes');

-- TRILHA 5: Afiliados (6 aulas)
INSERT INTO public.lessons (title, description) SELECT 'Como funciona o programa de afiliados MSIA', 'Comissões, regras, link de afiliado, painel Kiwify.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Como funciona o programa de afiliados MSIA');
INSERT INTO public.lessons (title, description) SELECT 'Construindo audiência pra começar a vender', 'Do zero ao primeiro nicho — o que postar nos primeiros 30 dias.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Construindo audiência pra começar a vender');
INSERT INTO public.lessons (title, description) SELECT 'Tipos de conteúdo que convertem (vídeo, post, live)', 'Anatomia de cada formato com exemplos reais.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Tipos de conteúdo que convertem (vídeo, post, live)');
INSERT INTO public.lessons (title, description) SELECT 'Demonstração ao vivo: o segredo da venda', 'Por que demonstrar funciona e como fazer bem.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Demonstração ao vivo: o segredo da venda');
INSERT INTO public.lessons (title, description) SELECT 'Tracking de comissão e dashboard Kiwify', 'Entendendo seus números, identificando o que funciona.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Tracking de comissão e dashboard Kiwify');
INSERT INTO public.lessons (title, description) SELECT 'Cases reais: como afiliados estão faturando', 'Estudos de caso de alunos que já vendem consistente.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Cases reais: como afiliados estão faturando');

-- TRILHA 6: PME local (5 aulas)
INSERT INTO public.lessons (title, description) SELECT 'Por que toda PME precisa de site (mesmo a pequena)', 'O custo de não estar online em 2026.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Por que toda PME precisa de site (mesmo a pequena)');
INSERT INTO public.lessons (title, description) SELECT 'Site institucional vs landing de captura', 'Quando cada um faz sentido pro seu modelo de negócio.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Site institucional vs landing de captura');
INSERT INTO public.lessons (title, description) SELECT 'Google Meu Negócio: aparecer no Maps', 'Cadastro, fotos, horário, reviews — o básico essencial.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Google Meu Negócio: aparecer no Maps');
INSERT INTO public.lessons (title, description) SELECT 'SEO local: ser achado por bairro e cidade', 'Palavras-chave geo, conteúdo local, sinais que o Google valoriza.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'SEO local: ser achado por bairro e cidade');
INSERT INTO public.lessons (title, description) SELECT 'Anúncios simples com a landing como destino', 'Google Ads e Meta Ads básico — orçamento inicial.' WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE title = 'Anúncios simples com a landing como destino');

-- ─── 3. TRAIL_LESSONS (vincula lessons às trilhas) ────────────────────────
INSERT INTO public.trail_lessons (trail_id, lesson_id, display_order, chapter)
SELECT t.id, l.id, m.ord, NULL
FROM (
    VALUES
        -- Trilha 1: Primeiro site
        ('primeiro-site', 'O que é um site e como a MSIA simplifica', 0),
        ('primeiro-site', 'Criando sua conta no GitHub (passo a passo)', 1),
        ('primeiro-site', 'Criando sua conta na Vercel', 2),
        ('primeiro-site', 'Escolhendo seu primeiro template', 3),
        ('primeiro-site', 'Publicando seu site em 2 minutos', 4),
        ('primeiro-site', 'Editando texto, imagens e cores no admin', 5),
        ('primeiro-site', 'Adicionando seu primeiro post de blog', 6),
        ('primeiro-site', 'O que fazer se o deploy der erro', 7),

        -- Trilha 2: Domínio e SEO
        ('dominio-e-seo', 'Comprando seu domínio (.com.br ou .com)', 0),
        ('dominio-e-seo', 'Conectando o domínio na MSIA', 1),
        ('dominio-e-seo', 'Esperando o DNS propagar (e o que checar)', 2),
        ('dominio-e-seo', 'Configurando título, descrição e favicon', 3),
        ('dominio-e-seo', 'SEO básico: o que é, por que importa', 4),
        ('dominio-e-seo', 'Conectando Google Search Console', 5),

        -- Trilha 3: Leads e WhatsApp
        ('leads-e-whatsapp', 'Por que capturar email e WhatsApp do visitante', 0),
        ('leads-e-whatsapp', 'Configurando formulário de newsletter', 1),
        ('leads-e-whatsapp', 'Integrando botão WhatsApp flutuante', 2),
        ('leads-e-whatsapp', 'Recebendo notificação de cada novo contato', 3),
        ('leads-e-whatsapp', 'Primeiros passos com email marketing', 4),

        -- Trilha 4: Freelancer
        ('freelancer-profissional', 'Como precificar: R$ 800 a R$ 6.000 por site', 0),
        ('freelancer-profissional', 'Modelo de proposta comercial que fecha', 1),
        ('freelancer-profissional', 'Coletando conteúdo do cliente sem retrabalho', 2),
        ('freelancer-profissional', 'Briefing visual: alinhando expectativa', 3),
        ('freelancer-profissional', 'Onboarding do cliente após entrega', 4),
        ('freelancer-profissional', 'Manutenção mensal: pacote recorrente', 5),
        ('freelancer-profissional', 'Conseguindo seus 3 primeiros clientes', 6),

        -- Trilha 5: Afiliados
        ('afiliados-que-vendem', 'Como funciona o programa de afiliados MSIA', 0),
        ('afiliados-que-vendem', 'Construindo audiência pra começar a vender', 1),
        ('afiliados-que-vendem', 'Tipos de conteúdo que convertem (vídeo, post, live)', 2),
        ('afiliados-que-vendem', 'Demonstração ao vivo: o segredo da venda', 3),
        ('afiliados-que-vendem', 'Tracking de comissão e dashboard Kiwify', 4),
        ('afiliados-que-vendem', 'Cases reais: como afiliados estão faturando', 5),

        -- Trilha 6: PME local
        ('pme-local', 'Por que toda PME precisa de site (mesmo a pequena)', 0),
        ('pme-local', 'Site institucional vs landing de captura', 1),
        ('pme-local', 'Google Meu Negócio: aparecer no Maps', 2),
        ('pme-local', 'SEO local: ser achado por bairro e cidade', 3),
        ('pme-local', 'Anúncios simples com a landing como destino', 4)
) AS m(trail_slug, lesson_title, ord)
JOIN public.trails t ON t.slug = m.trail_slug
JOIN public.lessons l ON l.title = m.lesson_title
ON CONFLICT (trail_id, lesson_id) DO NOTHING;

-- ─── Verificação ──────────────────────────────────────────────────────────
-- SELECT t.title AS trilha, COUNT(tl.lesson_id) AS aulas
-- FROM public.trails t
-- LEFT JOIN public.trail_lessons tl ON tl.trail_id = t.id
-- GROUP BY t.id, t.title, t.display_order
-- ORDER BY t.display_order;
