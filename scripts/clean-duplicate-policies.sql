-- Script para remover políticas RLS duplicadas da tabela key_pairs
-- Executar este script no Supabase SQL Editor

-- 1. Primeiro, vamos listar todas as políticas RLS atuais da tabela key_pairs
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'key_pairs'
ORDER BY policyname;

-- 2. Remover políticas duplicadas (ajuste os nomes conforme necessário)
-- IMPORTANTE: Revise a lista acima antes de executar os comandos DROP abaixo
-- Descomente apenas as políticas que você confirmar serem duplicadas

-- Exemplo de como remover uma política duplicada:
-- DROP POLICY IF EXISTS "nome_da_politica_duplicada" ON key_pairs;

-- 3. Verificar políticas restantes após a limpeza
SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Leitura'
        WHEN cmd = 'INSERT' THEN 'Inserção'
        WHEN cmd = 'UPDATE' THEN 'Atualização'
        WHEN cmd = 'DELETE' THEN 'Exclusão'
        ELSE cmd
    END as tipo_operacao,
    roles as funcoes_permitidas
FROM pg_policies 
WHERE tablename = 'key_pairs'
ORDER BY cmd, policyname;