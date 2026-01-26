-- ============================================================================
-- LGPD - Função de Exclusão Completa de Usuário
-- ============================================================================
-- Descrição: Remove completamente um usuário do sistema, incluindo:
--   1. Dados do Supabase Auth (auth.users)
--   2. Dados da tabela users (com CASCADE para key_pairs e signed_contents)
--   3. Registra log de auditoria da exclusão
--
-- Uso: SELECT lgpd_delete_user_complete('user-uuid-here');
--
-- Autor: Sistema Vero iD
-- Data: 2026-01-26
-- Conformidade: LGPD (Lei 13.709/2018)
-- ============================================================================

-- ============================================================================
-- PASSO 1: Criar tabela de auditoria de exclusões (se não existir)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_deletion_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    deleted_user_id UUID NOT NULL,
    deleted_user_email TEXT NOT NULL,
    deleted_user_name TEXT NOT NULL,
    deleted_by_user_id UUID,
    deleted_by_user_email TEXT,
    deletion_reason TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    -- Estatísticas do usuário deletado (para compliance)
    total_signed_contents INTEGER DEFAULT 0,
    total_key_pairs INTEGER DEFAULT 0,
    account_created_at TIMESTAMPTZ,
    -- Metadados
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_deleted_user_id 
ON public.user_deletion_logs(deleted_user_id);

CREATE INDEX IF NOT EXISTS idx_user_deletion_logs_deleted_at 
ON public.user_deletion_logs(deleted_at DESC);

-- RLS para tabela de logs (apenas admins podem ver)
ALTER TABLE public.user_deletion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem ver logs de exclusao" 
ON public.user_deletion_logs FOR SELECT 
TO public 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- ============================================================================
-- PASSO 2: Criar função de exclusão completa
-- ============================================================================
CREATE OR REPLACE FUNCTION lgpd_delete_user_complete(
    target_user_id UUID,
    deleted_by_admin_id UUID DEFAULT NULL,
    deletion_reason TEXT DEFAULT 'Solicitação do usuário (LGPD Art. 18, III)',
    request_ip TEXT DEFAULT NULL,
    request_user_agent TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do dono da função
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_user_record RECORD;
    v_admin_record RECORD;
    v_signed_contents_count INTEGER;
    v_key_pairs_count INTEGER;
    v_deletion_log_id UUID;
    v_auth_deleted BOOLEAN := false;
    v_public_deleted BOOLEAN := false;
    v_result JSON;
BEGIN
    -- ========================================================================
    -- VALIDAÇÕES INICIAIS
    -- ========================================================================
    
    -- Verifica se o usuário existe na tabela public.users
    SELECT * INTO v_user_record
    FROM public.users
    WHERE id = target_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Usuário não encontrado',
            'user_id', target_user_id
        );
    END IF;
    
    -- Se foi deletado por admin, busca dados do admin
    IF deleted_by_admin_id IS NOT NULL THEN
        SELECT email INTO v_admin_record
        FROM public.users
        WHERE id = deleted_by_admin_id AND is_admin = true;
        
        IF NOT FOUND THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Admin não encontrado ou sem permissão',
                'admin_id', deleted_by_admin_id
            );
        END IF;
    END IF;
    
    -- Proteção: Admin não pode deletar a própria conta via esta função
    IF deleted_by_admin_id = target_user_id THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Admin não pode deletar a própria conta',
            'user_id', target_user_id
        );
    END IF;
    
    -- ========================================================================
    -- COLETA DE ESTATÍSTICAS (antes da exclusão)
    -- ========================================================================
    
    -- Conta conteúdos assinados
    SELECT COUNT(*) INTO v_signed_contents_count
    FROM public.signed_contents
    WHERE user_id = target_user_id;
    
    -- Conta pares de chaves
    SELECT COUNT(*) INTO v_key_pairs_count
    FROM public.key_pairs
    WHERE user_id = target_user_id;
    
    -- ========================================================================
    -- REGISTRA LOG DE AUDITORIA (antes da exclusão)
    -- ========================================================================
    
    INSERT INTO public.user_deletion_logs (
        deleted_user_id,
        deleted_user_email,
        deleted_user_name,
        deleted_by_user_id,
        deleted_by_user_email,
        deletion_reason,
        total_signed_contents,
        total_key_pairs,
        account_created_at,
        ip_address,
        user_agent
    ) VALUES (
        target_user_id,
        v_user_record.email,
        v_user_record.nome_completo,
        deleted_by_admin_id,
        v_admin_record.email,
        deletion_reason,
        v_signed_contents_count,
        v_key_pairs_count,
        v_user_record.created_at,
        request_ip,
        request_user_agent
    ) RETURNING id INTO v_deletion_log_id;
    
    -- ========================================================================
    -- EXCLUSÃO 1: Remover do Supabase Auth (auth.users)
    -- ========================================================================
    
    BEGIN
        -- Tenta deletar do auth.users
        -- Nota: Esta operação requer privilégios de service_role
        DELETE FROM auth.users WHERE id = target_user_id;
        
        IF FOUND THEN
            v_auth_deleted := true;
            RAISE NOTICE 'Usuário removido do auth.users: %', target_user_id;
        ELSE
            RAISE NOTICE 'Usuário não encontrado em auth.users (pode já ter sido removido): %', target_user_id;
            v_auth_deleted := true; -- Considera sucesso se não existe
        END IF;
    EXCEPTION
        WHEN insufficient_privilege THEN
            -- Se não tiver privilégios, registra mas continua
            RAISE WARNING 'Sem privilégios para deletar de auth.users. Use service_role key.';
            v_auth_deleted := false;
        WHEN OTHERS THEN
            RAISE WARNING 'Erro ao deletar de auth.users: %', SQLERRM;
            v_auth_deleted := false;
    END;
    
    -- ========================================================================
    -- EXCLUSÃO 2: Remover da tabela public.users
    -- ========================================================================
    -- Nota: Isto automaticamente remove (CASCADE):
    --   - key_pairs (ON DELETE CASCADE)
    --   - signed_contents (ON DELETE CASCADE)
    
    DELETE FROM public.users WHERE id = target_user_id;
    
    IF FOUND THEN
        v_public_deleted := true;
        RAISE NOTICE 'Usuário removido de public.users (com CASCADE): %', target_user_id;
    ELSE
        v_public_deleted := false;
        RAISE WARNING 'Falha ao remover de public.users: %', target_user_id;
    END IF;
    
    -- ========================================================================
    -- RESULTADO FINAL
    -- ========================================================================
    
    v_result := json_build_object(
        'success', v_public_deleted,
        'user_id', target_user_id,
        'user_email', v_user_record.email,
        'user_name', v_user_record.nome_completo,
        'deleted_from_auth', v_auth_deleted,
        'deleted_from_public', v_public_deleted,
        'deletion_log_id', v_deletion_log_id,
        'statistics', json_build_object(
            'signed_contents_deleted', v_signed_contents_count,
            'key_pairs_deleted', v_key_pairs_count,
            'account_age_days', EXTRACT(DAY FROM (NOW() - v_user_record.created_at))
        ),
        'deleted_at', NOW(),
        'deleted_by', COALESCE(v_admin_record.email, 'self-service'),
        'reason', deletion_reason
    );
    
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Em caso de erro, retorna detalhes
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'error_detail', SQLSTATE,
            'user_id', target_user_id
        );
