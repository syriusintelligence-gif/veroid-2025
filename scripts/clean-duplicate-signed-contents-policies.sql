-- ============================================================================
-- Script: Limpeza de Políticas Duplicadas em signed_contents
-- Descrição: Remove políticas duplicadas de INSERT e SELECT mantendo apenas uma de cada
-- Data: 2026-01-19
-- Autor: Alex (Engineer)
-- ============================================================================

-- IMPORTANTE: Este script remove políticas duplicadas mas mantém a funcionalidade completa
-- Políticas mantidas:
--   - 1 DELETE policy (manter existente)
--   - 1 INSERT policy (manter a mais recente/clara)
--   - 1 SELECT policy (manter a mais recente/clara)

BEGIN;

-- ============================================================================
-- PASSO 1: Verificar políticas atuais antes da limpeza
-- ============================================================================
SELECT 
    'ANTES DA LIMPEZA' as status,
    policyname,
    cmd as command_type,
    COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'signed_contents'
GROUP BY policyname, cmd
ORDER BY cmd, policyname;

-- ============================================================================
-- PASSO 2: Remover políticas INSERT duplicadas (manter apenas uma)
-- ============================================================================

-- Remover: "Usuarios podem criar seus proprios conteudos" (sem acento)
DROP POLICY IF EXISTS "Usuarios podem criar seus proprios conteudos" ON signed_contents;

-- Remover: "Users can insert their own signed contents" (inglês)
DROP POLICY IF EXISTS "Users can insert their own signed contents" ON signed_contents;

-- MANTER: "Usuários podem criar seus próprios conteúdos" (português correto com acentos)
-- Esta é a política mais clara e em português correto

-- ============================================================================
-- PASSO 3: Remover políticas SELECT duplicadas (manter apenas uma)
-- ============================================================================

-- Remover: "Permitir leitura publica de conteudos assinados" (sem acento)
DROP POLICY IF EXISTS "Permitir leitura publica de conteudos assinados" ON signed_contents;

-- Remover: "Public read access" (inglês)
DROP POLICY IF EXISTS "Public read access" ON signed_contents;

-- MANTER: "Qualquer um pode ver conteúdos assinados" (português claro)
-- Esta é a política mais descritiva em português

-- ============================================================================
-- PASSO 4: Verificar políticas após limpeza
-- ============================================================================
SELECT 
    'APÓS LIMPEZA' as status,
    policyname,
    cmd as command_type,
    roles,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'signed_contents'
ORDER BY cmd, policyname;

-- ============================================================================
-- PASSO 5: Validação final - deve ter exatamente 3 políticas
-- ============================================================================
SELECT 
    'VALIDAÇÃO FINAL' as status,
    cmd as command_type,
    COUNT(*) as total_policies
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'signed_contents'
GROUP BY cmd
ORDER BY cmd;

-- Verificar total (deve ser 3: 1 DELETE + 1 INSERT + 1 SELECT)
SELECT 
    'TOTAL DE POLÍTICAS' as status,
    COUNT(*) as total,
    CASE 
        WHEN COUNT(*) = 3 THEN '✅ CORRETO - 3 políticas (1 DELETE, 1 INSERT, 1 SELECT)'
        ELSE '❌ ERRO - Deveria ter 3 políticas'
    END as validation
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'signed_contents';

COMMIT;

-- ============================================================================
-- RESULTADO ESPERADO APÓS EXECUÇÃO:
-- ============================================================================
-- Políticas Mantidas:
--   1. "Usuarios podem deletar seus proprios conteudos" (DELETE)
--   2. "Usuários podem criar seus próprios conteúdos" (INSERT)
--   3. "Qualquer um pode ver conteúdos assinados" (SELECT)
--
-- Políticas Removidas:
--   - "Usuarios podem criar seus proprios conteudos" (INSERT duplicada)
--   - "Users can insert their own signed contents" (INSERT duplicada)
--   - "Permitir leitura publica de conteudos assinados" (SELECT duplicada)
--   - "Public read access" (SELECT duplicada)
--
-- Funcionalidade Mantida:
--   ✅ Usuários podem criar conteúdos assinados
--   ✅ Usuários podem deletar seus próprios conteúdos
--   ✅ Leitura pública de conteúdos assinados
--   ✅ Conteúdos assinados são imutáveis (sem UPDATE)
-- ============================================================================