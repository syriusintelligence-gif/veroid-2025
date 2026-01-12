# 🔧 INSTRUÇÕES DE DEPLOY - Edge Function Corrigida

## 🎯 Problema Identificado e Corrigido

### **Causa Raiz do Erro 401**

O código anterior tinha um erro crítico na **linha 143**:

```typescript
// ❌ INCORRETO (código anterior)
const { data: { user }, error: authError } = await supabase.auth.getUser();
```

**Problema**: O método `getUser()` estava sendo chamado **SEM passar o token JWT** como argumento. Isso fazia com que a Edge Function tentasse validar um token que não existia no contexto dela, resultando em erro 401 "Auth session missing!".

### **Correção Aplicada**

```typescript
// ✅ CORRETO (código corrigido)
const token = authHeader.replace('Bearer ', '').trim();
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
```

**Solução**: Agora o token JWT é:
1. **Extraído do header Authorization** (linha 77)
2. **Validado se não está vazio** (linhas 79-90)
3. **Passado como argumento para getUser()** (linha 165)

---

## 📋 MUDANÇAS PRINCIPAIS NO CÓDIGO

### **1. Extração do Token (NOVO)**
```typescript
// Linha 77-90
const token = authHeader.replace('Bearer ', '').trim();

if (!token) {
  console.error('❌ Token vazio após extração');
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Usuário não autenticado.',
      details: 'Token is empty!' 
    }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

console.log('✅ [3.5/10] Token extraído do header:', token.substring(0, 20) + '...');
```

### **2. Validação de Variáveis de Ambiente (NOVO)**
```typescript
// Linha 103-114
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variáveis de ambiente ausentes');
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Configuração do servidor incorreta.',
      details: 'Missing environment variables' 
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### **3. Criação do Cliente Supabase (CORRIGIDO)**
```typescript
// Linha 123-130
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { Authorization: `Bearer ${token}` },
  },
  auth: {
    persistSession: false,
  },
});
```

### **4. Validação do Usuário (CORRIGIDO)**
```typescript
// Linha 165
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
```

**ANTES**: `await supabase.auth.getUser()` ❌  
**AGORA**: `await supabase.auth.getUser(token)` ✅

### **5. Logs Aprimorados (NOVO)**
```typescript
// Linha 175-180
console.log('✅ [5/10] Usuário autenticado com sucesso:', userId);
console.log('✅ [5.5/10] Email do usuário:', user.email);
```

---

## 🚀 PASSO A PASSO PARA DEPLOY

### **Passo 1: Acessar o Supabase Dashboard**
1. Vá para: https://supabase.com/dashboard/project/muqjeukjyfhwtbynrxkm
2. Faça login

### **Passo 2: Navegar até Edge Functions**
1. No menu lateral esquerdo, clique em **Edge Functions**
2. Encontre a função `sign-content` na lista
3. Clique nela para abrir

### **Passo 3: Editar o Código**
1. Clique no botão **"Edit Function"** ou **"Code"**
2. Você verá o editor de código com o conteúdo atual
3. **Selecione TODO o código** (Ctrl+A ou Cmd+A)
4. **Delete o código antigo**

### **Passo 4: Colar o Novo Código**
1. Abra o arquivo `/workspace/github-deploy/supabase/functions/sign-content/index.ts`
2. **Copie TODO o conteúdo** do arquivo
3. **Cole no editor do Supabase**
4. Verifique se o código foi colado corretamente (deve ter 344 linhas)

### **Passo 5: Verificar Variáveis de Ambiente**
1. Ainda no dashboard da Edge Function, procure a seção **"Environment Variables"** ou **"Secrets"**
2. Confirme que estas variáveis existem:
   - ✅ `SUPABASE_URL` (deve começar com `https://muqjeukjyfhwtbynrxkm.supabase.co`)
   - ✅ `SUPABASE_ANON_KEY` (uma string longa começando com `eyJ...`)
   - ✅ `SUPABASE_SERVICE_ROLE_KEY` (opcional, para testes)
   - ✅ `ENCRYPTION_KEY` (para criptografia das chaves privadas)

3. Se alguma variável estiver ausente, adicione-a:
   - Clique em **"Add Secret"** ou **"Add Variable"**
   - Cole o valor correto

### **Passo 6: Fazer o Deploy**
1. Clique no botão **"Deploy"** ou **"Save & Deploy"**
2. Aguarde a confirmação de deploy bem-sucedido
3. Você deve ver uma mensagem como:
   - ✅ "Function deployed successfully"
   - ✅ "Version X.X.X deployed"

### **Passo 7: Verificar o Deploy**
1. Na página da Edge Function, procure por:
   - **Status**: Deve estar **"Active"** ou **"Running"**
   - **Last Deployed**: Deve mostrar a data/hora atual
   - **Version**: Deve ser a versão mais recente

---

## 🧪 TESTE APÓS O DEPLOY

### **Passo 1: Voltar para a Aplicação Vero iD**
1. Abra a aplicação no navegador
2. Faça login (se necessário)
3. Abra o Console do navegador (F12)

### **Passo 2: Ativar a Edge Function**
```javascript
window.FeatureFlags.enableEdgeFunction()
```

Você deve ver:
```
✅ [FeatureFlags] Feature ativada: use_edge_function_signing
✅ [FeatureFlags] Feature ativada: enable_fallback
🔐 [FeatureFlags] Edge Function ativada com fallback de segurança
```

### **Passo 3: Assinar um Novo Documento**
1. Vá para a página `/sign-content`
2. Preencha o formulário com um novo conteúdo
3. Clique em **"Assinar Conteúdo"**

