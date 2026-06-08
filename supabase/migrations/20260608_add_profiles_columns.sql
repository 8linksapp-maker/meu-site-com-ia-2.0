-- Adiciona colunas faltantes na tabela profiles pra o JOIN dos comentários funcionar
-- Colunas usadas em: LessonPage.tsx, CourseViewer.tsx (.select('profiles(full_name, email, role)'))

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';

-- Backfill: popula email dos usuários existentes
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id
  AND p.email IS NULL;

-- Garante que todo profile tem role
UPDATE public.profiles SET role = 'student' WHERE role IS NULL;
