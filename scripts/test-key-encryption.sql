-- =====================================================
-- TESTE: Verificar se chaves estão sendo salvas corretamente
-- =====================================================
-- Este script verifica o estado atual das chaves no banco
-- =====================================================

-- 1. Verificar estrutura da tabela
SELECT 
    'Estrutura da Tabela' as teste,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'key_pairs'
ORDER BY ordinal_position;

-- 2. Verificar chaves existentes
SELECT 
    'Chaves Existentes' as teste,
    id,
    user_id,
    LEFT(public_key, 30) || '...' as public_key_preview,
    CASE 
        WHEN private_key IS NOT NULL THEN 'PRESENTE (texto plano)'
        ELSE 'NULL'
    END as private_key_status,
    CASE 
        WHEN encrypted_private_key IS NOT NULL THEN 'PRESENTE (criptografado)'
        ELSE 'NULL'
    END as encrypted_private_key_status,
    encryption_algorithm,
    key_version,
    created_at
FROM key_pairs
ORDER BY created_at DESC;

-- 3. Estatísticas
SELECT 
    'Estatísticas' as teste,
    COUNT(*) as total_chaves,
    COUNT(private_key) as chaves_texto_plano,
    COUNT(encrypted_private_key) as chaves_criptografadas,
    COUNT(CASE WHEN private_key IS NULL AND encrypted_private_key IS NULL THEN 1 END) as chaves_invalidas
FROM key_pairs;

-- 4. Verificar políticas RLS
SELECT 
    'Políticas RLS' as teste,
    policyname,
    cmd,
    qual as condicao
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'key_pairs'
ORDER BY cmd, policyname;