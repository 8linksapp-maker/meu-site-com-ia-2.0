-- ============================================================================
-- 20260529 — Re-seed affiliate_questions com 5 perguntas essenciais
-- ============================================================================
-- Substitui o seed inicial (9 perguntas em 4 steps) por 5 perguntas focadas
-- em 3 steps. Mantém o que importa pra admin avaliar candidato.
--
-- DELETA todas as perguntas existentes (perguntas — respostas históricas
-- ficam intactas em affiliate_applications.answers, mas órfãs).
-- Se quiser preservar perguntas customizadas que adicionou, rode só os INSERTs.
-- ============================================================================

-- ─── 1. Limpar perguntas atuais ────────────────────────────────────────────
DELETE FROM public.affiliate_questions;

-- ─── 2. Inserir 5 perguntas em 3 steps ─────────────────────────────────────
INSERT INTO public.affiliate_questions
    (question_text, question_type, options, helper_text, placeholder, step_group, step_label, display_order, is_required)
VALUES
    -- STEP 1: Contato
    ('Telefone com DDD', 'phone', '{}',
     'Pra gente conseguir te encontrar caso precise alinhar algo.', '(11) 99999-9999',
     1, 'Contato', 0, true),

    -- STEP 2: Audiência + experiência
    ('Onde você tem audiência hoje? Quais canais e qual o tamanho aproximado?', 'text', '{}',
     'Conta seus principais canais (Instagram, YouTube, WhatsApp, comunidade, etc) e número de seguidores ou membros.',
     'Ex: Instagram com 8k seguidores focado em empreendedorismo, grupo no WhatsApp com 300 pessoas, blog com 2k visitas/mês.',
     2, 'Audiência', 0, true),

    ('Você já vendeu como afiliado antes?', 'single_choice',
     ARRAY[
        'Nunca, vai ser meu primeiro programa',
        'Sim, vendi pouco (até R$ 1k/mês)',
        'Sim, vendo entre R$ 1k e R$ 10k/mês',
        'Sim, vendo mais de R$ 10k/mês'
     ],
     '', '',
     2, 'Audiência', 1, true),

    -- STEP 3: Estratégia + expectativa
    ('Como pretende divulgar a MSIA pra sua audiência?', 'text', '{}',
     'Conta sua estratégia. Vídeos? Posts? Lives? Bio? Comunidade? Quanto mais detalhe, melhor.',
     'Ex: vou fazer vídeos curtos demonstrando como criar site rápido com a MSIA, link de afiliado na bio do Instagram e em uma sequência de email pros meus leads.',
     3, 'Estratégia', 0, true),

    ('Quanto você espera ganhar por mês como afiliado MSIA?', 'single_choice',
     ARRAY[
        'Até R$ 500',
        'R$ 500 a R$ 2.000',
        'R$ 2.000 a R$ 10.000',
        'Mais de R$ 10.000'
     ],
     'Sem pressão — serve só pra calibrar expectativa entre nós.', '',
     3, 'Estratégia', 1, true);

-- ─── Verificação ───────────────────────────────────────────────────────────
-- SELECT step_group, step_label, display_order, question_text, question_type FROM public.affiliate_questions ORDER BY step_group, display_order;
