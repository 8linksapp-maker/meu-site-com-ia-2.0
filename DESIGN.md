---
name: MSIA · Direção Café-da-Tarde
description: Editorial brasileiro sóbrio — biblioteca acolhedora de quem trabalha com cuidado, com miolo tech-honesto.
colors:
  papel-craft: "oklch(98% 0.005 80)"
  cream-surface: "oklch(99% 0.003 80)"
  cream-elevated: "oklch(96% 0.008 70)"
  carvao-quente: "oklch(20% 0.015 50)"
  cafe-medio: "oklch(45% 0.020 60)"
  cafe-cinza-quente: "oklch(60% 0.020 70)"
  borda-cafe: "oklch(92% 0.010 70)"
  coral-terra: "oklch(45% 0.080 35)"
  terracota-profundo: "oklch(35% 0.085 30)"
  coral-wash: "oklch(88% 0.025 35)"
  verde-oliva: "oklch(50% 0.060 145)"
  mostarda-amber: "oklch(68% 0.110 80)"
  vermelho-tijolo: "oklch(48% 0.130 28)"
typography:
  display:
    fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif"
    fontSize: "clamp(1.5rem, 3vw, 1.875rem)"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Fraunces', 'DM Serif Display', Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "'Karla', 'Inter', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "'Karla', 'Inter', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Karla', 'Inter', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  eyebrow:
    fontFamily: "'Karla', 'Inter', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "0.12em"
  mono:
    fontFamily: "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  pequeno: "8px"
  medio: "12px"
  grande: "16px"
  pleno: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.coral-terra}"
    textColor: "{colors.papel-craft}"
    typography: "{typography.title}"
    rounded: "{rounded.medio}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.terracota-profundo}"
    textColor: "{colors.papel-craft}"
  button-secondary:
    backgroundColor: "{colors.cream-elevated}"
    textColor: "{colors.carvao-quente}"
    typography: "{typography.title}"
    rounded: "{rounded.medio}"
    padding: "12px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.coral-wash}"
    textColor: "{colors.terracota-profundo}"
  button-link:
    textColor: "{colors.coral-terra}"
    typography: "{typography.title}"
  button-destructive:
    backgroundColor: "{colors.vermelho-tijolo}"
    textColor: "{colors.papel-craft}"
    typography: "{typography.title}"
    rounded: "{rounded.medio}"
    padding: "12px 20px"
  card:
    backgroundColor: "{colors.cream-surface}"
    rounded: "{rounded.medio}"
    padding: "16px"
  chip-status-online:
    backgroundColor: "{colors.verde-oliva}"
    textColor: "{colors.papel-craft}"
    typography: "{typography.eyebrow}"
    rounded: "{rounded.pleno}"
    padding: "4px 10px"
  chip-user-avatar:
    backgroundColor: "{colors.coral-terra}"
    textColor: "{colors.papel-craft}"
    typography: "{typography.title}"
    rounded: "{rounded.pleno}"
    size: "40px"
  fab-suporte:
    backgroundColor: "{colors.carvao-quente}"
    textColor: "{colors.papel-craft}"
    typography: "{typography.title}"
    rounded: "{rounded.pleno}"
    padding: "12px 20px"
  input-text:
    backgroundColor: "{colors.cream-surface}"
    textColor: "{colors.carvao-quente}"
    typography: "{typography.body}"
    rounded: "{rounded.medio}"
    padding: "12px 16px"
  sidebar-item:
    backgroundColor: "{colors.cream-elevated}"
    textColor: "{colors.cafe-medio}"
    typography: "{typography.title}"
    rounded: "{rounded.pequeno}"
    padding: "10px 14px"
  sidebar-item-active:
    backgroundColor: "{colors.cream-surface}"
    textColor: "{colors.coral-terra}"
    typography: "{typography.title}"
    rounded: "{rounded.pequeno}"
    padding: "10px 14px"
---

# Design System: MSIA · Direção Café-da-Tarde

## 1. Overview: A Biblioteca Acolhedora

**Creative North Star: "A Biblioteca Acolhedora — ferramenta de quem trabalha com cuidado, sem fazer barulho, com miolo tech-honesto."**

