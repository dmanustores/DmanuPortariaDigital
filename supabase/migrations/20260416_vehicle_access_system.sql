-- Migration: Create Vehicle Access System
-- Date: 2026-04-16

-- 1. Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial config
INSERT INTO system_settings (key, value) 
VALUES ('veiculo_config', '{"tempo_alerta_permanencia": 480, "tipo_padrao_novo_veiculo": "VISITANTE"}') 
ON CONFLICT (key) DO NOTHING;

-- 2. Create registros_acesso table
CREATE TABLE IF NOT EXISTS registros_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veiculo_id UUID REFERENCES vehicles_registry(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('DENTRO', 'SAIU', 'NEGADO')),
    hora_entrada TIMESTAMPTZ DEFAULT now(),
    hora_saida TIMESTAMPTZ,
    observacoes TEXT,
    operador_entrada_id UUID REFERENCES operators(id),
    operador_saida_id UUID REFERENCES operators(id),
    permanencia_minutos INT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_registros_acesso_veiculo ON registros_acesso(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_registros_acesso_status ON registros_acesso(status);
CREATE INDEX IF NOT EXISTS idx_registros_acesso_hora_entrada ON registros_acesso(hora_entrada);

-- 4. Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_acesso ENABLE ROW LEVEL SECURITY;

-- 5. Basic RLS Policies (simplified for now as requested)
CREATE POLICY "Allow all for authenticated" ON system_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON registros_acesso FOR ALL TO authenticated USING (true);

-- ✅ Vehicle Access System tables created
SELECT 'registros_acesso and system_settings created' AS status;
