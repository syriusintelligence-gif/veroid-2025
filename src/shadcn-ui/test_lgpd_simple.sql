-- ============================================================================
-- TESTE SIMPLIFICADO - Exclusão Completa de Usuário (LGPD)
-- ============================================================================
-- Execute cada seção separadamente no Supabase SQL Editor
-- Copie e cole cada bloco individualmente
-- ============================================================================

-- ============================================================================
-- ETAPA 1: CRIAR USUÁRIO DE TESTE
-- ============================================================================
-- Copie e execute este bloco primeiro:

INSERT INTO public.users (
    id,
    nome_completo,
    nome_publico,
    email,
    cpf_cnpj,
    telefone,
    documento_url,
    selfie_url,
    verified,
    is_admin
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Usuário de Teste LGPD',
    'Teste LGPD',
    'teste.exclusao@veroid.test',
    '99999999999',
    '(99) 99999-9999',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmMDAiLz48L3N2Zz4=',
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMwZjAiLz48L3N2Zz4=',
    true,
    false
)
ON CONFLICT (id) DO NOTHING;

-- Resultado esperado: "Success. No rows returned" ou "1 row inserted"

-- ============================================================================
-- ETAPA 2: CRIAR PAR DE CHAVES
-- ============================================================================
-- Copie e execute este bloco:

INSERT INTO public.key_pairs (
    user_id,
    public_key,
    private_key
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'TEST_PUBLIC_KEY_00000000-0000-0000-0000-000000000001',
    'TEST_PRIVATE_KEY_00000000-0000-0000-0000-000000000001'
);

-- Resultado esperado: "1 row inserted"

-- ============================================================================
-- ETAPA 3: CRIAR CONTEÚDOS ASSINADOS
-- ============================================================================
-- Copie e execute este bloco:

INSERT INTO public.signed_contents (
    user_id,
    content,
    content_hash,
    signature,
    public_key,
    creator_name,
    verification_code,
    platforms
) VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'Conteúdo de teste 1 - LGPD',
    'hash_test_1',
    'signature_test_1',
    'TEST_PUBLIC_KEY_00000000-0000-0000-0000-000000000001',
    'Usuário de Teste LGPD',
    'TEST0001',
    ARRAY['Instagram', 'Facebook']
),
(
    '00000000-0000-0000-0000-000000000001',
    'Conteúdo de teste 2 - LGPD',
    'hash_test_2',
    'signature_test_2',
    'TEST_PUBLIC_KEY_00000000-0000-0000-0000-000000000001',
    'Usuário de Teste LGPD',
    'TEST0002',
    ARRAY['Twitter']
),
(
    '00000000-0000-0000-0000-000000000001',
    'Conteúdo de teste 3 - LGPD',
    'hash_test_3',
    'signature_test_3',
    'TEST_PUBLIC_KEY_00000000-0000-0000-0000-000000000001',
    'Usuário de Teste LGPD',
    'TEST0003',
    ARRAY['LinkedIn', 'YouTube']
);

-- Resultado esperado: "3 rows inserted"

-- ============================================================================
-- ETAPA 4: VERIFICAR DADOS CRIADOS
-- ============================================================================
-- Copie e execute este bloco:

SELECT 
    'users' as tabela,
    COUNT(*) as quantidade
FROM public.users 
WHERE id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'key_pairs' as tabela,
    COUNT(*) as quantidade
FROM public.key_pairs 
WHERE user_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'signed_contents' as tabela,
    COUNT(*) as quantidade
FROM public.signed_contents 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Resultado esperado:
-- tabela            | quantidade
-- ------------------|------------
-- users             | 1
-- key_pairs         | 1
-- signed_contents   | 3

-- ============================================================================
-- ETAPA 5: BUSCAR ID DO ADMIN (para teste)
-- ============================================================================
-- Copie e execute este bloco:

SELECT 
    id,
    nome_completo,
    email,
    is_admin
FROM public.users
WHERE is_admin = true
LIMIT 1;

-- Anote o ID do admin que apareceu, você vai usar na próxima etapa
-- Se não houver admin, use NULL na próxima etapa

-- ============================================================================
-- ETAPA 6: EXECUTAR A FUNÇÃO DE EXCLUSÃO
-- ============================================================================
-- IMPORTANTE: Substitua 'ADMIN-UUID-AQUI' pelo UUID do admin da etapa anterior
-- Se não houver admin, use NULL no lugar
-- Copie e execute este bloco:

SELECT lgpd_delete_user_complete(
    '00000000-0000-0000-0000-000000000001'::UUID,  -- ID do usuário de teste
    'ADMIN-UUID-AQUI'::UUID,                        -- ⚠️ SUBSTITUA pelo UUID do admin
    'Teste manual de exclusão LGPD',               -- Motivo
    '127.0.0.1',                                    -- IP
    'Manual Test'                                   -- User Agent
);

-- OU se não houver admin, use:
-- SELECT lgpd_delete_user_complete(
--     '00000000-0000-0000-0000-000000000001'::UUID,
--     NULL,
--     'Teste manual de exclusão LGPD',
--     '127.0.0.1',
--     'Manual Test'
-- );

-- Resultado esperado: JSON com success: true

-- ============================================================================
-- ETAPA 7: VERIFICAR SE OS DADOS FORAM REMOVIDOS
-- ============================================================================
-- Copie e execute este bloco:

SELECT 
    'users' as tabela,
    COUNT(*) as quantidade_restante
FROM public.users 
WHERE id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'key_pairs' as tabela,
    COUNT(*) as quantidade_restante
FROM public.key_pairs 
WHERE user_id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'signed_contents' as tabela,
    COUNT(*) as quantidade_restante
FROM public.signed_contents 
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Resultado esperado: TODOS devem mostrar 0
-- tabela            | quantidade_restante
-- ------------------|--------------------
-- users             | 0
-- key_pairs         | 0
-- signed_contents   | 0

-- ============================================================================
-- ETAPA 8: VERIFICAR LOG DE AUDITORIA
-- ============================================================================
-- Copie e execute este bloco:

SELECT 
    deleted_user_email,
    deleted_user_name,
    deleted_by_user_email,
    deletion_reason,
    total_signed_contents,
    total_key_pairs,
    deleted_at
FROM public.user_deletion_logs
WHERE deleted_user_id = '00000000-0000-0000-0000-000000000001'
ORDER BY deleted_at DESC
LIMIT 1;

-- Resultado esperado: 1 linha com os detalhes da exclusão

-- ============================================================================
-- ETAPA 9 (OPCIONAL): LIMPAR DADOS DE TESTE DO LOG
-- ============================================================================
-- Se quiser limpar o log de teste após validar:

-- DELETE FROM public.user_deletion_logs 
-- WHERE deleted_user_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- RESUMO DO TESTE
-- ============================================================================
-- ✅ Se todas as etapas funcionaram:
--    - Usuário de teste foi criado
--    - Dados relacionados foram criados
--    - Função de exclusão executou com sucesso
--    - Todos os dados foram removidos (CASCADE funcionou)
--    - Log de auditoria foi registrado
--
-- 🎯 Próximo passo: Etapa A.3 - Atualizar função TypeScript
-- ============================================================================