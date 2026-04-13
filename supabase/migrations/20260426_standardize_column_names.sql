-- Migration: Standardize column names to snake_case

-- Rename columns from camelCase to snake_case to follow PostgreSQL conventions
ALTER TABLE residents
RENAME COLUMN temWhatsApp TO tem_whatsapp;

ALTER TABLE residents
RENAME COLUMN lgpdConsent TO lgpd_consent;

ALTER TABLE residents
RENAME COLUMN dataEntrada TO data_entrada;

ALTER TABLE residents
RENAME COLUMN dataSaida TO data_saida;

-- Update comments
COMMENT ON COLUMN residents.tem_whatsapp IS 'Flag indicando se utiliza WhatsApp';
COMMENT ON COLUMN residents.lgpd_consent IS 'Consentimento LGPD';
COMMENT ON COLUMN residents.data_entrada IS 'Data de entrada do morador';
COMMENT ON COLUMN residents.data_saida IS 'Data de saída do morador';