A MSIA é uma ferramenta brasileira leiga de criação de sites com IA. A direção visual rejeita o reflex saturado da categoria (dev-tool roxo-aurora-dark de Linear/Vercel/Stripe, no-code pastel cartoon de Wix/Squarespace, infoproduto verde-amarelo agressivo de Hotmart/Kiwify, dashboard azul-cinza datado de WordPress) e ocupa o espaço inexplorado: **editorial sofisticado calmo, em paleta off-white warm com terracota seco discreto, tipografia serif acentual presente mas atenuada, sans humanista carregando todo o resto.**

O sistema se comporta como **uma capa de revista que esconde um dashboard tech-honesto**: a casca é editorial (Fraunces serif em h1/h2, paleta café-da-tarde, sidebar enxuta de 3 itens, hero compacto sem decoração), o miolo serve a operação real (números reais em tabular-nums servindo job, domínios em JetBrains Mono, status semânticos verde-oliva, peak-end pessoal puxando dado do user em vez de texto genérico). Onde a Padaria (versão anterior rejeitada) errou foi em saturar a paleta (cream amarelado forte, coral vibrante, ornamento azulejaria centralizado), Café-da-Tarde corrige isso: cream off-white quase neutro, terracota seco profundo, zero ornamento decorativo.

**Key Characteristics:**
- Paleta cream off-white quase neutra (não amarelada) + terracota seco profundo como única cor de marca dominante
- Tipografia editorial atenuada: Fraunces serif **apenas em h1 e h2**, weight 400 não bold; Karla sans carrega TODO resto
- Hierarquia editorial sem ornamento: dividers hairline, contraste por surface, zero decoração visual
- Sidebar enxuta (3 itens core + utilitário rodapé) seguindo Linear/Vercel/Plain pattern
- FAB Suporte canto inferior direito como elemento permanente (Intercom-style)
- Peak-end pessoal: dados reais do user (próxima aula, último site) substituem texto genérico
- Motion restrito a state (200ms ease-out); zero animação infinita ou decorativa; reduced-motion respeitado globalmente

## 2. Colors: A Paleta Café-da-Tarde

Cream off-white warm como neutral dominante (mas SEM amarelo saturado — apenas hint de warmth), terracota seco profundo como Committed brand carregando elementos pontuais (CTA primário, item ativo de nav, chip avatar). Verde-musgo e mostarda-amber como accents semânticos restritos. Carvão warm em vez de preto absoluto pra textos.

### Primary
- **Coral-Terra** (`oklch(45% 0.080 35)` · `≈ #8B4A36`): cor de marca dominante. Terracota seco profundo (não coral vibrante — Padaria errou ao usar saturação alta). Aparece em: CTA primário, label de item ativo na sidebar, chip user avatar do header, links editoriais inline, ícones de seção. **Restrita** — não usar em backgrounds grandes, nem em decoração.
- **Terracota-Profundo** (`oklch(35% 0.085 30)` · `≈ #6B3624`): variante deep usada apenas em hover de CTA primário e em hover de links.

### Secondary
- **Verde-Oliva** (`oklch(50% 0.060 145)` · `≈ #6F7D4C`): exclusivamente semântico — chip "Online" dos sites publicados, check icon de step concluído no onboarding, mensagens de sucesso. **Nunca decorativo.**
- **Mostarda-Amber** (`oklch(68% 0.110 80)` · `≈ #C49237`): accent raro, **uma única vez por tela** em destaque pontual (badge "Novo", aviso suave). Quebra o terra-cream com 1 ponto de surpresa.

### Tertiary
- **Vermelho-Tijolo** (`oklch(48% 0.130 28)` · `≈ #A04127`): estado "atenção" / "erro" / ação destrutiva. Mensagens de erro, botão de logout, deletar site. Coerente tonal com coral-terra mas mais escuro e saturado.

