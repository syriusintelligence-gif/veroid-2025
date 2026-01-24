# ✅ CHECKLIST DE ATIVAÇÃO - EDGE FUNCTION

Use este checklist para garantir uma ativação segura e sem problemas.

---

## 📋 PRÉ-ATIVAÇÃO

### 1. Verificações de Infraestrutura

- [ ] **Edge Function Deployada**
  ```bash
  # Verificar se a Edge Function está ativa
  curl -X OPTIONS https://muqjeukjyfhwtbynrxkm.supabase.co/functions/v1/sign-content
  # Esperado: 200 OK ou 405 Method Not Allowed
  ```

- [ ] **ENCRYPTION_KEY Configurada**
  ```bash
  # Verificar secrets no Supabase
  supabase secrets list
  # Deve conter: ENCRYPTION_KEY
  ```

- [ ] **Chaves Migradas**
  ```sql
  -- Verificar se chaves estão criptografadas
  SELECT 
    COUNT(*) as total_keys,
    COUNT(encrypted_private_key) as encrypted_keys
  FROM key_pairs;
  -- encrypted_keys deve ser igual a total_keys
  ```

- [ ] **Backup Realizado**
  ```bash
  # Verificar se backups existem
  ls -la /workspace/github-deploy/docs/migration/backups/
  ```

---

### 2. Verificações de Código

- [ ] **Arquivos Criados**
  - [ ] `src/lib/services/edge-function-service.ts`
  - [ ] `src/lib/services/feature-flags.ts`
  - [ ] `src/lib/services/supabase-crypto-enhanced.ts`
  - [ ] `docs/integration/phase3/PHASE3_FRONTEND_INTEGRATION.md`

- [ ] **Imports Corretos**
  ```bash
  # Verificar se não há erros de compilação
  cd /workspace/github-deploy
  pnpm run build
  ```

- [ ] **TypeScript Sem Erros**
  ```bash
  pnpm run type-check
  ```

---

## 🧪 TESTES INICIAIS

### 3. Teste de Conectividade

- [ ] **Abrir Console do Navegador**
  - Acesse: `http://localhost:5173` (ou URL de dev)
  - Pressione F12 para abrir DevTools
  - Vá para a aba "Console"

- [ ] **Testar Conectividade**
  ```javascript
  // Copiar e colar no console:
  const { testEdgeFunctionConnectivity } = await import('/src/lib/services/edge-function-service.ts');
  const status = await testEdgeFunctionConnectivity();
  console.log('Disponível?', status.available);
  console.log('Tempo:', status.responseTime + 'ms');
  ```
  - [ ] `status.available` deve ser `true`
  - [ ] `status.responseTime` deve ser < 5000ms

---

### 4. Teste de Feature Flags

- [ ] **Verificar Status Inicial**
  ```javascript
  window.FeatureFlags.printStatus()
  ```
  - [ ] `USE_EDGE_FUNCTION_SIGNING` deve estar `INATIVA` 🔴
  - [ ] `ENABLE_FALLBACK` deve estar `ATIVA` ✅

- [ ] **Testar Ativação/Desativação**
  ```javascript
  // Ativar
  window.FeatureFlags.enableEdgeFunction()
  window.FeatureFlags.printStatus()
  // Verificar: USE_EDGE_FUNCTION_SIGNING = ATIVA ✅
  
  // Desativar
  window.FeatureFlags.disableEdgeFunction()
  window.FeatureFlags.printStatus()
  // Verificar: USE_EDGE_FUNCTION_SIGNING = INATIVA 🔴
  ```

---

## 🚀 ATIVAÇÃO GRADUAL

### 5. Fase 1: Teste Individual (Você)

- [ ] **Ativar Edge Function**
  ```javascript
  window.FeatureFlags.enableEdgeFunction()
  window.FeatureFlags.enableDebug()
  ```

- [ ] **Assinar Conteúdo de Teste**
  1. Ir para `/sign-content`
  2. Preencher formulário:
     - Título: "Teste Edge Function - [Seu Nome]"
     - Tipo: Texto
     - Plataforma: Instagram
     - Conteúdo: "Testando assinatura segura via Edge Function"
  3. Clicar em "Assinar Digitalmente"

- [ ] **Verificar Logs no Console**
  - [ ] Ver: `🚀 [Enhanced] Usando Edge Function para assinatura segura...`
  - [ ] Ver: `✅ [EdgeFunction] Assinatura concluída em XXXms`
  - [ ] Ver: `✅ [Enhanced] Assinatura via Edge Function concluída com sucesso!`
  - [ ] **NÃO** ver: `🔄 [Enhanced] Fallback ativo...`

- [ ] **Validar Resultado**
  1. Copiar o código de verificação (ex: "A1B2C3D4")
  2. Ir para `/verify`
  3. Colar o código
  4. Verificar: ✅ "Conteúdo autêntico!"

- [ ] **Verificar no Banco**
  ```sql
  SELECT 
    id,
    creator_name,
    verification_code,
    LENGTH(signature) as sig_len,
    LENGTH(content_hash) as hash_len,
    created_at
  FROM signed_contents
  ORDER BY created_at DESC
  LIMIT 1;
  ```
  - [ ] `sig_len` = 64
  - [ ] `hash_len` = 64

---

### 6. Fase 2: Teste de Fallback

- [ ] **Simular Falha da Edge Function**
  ```javascript
  // Temporariamente, alterar URL para forçar erro
  // Em edge-function-service.ts, linha ~20:
  // EDGE_FUNCTION_URL: 'https://invalid-url.com/sign-content',
  ```

