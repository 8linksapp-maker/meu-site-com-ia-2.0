-- ============================================================================
-- 20260528 — FAQ seed adicional, baseado em erros REAIS dos alunos (Juvenal)
-- ============================================================================
-- Lê C:\Projects\Juvenal\erros\* — filtrou só o que afeta o aluno leigo.
-- Adiciona 14 FAQs em 4 categorias (Site, Editor, Deploy, Aulas).
-- Idempotente: NOT EXISTS na pergunta (evita duplicar se rodar 2x).
-- ============================================================================

INSERT INTO public.faq_articles (category, question, answer, display_order, is_published)
SELECT * FROM (VALUES

-- ─── SITE (publicação + atualização) ──────────────────────────────────────
('Site',
 'Editei algo no admin mas o site não atualizou. O que aconteceu?',
 'Quase sempre é uma destas 3 causas. Confira na ordem:

**1. Cache do seu navegador.** Aperta `Ctrl+F5` (Windows) ou `Cmd+Shift+R` (Mac) na página do site. Se atualizar, era só cache.

**2. Deploy em andamento.** Quando você salva no admin, a plataforma faz um commit e aciona um deploy na Vercel. Esse deploy demora ~30-60 segundos. Espera 1 minuto e recarrega.

**3. Algo travou no deploy.** Vai em **/meus-sites** → seu site → aba **Deploys**. Se o último estiver com status vermelho, clica em "Ver detalhes" pra entender o erro.

Se passou de 5 minutos e nada apareceu, vê a próxima pergunta sobre deploy travado.',
 3, true),

('Site',
 'Apareceu "site: Invalid url" no erro do deploy, o que significa?',
 'Significa que você colocou o domínio do seu site **sem o `https://`** na frente.

**Como resolver:**

1. Vai em **/meus-sites** → seu site → aba **Configurações**
2. Procura o campo **URL do site**
3. Coloca a URL completa com `https://` (ex: `https://meusite.com.br` e não só `meusite.com.br`)
4. Salva

O site refaz o deploy automaticamente em 1 minuto e volta a funcionar.',
 4, true),

('Site',
 'Meu site parou de fazer deploy do nada — salvo coisas no admin mas o site não atualiza',
 'Causa mais comum: você criou um **redirect** colando uma URL completa em vez do caminho.

**Exemplo do problema:**
- ❌ Você colocou: `https://meusite.com.br/blog/produto-x` no campo "De"
- ✅ Deveria ser apenas: `/blog/produto-x`

A Vercel rejeita o deploy quando o redirect tem formato errado, mas isso aparece silenciosamente — o site simplesmente para de atualizar.

**Como resolver:**

1. Entra no admin do seu site (ex: `meusite.com.br/admin`)
2. Vai em **Redirects** (ou Redirecionamentos)
3. Olha cada redirect e tira o `https://` + domínio. Deixa só a parte depois da `.com.br`
4. Salva

O deploy volta a funcionar em ~1 minuto.',
 5, true),

-- ─── CMS / EDITOR (nova categoria) ────────────────────────────────────────
('Editor',
 'Editei a página Sobre ou Contato mas o site não mudou',
 'Em alguns templates antigos, o editor de Sobre/Contato salvava num arquivo diferente do que a página lia.

**Bom: já corrigimos isso em todos os templates.**

Se ainda acontece com você:

1. Faz hard refresh no site (`Ctrl+F5`)
2. Se não resolveu, vai em **/meus-sites** → seu site → aba **Atualizações** e clica em **Verificar atualizações**. Aplica se houver alguma pendente
3. Se ainda persistir, fala com o suporte pelo botão **Falar com suporte** no fim desta página

O fix já está propagado em 67+ repos, mas casos pontuais podem ter passado.',
 0, true),

('Editor',
 'Categorias antigas do template aparecem no menu, como atualizar?',
 'Isso acontece porque o **menu do site** e o **gerenciador de categorias** são dois lugares diferentes — atualizar as categorias não atualiza o menu automaticamente.

**Como resolver:**

1. Entra no admin do seu site (ex: `meusite.com.br/admin`)
2. Vai em **Menu** (ou Navegação)
3. Procura o item "Blog" ou "Categorias" no menu
4. Edita os sub-itens removendo as categorias antigas e adicionando as suas
5. Salva

Pronto — em ~1 minuto o menu do site reflete o que você cadastrou.',
 1, true),

('Editor',
 'Os botões de compartilhar artigo levam pra Home, não funcionam',
 'Esse bug existia em templates antigos do TechMaster. **Já foi corrigido em todos os repos** afetados.

**Se ainda acontece com você:**

1. Vai em **/meus-sites** → seu site → aba **Atualizações**
2. Clica em **Verificar atualizações**
3. Se aparecer atualização disponível, clica em **Aplicar**

Depois disso, os botões de Facebook/Twitter/WhatsApp/LinkedIn vão compartilhar a URL real do post.',
 2, true),

('Editor',
 'Não consigo subir imagem — nada acontece quando clico em upload',
 'Esse era um bug do template iTechie (race condition no upload). **Já foi corrigido em todos os repos** afetados.

**Se ainda acontece com você:**

1. Vai em **/meus-sites** → seu site → aba **Atualizações** e aplica a última versão
2. Se ainda não funcionar:
   - Tenta com um navegador diferente (Chrome se estava no Firefox, ou vice-versa)
   - Confira se a imagem tem menos de **5MB**
   - Tenta com formato **JPG ou PNG** (alguns formatos especiais não rolam)
3. Se nada resolver, abre ticket no **Suporte**',
 3, true),

('Editor',
 'Subi um favicon novo mas o ícone sumiu / aparece quebrado',
 'Isso acontecia quando o upload do favicon falhava silenciosamente e ficava com uma URL temporária inválida no banco. **Já foi corrigido na plataforma.**

**Se ainda persistir com você:**

1. Entra no admin do seu site
2. Vai em **Configurações** → **Favicon**
3. Clica em **Remover** pra limpar o atual
4. Sobe o novo favicon (PNG ou ICO de 32×32 ou 64×64 funciona melhor)
5. Salva e espera 1 minuto pro deploy
6. Hard refresh (`Ctrl+F5`) — porque o navegador cacheia favicon agressivamente

Se mesmo assim não aparecer, tenta abrir o site em uma aba anônima — confirma se é só cache do seu navegador.',
 4, true),

-- ─── DEPLOY (nova categoria) ──────────────────────────────────────────────
('Deploy',
 'Apertei "Fazer Deploy" várias vezes mas nada acontece',
 'Geralmente é um destes problemas:

**1. Sua sessão expirou.** Sai da plataforma, entra de novo, tenta de novo o deploy.

**2. Seu vercel.json tá com erro silencioso** (caso de quem criou redirects incorretos). A Vercel aceita seu pedido (HTTP 201 PENDING) mas nunca executa porque rejeita a configuração. Vai em **Redirects** no admin do seu site e olha se tem algum com formato estranho (com `https://`, com `(.*)`, com `/?` no fim) — esses precisam virar caminho simples (ex: `/blog/post`).

**3. Vercel rate limit (Plano Hobby).** Se você fez muitos deploys hoje, atingiu o limite de 100/dia. Espera ~24h e tenta de novo. Ou faça upgrade pra Pro se for usar comercialmente.

Se nenhuma resolve, abre ticket no **Suporte** com o nome do seu site.',
 0, true),

('Deploy',
 'Erro "Login Connection" na Vercel ao publicar pela primeira vez',
 'Mensagem completa costuma ser: *"Failed to link. You need to add a Login Connection to your GitHub account first"*.

Significa que sua conta na Vercel não está conectada ao GitHub como método de login.

**Como resolver:**

1. Entra em [vercel.com/account/login-connections](https://vercel.com/account/login-connections)
2. Clica em **Connect with GitHub**
3. Autoriza a conexão
4. Volta na MSIA e clica em **Fazer Deploy** de novo

Pronto — a partir daí todos os seus deploys funcionam normalmente.',
 1, true),

('Deploy',
 'Apareceu "Token GitHub expirado" — preciso atualizar',
 'Tokens do GitHub (fine-grained) têm validade limitada (geralmente 1 ano). Quando expiram, deploy e atualizações param de funcionar.

**Como gerar um token novo:**

1. Entra em [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
2. Clica em **Generate new token** → **Fine-grained personal access token**
3. Coloca:
   - **Token name:** MSIA (ou outro nome de sua escolha)
   - **Expiration:** 1 year (ou "No expiration" se preferir)
   - **Repository access:** All repositories
   - **Permissions** → **Repository permissions** → **Contents: Read and write**
4. Clica em **Generate token** e copia o token (começa com `github_pat_`)
5. Volta na MSIA → **/configuracoes** → aba **Integração** → cola o novo token e salva',
 2, true),

-- ─── DOMÍNIO (categoria existente, mais 2 perguntas) ─────────────────────
('Domínio',
 'Por que meu post tá em /blog/produto-x em vez de só /produto-x?',
 'Por padrão, novos sites já vêm com **URL limpa** (sem o `/blog/`).

Se o seu ainda usa `/blog/`, é porque ele foi criado antes dessa mudança ou você ativou o prefixo manualmente.

**Como mudar pra URL limpa:**

1. Entra no admin do seu site
2. Vai em **Configurações** → **URLs e SEO**
3. Em **Prefixo dos posts**, deixa o campo vazio (ou seleciona "URL limpa")
4. Salva

A plataforma faz automaticamente os redirects 301 dos posts antigos (`/blog/X → /X`), então quem tinha link antigo continua chegando no post certo — preservando o SEO.',
 3, true),

('Domínio',
 'Criei um redirect mas ele tá dando erro de "invalid pattern"',
 'A Vercel é exigente com formato de redirects. Causas comuns:

**❌ Errado:**
- `https://meusite.com.br/blog/x` (URL completa)
- `/sample-page/?` (interrogação no fim)
- `/author/(.*)` (regex puro)

**✅ Certo:**
- `/blog/x` (só o caminho)
- `/sample-page` (sem interrogação)
- `/author/:rest*` (named param)

A plataforma agora **sanitiza automaticamente** a maioria desses casos. Se ainda assim seu redirect quebrar:

1. Edita removendo `https://` + nome do domínio (deixa só do `/` em diante)
2. Tira `?` ou `*` ou `()` se houver
3. Se quer "qualquer coisa depois de", usa `:rest*` (ex: `/category/:rest*`)
4. Salva

Site faz deploy de novo em ~1 minuto.',
 4, true),

-- ─── AULAS (nova categoria) ───────────────────────────────────────────────
('Aulas',
 'Vídeo da aula tá travando ou ficando em tela preta',
 'Os vídeos das aulas ficam num servidor (Backblaze) que pode ter latência maior no Brasil dependendo do horário e conexão.

**Como contornar enquanto não migramos pra CDN:**

1. **Espera 5-10 segundos sem mexer.** O vídeo geralmente desbloqueia depois do buffer inicial
2. **Pausa, espera 5s, dá play de novo** — força o navegador a tentar de novo
3. **Recarrega a página** (`F5`) e tenta de novo
4. **Tenta em outro navegador** — Chrome geralmente vai melhor que Firefox/Safari aqui
5. **Diminui qualidade** se o player tiver essa opção
6. **Faz teste de conexão** em [fast.com](https://fast.com) — pra streaming HD, ideal é ter pelo menos 10 Mbps estável

Se persistir, deixa um comentário na aula ou abre ticket no **Suporte** com o nome da aula e horário aproximado.',
 0, true)

) AS new_faqs(category, question, answer, display_order, is_published)
WHERE NOT EXISTS (
    SELECT 1 FROM public.faq_articles existing
    WHERE existing.question = new_faqs.question
);

-- Verificação
SELECT category, COUNT(*) AS perguntas
FROM public.faq_articles
GROUP BY category
ORDER BY category;
