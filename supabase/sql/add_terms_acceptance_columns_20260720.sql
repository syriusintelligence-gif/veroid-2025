-- =====================================================
-- MIGRATION: Adiciona colunas de aceite de Termos de Uso e
--            Política de Privacidade na tabela public.users
-- =====================================================
--
-- Objetivo:
--   Suportar o novo checkbox de aceite formal dos Termos de Uso e da
--   Política de Privacidade no fluxo de cadastro (Cadastro.tsx),
--   com auditoria LGPD-completa e versionamento dos documentos.
--
-- Padrão adotado:
--   Mesmíssimo padrão já usado pela declaração de maioridade e pelo
--   opt-in WhatsApp: flag booleana + timestamp + IP + user-agent.
--   Adicionalmente, grava a versão dos documentos aceitos (terms_version
--   e privacy_version), no formato "YYYY-MM-DD-vMAJOR.MINOR.PATCH".
--   Garante consentimento auditável e permite consultas SQL simples
--   como: SELECT ... FROM users WHERE terms_version = '2026-07-20-v1.0.2';
--
-- Segurança:
--   - ADITIVO: usa ADD COLUMN IF NOT EXISTS — pode ser rodado múltiplas
--     vezes sem erro e não altera nenhuma coluna existente.
--   - Defaults seguros: terms_accepted = false (usuários antigos e
--     usuários que NÃO marcarem o checkbox ficam explicitamente como
--     "não aceitou").
--   - Não altera RLS, triggers, índices, ou qualquer outra estrutura.
--   - Não altera dados existentes das outras colunas.
--   - Não impacta os 45+ usuários já cadastrados: as novas colunas
--     ficam com valores default (false/NULL) para eles.
--
-- Como aplicar em produção:
--   Copiar e colar no Supabase Dashboard > SQL Editor e clicar em Run.
--
-- @author Alex (Engineer)
-- @version 1.0.0
-- @created 2026-07-20
-- =====================================================

BEGIN;

-- Flag de consentimento (obrigatório para conformidade LGPD)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN NOT NULL DEFAULT false;

-- Timestamp do momento do aceite (NULL = usuário não aceitou)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- IP do cliente no momento do aceite (auditoria LGPD)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_accepted_ip TEXT;

-- User-Agent do cliente no momento do aceite (auditoria LGPD)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_accepted_user_agent TEXT;

-- Versão dos Termos de Uso aceitos no momento do cadastro
-- Formato: "YYYY-MM-DD-vMAJOR.MINOR.PATCH" (ex.: "2026-07-20-v1.0.2")
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Versão da Política de Privacidade aceita no momento do cadastro
-- Formato: "YYYY-MM-DD-vMAJOR.MINOR.PATCH" (ex.: "2026-07-20-v1.0.2")
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS privacy_version TEXT;

-- Comentários para documentação inline (aparecem no pgAdmin/Supabase Studio)
COMMENT ON COLUMN public.users.terms_accepted IS
  'LGPD: usuário aceitou os Termos de Uso e a Política de Privacidade. Default false.';
COMMENT ON COLUMN public.users.terms_accepted_at IS
  'LGPD: timestamp do aceite. NULL quando terms_accepted = false.';
COMMENT ON COLUMN public.users.terms_accepted_ip IS
  'LGPD: IP registrado no momento do aceite (auditoria).';
COMMENT ON COLUMN public.users.terms_accepted_user_agent IS
  'LGPD: User-Agent registrado no momento do aceite (auditoria).';
COMMENT ON COLUMN public.users.terms_version IS
  'LGPD: versão dos Termos de Uso aceitos. Formato YYYY-MM-DD-vMAJOR.MINOR.PATCH.';
COMMENT ON COLUMN public.users.privacy_version IS
  'LGPD: versão da Política de Privacidade aceita. Formato YYYY-MM-DD-vMAJOR.MINOR.PATCH.';

COMMIT;

-- =====================================================
-- Rollback (executar manualmente somente se necessário)
-- =====================================================
-- BEGIN;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS privacy_version;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS terms_version;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS terms_accepted_user_agent;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS terms_accepted_ip;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS terms_accepted_at;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS terms_accepted;
-- COMMIT;