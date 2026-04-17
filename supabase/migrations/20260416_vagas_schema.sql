-- Migration: Add Vagas table and initial data population
-- Date: 2026-04-16

-- 1. Create table
CREATE TABLE IF NOT EXISTS vagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) NOT NULL UNIQUE, -- Ex: B08-302-A
    unidade_id UUID REFERENCES units(id) ON DELETE CASCADE,
    tipo VARCHAR(20) DEFAULT 'PADRAO',
    status VARCHAR(20) DEFAULT 'LIVRE',
    veiculo_id UUID UNIQUE REFERENCES vehicles(id) ON DELETE SET NULL,
    alugada_para_morador_id UUID REFERENCES residents(id) ON DELETE SET NULL,
    valor_aluguel DECIMAL(10,2),
    data_inicio_aluguel DATE,
    data_fim_aluguel DATE,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Note: units.vagasgaragem is an integer.
-- We use a DO block to loop over all units and generate X vagas per unit.
DO $$
DECLARE
    rec RECORD;
    i INT;
    letter CHAR;
    vaga_code VARCHAR;
BEGIN
    FOR rec IN SELECT id, bloco, numero, vagasgaragem FROM units WHERE vagasgaragem > 0 LOOP
        FOR i IN 1..rec.vagasgaragem LOOP
            -- Determine letter A, B, C, D...
            letter := chr(64 + i); -- 1 -> A, 2 -> B
            
            -- Format: B08-302-A
            vaga_code := 'B' || rec.bloco || '-' || rec.numero || '-' || letter;
            
            IF NOT EXISTS (SELECT 1 FROM vagas WHERE codigo = vaga_code) THEN
                INSERT INTO vagas (unidade_id, codigo, tipo, status)
                VALUES (rec.id, vaga_code, 'PADRAO', 'LIVRE');
            END IF;
            
        END LOOP;
    END LOOP;
END
$$;