### Neutral
- **Papel-Craft** (`oklch(98% 0.005 80)` · `≈ #F9F7F2`): background da página inteira. Off-white com hint de warmth quase imperceptível — papel de envelope claro, **nunca cream-amarelado saturado** (correção crítica do erro Padaria).
- **Cream-Surface** (`oklch(99% 0.003 80)` · `≈ #FCFBF8`): surface de cards, inputs, items ativos de nav. Levemente mais claro que papel-craft, contraste sutil sem border.
- **Cream-Elevated** (`oklch(96% 0.008 70)` · `≈ #EFEBE2`): surface alternativa pra sidebar/dropdown panel — cooler-warm que conteúdo, separa do principal **sem dark mode**.
- **Carvão-Quente** (`oklch(20% 0.015 50)` · `≈ #2D2419`): texto primário, headings, ícones em alta hierarquia. **Nunca preto absoluto.**
- **Café-Médio** (`oklch(45% 0.020 60)` · `≈ #695A4A`): texto secundário, subtitles, body de descrições.
- **Café-Cinza-Quente** (`oklch(60% 0.020 70)` · `≈ #9A8B79`): texto muted, helper, timestamps, eyebrows de seção, items de nav default.
- **Borda-Café** (`oklch(92% 0.010 70)` · `≈ #E6DFD2`): borders sutis. **1px máximo, nunca mais grosso**, sempre hairline. Dividers de seção, borders de cards e inputs.

**The Sem-Branco-Sem-Preto Rule.** `#FFFFFF` e `#000000` são **proibidos** em todo o sistema, incluindo sombras (`rgba(0,0,0,X)` proibido). Brancos vão pra cream-surface ou papel-craft; pretos vão pra carvão-quente. Sombras usam `rgba(80, 40, 20, X)` (terra escuro). O sistema inteiro fica warm-tinted sem nenhum elemento frio destoando.

**The Coral-Terra é Voz Única Rule.** Coral-terra é a **única** cor saturada que aparece consistentemente. CTA primário, chip avatar, label de item ativo, links editoriais. Em qualquer tela, coral-terra não pode aparecer em mais de 2-3 contextos distintos. Múltiplos blocos saturados na mesma tela são proibidos — quebra a hierarquia editorial e desfaz a personalidade "calma > estímulo".

**The Cream-Sem-Amarelo Rule** (correção do erro Padaria). Papel-craft tem chroma **0.005** (quase neutro). Versões anteriores com chroma 0.015+ ficaram visivelmente amareladas e foram rejeitadas pelo dono. Mantenha sempre baixa saturação em neutrals warm — warmth vem do hue (80=amarelo-quente), não da chroma.

## 3. Typography

**Display Font:** `Fraunces` (variable, Google Fonts grátis) com fallback `DM Serif Display`, `Georgia`, `serif`.
**Body Font:** `Karla` (Google Fonts grátis) com fallback `Inter`, `system-ui`, `sans-serif`.
**Mono Font:** `JetBrains Mono` com fallback `IBM Plex Mono`, `ui-monospace`.

**Character:** Fraunces dá personalidade editorial **atenuada** — usada em h1/h2 apenas, weight 400 (normal), tracking apertado (-0.02em). Karla é sans humanista calorosa que carrega TODO o restante: botões, labels, nav items, body. Mono pra dados (domínios, IDs). O par soa **biblioteca de quem trabalha com cuidado**: confiante sem ser estridente.

### Hierarchy

- **Display** (Fraunces, weight **400**, `clamp(1.5rem, 3vw, 1.875rem)` ≈ 24-30px, `1.15` line-height, tracking `-0.02em`): apenas no `<h1>` de hero ou home de página. **Atenuada** — não usar weight 500+ (Padaria errou ao usar weight 500+text-[2.5rem], soou pesado demais).
- **Headline** (Fraunces, weight 400, `1.5rem` = 24px, `1.2` line, tracking `-0.015em`): títulos de seção dentro de página ("Meus sites", "Comece um novo site"). Sempre Fraunces, nunca sans.
- **Title** (Karla, weight 600, `1rem` = 16px, `1.4` line): labels de botão, nav items, título de card individual. **NUNCA Fraunces aqui** — serif em UI utilitária é AI slop.
- **Body** (Karla, weight 400, `1rem` = 16px, `1.5` line): texto corrido, subtitles, descrições.
- **Label** (Karla, weight 500, `0.8125rem` = 13px, `1.4` line): sublabels, helper, status descriptive.
- **Eyebrow** (Karla, weight 700, `0.75rem` = 12px uppercase, `1.3` line, tracking `0.12em`): rótulo categórico acima de headlines ("BÔNUS INCLUÍDO", "SUA PRÓXIMA AULA"). **Floor absoluto de 12px** — nada de conteúdo abaixo.
- **Mono** (JetBrains Mono, weight 400, `0.8125rem` = 13px): apenas pra dados estruturados — domínios (`cafedabela.com`), IDs, fragmentos de URL, valores tabulares. Nunca prosa.

