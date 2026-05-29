# Product

## Register

product

## Users

A MSIA serve quatro perfis de usuário, todos brasileiros, em sua maioria sem fluência técnica:

1. **Iniciantes em web sem programação** — pessoas tentando construir presença online pela primeira vez.
2. **Freelancers (cobram R$ 800–6.000 por site)** — fazem site pra cliente, a MSIA é a ferramenta de produção deles. Precisam que o painel pareça profissional o suficiente pra mostrar pro cliente final sem vergonha.
3. **Afiliados querendo blog de renda passiva** — monetizam via SEO + links de afiliado, criam vários sites por nicho.
4. **Negócios locais e pequenos empreendedores com orçamento limitado** — médico, salão, advogado, loja de bairro. Querem presença digital mínima e profissional sem pagar agência.

**Contexto de uso comum:** computador desktop ou notebook em casa/escritório, sessão de 15–60 minutos, frequentemente fora do horário comercial. Idade típica 30–55, presbiopia provável, paciência baixa pra jargão técnico.

**Job to be done principal:** gerenciar uma **carteira de vários sites** (não um site só). O dashboard precisa servir o steady state de 3–20 sites mais que o estado "ainda não publiquei o primeiro". O fluxo de primeiro site é onboarding, não home permanente.

## Product Purpose

A MSIA é uma plataforma SaaS brasileira que permite que pessoas sem conhecimento de programação publiquem e editem múltiplos sites e blogs, com IA assistente, em menos de 2 minutos por site. O produto inclui:

- Vitrine de templates Astro prontos pra deploy
- Wizard de publicação que automatiza GitHub + Vercel sem o usuário precisar tocar essas plataformas
- Editor de conteúdo pós-deploy (CMS embarcado em cada site)
- Academy (curso ensinando o uso do produto + temas correlatos: SEO, monetização, marketing)
- Marketplace (em construção) pra compra/venda de templates entre alunos

**Sucesso de produto:** ainda não selado pelo dono. Sugestão de tracking inicial = activation rate (% de alunos que publicam o primeiro site em 7 dias) + retention rate (% que volta no mês 2 e edita/publica de novo). Fica como decisão aberta.

## Brand Personality

**Três palavras:** amigo, didático, brasileiro.

**Tom:** caloroso sem ser infantil. Explica do zero sem fazer o usuário se sentir burro. Profissional o suficiente pra um freelancer mostrar pro cliente dele, mas sem a rigidez de ferramenta corporativa.

**Voz:** PT-BR natural, pronome "você", linguagem clara. Bom-humor brasileiro contido (não memes, não emoji decorativo, não gírias datadas). Frases curtas. Diretas. Nunca jargão técnico sem tradução imediata.

**Emoções a evocar:**
- **Confiança calma** ("você tá em boas mãos, vai dar certo")
- **Capacidade pessoal** ("eu consegui sozinho, sem ajuda de TI")
- **Orgulho de mostrar** (o painel é bonito o suficiente pra mostrar pro cliente do freelancer, ou pro filho/neto)

## Anti-references

A MSIA explicitamente NÃO pode parecer:

1. **Ferramenta dev tipo Linear / Vercel / Stripe** (dark + roxo + aurora orbs + glassmorphism + ícones Sparkles/Rocket/Zap). É o reflex de categoria mais batido em 2024–2026 e fala uma língua que o usuário leigo não entende. É exatamente o que o dashboard atual faz.
2. **Wix / Squarespace genérico** (paleta pastel + ilustrações cartoon humanas + tom over-friendly). Visual "no-code amigável" já banalizado, e a MSIA quer parecer mais adulta/sofisticada que isso.
3. **Hotmart / Kiwify de infoproduto** (verde + amarelo + CTAs gritando "compre agora" + faixas de desconto). Visual agressivo de funil que reduz percepção de qualidade.
4. **WordPress dashboard clássico** (azul-cinza denso + UI de painel datado + tipografia pequena). A MSIA é alternativa moderna a isso — não pode lembrar visualmente do velho.

**Implicação combinada:** sobra um espaço inexplorado na categoria. A direção visual deve ser **quente sem ser cartoon, brasileira sem ser clichê tropical, profissional sem ser fria, premium sem ser dev-tool**. Caminho aberto pra paleta tipo cerâmica / terracota / café-da-tarde, tipografia editorial-mas-amigável, e composição com hierarquia editorial em vez de "card-everything".

## Design Principles

1. **Vocabulário do usuário, não da plataforma.** Toda palavra técnica é uma porta fechada. "Deploy" vira "publicar", "CMS" vira "editar site", "tokens" vira "conectar suas contas", "NO AR" vira "online". Quem fala dev-tools fala pra desenvolvedores; a MSIA fala pra cabeleireira de Goiânia.

2. **Otimize pro steady state, não pro empty state.** O JTBD principal é gerenciar carteira de sites. Quem tem 5 sites precisa ver os 5 sites primeiro. O fluxo "criar primeiro site" merece um onboarding dedicado, não dominar o dashboard pra sempre.

3. **Calma > estímulo.** O usuário tá nervoso ("vou conseguir?"). O dashboard deve baixar a frequência cardíaca dele, não acelerar. Motion contido, hierarquia clara, mensagem reasseguradora ("você tá em boas mãos") em vez de pirotécnica.

4. **Confiança via craft, não via decoração.** Wow vem de detalhe bem-feito (tipografia honesta, cor com intenção, espaçamento rítmico), não de animação infinita, gradient ou glow. O freelancer mostra o painel pro cliente dele e o cliente pensa "esse cara usa ferramenta séria".

5. **Distinção é estratégia.** Em categoria saturada (AI builder PT-BR), o único caminho pra "wow" memorável é não parecer com nenhum dos quatro reflexos batidos. Comprometer com uma direção autoral, mesmo que inicialmente desconfortável, é menos arriscado que se diluir entre os clones.

## Accessibility & Inclusion

**Nível de compromisso:** WCAG AA é obrigatório. A LBI (13.146/2015) aplica a produtos digitais comerciais no Brasil; além disso, a audiência declarada (30–55 anos com presbiopia provável) faz da acessibilidade um requisito de produto, não um extra.

**Requisitos mínimos:**

- **Contraste:** texto regular ≥ 4.5:1, texto large/bold ≥ 3:1. Validar com ferramenta automatizada antes de merge.
- **Tipografia floor:** 12px (`text-xs` do Tailwind). Nenhum texto de conteúdo abaixo disso. Eyebrows uppercase com `tracking-widest` podem ir a 11px em casos específicos.
- **Touch targets:** mínimo 44×44px em todos elementos clicáveis (botões, links primários, ícones-only).
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` global desativando animações decorativas (auroraFloat, pulseGlow, shimmerSlide, scalePop, fadeInUp).
- **Ícones acessíveis:** `aria-label` em todo botão ou link ícone-only.
- **Foco visível:** outline estilizado explicitamente em todo elemento interativo, não confiar no default do browser.
- **Estrutura semântica:** landmarks (`<main>`, `<nav>`, `<aside>`, `<header>`) corretos, `lang="pt-BR"` em todo HTML root (já está em layouts), labels semânticas em forms.

**Audiência específica:** público predominante 30–55 anos, presbiopia provável após 40. Tipografia clara e contraste forte são features críticas, não acessibilidade-extra.
