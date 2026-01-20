-- ============================================================================
-- 🧹 CONFIGURAÇÃO DE CRON JOB PARA LIMPEZA AUTOMÁTICA
-- ============================================================================
-- 
-- Este script configura um Cron Job no Supabase usando pg_cron para executar
-- a Edge Function de limpeza de arquivos temporários diariamente às 2h da manhã.
-- 
-- FASE 5 - Limpeza Automática
-- Autor: Alex (Engineer)
-- Data: 2026-01-20
-- 
-- ============================================================================

-- ============================================================================
-- PASSO 1: HABILITAR EXTENSÃO PG_CRON (se ainda não estiver habilitada)
-- ============================================================================

-- Verificar se pg_cron está instalado
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

-- Habilitar pg_cron (requer permissões de superusuário)
-- No Supabase, isso já está habilitado por padrão no plano Pro
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- PASSO 2: CRIAR FUNÇÃO AUXILIAR PARA CHAMAR EDGE FUNCTION
-- ============================================================================

-- Esta função faz uma requisição HTTP POST para a Edge Function
CREATE OR REPLACE FUNCTION call_cleanup_temp_uploads()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_url TEXT;
  service_role_key TEXT;
  response TEXT;
BEGIN
  -- Obter URL do projeto (substitua YOUR_PROJECT_REF pelo seu Project Ref)
  -- Exemplo: https://abcdefghijklmnop.supabase.co
  project_url := current_setting('app.settings.project_url', true);
  
  -- Obter Service Role Key (armazenada como configuração)
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Fazer requisição HTTP POST para a Edge Function
  SELECT content::text INTO response
  FROM http_post(
    project_url || '/functions/v1/cleanup-temp-uploads',
    '{}',
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || service_role_key)
    ]
  );
  
  -- Log do resultado
  RAISE NOTICE '🧹 Cleanup executado: %', response;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '❌ Erro ao executar cleanup: %', SQLERRM;
END;
$$;

-- ============================================================================
-- PASSO 3: CONFIGURAR VARIÁVEIS DE AMBIENTE (EXECUTAR APENAS UMA VEZ)
-- ============================================================================

-- IMPORTANTE: Substitua os valores abaixo pelos seus valores reais
-- Obtenha esses valores no Dashboard do Supabase:
-- 1. Project URL: Settings > API > Project URL
-- 2. Service Role Key: Settings > API > service_role key (secret)

-- Exemplo de configuração (AJUSTE OS VALORES):
-- ALTER DATABASE postgres SET app.settings.project_url = 'https://YOUR_PROJECT_REF.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';

-- ⚠️ ATENÇÃO: NÃO COMMITE O SERVICE ROLE KEY NO REPOSITÓRIO!
-- Execute essas configurações diretamente no SQL Editor do Supabase.

-- ============================================================================
-- PASSO 4: AGENDAR CRON JOB (Executar diariamente às 2h da manhã)
-- ============================================================================

-- Remover job existente (se houver)
SELECT cron.unschedule('cleanup-temp-uploads-daily');

-- Criar novo job
-- Cron expression: '0 2 * * *' = Todo dia às 2:00 AM (UTC)
SELECT cron.schedule(
  'cleanup-temp-uploads-daily',  -- Nome do job
  '0 2 * * *',                   -- Cron expression (2h da manhã, UTC)
  $$
  SELECT call_cleanup_temp_uploads();
  $$
);

-- ============================================================================
-- PASSO 5: VERIFICAR CONFIGURAÇÃO
-- ============================================================================

-- Listar todos os cron jobs
SELECT * FROM cron.job;

-- Verificar histórico de execuções
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-temp-uploads-daily')
ORDER BY start_time DESC
LIMIT 10;

-- ============================================================================
-- PASSO 6: TESTAR MANUALMENTE (OPCIONAL)
-- ============================================================================

-- Executar limpeza manualmente para testar
SELECT call_cleanup_temp_uploads();

-- ============================================================================
-- COMANDOS ÚTEIS PARA GERENCIAMENTO
-- ============================================================================

-- Desabilitar o cron job temporariamente
-- UPDATE cron.job SET active = false WHERE jobname = 'cleanup-temp-uploads-daily';

-- Reabilitar o cron job
-- UPDATE cron.job SET active = true WHERE jobname = 'cleanup-temp-uploads-daily';

-- Alterar horário de execução (exemplo: 3h da manhã)
-- SELECT cron.schedule(
--   'cleanup-temp-uploads-daily',
--   '0 3 * * *',
--   $$SELECT call_cleanup_temp_uploads();$$
-- );

-- Deletar o cron job permanentemente
-- SELECT cron.unschedule('cleanup-temp-uploads-daily');

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

-- 1. TIMEZONE: O pg_cron usa UTC por padrão. Ajuste o horário conforme necessário.
--    Exemplo: Para executar às 2h (horário de Brasília/BRT = UTC-3), use '5 * * *' (5h UTC)

-- 2. LOGS: Verifique os logs da Edge Function no Dashboard do Supabase:
--    Functions > cleanup-temp-uploads > Logs

-- 3. MONITORAMENTO: Monitore o histórico de execuções:
--    SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- 4. PERMISSÕES: Esta configuração requer permissões de superusuário.
--    No Supabase, execute diretamente no SQL Editor com sua conta de admin.

-- 5. CUSTOS: A execução diária consome créditos de Edge Function.
--    Monitore o uso no Dashboard: Settings > Usage

-- ============================================================================
-- FIM DA CONFIGURAÇÃO
-- ============================================================================