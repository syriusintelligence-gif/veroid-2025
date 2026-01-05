-- Tabela para armazenar configurações de 2FA dos usuários
CREATE TABLE IF NOT EXISTS user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false NOT NULL,
  backup_codes TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT user_2fa_user_id_key UNIQUE (user_id)
);

-- Índice para busca rápida por user_id
CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa(user_id);

-- Índice para busca por usuários com 2FA ativado
CREATE INDEX IF NOT EXISTS idx_user_2fa_enabled ON user_2fa(enabled) WHERE enabled = true;

-- RLS (Row Level Security) - Usuário só pode ver/editar seu próprio 2FA
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;

-- Política: Usuário pode ver apenas seu próprio 2FA
CREATE POLICY "Users can view their own 2FA settings"
  ON user_2fa
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Usuário pode inserir apenas seu próprio 2FA
CREATE POLICY "Users can insert their own 2FA settings"
  ON user_2fa
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Usuário pode atualizar apenas seu próprio 2FA
CREATE POLICY "Users can update their own 2FA settings"
  ON user_2fa
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Usuário pode deletar apenas seu próprio 2FA
CREATE POLICY "Users can delete their own 2FA settings"
  ON user_2fa
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE user_2fa IS 'Armazena configurações de autenticação de dois fatores (2FA) dos usuários';
COMMENT ON COLUMN user_2fa.secret IS 'Secret TOTP (Time-based One-Time Password) criptografado';
COMMENT ON COLUMN user_2fa.enabled IS 'Indica se o 2FA está ativado para este usuário';
COMMENT ON COLUMN user_2fa.backup_codes IS 'Array de códigos de backup para recuperação (hasheados)';
COMMENT ON COLUMN user_2fa.last_used_at IS 'Última vez que o 2FA foi usado com sucesso';