### Named Rules

**The Floor-12 Rule.** Nenhum texto de conteúdo cai abaixo de 12px. Eyebrows uppercase com tracking-widest podem ir a 11px **apenas** em uso puramente categórico onde a leitura é secundária. Texto < 12px em sublabels, descrições ou body é proibido — destrói a11y para audiência 40+ (público MSIA tem presbiopia provável).

**The Serif-Pra-Voz Rule.** Fraunces aparece **só em headings** (Display h1 + Headline h2). Botões, labels, nav, sublabels, body, tudo Karla. Display serif em UI utilitária é AI slop clássico.

**The Fraunces-Atenuada Rule** (correção do erro Padaria). Fraunces em h1 usa weight **400** (não 500+), tamanho clamp(1.5rem, 3vw, 1.875rem) = 24-30px (não 40px+), tracking -0.02em. Hero pesado demais soou over-editorial e foi rejeitado. Atenuada = presença sem dominar.

**The Tabular-Nums Rule.** Toda métrica numérica (sites publicados, % progresso, contagem de aulas) usa `font-variant-numeric: tabular-nums` para evitar shift quando valores mudam.

## 4. Elevation

Sistema **majoritariamente flat com tonal layering warm**. Profundidade vem de surface contrast (papel-craft → cream-surface → cream-elevated), não de sombras. Sombras existem apenas como **resposta a estado interativo** (hover) ou em FAB suporte (que precisa flutuar visualmente). Nenhum elemento decorativo ganha sombra.

### Shadow Vocabulary

- **Shadow-Sutil-Quente** (`box-shadow: 0 1px 2px 0 rgba(80, 40, 20, 0.04)`): elevação 1, default de cards interativos (sites, templates). Sombra cor-terra (não preto puro) pra coerência warm.
- **Shadow-Hover-Quente** (`box-shadow: 0 6px 16px -4px rgba(80, 40, 20, 0.10)`): elevação 2, hover de cards. Transição `200ms cubic-bezier(0.22, 1, 0.36, 1)`.
- **Shadow-FAB** (`box-shadow: 0 10px 25px -5px rgba(80, 40, 20, 0.25), 0 4px 6px -2px rgba(80, 40, 20, 0.10)`): elevação 3, exclusiva do FAB Suporte. Mais pronunciada porque precisa parecer flutuante sobre tudo.

### Named Rules

**The Flat-By-Default Rule.** Items de nav, stats inline, inputs, badges, sections — todos **flat** em rest. Sombra aparece **só em hover de cards interativos ou no FAB persistente**. Hero não tem sombra (rejeitado: card-hero Padaria com shadow-hero-quente ficou pesado demais).

**The Sombra-é-Terra Rule.** Toda sombra usa `rgba(80, 40, 20, X)` (terra escuro com alpha variável), **nunca** `rgba(0, 0, 0, X)`. Sombras pretas neutras em paleta warm destoam visualmente — terra mantém coerência.

## 5. Components

### Buttons

**Caractere:** confiantes, calorosos, peso suficiente pra parecer clicáveis sem decoração extra. Zero gradient, zero glow, zero shimmer, zero pulse infinito. Hover é mudança de tom + leve elevação, nunca animação loopada.

- **Shape:** `rounded-medio` (12px). Mais arredondado que enterprise SaaS, menos que pill cartoonish.
- **Primary:** background `coral-terra`, text `papel-craft`, padding `12-14px 20-24px`, weight 600. Hover: background `terracota-profundo`. Foco: outline 2px `coral-terra` offset 2px. **min-height: 44px** (touch target).
- **Secondary:** background `cream-elevated` (não cream-surface — cooler contraste de papel-craft), text `carvao-quente`, border 1px `borda-cafe`. Hover: bg `coral-wash`, text `terracota-profundo`.
- **Link inline:** color `coral-terra`, weight 600 ou 500, sem fundo. Hover: `terracota-profundo`. Pode ter sublinhado editorial com `text-decoration-skip-ink: auto`.
- **Destructive:** background `vermelho-tijolo`, text `papel-craft`. Apenas para ações destrutivas reais (deletar site, logout).
- **Touch target floor:** 44×44px em todos elementos clicáveis. Botões compactos compensam com `min-height: 44px`.

