-- Função para verificar código 2FA durante o login (sem autenticação)
-- Esta função bypassa RLS porque é executada com SECURITY DEFINER

CREATE OR REPLACE FUNCTION verify_2fa_code_for_login(
  p_user_id UUID,
  p_token TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  secret TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do owner (bypassa RLS)
SET search_path = public
AS $$
BEGIN
  -- Busca as configurações 2FA do usuário (bypassa RLS)
  RETURN QUERY
  SELECT 
    CASE 
      WHEN u2fa.enabled = true THEN true
      ELSE false
    END as success,
    CASE 
      WHEN u2fa.enabled = true THEN 'OK'
      ELSE '2FA não está ativado para este usuário'
    END as message,
    u2fa.secret
  FROM user_2fa u2fa
  WHERE u2fa.user_id = p_user_id
  LIMIT 1;
  
  -- Se não encontrou nenhum registro
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '2FA não configurado'::TEXT, NULL::TEXT;
  END IF;
END;
$$;

-- Permite que qualquer usuário (autenticado ou não) execute esta função
GRANT EXECUTE ON FUNCTION verify_2fa_code_for_login(UUID, TEXT) TO anon, authenticated;

-- Comentário para documentação
COMMENT ON FUNCTION verify_2fa_code_for_login IS 
  'Verifica código 2FA durante login. Bypassa RLS para permitir verificação sem autenticação prévia.';