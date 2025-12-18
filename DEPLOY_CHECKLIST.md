# 🚀 Deploy Checklist - Vercel + Supabase

## ✅ Pré-requisitos

### 1. Variáveis de Ambiente na Vercel

**CRÍTICO:** As variáveis `VITE_*` devem estar configuradas **ANTES** do build.

Acesse: **Vercel Dashboard** → **Seu Projeto** → **Settings** → **Environment Variables**

Adicione as seguintes variáveis para **TODOS** os ambientes (Production, Preview, Development):

| Key | Value | Environments |
|-----|-------|--------------|
| `VITE_SUPABASE_URL` | `https://muqjeukjyfhwtbynrxkm.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbG...` (sua chave anon) | Production, Preview, Development |

⚠️ **IMPORTANTE:** 
- As variáveis devem ter o prefixo `VITE_` (não `REACT_APP_`)
- Elas são embedadas durante o build, não em runtime
- Qualquer mudança requer **Redeploy**

---

### 2. Edge Functions no Supabase

Verifique se as Edge Functions estão deployadas:

Acesse: **Supabase Dashboard** → **Seu Projeto** → **Edge Functions**

Devem estar listadas:
- ✅ `check-rate-limit` (Status: Deployed)
- ✅ `protected-login` (Status: Deployed)

---

### 3. Tabelas no Supabase

Verifique se as tabelas existem:

Acesse: **Supabase Dashboard** → **Seu Projeto** → **Table Editor**

Devem estar criadas:
- ✅ `rate_limit_attempts` (com RLS habilitado)
- ✅ `users` (tabela auth.users é automática)

---

## 🔄 Como Fazer Redeploy na Vercel

### Opção A: Redeploy com Clear Cache (Recomendado)

1. Acesse: **Vercel Dashboard** → **Seu Projeto** → **Deployments**
2. Clique no último deploy (o mais recente)
3. Clique no botão **⋯** (três pontos) no canto superior direito
4. Selecione: **Redeploy**
5. ✅ **MARQUE** a opção: **"Clear cache and redeploy"**
6. Clique em **Redeploy**
7. Aguarde o status mudar para **"Ready"** (~2-3 minutos)

### Opção B: Novo Commit (Alternativa)

```bash
cd /workspace/github-deploy
git add .
git commit -m "chore: trigger redeploy with env vars"
git push origin main
```

---

## 🧪 Teste Após Deploy

### 1. Verificar Variáveis de Ambiente no Build

Acesse o log do deploy na Vercel e procure por:
```
✓ Loaded env variables from .env
```

### 2. Testar Login

1. Abra o site em produção
2. Abra DevTools (F12) → Aba **Network**
3. Tente fazer login
4. Verifique a requisição para `protected-login`:
   - ✅ Status: 200 (sucesso) ou 401 (credenciais erradas)
   - ❌ Status: 404 (Edge Function não encontrada)

### 3. Verificar URL da Requisição

No DevTools → Network → Clique na requisição `protected-login`:

**URL esperada:**
```
https://muqjeukjyfhwtbynrxkm.supabase.co/functions/v1/protected-login
```

**Se a URL estiver diferente (ex: `undefined/functions/...`):**
- ❌ As variáveis de ambiente não foram carregadas no build
- ✅ Faça redeploy com "Clear cache and redeploy"

---

## 🐛 Troubleshooting

### Problema: Ainda dá erro 404 após redeploy

**Possíveis causas:**

1. **Variáveis não foram salvas corretamente**
   - Verifique se as variáveis estão em **TODOS** os ambientes
   - Verifique se não há espaços extras no início/fim dos valores

2. **Cache do navegador**
   - Limpe o cache (Ctrl+Shift+Delete)
   - Teste em aba anônima
   - Teste em outro navegador

3. **Edge Function inativa**
   - Acesse o Supabase Dashboard
   - Vá em Edge Functions
   - Clique em `protected-login`
   - Verifique se está "Deployed" (não "Paused")

4. **CORS da Edge Function**
   - Verifique se a Edge Function retorna headers CORS
   - Teste diretamente com curl:
   ```bash
   curl -X POST \
     https://muqjeukjyfhwtbynrxkm.supabase.co/functions/v1/protected-login \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -d '{"email":"test@test.com","password":"test123"}'
   ```

---

## 📊 Status Atual

### ✅ Configurações Verificadas (Pelas Imagens)

- [x] Variáveis de ambiente existem na Vercel
- [x] Edge Functions deployadas no Supabase
- [x] Tabela `rate_limit_attempts` criada e funcionando

### ⏳ Próximos Passos

1. [ ] Fazer redeploy na Vercel com "Clear cache and redeploy"
2. [ ] Aguardar status "Ready"
3. [ ] Testar login novamente
4. [ ] Verificar URL da requisição no DevTools
5. [ ] Reportar resultado

---

## 📞 Suporte

Se o erro 404 persistir após seguir todos os passos:

1. Capture screenshot do DevTools → Network → Requisição `protected-login`
2. Copie a URL completa que está sendo chamada
3. Copie os headers da requisição
4. Verifique os logs da Edge Function no Supabase
5. Me informe para investigação adicional

---

**Última atualização:** 2025-12-18
**Status:** ⏳ Aguardando redeploy na Vercel