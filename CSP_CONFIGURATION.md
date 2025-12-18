# 🔒 Content Security Policy (CSP) - Configuração

## Problema Resolvido

**Erro anterior:**
```
Creating a worker from 'blob:...' violates the following Content Security Policy directive
```

**Causa:** O CSP estava bloqueando Web Workers necessários para o Supabase funcionar corretamente.

---

## ✅ Solução Implementada

Criado arquivo `vercel.json` com configuração de CSP otimizada que:

### 1. **Permite Workers do Supabase**
- `worker-src 'self' blob:` - Permite workers de blob URLs
- `script-src` inclui `blob:` - Permite scripts de blob URLs

### 2. **Mantém Segurança**
- Restringe fontes de scripts apenas a domínios confiáveis
- Bloqueia iframes de outros domínios (`frame-ancestors 'none'`)
- Previne MIME type sniffing (`X-Content-Type-Options: nosniff`)
- Protege contra clickjacking (`X-Frame-Options: DENY`)

### 3. **Permite Funcionalidades Necessárias**
- ✅ Supabase Edge Functions
- ✅ Supabase Realtime (WebSocket)
- ✅ Sentry (monitoramento de erros)
- ✅ CDN do jsDelivr (bibliotecas)
- ✅ Imagens de qualquer origem HTTPS

---

## 📋 Detalhamento das Diretivas CSP

| Diretiva | Valor | Propósito |
|----------|-------|-----------|
| `default-src` | `'self'` | Padrão: apenas mesmo domínio |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.sentry.io https://*.supabase.co blob:` | Scripts do app, Supabase, Sentry, CDN e workers |
| `worker-src` | `'self' blob:` | **CRÍTICO**: Permite Web Workers do Supabase |
| `style-src` | `'self' 'unsafe-inline' https://cdn.jsdelivr.net` | Estilos inline e do CDN |
| `img-src` | `'self' data: https: blob:` | Imagens de qualquer HTTPS, data URIs e blobs |
| `font-src` | `'self' data: https://cdn.jsdelivr.net` | Fontes locais, data URIs e CDN |
| `connect-src` | `'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co` | APIs e WebSockets do Supabase e Sentry |
| `frame-ancestors` | `'none'` | Bloqueia embedding em iframes |
| `base-uri` | `'self'` | Previne ataques de base tag injection |
| `form-action` | `'self'` | Formulários só podem enviar para mesmo domínio |

---

## 🚀 Como Aplicar

### **Passo 1: Commit e Push**
```bash
cd /workspace/github-deploy
git add vercel.json
git commit -m "Add CSP configuration to fix Supabase workers"
git push origin main
```

### **Passo 2: Aguardar Deploy**
- A Vercel detectará o novo `vercel.json`
- Fará redeploy automático
- Aguarde o status "Ready"

### **Passo 3: Testar Novamente**
1. Abra o site em produção
2. Abra o DevTools (F12) > Console
3. Tente fazer login
4. **NÃO DEVE** aparecer mais o erro de CSP sobre workers

---

## 🧪 Validação

Após o deploy, verifique:

✅ **Console do navegador limpo** - Sem erros de CSP
✅ **Login funcionando** - Com credenciais corretas
✅ **Rate limiting funcionando** - Bloqueio após 5 tentativas
✅ **Desbloqueio após 15 minutos** - Sistema permite login novamente

---

## ⚠️ Notas de Segurança

### **Diretivas Permissivas (Necessárias)**
- `'unsafe-inline'` - Necessário para estilos inline do React
- `'unsafe-eval'` - Necessário para algumas bibliotecas (Supabase, etc.)
- `blob:` - **CRÍTICO** para Web Workers do Supabase

### **Por que são seguras neste contexto:**
1. Aplicação usa sanitização de inputs (DOMPurify)
2. Rate limiting previne ataques de força bruta
3. Todas as fontes externas são de domínios confiáveis
4. Headers adicionais (X-Frame-Options, etc.) reforçam segurança

### **Melhorias Futuras (Opcional):**
- Implementar nonces para scripts inline
- Usar hashes SHA-256 para estilos inline específicos
- Migrar para CSP mais restritivo quando possível

---

## 🐛 Troubleshooting

### **Problema: Erro de CSP persiste após deploy**
**Solução:**
1. Limpe cache do navegador (Ctrl+Shift+Delete)
2. Teste em aba anônima
3. Verifique se o `vercel.json` foi deployado (veja logs da Vercel)

### **Problema: Outras funcionalidades quebradas**
**Solução:**
1. Verifique console do navegador para novos erros de CSP
2. Adicione o domínio necessário à diretiva apropriada
3. Faça novo commit e deploy

### **Problema: Supabase ainda não funciona**
**Solução:**
1. Verifique se Edge Functions estão deployadas
2. Confirme variáveis de ambiente no Supabase
3. Teste Edge Functions diretamente via curl

---

## 📞 Suporte

Se o problema persistir após aplicar esta configuração:
1. Capture screenshot do console do navegador
2. Copie erro completo de CSP (se houver)
3. Verifique logs da Vercel e Supabase
4. Me informe para investigação adicional

---

**Última atualização:** 2025-12-18
**Status:** ✅ Pronto para deploy