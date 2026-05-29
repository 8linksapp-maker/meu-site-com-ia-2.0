-- ============================================================================
-- 20260529 — Reset completo de trilhas/aulas + seed das novas 6 trilhas
-- ============================================================================
-- ⚠️ DESTRUTIVO: apaga TODAS as trails, lessons, vínculos e progresso de alunos.
-- Use só pra resetar a Academy do zero com a nova grade curricular.
-- Inclui também a trilha `aulas-ao-vivo` vazia (necessária pra /aulas-ao-vivo
-- mostrar replays — você adiciona aulas dentro dela quando gravar lives).
-- ============================================================================

-- ─── 1. LIMPAR TUDO ───────────────────────────────────────────────────────
-- Ordem: dependências mais profundas primeiro
DELETE FROM public.user_lessons_progress;
DELETE FROM public.lesson_resources;
DELETE FROM public.trail_lessons;
DELETE FROM public.lessons;
DELETE FROM public.trails;

-- ─── 2. INSERIR TRILHAS NOVAS (6 didáticas + 1 vazia pra lives) ───────────
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
     'store', 'pmes', 5, false, 1.0),

    -- Trilha de replays — começa vazia, você adiciona via TrailsManager
    -- toda sexta após a live
    ('aulas-ao-vivo',
     'Aulas ao vivo',
     'Gravações das aulas ao vivo da Academy.',
     'radio', 'todos', 999, false, NULL);

-- ─── 3. INSERIR LESSONS (39 aulas) ────────────────────────────────────────
INSERT INTO public.lessons (title, description) VALUES
    -- Trilha 1: Primeiro site (8 aulas)
    ('O que é um site e como a MSIA simplifica', 'Visão geral da plataforma e do que você vai conquistar nesta trilha.'),
    ('Criando sua conta no GitHub (passo a passo)', 'Por que precisa, como criar, onde encontrar as configurações.'),
    ('Criando sua conta na Vercel', 'Vinculando com GitHub e configurando o ambiente de publicação.'),
    ('Escolhendo seu primeiro template', 'Critérios pra escolher bem: nicho, visual, complexidade.'),
    ('Publicando seu site em 2 minutos', 'O processo de deploy automático — o que acontece nos bastidores.'),
    ('Editando texto, imagens e cores no admin', 'Painel de edição: navegação, salvamento, preview ao vivo.'),
    ('Adicionando seu primeiro post de blog', 'Criando, formatando e publicando conteúdo no blog do site.'),
    ('O que fazer se o deploy der erro', 'Erros comuns do deploy e como resolver cada um.'),

    -- Trilha 2: Domínio e SEO (6 aulas)
    ('Comprando seu domínio (.com.br ou .com)', 'Onde comprar, qual extensão escolher, quanto custa.'),
    ('Conectando o domínio na MSIA', 'Configurando os DNS — passo a passo visual.'),
    ('Esperando o DNS propagar (e o que checar)', 'Por que demora, como verificar status, ferramentas que ajudam.'),
    ('Configurando título, descrição e favicon', 'Identidade básica do site no Google e no browser.'),
    ('SEO básico: o que é, por que importa', 'Conceitos fundamentais sem jargão técnico.'),
    ('Conectando Google Search Console', 'Como cadastrar seu site no Google e enviar sitemap.'),

    -- Trilha 3: Leads e WhatsApp (5 aulas)
    ('Por que capturar email e WhatsApp do visitante', 'Conversão e relacionamento — a base do crescimento.'),
    ('Configurando formulário de newsletter', 'Onde colocar, o que pedir, o que prometer em troca.'),
    ('Integrando botão WhatsApp flutuante', 'Botão sempre visível com link direto e mensagem pré-pronta.'),
    ('Recebendo notificação de cada novo contato', 'Email, Slack, planilha — escolhendo seu canal.'),
    ('Primeiros passos com email marketing', 'Ferramentas gratuitas, primeira sequência, evitando spam.'),

    -- Trilha 4: Freelancer (7 aulas)
    ('Como precificar: R$ 800 a R$ 6.000 por site', 'Fatores que definem o preço, faixas por tipo de cliente.'),
    ('Modelo de proposta comercial que fecha', 'Estrutura, escopo claro, justificativa de valor.'),
    ('Coletando conteúdo do cliente sem retrabalho', 'Checklist de coleta, formulário organizado, prazos.'),
    ('Briefing visual: alinhando expectativa', 'Mood board, referências, validação antes de começar.'),
    ('Onboarding do cliente após entrega', 'Treinamento, documentação, evitando suporte infinito.'),
    ('Manutenção mensal: pacote recorrente', 'Como estruturar mensalidade que vale a pena pros dois lados.'),
    ('Conseguindo seus 3 primeiros clientes', 'Onde prospectar, como abordar, fechando o primeiro.'),

    -- Trilha 5: Afiliados (6 aulas)
    ('Como funciona o programa de afiliados MSIA', 'Comissões, regras, link de afiliado, painel Kiwify.'),
    ('Construindo audiência pra começar a vender', 'Do zero ao primeiro nicho — o que postar nos primeiros 30 dias.'),
    ('Tipos de conteúdo que convertem (vídeo, post, live)', 'Anatomia de cada formato com exemplos reais.'),
    ('Demonstração ao vivo: o segredo da venda', 'Por que demonstrar funciona e como fazer bem.'),
    ('Tracking de comissão e dashboard Kiwify', 'Entendendo seus números, identificando o que funciona.'),
    ('Cases reais: como afiliados estão faturando', 'Estudos de caso de alunos que já vendem consistente.'),

    -- Trilha 6: PME local (5 aulas)
    ('Por que toda PME precisa de site (mesmo a pequena)', 'O custo de não estar online em 2026.'),
    ('Site institucional vs landing de captura', 'Quando cada um faz sentido pro seu modelo de negócio.'),
    ('Google Meu Negócio: aparecer no Maps', 'Cadastro, fotos, horário, reviews — o básico essencial.'),
    ('SEO local: ser achado por bairro e cidade', 'Palavras-chave geo, conteúdo local, sinais que o Google valoriza.'),
    ('Anúncios simples com a landing como destino', 'Google Ads e Meta Ads básico — orçamento inicial.');

