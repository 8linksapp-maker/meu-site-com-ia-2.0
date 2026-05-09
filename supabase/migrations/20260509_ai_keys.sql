-- Adiciona colunas pra chaves de IA + provider selector na platform_settings.
-- Default: gemini (free tier, vídeo nativo até 2GB via Files API).

ALTER TABLE platform_settings
    ADD COLUMN IF NOT EXISTS gemini_api_key TEXT,
    ADD COLUMN IF NOT EXISTS openai_api_key TEXT,
    ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'gemini' CHECK (ai_provider IN ('gemini', 'openai')),
    ADD COLUMN IF NOT EXISTS lesson_ai_prompt TEXT;  -- system prompt customizável; vazio = usa DEFAULT_LESSON_PROMPT do código

-- Backfill: se já existir row id=1, garante o provider default
UPDATE platform_settings SET ai_provider = COALESCE(ai_provider, 'gemini') WHERE id = 1;

-- Coluna pra rollback do backfill de títulos (regenerados via IA)
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS original_title TEXT;
