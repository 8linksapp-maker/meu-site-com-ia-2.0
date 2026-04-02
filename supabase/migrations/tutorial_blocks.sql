-- Tutorial Blocks: conteúdo educativo inline gerenciado pelo admin
-- Rodar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tutorial_blocks (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  title       text NOT NULL,
  video_url   text,
  video_poster text,
  steps       jsonb DEFAULT '[]'::jsonb,
  images      jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- RLS: leitura pública (usuários logados), escrita só admin
ALTER TABLE tutorial_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutorial_blocks_read_all" ON tutorial_blocks
  FOR SELECT USING (true);

CREATE POLICY "tutorial_blocks_admin_write" ON tutorial_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seeds iniciais com os dois tutoriais do ConfigSettings
INSERT INTO tutorial_blocks (slug, title, video_url, steps, images) VALUES
(
  'github-token',
  'Como criar seu token do GitHub',
  'https://www.youtube.com/embed/kHkQnuYzwoo',
  '[
    "Acesse <a href=\"https://github.com/settings/personal-access-tokens/new\" target=\"_blank\">github.com/settings/personal-access-tokens/new</a>",
    "Em <strong>Token name</strong>, coloque <code>meu-site-com-ia</code>. Em <strong>Expiration</strong>, selecione <strong>No expiration</strong>.",
    "Em <strong>Repository access</strong>, selecione <strong>All repositories</strong>.",
    "Em <strong>Permissions → Repository</strong>, ative: <strong>Contents</strong> (Read and write), <strong>Metadata</strong> (Read-only), <strong>Administration</strong> (Read and write).",
    "Clique em <strong>Generate token</strong>, copie o token gerado e cole no campo abaixo."
  ]'::jsonb,
  '[]'::jsonb
),
(
  'vercel-token',
  'Como criar seu token da Vercel',
  'https://www.youtube.com/embed/fvnDJAFaEGM',
  '[
    "Acesse <a href=\"https://vercel.com/account/settings/tokens\" target=\"_blank\">vercel.com/account/settings/tokens</a>",
    "Clique em <strong>Create Token</strong>. Dê o nome <code>meu-site-com-ia</code>.",
    "Em <strong>Scope</strong>, selecione <strong>Full Account</strong>. Em <strong>Expiration</strong>, selecione <strong>No Expiration</strong>.",
    "Clique em <strong>Create</strong>, copie o token e cole no campo abaixo."
  ]'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (slug) DO NOTHING;
