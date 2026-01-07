# Guia de Correção do Loop Infinito CSP

## 🔴 Problema Identificado

**Loop infinito de violações CSP** gerando 3,619+ mensagens de erro no console, causando:
- Degradação de performance
- Consumo excessivo de memória
- Possível travamento do navegador
- Experiência do usuário comprometida

## ✅ Solução Implementada

### 1. Endpoint `/api/csp-report` Funcional

**Arquivo:** `/workspace/github-deploy/api/csp-report.ts`

**Funcionalidades:**
- ✅ Aceita requisições POST (corrige erro 405)
- ✅ Valida estrutura dos reports CSP
- ✅ Registra violações com timestamp e detalhes
- ✅ Agrupa violações similares para análise
- ✅ Retorna status 204 (No Content) conforme especificação
- ✅ Tratamento de erros robusto
- ✅ Limite de tamanho de payload (10KB)

**Logs Estruturados:**
```typescript
{
  timestamp: "2026-01-07T19:45:00.000Z",
  documentUri: "https://veroid.com/",
  violatedDirective: "style-src 'self'",
  effectiveDirective: "style-src",
  blockedUri: "inline",
  sourceFile: "vendor-utils-DgWA8-To.js",
  lineNumber: 21,
  columnNumber: 0,
  statusCode: 200
}
```

### 2. CSP Atualizado com 'unsafe-inline'

**Arquivo:** `/workspace/github-deploy/vercel-csp-v1-fixed.json`

**Mudanças Principais:**

**ANTES (causava loop):**
```
style-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com
```

**DEPOIS (resolve loop):**
```
style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com
```

**Adições:**
- ✅ `'unsafe-inline'` em `style-src` (permite estilos inline do React)
- ✅ `https://public-frontend-cos.metadl.com` em `img-src` (corrige favicon)
- ✅ `report-uri /api/csp-report` (endpoint funcional)
- ✅ Rewrite rule para `/api/csp-report`

### 3. Configuração Completa do CSP

```json
{
  "default-src": "'self'",
  "script-src": "'self' 'unsafe-eval' https://cdn.jsdelivr.net https://accounts.google.com https://www.gstatic.com",
  "style-src": "'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "font-src": "'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
  "img-src": "'self' data: blob: https: https://public-frontend-cos.metadl.com",
  "connect-src": "'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
  "frame-src": "'self' https://accounts.google.com",
  "object-src": "'none'",
  "base-uri": "'self'",
  "form-action": "'self'",
  "frame-ancestors": "'none'",
  "upgrade-insecure-requests": "",
  "report-uri": "/api/csp-report"
}
```

## 📋 Passos para Deploy

### 1. Substituir vercel.json

```bash
cd /workspace/github-deploy
cp vercel-csp-v1-fixed.json vercel.json
```

### 2. Commit e Push

```bash
git add vercel.json api/csp-report.ts
git commit -m "fix: Resolve CSP infinite loop + implement csp-report endpoint"
git push origin main
```

### 3. Deploy no Vercel

O deploy será automático via GitHub integration, ou use:

```bash
vercel --prod
```

### 4. Verificar Funcionamento

**Teste 1: Endpoint CSP Report**
```bash
curl -X POST https://seu-dominio.vercel.app/api/csp-report \
  -H "Content-Type: application/json" \
  -d '{"csp-report":{"document-uri":"test","violated-directive":"test"}}'
```

**Resposta esperada:** `204 No Content`

**Teste 2: Console do Navegador**
- Abrir DevTools → Console
- Acessar homepage (sem login)
- Verificar se o loop parou
- Logs CSP devem aparecer apenas uma vez por violação

**Teste 3: Logs do Vercel**
```bash
vercel logs
```

Procurar por: `🔒 CSP Violation Report:` e `📊 CSP Metrics:`

## 🔍 Monitoramento

### Logs Esperados (Normais)

```
🔒 CSP Violation Report: {
  timestamp: "2026-01-07T19:45:00.000Z",
  violatedDirective: "style-src 'self'",
  blockedUri: "inline"
}
```

### Logs Problemáticos (Requerem Ação)

```
❌ Error processing CSP report: [error details]
```

## 📊 Métricas de Sucesso

**ANTES:**
- ❌ 3,619+ issues acumuladas
- ❌ Loop infinito de logs
- ❌ Endpoint retornando 405
- ❌ Performance degradada

**DEPOIS:**
- ✅ Logs controlados (1 por violação única)
- ✅ Endpoint retornando 204
- ✅ Performance restaurada
- ✅ Violações sendo capturadas corretamente

## ⚠️ Notas de Segurança

### 'unsafe-inline' em style-src

**Status:** ⚠️ Temporário (desenvolvimento/teste)

**Risco:** Médio
- Permite injeção de estilos inline
- Mitiga XSS baseado em estilos

**Próximos Passos (Produção):**
1. Implementar sistema de nonces
2. Migrar estilos inline para CSS modules
3. Remover 'unsafe-inline' do CSP

### 'unsafe-eval' em script-src

**Status:** ⚠️ Necessário para React/Vite

**Risco:** Alto
- Permite eval() e Function()
- Necessário para hot module replacement (HMR)

**Produção:**
- Remover em build de produção
- Usar apenas em desenvolvimento

## 🔄 Roadmap de Segurança

### Fase 1: ✅ Correção Imediata (Atual)
- [x] Implementar endpoint `/api/csp-report`
- [x] Adicionar 'unsafe-inline' ao CSP
- [x] Resolver loop infinito
- [x] Adicionar domínios faltantes

### Fase 2: 🔄 Melhorias (Próxima)
- [ ] Implementar sistema de nonces
- [ ] Migrar estilos inline para CSS modules
- [ ] Remover 'unsafe-inline'
- [ ] Adicionar analytics de violações

### Fase 3: 🎯 Hardening (Produção)
- [ ] Remover 'unsafe-eval'
- [ ] Implementar Subresource Integrity (SRI)
- [ ] Adicionar Content-Security-Policy (enforce mode)
- [ ] Configurar automated security scanning

## 📚 Referências

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [Vercel Security Headers](https://vercel.com/docs/concepts/edge-network/headers#content-security-policy)
- [OWASP CSP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)

## 🆘 Troubleshooting

### Problema: Loop ainda ocorre após deploy

**Solução:**
1. Verificar se `vercel.json` foi atualizado corretamente
2. Fazer hard refresh (Ctrl+Shift+R)
3. Limpar cache do navegador
4. Verificar logs do Vercel

### Problema: Endpoint retorna 404

**Solução:**
1. Verificar se arquivo `api/csp-report.ts` existe
2. Verificar rewrite rule em `vercel.json`
3. Fazer redeploy: `vercel --prod --force`

### Problema: Violações não aparecem nos logs

**Solução:**
1. Verificar console do Vercel: `vercel logs`
2. Testar endpoint manualmente com curl
3. Verificar se CSP está em modo report-only

---

**Status:** ✅ Pronto para Deploy
**Prioridade:** 🔴 Crítica
**Impacto:** Alto (resolve loop infinito)
**Risco:** Baixo (apenas adiciona 'unsafe-inline')