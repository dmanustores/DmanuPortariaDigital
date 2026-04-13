-- Migration: Add missing columns to residents table

ALTER TABLE residents 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ATIVO',
ADD COLUMN IF NOT EXISTS temWhatsApp BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS lgpdConsent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dataEntrada TEXT,
ADD COLUMN IF NOT EXISTS dataSaida TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS numero TEXT;

COMMENT ON COLUMN residents.status IS 'Status do morador: ATIVO, INATIVO, etc';
COMMENT ON COLUMN residents.temWhatsApp IS 'Flag indicando se utiliza WhatsApp';
COMMENT ON COLUMN residents.lgpdConsent IS 'Consentimento LGPD';
COMMENT ON COLUMN residents.dataEntrada IS 'Data de entrada do morador';
COMMENT ON COLUMN residents.dataSaida IS 'Data de saída do morador';
COMMENT ON COLUMN residents.observacoes IS 'Observações sobre o morador';
COMMENT ON COLUMN residents.numero IS 'Número da unidade (compatibilidade com schema anterior)';
