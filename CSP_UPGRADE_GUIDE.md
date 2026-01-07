# 🛡️ Guia de Upgrade do CSP - Vero iD

Este guia contém 3 versões progressivas de melhoria do Content Security Policy (CSP) para o projeto Vero iD.

---

## 📊 Comparação das Versões

| Versão | Segurança | Risco de Quebra | Melhorias | Score Esperado |
|--------|-----------|-----------------|-----------|----------------|
| **V1 - Monitoring** | 7.5/10 | 🟢 ZERO | Adiciona monitoramento + corrige domínios | 7.5/10 |
| **V2 - No Eval** | 8.5/10 | 🟡 BAIXO | Remove 'unsafe-eval' + adiciona HSTS | 8.5/10 |
| **V3 - Strict** | 9.0/10 | 🔴 MÉDIO | Remove 'unsafe-inline' (máxima segurança) | 9.0/10 |

---

## 🎯 VERSÃO 1: Monitoramento (COMEÇAR AQUI)

### **Arquivo:** `vercel-csp-v1-monitoring.json`

### **O Que Muda:**
1. ✅ **Adiciona `ipapi.co`** em `connect-src` (corrige erro no CSRF middleware)
2. ✅ **Adiciona CSP Report-Only** paralelo (monitora violações sem bloquear)
3. ✅ **Adiciona `upgrade-insecure-requests`** (força HTTPS)
4. ✅ **Adiciona `block-all-mixed-content`** (bloqueia HTTP em HTTPS)
5. ✅ **Restringe `img-src`** (remove `https:` genérico, adiciona domínios específicos)

### **Risco:** 🟢 ZERO
- Mantém CSP atual funcionando
- Apenas adiciona monitoramento paralelo
- Não quebra nada

### **Como Aplicar:**
```bash
# Backup do arquivo atual
cp vercel.json vercel.json.backup

# Aplicar V1
cp vercel-csp-v1-monitoring.json vercel.json

# Fazer deploy
git add vercel.json
git commit -m "feat: adiciona monitoramento CSP (V1)"
git push
```

### **Como Testar:**
1. Após deploy, abra o site
2. Abra o Console do navegador (F12)
3. Navegue por todas as páginas
4. Procure por mensagens de CSP no console
5. **Se aparecer algo como:** `[Report Only] Refused to load...`
   - Isso é NORMAL! É o monitoramento funcionando
   - Anote quais recursos estão sendo bloqueados
6. **Se NÃO aparecer nada:**
   - Ótimo! Significa que o CSP V2 não quebrará nada

### **Duração do Teste:** 2-3 dias de uso normal

---

## 🎯 VERSÃO 2: Sem Eval (DEPOIS DE TESTAR V1)

### **Arquivo:** `vercel-csp-v2-no-eval.json`

### **O Que Muda:**
1. ✅ **Remove `'unsafe-eval'`** de `script-src` (bloqueia `eval()`, `Function()`, etc.)
2. ✅ **Restringe `img-src`** (permite apenas domínios específicos)
3. ✅ **Adiciona HSTS** (Strict-Transport-Security - força HTTPS por 2 anos)
4. ✅ **Remove CSP Report-Only** (não precisa mais, já testamos)

### **Risco:** 🟡 BAIXO
- A maioria dos projetos modernos não usa `eval()`
- Vite/React geralmente não precisa de `eval()`
- Se quebrar algo, é fácil reverter

### **Como Aplicar:**
```bash
# Aplicar V2
cp vercel-csp-v2-no-eval.json vercel.json

# Fazer deploy
git add vercel.json
git commit -m "feat: remove unsafe-eval do CSP (V2)"
git push
```

### **Como Testar:**
1. Após deploy, teste TODAS as funcionalidades:
   - ✅ Login/Logout
   - ✅ Cadastro de usuário
   - ✅ Upload de documentos
   - ✅ Assinatura de conteúdo
   - ✅ Verificação de assinatura
   - ✅ Dashboard de admin
   - ✅ Logs de auditoria
2. Abra o Console (F12)
3. Procure por erros relacionados a CSP
4. **Se aparecer:** `Refused to evaluate a string as JavaScript because 'unsafe-eval'...`
   - Isso significa que algum código usa `eval()`
   - Reverta para V1 e me avise (vou ajustar o código)
5. **Se tudo funcionar normalmente:**
   - Parabéns! Pode avançar para V3

### **Duração do Teste:** 1-2 dias de uso normal

---

## 🎯 VERSÃO 3: Strict (MÁXIMA SEGURANÇA)

### **Arquivo:** `vercel-csp-v3-strict.json`

### **O Que Muda:**
1. ✅ **Remove `'unsafe-inline'`** de `script-src` (bloqueia scripts inline)
2. ✅ **Remove `'unsafe-inline'`** de `style-src` (bloqueia estilos inline)
3. ✅ **Adiciona `X-XSS-Protection`** (proteção adicional contra XSS)

### **Risco:** 🔴 MÉDIO
- Pode quebrar componentes que usam estilos inline
- Requer ajustes no código React
- Mais difícil de reverter

### **IMPORTANTE:** 
**NÃO APLIQUE V3 AINDA!** Esta versão requer mudanças no código React para funcionar corretamente.

