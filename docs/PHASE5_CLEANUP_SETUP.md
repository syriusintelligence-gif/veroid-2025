# 🧹 FASE 5: CONFIGURAÇÃO DE LIMPEZA AUTOMÁTICA

**Sistema:** Vero iD - Assinatura Digital  
**Autor:** Alex (Engineer)  
**Data:** 2026-01-20  
**Status:** ✅ IMPLEMENTADO

---

## 📋 VISÃO GERAL

A Fase 5 implementa limpeza automática de arquivos temporários no bucket `temp-uploads` do Supabase Storage. Arquivos com mais de 24 horas são deletados automaticamente todos os dias às 2h da manhã (UTC).

---

## 🎯 PROBLEMA RESOLVIDO

**Antes:**
- Arquivos temporários acumulavam indefinidamente
- Uso desnecessário de espaço de armazenamento
- Custos crescentes de storage
- Risco de atingir limite de armazenamento

**Depois:**
- Limpeza automática diária
- Apenas arquivos recentes (<24h) são mantidos
- Otimização de custos
- Storage sempre limpo e organizado

---

## 🏗️ ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE LIMPEZA                         │
└─────────────────────────────────────────────────────────────┘

1. AGENDAMENTO (pg_cron)
   ├─ Todo dia às 2h da manhã (UTC)
   ├─ Cron expression: '0 2 * * *'
   └─ Chama função call_cleanup_temp_uploads()

2. FUNÇÃO AUXILIAR (PostgreSQL)
   ├─ Obtém URL do projeto
   ├─ Obtém Service Role Key
   ├─ Faz requisição HTTP POST
   └─ Chama Edge Function

3. EDGE FUNCTION (Deno)
   ├─ Lista todos os arquivos de temp-uploads
   ├─ Filtra arquivos com >24 horas
   ├─ Deleta arquivos antigos em lote
   └─ Retorna relatório de limpeza

4. RESULTADO
   ├─ Arquivos deletados
   ├─ Logs detalhados
   └─ Métricas de execução
```

---

## 📦 ARQUIVOS CRIADOS

### 1. Edge Function

**Arquivo:** `supabase/functions/cleanup-temp-uploads/index.ts`

**Responsabilidades:**
- Listar arquivos do bucket `temp-uploads`
- Filtrar arquivos com mais de 24 horas
- Deletar arquivos antigos em lote
- Gerar relatório de limpeza

**Características:**
- ✅ Usa Service Role Key (acesso total)
- ✅ Processa até 1000 arquivos por execução
- ✅ Logs detalhados de cada operação
- ✅ Tratamento robusto de erros
- ✅ Retorna métricas de execução

### 2. Script SQL de Configuração

**Arquivo:** `scripts/setup-cron-cleanup.sql`

**Responsabilidades:**
- Habilitar extensão `pg_cron`
- Criar função auxiliar `call_cleanup_temp_uploads()`
- Configurar variáveis de ambiente
- Agendar cron job diário
- Comandos de gerenciamento

**Características:**
- ✅ Documentação completa inline
- ✅ Exemplos de uso
- ✅ Comandos de teste
- ✅ Comandos de gerenciamento

---

## 🚀 COMO CONFIGURAR

### Passo 1: Deploy da Edge Function

```bash
# No terminal local
cd /workspace/github-deploy

# Deploy da Edge Function
supabase functions deploy cleanup-temp-uploads
```

### Passo 2: Configurar Variáveis de Ambiente

No **SQL Editor do Supabase Dashboard**, execute:

```sql
-- Substitua pelos seus valores reais
ALTER DATABASE postgres SET app.settings.project_url = 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

**Como obter os valores:**
1. **Project URL:** Dashboard > Settings > API > Project URL
2. **Service Role Key:** Dashboard > Settings > API > service_role (secret)

⚠️ **IMPORTANTE:** Nunca commite o Service Role Key no repositório!

### Passo 3: Executar Script de Configuração

No **SQL Editor do Supabase Dashboard**, execute o arquivo completo:

```sql
-- Cole todo o conteúdo de scripts/setup-cron-cleanup.sql
```

### Passo 4: Verificar Configuração

```sql
-- Listar cron jobs
SELECT * FROM cron.job;

-- Verificar se o job foi criado
SELECT * FROM cron.job WHERE jobname = 'cleanup-temp-uploads-daily';
```

### Passo 5: Testar Manualmente

```sql
-- Executar limpeza manualmente
SELECT call_cleanup_temp_uploads();
```

---

## 🧪 COMO TESTAR

### Teste 1: Criar Arquivo Temporário Antigo

```sql
-- 1. Fazer upload de um arquivo via SignContent
-- 2. Verificar se arquivo está em temp-uploads
SELECT * FROM storage.objects
WHERE bucket_id = 'temp-uploads'
ORDER BY created_at DESC
LIMIT 5;

-- 3. Alterar created_at para 25 horas atrás (simulação)
UPDATE storage.objects
SET created_at = NOW() - INTERVAL '25 hours'
WHERE bucket_id = 'temp-uploads'
AND name = 'SEU_ARQUIVO_AQUI';
```

### Teste 2: Executar Limpeza Manualmente

```sql
-- Executar função de limpeza
SELECT call_cleanup_temp_uploads();

-- Verificar se arquivo foi deletado
SELECT * FROM storage.objects
WHERE bucket_id = 'temp-uploads'
ORDER BY created_at DESC;
```

### Teste 3: Verificar Logs da Edge Function

1. Acesse: **Dashboard > Functions > cleanup-temp-uploads > Logs**
2. Verifique se há logs de execução
3. Confirme que arquivos foram deletados

### Teste 4: Verificar Histórico de Cron Jobs

