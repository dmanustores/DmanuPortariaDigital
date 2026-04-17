-- Migration: Cleanup Old Non-Resident Vehicle Records
-- Date: 2026-04-16
-- Purpose: Clear legacy visitor records to start fresh with the new access log system.

-- 1. Remove vehicles that are not Residents (Proprietário/Locatário)
-- AND that are not currently with an active access log (DENTRO)
DELETE FROM vehicles_registry 
WHERE tipo IN ('VISITANTE', 'PRESTADOR', 'MUDANÇA')
AND id NOT IN (
    SELECT veiculo_id 
    FROM registros_acesso 
    WHERE status = 'DENTRO'
);

-- ✅ Cleanup complete
SELECT 'Old visitor records cleared' AS status;
