-- Adiciona coluna highlights na tabela lessons
-- Armazena array de pontos-chave da aula (gerados por IA ou manuais)
-- Registros existentes ficam com NULL, o que é compatível com o frontend

ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS highlights text[];