**The Sem-Pulse Rule.** Botões **NUNCA** têm `pulseGlow`, `shimmer`, `animate-ping`, `animate-pulse` ou qualquer animação infinita. Atenção via hierarquia visual (cor, tamanho, posição), nunca via motion.

### Cards

**Caractere:** envelope de papel discreto. Surface levemente elevada de `papel-craft` (background) para `cream-surface` (card), border invisível ou hairline `borda-café`, cantos arredondados moderados.

- **Card-Site** / **Card-Template** (galeria principal): `cream-surface`, `rounded-medio` (12px), `padding 16px`, `shadow-sutil-quente`. Hover: `shadow-hover-quente`. **Zero `scale-110`** — só sombra muda (decisão V1: hover sutil, não brincalhão).
- **Card-Section** (Academy banner, onboarding checklist, empty states): `cream-surface`, `rounded-medio` (12px), `padding 20-24px`, flat (sem sombra default).

**The Card-Com-Restrição Rule** (correção do erro herdado). Stats em cards **proibido**. Quick actions em cards **proibido**. Apenas: cards de items reais (sites, templates) e cards de section (banners, empty states, onboarding). Tudo mais é prosa solta com hierarquia editorial.

### Chips

- **Chip-Status-Online** (badge "Online" sites publicados): bg `verde-oliva`, text `papel-craft`, eyebrow type uppercase, `rounded-pleno`, padding `4px 10px`, com small dot circular interno `papel-craft`.
- **Chip-Status-Construção** (sites em deploy/erro): bg `mostarda-amber`, text `carvao-quente`.
- **Chip-User-Avatar** (header da página, **substitui Settings cog**): círculo `40×40px`, bg `coral-terra`, text `papel-craft` em Karla weight 600, **iniciais reais do usuário** centralizadas (script puxa de `user_metadata.full_name` → primeiras letras, fallback email).
- **Chip-Eyebrow** (labels "Novo", "Em breve", "Live"): bg contextual (verde-oliva pra Novo, cream-elevated pra Em breve discreto, vermelho-tijolo pra Live), eyebrow type, `rounded-pleno`.

### Inputs / Fields

- **Input-Text:** `cream-surface`, `rounded-medio` (12px), border `1px borda-cafe`, padding `12px 16px`, body type Karla. Focus: border vira `coral-terra` 2px, outline-offset 0. **Sem glow shadow, sem ring colorido** — só border muda.
- **Error state:** border `vermelho-tijolo` 2px + helper text abaixo em `vermelho-tijolo` weight 500.
- **Disabled:** opacity `0.6`, cursor `not-allowed`, sem mudança de cor (preserva paleta).

### Navigation

**Sidebar (desktop, w-64):**
- Background: `cream-elevated` (cooler-warm que conteúdo, sem dark mode).
- **Conteúdo: SOMENTE itens que servem JTBD identificado.** Para MSIA hoje: Visão Geral + Meus sites + Academy (3 itens core) + Configurações no footer como utilitário. **Proibido** poluir com itens "Em breve", routes secundárias, links de marketing. Items secundários acessíveis via routes diretas ou sub-pages.
- Items: padding `10-12px 14px`, Karla weight 500, color `cafe-medio`.
- Hover: bg `coral-wash`, text `terracota-profundo`.
- Active: bg `cream-surface`, text `coral-terra`, weight 600.
- Section dividers (raros — usar só se 4+ itens): eyebrow `cafe-cinza-quente` uppercase + linha hairline `borda-cafe`.
- Footer da sidebar: utilitários discretos (Configurações), texto menor (text-xs) cafe-cinza-quente, separado por border-t.
- Mobile: drawer com overlay `bg-carvao-quente/40` (não preto puro), transição 200ms.

**Header:**
- Background: `papel-craft` (continuidade com a página). Border-bottom `1px borda-cafe`.
- Title: Headline Fraunces 24px `carvao-quente`.
- Right: **Chip-User-Avatar** (não Settings cog). Dropdown abre Conta, Integrações, Admin (condicional), Sair.
- Sem border decorativo, sem shadow.

### FAB (Floating Action Button) — Signature Component

**Caractere:** o assistente permanente da plataforma. Posicionado canto inferior direito `fixed bottom-6 right-6 z-40`, **sempre visível em todas pages do dashboard**, **substitui** o link "Suporte" no nav principal.

