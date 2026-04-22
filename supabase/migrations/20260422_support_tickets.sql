-- Juvenal Support Ticket System
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_email text NOT NULL,
  user_name text DEFAULT '',
  site_repo text DEFAULT '',
  category text NOT NULL DEFAULT 'bug',
  subject text NOT NULL,
  description text NOT NULL,
  screenshot_url text DEFAULT '',
  status text NOT NULL DEFAULT 'aberto',
  priority int NOT NULL DEFAULT 0,
  resolved_at timestamptz,
  resolved_note text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  author_type text NOT NULL DEFAULT 'aluno',
  author_name text NOT NULL DEFAULT '',
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON public.support_tickets
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can do anything on tickets
CREATE POLICY "Admins can do anything on tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Users can view messages on their own tickets
CREATE POLICY "Users can view own ticket messages" ON public.ticket_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_messages.ticket_id AND user_id = auth.uid())
  );

-- Users can post messages on their own tickets
CREATE POLICY "Users can post messages on own tickets" ON public.ticket_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_messages.ticket_id AND user_id = auth.uid())
  );

-- Admins can do anything on messages
CREATE POLICY "Admins can do anything on messages" ON public.ticket_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