```sql
-- Ver últimas 10 execuções
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-temp-uploads-daily')
ORDER BY start_time DESC
LIMIT 10;
```

---

## 📊 MONITORAMENTO

### Métricas Importantes

| Métrica | Como Verificar | Meta |
|---------|----------------|------|
| **Taxa de Sucesso** | `cron.job_run_details` | 100% |
| **Tempo de Execução** | Logs da Edge Function | < 10s |
| **Arquivos Deletados** | Response da Edge Function | Variável |
| **Uso de Storage** | Dashboard > Storage | < 80% |

### Comandos de Monitoramento

```sql
-- 1. Verificar última execução
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-temp-uploads-daily')
ORDER BY start_time DESC
LIMIT 1;

-- 2. Contar arquivos temporários atuais
SELECT COUNT(*) as total_temp_files
FROM storage.objects
WHERE bucket_id = 'temp-uploads';

-- 3. Verificar arquivos antigos (>24h)
SELECT COUNT(*) as old_files
FROM storage.objects
WHERE bucket_id = 'temp-uploads'
AND created_at < NOW() - INTERVAL '24 hours';

-- 4. Calcular tamanho total do bucket
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size
FROM storage.objects
WHERE bucket_id = 'temp-uploads'
GROUP BY bucket_id;
```

---

## 🔧 GERENCIAMENTO

### Desabilitar Limpeza Temporariamente

```sql
UPDATE cron.job 
SET active = false 
WHERE jobname = 'cleanup-temp-uploads-daily';
```

### Reabilitar Limpeza

```sql
UPDATE cron.job 
SET active = true 
WHERE jobname = 'cleanup-temp-uploads-daily';
```

### Alterar Horário de Execução

```sql
-- Exemplo: Mudar para 3h da manhã
SELECT cron.schedule(
  'cleanup-temp-uploads-daily',
  '0 3 * * *',
  $$SELECT call_cleanup_temp_uploads();$$
);
```

### Deletar Cron Job Permanentemente

```sql
SELECT cron.unschedule('cleanup-temp-uploads-daily');
```

---

## ⚠️ NOTAS IMPORTANTES

### 1. Timezone

O `pg_cron` usa **UTC por padrão**. Para executar em horário local:

- **Brasília (BRT = UTC-3):** Use `5 * * *` para executar às 2h BRT (5h UTC)
- **Lisboa (WET = UTC+0):** Use `2 * * *` para executar às 2h WET

### 2. Custos

- Cada execução consome créditos de Edge Function
- Monitore o uso em: **Dashboard > Settings > Usage**
- Estimativa: ~0.001 créditos por execução (negligível)

### 3. Limites

- Máximo de 1000 arquivos por execução
- Se houver mais de 1000 arquivos, alguns não serão deletados
- Solução: Aumentar frequência (ex: 2x por dia)

### 4. Segurança

- Service Role Key tem acesso total ao projeto
- **NUNCA** exponha o Service Role Key publicamente
- Armazene apenas no banco de dados (configurações)

### 5. Backup

- Arquivos deletados **NÃO podem ser recuperados**
- Certifique-se de que arquivos importantes foram movidos para `signed-documents`
- Considere aumentar o período de retenção (ex: 48h) se necessário

---

## 🐛 TROUBLESHOOTING

### Problema: Cron Job não está executando

**Causa:** Variáveis de ambiente não configuradas

**Solução:**
```sql
-- Verificar se variáveis estão configuradas
SHOW app.settings.project_url;
SHOW app.settings.service_role_key;

-- Se estiverem vazias, configurar novamente
ALTER DATABASE postgres SET app.settings.project_url = 'https://YOUR_PROJECT_REF.supabase.co';
ALTER DATABASE postgres SET app.settings.service_role_key = 'YOUR_SERVICE_ROLE_KEY';
```

### Problema: Edge Function retorna erro 401

**Causa:** Service Role Key inválido ou expirado

**Solução:**
1. Obter novo Service Role Key no Dashboard
2. Atualizar configuração:
```sql
ALTER DATABASE postgres SET app.settings.service_role_key = 'NEW_SERVICE_ROLE_KEY';
```

### Problema: Arquivos não estão sendo deletados

**Causa:** RLS policies bloqueando deleção

**Solução:**
- Edge Function usa Service Role Key, que bypassa RLS
- Verificar logs da Edge Function para erros específicos
- Testar deleção manual:
```sql
SELECT * FROM storage.objects WHERE bucket_id = 'temp-uploads';
```

### Problema: Timeout na execução

**Causa:** Muitos arquivos para deletar

**Solução:**
1. Aumentar frequência de execução (2x por dia)
2. Ou reduzir período de retenção (12h em vez de 24h)

---

## 📈 PRÓXIMOS PASSOS

Após configurar a limpeza automática:

1. ✅ **Monitorar por 1 semana** - Verificar se está funcionando corretamente
2. ✅ **Ajustar horário** - Se necessário, mudar para horário mais conveniente
3. ✅ **Configurar alertas** - Notificações se limpeza falhar
4. ✅ **Documentar métricas** - Quantos arquivos são deletados por dia
5. ✅ **Otimizar período** - Ajustar 24h se necessário (12h, 48h, etc.)

---

## ✅ CHECKLIST DE VALIDAÇÃO

Antes de considerar a Fase 5 completa:

- [ ] Edge Function deployada com sucesso
- [ ] Variáveis de ambiente configuradas
- [ ] Cron job criado e ativo
- [ ] Teste manual executado com sucesso
- [ ] Logs da Edge Function verificados
- [ ] Histórico de cron jobs verificado
- [ ] Monitoramento configurado
- [ ] Documentação revisada

---

**Documento criado por:** Alex (Engineer)  
**Data:** 2026-01-20  
**Versão:** 1.0  
**Status:** ✅ Implementado