### **Passo 4: Verificar os Logs no Console**

#### **✅ Logs Esperados (SUCESSO):**
```
🔐 [EdgeFunction] Iniciando assinatura segura via Edge Function...
✅ [EdgeFunction] Token de autenticação obtido
📤 [EdgeFunction] Enviando requisição para: https://...
📥 [EdgeFunction] Resposta recebida: 200 OK
✅ [EdgeFunction] Resposta parseada com sucesso
✅ [EdgeFunction] Assinatura concluída em 500ms
✅ [Enhanced] Assinatura via Edge Function concluída com sucesso!
```

#### **❌ Logs de Erro (se ainda falhar):**
```
❌ [EdgeFunction] Erro na resposta: 401
```

Se você ainda ver erro 401, vá para o **Passo 5**.

### **Passo 5: Verificar Logs da Edge Function no Supabase**
1. No Supabase Dashboard, vá para **Edge Functions** → **sign-content**
2. Clique na aba **"Logs"** ou **"Invocations"**
3. Procure pela requisição mais recente
4. Verifique os logs:

#### **✅ Logs Esperados (SUCESSO):**
```
🔐 [1/10] Edge Function sign-content iniciada
✅ [2/10] Método HTTP validado: POST
✅ [3/10] Header Authorization encontrado
✅ [3.5/10] Token extraído do header: eyJhbGciOiJIUzI1NiIs...
✅ [4/10] Variáveis de ambiente carregadas
✅ [4.5/10] Cliente Supabase criado com token do usuário
🔐 [AUTH] Validando token JWT do usuário...
✅ [5/10] Usuário autenticado com sucesso: c4439af1-...
✅ [5.5/10] Email do usuário: comercial.veronezi@gmail.com
✅ [6/10] Request validado: {...}
✅ [7/10] Chaves encontradas para usuário: c4439af1-...
✅ [8/10] Chave privada descriptografada com sucesso
✅ [9/10] Conteúdo assinado com sucesso
✅ [10/10] Audit log registrado
```

#### **❌ Logs de Erro (se ainda falhar):**
```
❌ Erro de autenticação: {...}
❌ Detalhes do erro: {...}
```

Se você ver logs de erro, **copie os logs completos** e me envie para análise.

---

## 🔍 COMPARAÇÃO: ANTES vs DEPOIS

### **ANTES (❌ Código com Bug)**
```typescript
// Linha 143 (código antigo)
const { data: { user }, error: authError } = await supabase.auth.getUser();
// ❌ Token não é passado como argumento
// ❌ Edge Function não consegue validar o usuário
// ❌ Retorna 401 "Auth session missing!"
```

### **DEPOIS (✅ Código Corrigido)**
```typescript
// Linha 77 (código novo)
const token = authHeader.replace('Bearer ', '').trim();

// Linha 165 (código novo)
const { data: { user }, error: authError } = await supabase.auth.getUser(token);
// ✅ Token é extraído do header
// ✅ Token é passado como argumento
// ✅ Edge Function valida o usuário corretamente
// ✅ Retorna 200 OK
```

---

## 📊 CHECKLIST DE VERIFICAÇÃO

Antes de fazer o deploy, confirme:

- [ ] Copiei TODO o código do arquivo `supabase/functions/sign-content/index.ts`
- [ ] Colei no editor do Supabase substituindo o código antigo
- [ ] Verifiquei que as variáveis de ambiente existem:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `ENCRYPTION_KEY`
- [ ] Cliquei em "Deploy" e aguardei a confirmação
- [ ] Status da função está "Active"

Após o deploy:

- [ ] Voltei para a aplicação Vero iD
- [ ] Ativei a Edge Function com `window.FeatureFlags.enableEdgeFunction()`
- [ ] Assinei um novo documento
- [ ] Verifiquei os logs no console do navegador
- [ ] Verifiquei os logs da Edge Function no Supabase Dashboard

---

## 🆘 SE AINDA HOUVER PROBLEMAS

Se após seguir todos os passos o erro 401 persistir:

1. **Copie os logs completos**:
   - Logs do console do navegador
   - Logs da Edge Function no Supabase Dashboard

2. **Verifique as variáveis de ambiente**:
   - Tire um screenshot da seção "Environment Variables"
   - Confirme que `SUPABASE_ANON_KEY` está correto

3. **Teste com Postman/Insomnia**:
   - Faça uma requisição POST manual para a Edge Function
   - Use o mesmo token JWT que o frontend está usando
   - Veja se o erro persiste

4. **Me envie as informações**:
   - Logs completos
   - Screenshot das variáveis de ambiente (ocultando valores sensíveis)
   - Resultado do teste com Postman/Insomnia

---

## ✅ RESULTADO ESPERADO

Após o deploy correto, você deve ver:

### **No Console do Navegador:**
```
✅ [EdgeFunction] Resposta recebida: 200 OK
✅ [EdgeFunction] Assinatura concluída em 500ms
✅ Conteúdo assinado com sucesso no Supabase!
```

### **No Supabase Dashboard (Logs da Edge Function):**
```
✅ [5/10] Usuário autenticado com sucesso: c4439af1-...
✅ [9/10] Conteúdo assinado com sucesso
```

### **Na Aplicação:**
- Documento assinado com sucesso
- QR Code gerado
- Método de assinatura: `edge_function` (não mais `client_side`)

---

**Última atualização**: 2026-01-12  
**Versão**: 3.0 (Correção Definitiva - Token JWT)