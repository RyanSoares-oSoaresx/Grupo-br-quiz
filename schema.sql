-- ==============================================================
-- QUIZPULSE - BANCO DE DADOS DE ALTA DISPONIBILIDADE
-- Compatível com Supabase / PostgreSQL / Neon
-- ==============================================================

-- 1. Criação da Tabela de Resultados do Quiz
CREATE TABLE IF NOT EXISTS public.quiz_results (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL DEFAULT '⚡',
    score INTEGER NOT NULL DEFAULT 0,
    accuracy INTEGER NOT NULL DEFAULT 0,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "totalQuestions" INTEGER NOT NULL DEFAULT 12,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    timestamp TEXT NOT NULL,
    "createdAt" BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices de Alta Performance para Ranking Instantâneo
CREATE INDEX IF NOT EXISTS idx_quiz_results_score ON public.quiz_results (score DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_results_created ON public.quiz_results ("createdAt" DESC);

-- 3. Habilita Row Level Security (RLS)
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- Permissões públicas para leitura e inserção de resultados do quiz
CREATE POLICY "Permitir leitura pública do ranking"
    ON public.quiz_results
    FOR SELECT
    USING (true);

CREATE POLICY "Permitir inserção pública de resultados"
    ON public.quiz_results
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Permitir exclusão pelo painel de admin"
    ON public.quiz_results
    FOR DELETE
    USING (true);

-- 4. Tabela de Heartbeat / Participantes Ativos (Opcional)
CREATE TABLE IF NOT EXISTS public.quiz_active_participants (
    "sessionId" TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    "currentQ" INTEGER NOT NULL,
    "totalQ" INTEGER NOT NULL,
    "elapsedSec" INTEGER NOT NULL,
    "lastPing" BIGINT NOT NULL
);

ALTER TABLE public.quiz_active_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso público participantes ativos"
    ON public.quiz_active_participants
    FOR ALL
    USING (true)
    WITH CHECK (true);
