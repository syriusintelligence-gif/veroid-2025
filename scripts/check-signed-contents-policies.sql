-- Verificar todas as políticas RLS da tabela signed_contents
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command_type,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'signed_contents'
ORDER BY cmd, policyname;