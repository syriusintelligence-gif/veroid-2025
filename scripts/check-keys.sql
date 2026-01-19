-- Script para verificar o estado atual das chaves
-- Executar este script no Supabase SQL Editor

-- 1. Verificar todas as chaves existentes com informações dos usuários
SELECT 
    kp.id as key_id,
    kp.user_id,
    u.email,
    u.nome_completo,
    u.nome_publico,
    kp.created_at as key_created_at,
    kp.encryption_algorithm,
    kp.key_version,
    CASE 
        WHEN kp.encrypted_private_key IS NOT NULL THEN 'Criptografada'
        ELSE 'Não Criptografada'
    END as encryption_status,
    LENGTH(kp.public_key) as public_key_length,
    LENGTH(kp.private_key) as private_key_length,
    LENGTH(kp.encrypted_private_key) as encrypted_key_length
FROM key_pairs kp
LEFT JOIN users u ON kp.user_id = u.id
ORDER BY kp.created_at DESC;

-- 2. Verificar se há conteúdos assinados com essas chaves
SELECT 
    kp.user_id,
    u.email,
    u.nome_completo,
    COUNT(sc.id) as total_signed_contents,
    MAX(sc.created_at) as last_signature_date
FROM key_pairs kp
LEFT JOIN users u ON kp.user_id = u.id
LEFT JOIN signed_contents sc ON sc.user_id = kp.user_id
GROUP BY kp.user_id, u.email, u.nome_completo
ORDER BY total_signed_contents DESC;

-- 3. Verificar integridade das chaves (se public_key e private_key não são nulos)
SELECT 
    COUNT(*) as total_keys,
    COUNT(CASE WHEN public_key IS NOT NULL AND private_key IS NOT NULL THEN 1 END) as valid_keys,
    COUNT(CASE WHEN encrypted_private_key IS NOT NULL THEN 1 END) as encrypted_keys,
    COUNT(CASE WHEN public_key IS NULL OR private_key IS NULL THEN 1 END) as invalid_keys
FROM key_pairs;