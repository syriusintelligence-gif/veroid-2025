# 🚀 QUICK START - ATIVAÇÃO DA EDGE FUNCTION

Guia rápido para ativar a assinatura segura via Edge Function em 5 minutos.

---

## ⚡ ATIVAÇÃO RÁPIDA (5 MINUTOS)

### 1️⃣ Abrir Console do Navegador (30 segundos)

1. Acesse a aplicação: `http://localhost:5173` ou sua URL de produção
2. Pressione **F12** (ou Cmd+Option+I no Mac)
3. Clique na aba **Console**

---

### 2️⃣ Verificar Status Atual (30 segundos)

Cole no console:

```javascript
window.FeatureFlags.printStatus()
```

**Resultado Esperado**:
```
🚩 [FeatureFlags] Status Atual:
══════════════════════════════════════════════════
🔴 use_edge_function_signing: INATIVA
🔴 enable_debug_logs: INATIVA
✅ enable_fallback: ATIVA
══════════════════════════════════════════════════
```

---

### 3️⃣ Ativar Edge Function (30 segundos)

Cole no console:

```javascript
window.FeatureFlags.enableEdgeFunction()
window.FeatureFlags.enableDebug()
window.FeatureFlags.printStatus()
```

**Resultado Esperado**:
```
✅ [FeatureFlags] Feature ativada: use_edge_function_signing
✅ [FeatureFlags] Feature ativada: enable_debug_logs
🚩 [FeatureFlags] Status Atual:
══════════════════════════════════════════════════
✅ use_edge_function_signing: ATIVA
✅ enable_debug_logs: ATIVA
✅ enable_fallback: ATIVA
══════════════════════════════════════════════════
```

---

### 4️⃣ Testar Assinatura (3 minutos)

1. **Ir para a página de assinatura**: `/sign-content`

2. **Preencher o formulário**:
   - **Título**: "Teste Edge Function"
   - **Tipo**: Texto
   - **Plataforma**: Instagram ✅
   - **Conteúdo**: "Testando assinatura segura via Edge Function"

3. **Clicar em**: "Assinar Digitalmente"

4. **Observar o console** - Deve mostrar:
   ```
   🚀 [Enhanced] Usando Edge Function para assinatura segura...
   🔐 [EdgeFunction] Iniciando assinatura segura via Edge Function...
   📤 [EdgeFunction] Enviando requisição para: https://...
   📥 [EdgeFunction] Resposta recebida: 200 OK
   ✅ [EdgeFunction] Assinatura concluída em 283ms
   ✅ [Enhanced] Assinatura via Edge Function concluída com sucesso!
   ```

5. **Copiar o código de verificação** (ex: "A1B2C3D4")

---

### 5️⃣ Validar Resultado (1 minuto)

1. **Ir para**: `/verify`
2. **Colar o código** de verificação
3. **Clicar em**: "Verificar"

**Resultado Esperado**: ✅ **"Conteúdo autêntico! A assinatura digital foi verificada com sucesso."**

---

## ✅ PRONTO!

Se você viu todas as mensagens acima, **parabéns!** 🎉

A Edge Function está **ATIVA** e funcionando corretamente!

---

## 🔄 DESATIVAR (Se Necessário)

Para desativar a Edge Function e voltar ao método tradicional:

```javascript
window.FeatureFlags.disableEdgeFunction()
window.FeatureFlags.printStatus()
```

**Resultado**:
```
🔴 [FeatureFlags] Feature desativada: use_edge_function_signing
🚩 [FeatureFlags] Status Atual:
══════════════════════════════════════════════════
🔴 use_edge_function_signing: INATIVA
✅ enable_fallback: ATIVA
══════════════════════════════════════════════════
```

---

## 🐛 TROUBLESHOOTING RÁPIDO

### Problema: "window.FeatureFlags is not defined"

**Solução**: Recarregue a página (Ctrl+R ou Cmd+R)

---

### Problema: Edge Function retorna erro 500

**Logs no Console**:
```
❌ [EdgeFunction] Erro na resposta: 500 Internal Server Error
🔄 [Enhanced] Fallback ativo, usando método client-side...
✅ [Enhanced] Assinatura client-side concluída com sucesso!
```

**O que aconteceu**: Edge Function falhou, mas o **fallback automático** funcionou! ✅

**Ação**: Nenhuma! O sistema continuou funcionando normalmente.

**Investigar depois**: Verificar logs da Edge Function no Supabase.

---

### Problema: Assinatura demora muito (> 5 segundos)

**Possíveis Causas**:
- Edge Function está lenta
- Rede instável
- Banco de dados sobrecarregado

**Solução Temporária**: Desativar Edge Function
```javascript
window.FeatureFlags.disableEdgeFunction()
```

**Solução Permanente**: Investigar performance da Edge Function

---

## 📊 COMANDOS ÚTEIS

### Ver todas as flags
```javascript
window.FeatureFlags.getAll()
```

### Resetar para padrão
```javascript
window.FeatureFlags.reset()
```

### Ativar apenas logs de debug
```javascript
window.FeatureFlags.enableDebug()
```

### Desativar logs de debug
```javascript
window.FeatureFlags.disableDebug()
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

Para mais detalhes, consulte:

- **Integração Completa**: `docs/integration/phase3/PHASE3_FRONTEND_INTEGRATION.md`
- **Checklist de Ativação**: `docs/integration/phase3/ACTIVATION_CHECKLIST.md`
- **Edge Function**: `docs/migration/PHASE2_EDGE_FUNCTION.md`

---

## 💡 DICAS

1. **Sempre ative o fallback**: Garante que o sistema continue funcionando mesmo se a Edge Function falhar
2. **Use logs de debug**: Ajuda a identificar problemas rapidamente
3. **Teste localmente primeiro**: Antes de ativar em produção
4. **Monitore as métricas**: Taxa de sucesso, tempo de resposta, taxa de fallback

---

## 🎯 PRÓXIMOS PASSOS

Após ativar e testar com sucesso:

1. ✅ Testar com 2-3 pessoas da equipe
2. ✅ Monitorar por 1 semana
3. ✅ Ativar para 10% dos usuários
4. ✅ Rollout gradual até 100%

---

## 🆘 PRECISA DE AJUDA?

- Verifique os logs no console do navegador
- Execute `window.FeatureFlags.printStatus()` para diagnóstico
- Consulte a documentação completa
- Em caso de emergência: `window.FeatureFlags.disableEdgeFunction()`

---

**Versão**: 1.0.0  
**Última Atualização**: 2025-01-12  
**Status**: ✅ Pronto para Uso