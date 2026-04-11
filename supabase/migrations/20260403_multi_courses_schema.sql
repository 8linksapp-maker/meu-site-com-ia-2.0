-- 1. Tabela Base dos Cursos
CREATE TABLE IF NOT EXISTS public.courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  kiwify_product_ids text[],
  created_at timestamp with time zone DEFAULT now()
);

-- RLS Courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Courses are viewable by everyone." ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admin can completely manage courses." ON public.courses FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 2. Tabela de Vinculação (Travas) Estudante -> Curso
CREATE TABLE IF NOT EXISTS public.user_courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  granted_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  UNIQUE(user_id, course_id)
);

-- RLS User_Courses
ALTER TABLE public.user_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own course accesses." ON public.user_courses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can fully manage accesses." ON public.user_courses FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- 3. Atualizar Módulos Adicionando a Referência
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE;

-------------------------------------------------------------------------------------------------------------
-- MIGRAÇÃO AUTOMÁTICA DE DADOS LEGADOS:
-------------------------------------------------------------------------------------------------------------

-- 4. Criando o "Curso 1" Invisível que abriga os dados originais
INSERT INTO public.courses (id, title, description, kiwify_product_ids)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid, 
  'Meu Site com IA 2.0 (Legado)', 
  'Acesso ao conteúdo clássico',
  ARRAY[
    'b54bcd50-2edd-11f1-be15-5fff77dd3577', 
    '0b584cb0-0917-11f1-b405-c153dd3b957a', 
    '4b57ece0-1f0f-11f1-a7e5-97e2309232ba'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 5. Atribuindo todos os módulos existentes ao "Curso 1" recém-criado
UPDATE public.modules SET course_id = '00000000-0000-0000-0000-000000000001'::uuid WHERE course_id IS NULL;

-- 6. Liberação: Todo aluno recebe a posse e migramos o acesso e o limite de tempo nativo da subscription_period_end original
INSERT INTO public.user_courses (user_id, course_id, expires_at)
SELECT id, '00000000-0000-0000-0000-000000000001'::uuid, subscription_period_end
FROM public.profiles 
WHERE subscription_status = 'active'
ON CONFLICT (user_id, course_id) DO NOTHING;