END;
$$;

-- ============================================================================
-- COMENTÁRIOS E DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON FUNCTION lgpd_delete_user_complete IS 
'Função de exclusão completa de usuário em conformidade com LGPD.
Remove usuário de auth.users e public.users (com CASCADE para tabelas relacionadas).
Registra log de auditoria detalhado.

Parâmetros:
- target_user_id: UUID do usuário a ser deletado
- deleted_by_admin_id: UUID do admin que solicitou (NULL se auto-exclusão)
- deletion_reason: Motivo da exclusão (padrão: LGPD Art. 18, III)
- request_ip: IP da requisição (opcional)
- request_user_agent: User-Agent da requisição (opcional)

Retorna JSON com:
- success: boolean
- user_id, user_email, user_name
- deleted_from_auth, deleted_from_public: boolean
- deletion_log_id: UUID do log de auditoria
- statistics: contadores de dados deletados
- deleted_at, deleted_by, reason

Exemplo de uso:
SELECT lgpd_delete_user_complete(
    ''550e8400-e29b-41d4-a716-446655440000'',
    ''admin-uuid-here'',
    ''Solicitação via suporte'',
    ''192.168.1.1'',
    ''Mozilla/5.0...''
);';

COMMENT ON TABLE public.user_deletion_logs IS
'Tabela de auditoria de exclusões de usuários (LGPD).
Armazena histórico de todas as exclusões de contas para compliance.
Apenas administradores podem consultar esta tabela.';

-- ============================================================================
-- TESTES E VALIDAÇÃO
-- ============================================================================

-- Para testar a função (NÃO EXECUTE EM PRODUÇÃO):
-- 1. Crie um usuário de teste
-- 2. Execute: SELECT lgpd_delete_user_complete('test-user-uuid');
-- 3. Verifique os logs: SELECT * FROM user_deletion_logs ORDER BY deleted_at DESC LIMIT 1;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================