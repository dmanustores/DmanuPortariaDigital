-- Migration: Create Occurrences table
-- Date: 2026-04-18

CREATE TABLE IF NOT EXISTS occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    unidade_id UUID REFERENCES units(id) ON DELETE SET NULL,
    unidade_desc TEXT,
    prioridade TEXT DEFAULT 'Normal',
    status TEXT DEFAULT 'Aberta',
    operador_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    operador_resolucao_id UUID REFERENCES operators(id) ON DELETE SET NULL,
    atendimento_obs TEXT,
    atendido_em TIMESTAMPTZ,
    resolvida_em TIMESTAMPTZ,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Allow all for authenticated" ON occurrences FOR ALL TO authenticated USING (true);

-- ✅ Occurrences table created
SELECT 'occurrences table created' AS status;