- [ ] **Assinar Conteúdo**
  1. Ir para `/sign-content`
  2. Preencher formulário
  3. Clicar em "Assinar Digitalmente"

- [ ] **Verificar Logs no Console**
  - [ ] Ver: `❌ [EdgeFunction] Erro na resposta...`
  - [ ] Ver: `🔄 [Enhanced] Fallback ativo, usando método client-side...`
  - [ ] Ver: `✅ [Enhanced] Assinatura client-side concluída com sucesso!`

- [ ] **Validar Resultado**
  - [ ] Assinatura foi concluída (apesar do erro)
  - [ ] Conteúdo foi salvo no banco
  - [ ] Verificação funciona normalmente

- [ ] **Restaurar URL Correta**
  ```javascript
  // Reverter alteração em edge-function-service.ts
  ```

---

### 7. Fase 3: Teste com Equipe (3-5 pessoas)

- [ ] **Instruir Equipe**
  - Enviar este checklist
  - Pedir para ativar Edge Function
  - Pedir para assinar 2-3 conteúdos cada

- [ ] **Coletar Feedback**
  - [ ] Todos conseguiram ativar?
  - [ ] Todas as assinaturas foram bem-sucedidas?
  - [ ] Tempo de resposta aceitável (< 1s)?
  - [ ] Algum erro ou comportamento estranho?

- [ ] **Analisar Métricas**
  ```sql
  -- Assinaturas nas últimas 24h
  SELECT 
    COUNT(*) as total,
    DATE_TRUNC('hour', created_at) as hora
  FROM signed_contents
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY hora
  ORDER BY hora DESC;
  ```

---

### 8. Fase 4: Rollout Gradual (10% → 50% → 100%)

- [ ] **10% dos Usuários (1 semana)**
  - [ ] Ativar para 10% aleatoriamente
  - [ ] Monitorar taxa de erro < 1%
  - [ ] Monitorar tempo de resposta < 500ms

- [ ] **50% dos Usuários (2 semanas)**
  - [ ] Aumentar para 50%
  - [ ] Continuar monitoramento
  - [ ] Validar fallback < 5%

- [ ] **100% dos Usuários (1 mês)**
  - [ ] Ativar para todos
  - [ ] Monitorar por 1 semana
  - [ ] Considerar desativar método client-side

---

## 📊 MONITORAMENTO PÓS-ATIVAÇÃO

### 9. Métricas Diárias

- [ ] **Taxa de Sucesso**
  ```sql
  -- Deve ser > 95%
  SELECT 
    COUNT(*) as total_assinaturas,
    DATE(created_at) as dia
  FROM signed_contents
  WHERE created_at > NOW() - INTERVAL '7 days'
  GROUP BY dia
  ORDER BY dia DESC;
  ```

- [ ] **Tempo Médio de Resposta**
  - Verificar logs: `executionTime`
  - Meta: < 500ms

- [ ] **Taxa de Fallback**
  - Verificar logs: `method: 'client_side'` após tentativa de Edge Function
  - Meta: < 5%

---

### 10. Alertas e Notificações

- [ ] **Configurar Alertas**
  - [ ] Taxa de erro > 5%
  - [ ] Tempo de resposta > 1s
  - [ ] Edge Function indisponível

- [ ] **Dashboard de Monitoramento**
  - [ ] Criar dashboard no Supabase
  - [ ] Adicionar gráficos de:
    - Assinaturas por hora
    - Tempo de resposta
    - Taxa de sucesso/erro

---

## 🔄 ROLLBACK (Se Necessário)

### 11. Procedimento de Rollback

- [ ] **Desativar Imediatamente**
  ```javascript
  window.FeatureFlags.disableEdgeFunction()
  ```

- [ ] **Notificar Equipe**
  - Enviar mensagem: "Edge Function desativada temporariamente"

- [ ] **Investigar Causa**
  - Verificar logs da Edge Function
  - Verificar logs do frontend
  - Identificar padrão de erros

- [ ] **Corrigir Problema**
  - Aplicar correção
  - Re-testar localmente
  - Re-ativar gradualmente

---

## ✅ CRITÉRIOS DE SUCESSO

### Ativação Bem-Sucedida Se:

- ✅ Taxa de sucesso > 95%
- ✅ Tempo de resposta < 500ms
- ✅ Taxa de fallback < 5%
- ✅ Zero reclamações de usuários
- ✅ Todas as validações passam

### Rollback Necessário Se:

- ❌ Taxa de sucesso < 90%
- ❌ Tempo de resposta > 2s consistentemente
- ❌ Taxa de fallback > 20%
- ❌ Múltiplas reclamações de usuários
- ❌ Edge Function indisponível por > 5 minutos

---

## 📝 NOTAS FINAIS

- **Data de Ativação**: _______________
- **Responsável**: _______________
- **Versão**: 1.0.0
- **Status**: [ ] Planejado [ ] Em Progresso [ ] Concluído [ ] Rollback

**Observações**:
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

## 🎉 PARABÉNS!

Se você chegou até aqui e todos os checkboxes estão marcados, a integração foi um sucesso! 🚀

A aplicação Vero iD agora usa assinatura server-side segura, mantendo as chaves privadas protegidas no servidor.

**Próximos Passos**:
1. Monitorar por 30 dias
2. Coletar feedback dos usuários
3. Considerar desativar método client-side antigo
4. Documentar lições aprendidas