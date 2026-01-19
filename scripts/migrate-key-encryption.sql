-- =====================================================
-- MIGRAÇÃO: Adicionar suporte para chaves criptografadas
-- =====================================================
-- Este script adiciona as colunas necessárias para armazenar
-- chaves privadas criptografadas com AES-256-GCM
-- =====================================================

BEGIN;

-- 1. Adicionar novas colunas para chaves criptografadas
ALTER TABLE key_pairs
ADD COLUMN IF NOT EXISTS encrypted_private_key TEXT,
ADD COLUMN IF NOT EXISTS encryption_algorithm TEXT,
ADD COLUMN IF NOT EXISTS key_version INTEGER DEFAULT 1;

-- 2. Tornar private_key NULLABLE (para permitir modo criptografado)
ALTER TABLE key_pairs
ALTER COLUMN private_key DROP NOT NULL;

-- 3. Adicionar constraint: pelo menos uma das chaves deve existir
ALTER TABLE key_pairs
ADD CONSTRAINT check_key_exists 
CHECK (
  (private_key IS NOT NULL) OR 
  (encrypted_private_key IS NOT NULL)
);

-- 4. Adicionar índice para melhorar performance de busca
CREATE INDEX IF NOT EXISTS idx_key_pairs_user_id_created 
ON key_pairs(user_id, created_at DESC);

-- 5. Verificar estrutura final
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'key_pairs'
ORDER BY ordinal_position;

COMMIT;

-- =====================================================
-- VERIFICAÇÃO PÓS-MIGRAÇÃO
-- =====================================================
SELECT 
    'Migração concluída com sucesso!' as status,
    COUNT(*) as total_chaves,
    COUNT(private_key) as chaves_texto_plano,
    COUNT(encrypted_private_key) as chaves_criptografadas
FROM key_pairs;