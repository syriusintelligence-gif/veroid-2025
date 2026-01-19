-- Script para remover políticas de UPDATE da tabela signed_contents
-- Motivo: Conteúdos assinados digitalmente NÃO devem ser modificados após criação
-- Data: 2026-01-19
-- IMPORTANTE: Execute este script no Supabase SQL Editor

BEGIN;

-- 1. Remover política de UPDATE: "Usuarios podem atualizar seus proprios conteudos"
DROP POLICY IF EXISTS "Usuarios podem atualizar seus proprios conteudos" ON signed_contents;

-- 2. Remover política de UPDATE: "Usuários podem atualizar seus próprios conteúdos"
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios conteúdos" ON signed_contents;

-- 3. Verificar políticas restantes (deve mostrar apenas SELECT, INSERT e DELETE)
SELECT 
    policyname,
    cmd as command_type,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'signed_contents'
ORDER BY cmd, policyname;

COMMIT;

-- Resultado esperado:
-- ✅ Políticas de UPDATE removidas
-- ✅ Políticas de SELECT, INSERT e DELETE mantidas
-- ✅ Conteúdos assinados agora são imutáveis (não podem ser modificados)