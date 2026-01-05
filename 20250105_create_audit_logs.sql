-- =====================================================
-- AUDIT LOGS TABLE
-- =====================================================
-- Tabela para registrar todas as ações importantes do sistema
-- para fins de auditoria e segurança

BEGIN;

-- Criar tabela de logs de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Criar índices para otimização de queries
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_action_idx ON audit_logs(user_id, action);

-- Criar índice GIN para busca em JSONB
CREATE INDEX IF NOT EXISTS audit_logs_details_idx ON audit_logs USING GIN (details);

-- Comentários para documentação
COMMENT ON TABLE audit_logs IS 'Registros de auditoria de todas as ações importantes do sistema';
COMMENT ON COLUMN audit_logs.user_id IS 'ID do usuário que executou a ação (NULL se não autenticado)';
COMMENT ON COLUMN audit_logs.action IS 'Tipo de ação executada (ex: LOGIN, LOGOUT, SIGN_CONTENT)';
COMMENT ON COLUMN audit_logs.details IS 'Detalhes adicionais da ação em formato JSON';
COMMENT ON COLUMN audit_logs.ip_address IS 'Endereço IP de onde a ação foi executada';
COMMENT ON COLUMN audit_logs.user_agent IS 'User Agent do navegador/aplicação';

-- Setup Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem ver todos os logs
CREATE POLICY "allow_admin_read_all_logs" 
ON audit_logs 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.is_admin = true
  )
);

-- Policy: Usuários podem ver apenas seus próprios logs
CREATE POLICY "allow_users_read_own_logs" 
ON audit_logs 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- Policy: Sistema pode inserir logs (via service role)
CREATE POLICY "allow_service_insert_logs" 
ON audit_logs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Função para limpar logs antigos (executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Remove logs de auditoria mais antigos que X dias (padrão: 90 dias)';

COMMIT;