- Shape: pill (`rounded-pleno`)
- Bg default: `carvao-quente` (escuro warm pra contraste alto sobre `papel-craft`)
- Hover: bg vira `coral-terra` (sinaliza ação primária)
- Conteúdo: ícone `LifeBuoy` (16px) + label "Ajuda" (Karla 14px weight 600)
- Mobile: label oculto (`hidden sm:inline`), só ícone
- Shadow: `shadow-fab` warm-terra forte
- Hover motion: `hover:-translate-y-0.5` (sobe 2px sutil)
- `min-height: 48px`

### Hero Block (Pattern do dashboard)

**Caractere:** texto solto editorial sobre o body bg, sem card wrapper, sem ornamento.

- **Não usar card cream-surface** (correção do erro Padaria). Texto direto sobre `papel-craft`.
- **Estrutura:** h1 Display (Fraunces 24-30px weight 400) + subtitle Body (Karla 14-16px `cafe-medio` com **dado real do usuário** quando disponível) + CTA Primary alinhado direita
- **Padding:** `pt-2 pb-0 md:pt-4` (compacto — hero não respira mais que necessário)
- **Subtitle deve carregar peak-end pessoal:** "Você tem 3 sites no ar" / "Sua próxima aula é X" — **nunca** "Bem-vindo de volta" sem contexto
- **1 CTA único** (não 2). Secondary CTA do hero anterior foi removido por diluição.

### Academy Banner Pattern — Peak-end Pessoal

**Caractere:** banner full-width footer com dado real puxado do user.

- Surface: `cream-surface` border `borda-cafe` `rounded-medio` padding `20-24px`
- Layout: flex row md+, ícone (GraduationCap em chip `coral-wash` 48px round) + texto (eyebrow contextual + h3 Headline Fraunces + subtitle Label tabular-nums) + progress bar opcional + CTA
- **Eyebrow muda conforme estado:** "SUA PRÓXIMA AULA" (em progresso) / "COMECE PELA PRIMEIRA AULA" (zero) / "CURSO CONCLUÍDO" (100%) / "BÔNUS INCLUÍDO" (fallback)
- **h3 mostra título REAL** da próxima aula (puxado da query `lessons` ordenado por `display_order`, filtrado por `user_lessons_progress.is_completed`)
- CTA contextual: "Retomar aula" / "Começar curso" / "Revisar aulas"

**The Peak-End Pessoal Rule.** Sempre que possível, substituir texto genérico ("Bem-vindo!", "Plataforma Ativa") por dado específico do user (nome do site recém-publicado, título da próxima aula, contagem real de visitas). É o miolo tech-honesto dentro da casca editorial. Decoração que finge ser dado é AI slop.

## 6. Do's and Don'ts

### Do:

- **Do** usar `papel-craft` (`oklch(98% 0.005 80)`) como background da página. Off-white quase neutro, **não amarelado**.
- **Do** texturizar texto com `carvao-quente` (`oklch(20% 0.015 50)`) em vez de `#000`. Toda neutralidade é warm-tinted.
- **Do** restringir `coral-terra` (terracota seco) ao CTA primário, item ativo de nav, chip-avatar e links editoriais inline. Coral-terra é voz única.
- **Do** floor de tipografia em 12px. Eyebrows com tracking-widest podem ir a 11px **só** em uso categórico.
- **Do** usar Fraunces **só em h1 e h2** com weight 400 atenuado. Tudo mais é Karla.
- **Do** sidebar enxuta com **somente itens JTBD-validados** (Visão Geral + Meus sites + Academy + Configurações no footer). Items secundários acessíveis via routes diretas.
- **Do** Chip User Avatar no header (iniciais coral-terra) substituindo Settings cog.
- **Do** FAB Suporte canto inferior direito como pattern permanente em todas pages autenticadas.
- **Do** peak-end pessoal — dado real do user (próxima aula, último site, número honesto) substitui texto genérico.
- **Do** respeitar `prefers-reduced-motion: reduce` globalmente em `global.css`.
- **Do** vocabulário PT-BR leigo: "publicar" não "deploy", "editar site" não "CMS", "online" não "NO AR", "conectar suas contas" não "tokens".
- **Do** sombras `rgba(80, 40, 20, X)` (terra alpha), nunca `rgba(0, 0, 0, X)`.
- **Do** touch targets ≥ 44×44px em todos elementos clicáveis.
- **Do** mono `JetBrains Mono` para dados estruturados (domínios, IDs, fragmentos de URL).