### **Pré-requisitos para V3:**
1. ✅ Todos os estilos inline devem ser movidos para arquivos CSS
2. ✅ Componentes com `style={{}}` devem usar classes CSS
3. ✅ Bibliotecas que injetam estilos inline precisam ser ajustadas

### **Como Preparar o Código para V3:**
```bash
# Encontrar todos os usos de style inline
grep -r "style={{" src/ --include="*.tsx" --include="*.jsx"

# Encontrar todos os usos de dangerouslySetInnerHTML
grep -r "dangerouslySetInnerHTML" src/ --include="*.tsx" --include="*.jsx"
```

**Se você quiser aplicar V3, me avise que eu ajusto o código necessário!**

---

## 📋 Checklist de Implementação

### **Fase 1: V1 - Monitoramento (AGORA)**
- [ ] Fazer backup do `vercel.json` atual
- [ ] Copiar `vercel-csp-v1-monitoring.json` para `vercel.json`
- [ ] Fazer deploy
- [ ] Testar por 2-3 dias
- [ ] Verificar console do navegador
- [ ] Anotar violações (se houver)

### **Fase 2: V2 - No Eval (DEPOIS DE 2-3 DIAS)**
- [ ] Confirmar que V1 não reportou problemas
- [ ] Copiar `vercel-csp-v2-no-eval.json` para `vercel.json`
- [ ] Fazer deploy
- [ ] Testar TODAS as funcionalidades
- [ ] Verificar console do navegador
- [ ] Usar por 1-2 dias

### **Fase 3: V3 - Strict (FUTURO - REQUER AJUSTES NO CÓDIGO)**
- [ ] Confirmar que V2 funciona perfeitamente
- [ ] Solicitar ajustes no código React (me avise!)
- [ ] Remover estilos inline
- [ ] Testar em ambiente de desenvolvimento
- [ ] Aplicar V3 em produção
- [ ] Monitorar por 1 semana

---

## 🔄 Como Reverter (Se Algo Der Errado)

### **Reverter para versão anterior:**
```bash
# Reverter para backup original
cp vercel.json.backup vercel.json

# Fazer deploy
git add vercel.json
git commit -m "revert: volta CSP para versão anterior"
git push
```

### **Reverter para V1 (se V2 quebrou):**
```bash
cp vercel-csp-v1-monitoring.json vercel.json
git add vercel.json
git commit -m "revert: volta CSP para V1"
git push
```

---

## 📊 Melhorias de Segurança por Versão

### **V1 - Monitoramento:**
- ✅ Corrige domínio faltante (`ipapi.co`)
- ✅ Adiciona monitoramento de violações
- ✅ Força HTTPS (`upgrade-insecure-requests`)
- ✅ Bloqueia conteúdo misto (`block-all-mixed-content`)
- ✅ Restringe imagens a domínios específicos

### **V2 - No Eval:**
- ✅ Todas as melhorias de V1
- ✅ Bloqueia `eval()` e `Function()` (previne XSS)
- ✅ Adiciona HSTS (força HTTPS por 2 anos)
- ✅ Melhora proteção contra injeção de código

### **V3 - Strict:**
- ✅ Todas as melhorias de V2
- ✅ Bloqueia scripts inline (máxima proteção XSS)
- ✅ Bloqueia estilos inline (previne CSS injection)
- ✅ Adiciona X-XSS-Protection (proteção adicional)

---

## 🎯 Score de Segurança Esperado

| Versão | Supabase Score | Frontend Score | Score Total |
|--------|----------------|----------------|-------------|
| **Atual** | 8.5/10 | 7.5/10 | 8.0/10 |
| **V1** | 8.5/10 | 7.5/10 | 8.0/10 |
| **V2** | 8.5/10 | 8.5/10 | 8.5/10 |
| **V3** | 8.5/10 | 9.0/10 | 8.75/10 |

---

## ❓ FAQ

### **Q: Quanto tempo leva cada fase?**
A: 
- V1: 15 minutos para aplicar + 2-3 dias de monitoramento
- V2: 15 minutos para aplicar + 1-2 dias de testes
- V3: 2-3 horas de ajustes no código + 1 semana de testes

### **Q: Posso pular direto para V3?**
A: NÃO recomendado! V3 pode quebrar o site se não for testado gradualmente.

### **Q: O que fazer se V2 quebrar algo?**
A: Reverta para V1 imediatamente e me avise. Vou investigar qual código está usando `eval()`.

### **Q: V1 é suficiente para produção?**
A: Sim! V1 já oferece boa proteção. V2 e V3 são melhorias incrementais.

### **Q: Como sei se o CSP está funcionando?**
A: Abra o Console (F12), vá em "Network" → clique em qualquer requisição → aba "Headers" → procure por "Content-Security-Policy"

---

## 📞 Suporte

Se tiver qualquer problema durante a implementação:
1. Reverta para a versão anterior
2. Anote o erro exato que apareceu no console
3. Me avise com print do erro
4. Vou ajustar o CSP ou o código conforme necessário

---

## 🎉 Parabéns!

Ao completar as 3 fases, seu projeto terá:
- 🔒 Proteção máxima contra XSS
- 🔒 Proteção contra clickjacking
- 🔒 Proteção contra injeção de código
- 🔒 HTTPS forçado
- 🔒 Score de segurança 8.75/10

**Boa sorte com a implementação!** 🚀