# Rate Limiting - Vero iD

## 📋 Visão Geral

O Rate Limiting (Limitação de Taxa) é uma camada de segurança implementada para proteger a plataforma Vero iD contra:

- ✅ **Ataques de Força Bruta** - Tentativas automatizadas de login
- ✅ **Abuso de APIs** - Uso excessivo de endpoints
- ✅ **Spam de Registro** - Criação massiva de contas falsas
- ✅ **DDoS** - Ataques de negação de serviço
- ✅ **Scraping** - Extração não autorizada de dados

---

## 🔒 Limites Implementados

### **1. Login**
- **Limite:** 5 tentativas por minuto
- **Bloqueio:** 5 minutos após exceder
- **Armazenamento:** localStorage (client-side)
- **Identificador:** `rate_limit_login`

**Comportamento:**
```
Tentativa 1-5: ✅ Permitido
Tentativa 6+: ❌ Bloqueado por 5 minutos
```

### **2. Registro de Conta**
- **Limite:** 3 contas por hora
- **Bloqueio:** 24 horas após exceder
- **Armazenamento:** localStorage (client-side)
- **Identificador:** `rate_limit_register`

**Comportamento:**
```
Conta 1-3: ✅ Permitido
Conta 4+: ❌ Bloqueado por 24 horas
```

### **3. Assinatura de Conteúdo**
- **Limite:** 10 assinaturas por hora
- **Bloqueio:** 2 horas após exceder
- **Armazenamento:** localStorage (client-side)
- **Identificador:** `rate_limit_sign_content`

**Comportamento:**
```
Assinatura 1-10: ✅ Permitido
Assinatura 11+: ❌ Bloqueado por 2 horas
```

### **4. Verificação de Certificado**
- **Limite:** 20 verificações por minuto
- **Bloqueio:** 10 minutos após exceder
- **Armazenamento:** localStorage (client-side)
- **Identificador:** `rate_limit_verify_certificate`

**Comportamento:**
```
Verificação 1-20: ✅ Permitido
Verificação 21+: ❌ Bloqueado por 10 minutos
```

### **5. Reset de Senha**
- **Limite:** 3 tentativas por hora
- **Bloqueio:** 6 horas após exceder
- **Armazenamento:** localStorage (client-side)
- **Identificador:** `rate_limit_reset_password`

**Comportamento:**
```
Reset 1-3: ✅ Permitido
Reset 4+: ❌ Bloqueado por 6 horas
```

---

## 🛠️ Arquitetura

### **Client-Side (Frontend)**

```
src/lib/rate-limiter.ts
├── RateLimiter (classe principal)
├── RateLimitPresets (configurações)
└── Funções auxiliares

src/hooks/useRateLimit.ts
├── useRateLimit (hook React)
└── useMultipleRateLimits (múltiplos limites)

src/components/RateLimitAlert.tsx
└── Componente de alerta visual
```

**Vantagens do Client-Side:**
- ✅ Resposta instantânea (sem latência de rede)
- ✅ Reduz carga no servidor
- ✅ Melhor UX (feedback imediato)
- ✅ Funciona offline

**Limitações:**
- ⚠️ Pode ser contornado limpando localStorage
- ⚠️ Não protege contra ataques distribuídos (múltiplos IPs)

### **Server-Side (Backend)**

> **Nota:** Implementação futura com Supabase Edge Functions para proteção adicional.

**Planejado:**
```
supabase/functions/rate-limit/
├── index.ts (Edge Function)
├── ip-tracker.ts (rastreamento de IP)
└── redis-cache.ts (cache distribuído)
```

---

## 📊 Fluxo de Funcionamento

### **1. Verificação de Rate Limit**

```typescript
// Usuário tenta fazer login
const rateLimitResult = await checkRateLimit();

if (!rateLimitResult.allowed) {
  // Bloqueado - mostra alerta
  setError(rateLimitResult.message);
  return;
}

// Permitido - prossegue com login
await loginUser(email, senha);
```

### **2. Estrutura de Dados (localStorage)**

```json
{
  "rate_limit_login": {
    "attempts": [1702345678000, 1702345680000, 1702345682000],
    "blockedUntil": null
  }
}
```

**Campos:**
- `attempts`: Array de timestamps (milissegundos) das tentativas
- `blockedUntil`: Timestamp do fim do bloqueio (null se não bloqueado)

### **3. Limpeza Automática**

Tentativas antigas (fora da janela de tempo) são automaticamente removidas:

```typescript
const windowStart = now - config.windowMs;
entry.attempts = entry.attempts.filter(timestamp => timestamp > windowStart);
```

---

## 🎨 Interface do Usuário

### **Alerta de Rate Limit**

Quando o usuário excede o limite, um alerta é exibido:

```
┌─────────────────────────────────────────┐
│ ⚠️ Limite de Tentativas Excedido        │
│                                         │
│ Muitas tentativas. Tente novamente em  │
│ 4m 32s                                  │
│                                         │
│ Tentativas restantes: 0                 │
└─────────────────────────────────────────┘
```

**Características:**
- ✅ Atualização em tempo real (countdown)
- ✅ Mensagem clara e amigável
- ✅ Indicador de tentativas restantes
- ✅ Animação suave (fade-in)

### **Indicador de Tentativas**

Quando restam poucas tentativas, um aviso é exibido:

```
⚠️ 2 tentativas restantes
```

---

## 🔧 Como Usar

### **1. Em Componentes React**