### Don't:

- **Don't** usar dark mode em nenhuma surface autenticada. PRODUCT.md anti-ref #1: *"Ferramenta dev tipo Linear / Vercel / Stripe (dark + roxo + aurora orbs + glassmorphism)"*.
- **Don't** usar `#7c3aed` (roxo) ou qualquer roxo/violeta. Cor da estética dev-tool batida. Toda referência hardcoded de `#7c3aed` no código deve virar `coral-terra` ou `cream-surface` conforme o papel.
- **Don't** usar aurora orbs, radial gradients decorativos, dot grids decorativos, glassmorphism, shimmer animado, pulseGlow infinito, animate-ping fora de loaders ativos.
- **Don't** usar paleta pastel ou ilustrações cartoon. PRODUCT.md anti-ref #2: *"Wix / Squarespace genérico"*.
- **Don't** usar verde-amarelo agressivo de infoproduto. PRODUCT.md anti-ref #3: *"Hotmart / Kiwify"*. Mostarda-amber é accent pontual; verde-oliva é semântico.
- **Don't** usar azul-cinza denso com tipografia pequena. PRODUCT.md anti-ref #4: *"WordPress"*. Café-da-Tarde **não tem nenhum azul**.
- **Don't** card-everything. Stats em cards é proibido. Quick actions em cards é proibido. Apenas: cards de items reais (sites, templates) e cards de section (banners, empty states, onboarding).
- **Don't** mais de uma surface saturada por tela. Coral-terra no CTA hero **OU** coral-terra em bloco grande, não ambos com mesma força.
- **Don't** Fraunces em buttons, labels, nav items, sublabels. Serif display em UI utilitária é AI slop clássico.
- **Don't** Fraunces em hero com weight 500+ ou tamanho 40px+. Atenuada = peso 400 + clamp(1.5rem, 3vw, 1.875rem). Hero pesado demais foi rejeitado (Padaria).
- **Don't** cream-paper com chroma > 0.008. Cream amarelado saturado foi rejeitado (Padaria). Manter chroma baixa em neutrals warm.
- **Don't** sombra preta neutra (`rgba(0, 0, 0, X)`). Sempre terra (`rgba(80, 40, 20, X)`).
- **Don't** em-dashes (`—`) em copy PT-BR. Brasileiro escreve com vírgula, dois-pontos, parênteses ou ponto-e-vírgula. Em-dash é tell de AI.
- **Don't** sidebar com mais de 5 itens visíveis no top-level. Items secundários acessíveis via sub-pages ou menu da conta.
- **Don't** stats grid no dashboard home sem servir JTBD identificado. Decoração numérica = AI slop.
- **Don't** quick actions card no dashboard home. Redundante com sidebar + hero CTA + FAB.
- **Don't** mais de 1 entry point visível pro mesmo destino na home. Hero CTA OU sidebar item, não os dois com mesma força.
- **Don't** texto genérico no hero ("Bem-vindo de volta!", "Plataforma Ativa"). Sempre peak-end pessoal com dado real do user.

---

**Audit tests** (uma linha cada, para checar drift em código futuro):

- *"Se o painel parece com Linear/Vercel/Stripe, paleta errada — sobra dark, falta cream-paper warm."*
- *"Se o cream do bg aparece visivelmente amarelado, chroma alta demais — abaixar para 0.005."*
- *"Se o user leigo lê 'deploy', 'tokens', 'CMS' ou 'NO AR' na tela, vocabulário falhou."*
- *"Se há mais de uma animação infinita por tela, motion overload — cortar pra zero."*
- *"Se uma label tem 8/9/10/11px, está abaixo do floor-12 — sobe pra 12px+."*
- *"Se Fraunces aparece em botão, label de nav ou sublabel, serif fora do lugar — trocar pra Karla."*
- *"Se a sidebar tem mais de 5 itens visíveis no top-level, IA poluída — mover secundários pra rotas diretas ou menu da conta."*
- *"Se o hero tem aurora orb, gradient ou animação infinita, decoração herdada — remover."*
- *"Se o stats grid aparece no home, decoração herdada — remover (não serve JTBD)."*
- *"Se o subtitle do hero não tem dado real do user, peak-end ausente — substituir genérico por dado específico."*