-- ─── 4. INSERIR TRAIL_LESSONS (vincula via JOIN) ──────────────────────────
INSERT INTO public.trail_lessons (trail_id, lesson_id, display_order, chapter)
SELECT t.id, l.id, m.ord, NULL
FROM (
    VALUES
        ('primeiro-site', 'O que é um site e como a MSIA simplifica', 0),
        ('primeiro-site', 'Criando sua conta no GitHub (passo a passo)', 1),
        ('primeiro-site', 'Criando sua conta na Vercel', 2),
        ('primeiro-site', 'Escolhendo seu primeiro template', 3),
        ('primeiro-site', 'Publicando seu site em 2 minutos', 4),
        ('primeiro-site', 'Editando texto, imagens e cores no admin', 5),
        ('primeiro-site', 'Adicionando seu primeiro post de blog', 6),
        ('primeiro-site', 'O que fazer se o deploy der erro', 7),
        ('dominio-e-seo', 'Comprando seu domínio (.com.br ou .com)', 0),
        ('dominio-e-seo', 'Conectando o domínio na MSIA', 1),
        ('dominio-e-seo', 'Esperando o DNS propagar (e o que checar)', 2),
        ('dominio-e-seo', 'Configurando título, descrição e favicon', 3),
        ('dominio-e-seo', 'SEO básico: o que é, por que importa', 4),
        ('dominio-e-seo', 'Conectando Google Search Console', 5),
        ('leads-e-whatsapp', 'Por que capturar email e WhatsApp do visitante', 0),
        ('leads-e-whatsapp', 'Configurando formulário de newsletter', 1),
        ('leads-e-whatsapp', 'Integrando botão WhatsApp flutuante', 2),
        ('leads-e-whatsapp', 'Recebendo notificação de cada novo contato', 3),
        ('leads-e-whatsapp', 'Primeiros passos com email marketing', 4),
        ('freelancer-profissional', 'Como precificar: R$ 800 a R$ 6.000 por site', 0),
        ('freelancer-profissional', 'Modelo de proposta comercial que fecha', 1),
        ('freelancer-profissional', 'Coletando conteúdo do cliente sem retrabalho', 2),
        ('freelancer-profissional', 'Briefing visual: alinhando expectativa', 3),
        ('freelancer-profissional', 'Onboarding do cliente após entrega', 4),
        ('freelancer-profissional', 'Manutenção mensal: pacote recorrente', 5),
        ('freelancer-profissional', 'Conseguindo seus 3 primeiros clientes', 6),
        ('afiliados-que-vendem', 'Como funciona o programa de afiliados MSIA', 0),
        ('afiliados-que-vendem', 'Construindo audiência pra começar a vender', 1),
        ('afiliados-que-vendem', 'Tipos de conteúdo que convertem (vídeo, post, live)', 2),
        ('afiliados-que-vendem', 'Demonstração ao vivo: o segredo da venda', 3),
        ('afiliados-que-vendem', 'Tracking de comissão e dashboard Kiwify', 4),
        ('afiliados-que-vendem', 'Cases reais: como afiliados estão faturando', 5),
        ('pme-local', 'Por que toda PME precisa de site (mesmo a pequena)', 0),
        ('pme-local', 'Site institucional vs landing de captura', 1),
        ('pme-local', 'Google Meu Negócio: aparecer no Maps', 2),
        ('pme-local', 'SEO local: ser achado por bairro e cidade', 3),
        ('pme-local', 'Anúncios simples com a landing como destino', 4)
) AS m(trail_slug, lesson_title, ord)
JOIN public.trails t ON t.slug = m.trail_slug
JOIN public.lessons l ON l.title = m.lesson_title;

-- ─── 5. VERIFICAÇÃO ───────────────────────────────────────────────────────
-- Esperado: 6 trilhas didáticas com aulas + trilha aulas-ao-vivo com 0 aulas
SELECT t.title AS trilha, t.is_featured, COUNT(tl.lesson_id) AS aulas
FROM public.trails t
LEFT JOIN public.trail_lessons tl ON tl.trail_id = t.id
GROUP BY t.id, t.title, t.is_featured, t.display_order
ORDER BY t.display_order;