```typescript
import { useRateLimit } from '@/hooks/useRateLimit';
import { RateLimitAlert } from '@/components/RateLimitAlert';

function LoginPage() {
  const { check, isBlocked, blockedUntil, remaining, message } = useRateLimit('LOGIN');
  
  const handleSubmit = async () => {
    // Verifica rate limit
    const result = await check();
    
    if (!result.allowed) {
      setError(result.message);
      return;
    }
    
    // Prossegue com a ação
    await loginUser(email, password);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Alerta de rate limit */}
      {isBlocked && (
        <RateLimitAlert 
          blockedUntil={blockedUntil}
          message={message}
          remaining={remaining}
        />
      )}
      
      {/* Campos do formulário */}
      <input disabled={isBlocked} />
      <button disabled={isBlocked}>Entrar</button>
    </form>
  );
}
```

### **2. Múltiplos Rate Limiters**

```typescript
import { useMultipleRateLimits } from '@/hooks/useRateLimit';

function ComplexAction() {
  const { checkAll, isAnyBlocked } = useMultipleRateLimits([
    'LOGIN',
    'SIGN_CONTENT'
  ]);
  
  const handleAction = async () => {
    const result = await checkAll();
    
    if (!result.allowed) {
      alert(result.message);
      return;
    }
    
    // Todas as verificações passaram
    await performAction();
  };
}
```

### **3. Criar Rate Limiter Customizado**

```typescript
import { RateLimiter } from '@/lib/rate-limiter';

const customLimiter = new RateLimiter('custom_action', {
  maxAttempts: 15,
  windowMs: 5 * 60 * 1000, // 5 minutos
  blockDurationMs: 15 * 60 * 1000, // 15 minutos
});

const result = await customLimiter.check();
```

---

## 🧪 Testando Rate Limiting

### **1. Teste Manual**

1. Abra a página de login
2. Tente fazer login 5 vezes com senha errada
3. Na 6ª tentativa, você será bloqueado por 5 minutos
4. Verifique o alerta com countdown
5. Aguarde o tempo expirar e tente novamente

### **2. Teste com Console**

```javascript
// Abre o console do navegador (F12)

// Verifica status atual
const limiter = new RateLimiter('test', { maxAttempts: 3, windowMs: 60000 });
console.log(limiter.getStatus());

// Simula tentativas
for (let i = 0; i < 5; i++) {
  const result = await limiter.check();
  console.log(`Tentativa ${i + 1}:`, result);
}

// Reseta contador
limiter.reset();
```

### **3. Teste de Limpeza**

```javascript
// Limpa todos os rate limiters
import { clearAllRateLimiters } from '@/lib/rate-limiter';
clearAllRateLimiters();
```

---

## ⚙️ Configuração

### **Ajustar Limites**

Edite o arquivo `src/lib/rate-limiter.ts`:

```typescript
export const RateLimitPresets = {
  LOGIN: {
    maxAttempts: 10, // Aumenta para 10 tentativas
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 2 * 60 * 1000, // Reduz bloqueio para 2 minutos
  },
  // ... outros presets
};
```

### **Desabilitar Rate Limiting (Desenvolvimento)**

```typescript
// src/lib/rate-limiter.ts

export class RateLimiter {
  async check(): Promise<RateLimitResult> {
    // Modo desenvolvimento: sempre permite
    if (import.meta.env.DEV) {
      return {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + 60000),
      };
    }
    
    // Código normal...
  }
}
```

---

## 🐛 Troubleshooting

### **Problema: Usuário bloqueado permanentemente**

**Causa:** localStorage corrompido ou bloqueio muito longo.

**Solução:**
```javascript
// Console do navegador (F12)
localStorage.removeItem('rate_limit_login');
// ou
import { clearAllRateLimiters } from '@/lib/rate-limiter';
clearAllRateLimiters();
```

### **Problema: Rate limit não funciona**

**Causa:** localStorage desabilitado ou navegador privado.

**Solução:**
1. Verifique se localStorage está habilitado
2. Teste em navegador normal (não privado)
3. Verifique console por erros

### **Problema: Contador não reseta**

**Causa:** Relógio do sistema incorreto.

**Solução:**
1. Sincronize relógio do sistema
2. Use `limiter.reset()` para forçar reset

---

## 📈 Métricas e Monitoramento

### **Eventos Logados**

```javascript
console.log('✅ Rate limit OK. Tentativas restantes:', remaining);
console.warn('🚫 Rate limit excedido:', message);
console.error('[RateLimiter] Erro ao ler localStorage:', error);
```

### **Integração com Sentry**

```typescript
import { captureMessage } from '@/lib/sentry';

if (!rateLimitResult.allowed) {
  captureMessage(
    `Rate limit excedido: ${action}`,
    'warning'
  );
}
```

---

## 🚀 Roadmap

### **Fase 2: Server-Side Rate Limiting**

- [ ] Implementar Edge Function no Supabase
- [ ] Rastreamento de IP
- [ ] Cache distribuído (Redis)
- [ ] Bloqueio de IP abusivo
- [ ] Dashboard de métricas

### **Fase 3: Rate Limiting Avançado**

- [ ] Machine Learning para detectar padrões
- [ ] Captcha após múltiplas tentativas
- [ ] Whitelist de IPs confiáveis
- [ ] Rate limiting por usuário autenticado
- [ ] Notificações de atividade suspeita

---

## 📚 Referências

- [OWASP Rate Limiting](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)
- [MDN Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

## ✅ Checklist de Segurança

- [x] Rate limiting implementado no login
- [x] Rate limiting implementado no registro
- [x] Rate limiting implementado na assinatura
- [x] Feedback visual para usuário
- [x] Documentação completa
- [ ] Rate limiting server-side (futuro)
- [ ] Integração com WAF (futuro)
- [ ] Dashboard de métricas (futuro)

---

**Última atualização:** 2024-12-15
**Versão:** 1.0.0
**Autor:** Vero iD Team