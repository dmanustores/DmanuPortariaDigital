-- Adicionar colunas para integração com WhatsApp na tabela de packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS whatsapp_enviado BOOLEAN DEFAULT false;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS whatsapp_lido BOOLEAN DEFAULT false;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS whatsapp_mensagem_id TEXT;

-- Comentários para documentação
COMMENT ON COLUMN packages.whatsapp_enviado IS 'Indica se a notificação de WhatsApp foi disparada com sucesso';
COMMENT ON COLUMN packages.whatsapp_lido IS 'Indica se o morador leu a mensagem (via webhook da Evolution API)';
COMMENT ON COLUMN packages.whatsapp_mensagem_id IS 'ID da mensagem retornado pela Evolution API para rastreamento de status';
