# 🔍 Configuração do Sentry - Monitoramento de Erros

Este documento explica como configurar o Sentry para monitoramento de erros em produção no Vero iD.

## 📋 O que é o Sentry?

O Sentry é uma plataforma de monitoramento de erros que captura automaticamente:
- ✅ Erros JavaScript não tratados
- ✅ Erros do React (componentes que quebram)
- ✅ Erros de requisições HTTP
- ✅ Performance de navegação
- ✅ Replay de sessões com erro (para debug)

## 🚀 Passo a Passo para Configuração

### 1. Criar Conta no Sentry

1. Acesse: https://sentry.io/signup/
2. Crie uma conta gratuita (10.000 erros/mês grátis)
3. Escolha "React" como plataforma

### 2. Criar Projeto

1. No dashboard do Sentry, clique em "Create Project"
2. Selecione "React" como plataforma
3. Dê um nome ao projeto (ex: "veroid-production")
4. Clique em "Create Project"

### 3. Obter o DSN

Após criar o projeto, você verá uma tela com o **DSN** (Data Source Name). Ele tem este formato:

```
https://1234567890abcdef@o123456.ingest.sentry.io/7890123
```

**IMPORTANTE:** Copie este DSN, você vai precisar dele!

### 4. Configurar Variáveis de Ambiente

#### **Opção A: Vercel (Recomendado para Produção)**

1. Acesse o dashboard da Vercel
2. Vá em: **Settings → Environment Variables**
3. Adicione a variável:
   - **Name:** `VITE_SENTRY_DSN`
   - **Value:** Cole o DSN que você copiou
   - **Environment:** Selecione "Production" (e "Preview" se quiser)
4. Clique em "Save"
5. Faça um novo deploy (ou force redeploy)

#### **Opção B: Desenvolvimento Local**

1. Crie um arquivo `.env.local` na raiz do projeto:

```bash
# .env.local
VITE_SENTRY_DSN=https://seu-dsn-aqui@sentry.io/projeto-id
VITE_APP_VERSION=1.0.0
```

2. **NUNCA** commite este arquivo no Git (já está no .gitignore)

### 5. Verificar Instalação

Após configurar, faça um teste:

1. Acesse sua aplicação
2. Abra o Console do navegador (F12)
3. Você deve ver: `[Sentry] Inicializado com sucesso`
4. Force um erro para testar (opcional):

```javascript
// No console do navegador
throw new Error('Teste do Sentry');
```

5. Verifique no dashboard do Sentry se o erro foi capturado

## 🎯 Funcionalidades Implementadas

### 1. **Captura Automática de Erros**

Todos os erros JavaScript não tratados são automaticamente enviados para o Sentry:

```typescript
// Exemplo: Este erro será capturado automaticamente
function minhaFuncao() {
  const obj = null;
  obj.propriedade; // TypeError: Cannot read property of null
}
```

### 2. **ErrorBoundary do React**

Erros em componentes React são capturados e exibem uma UI amigável:

```tsx
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 3. **Captura Manual de Erros**

Você pode capturar erros manualmente:

```typescript
import { captureError, captureMessage } from '@/lib/sentry';

try {
  // código que pode falhar
} catch (error) {
  captureError(error, { contexto: 'informação adicional' });
}

// Ou capturar mensagens
captureMessage('Algo importante aconteceu', 'warning');
```

### 4. **Contexto de Usuário**

O sistema automaticamente rastreia qual usuário teve o erro:

```typescript
// Automático no login
setUserContext({
  id: user.id,
  username: user.nomePublico,
});

// Automático no logout
clearUserContext();
```

### 5. **Breadcrumbs (Rastro de Navegação)**

Adicione rastros para entender o que o usuário fez antes do erro:

```typescript
import { addBreadcrumb } from '@/lib/sentry';

addBreadcrumb('Usuário clicou no botão de assinar', 'user', 'info');
```

## 🔒 Privacidade e Segurança

O Sentry foi configurado com **máxima privacidade**:

### ✅ Dados Removidos Automaticamente:

- ❌ Tokens de autenticação (Authorization headers)
- ❌ Cookies
- ❌ Senhas em query params
- ❌ Emails dos usuários
- ❌ Endereços IP

### ✅ Session Replay:

- Textos são mascarados (`maskAllText: true`)
- Mídia é bloqueada (`blockAllMedia: true`)
- Apenas 10% das sessões normais são gravadas
- 100% das sessões com erro são gravadas (para debug)

### ✅ Erros Ignorados:

Erros conhecidos e não críticos são ignorados:
- Erros de rede (Network request failed)
- Erros de extensões do browser
- Erros de third-party scripts
- Erros de cancelamento (AbortError)

## 📊 Configurações Atuais

```typescript
{
  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% das transações

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% das sessões normais
  replaysOnErrorSampleRate: 1.0, // 100% das sessões com erro

  // Privacidade
  beforeSend: (event) => {
    // Remove dados sensíveis
    return event;
  },

  // Apenas em produção
  environment: 'production',
}
```

## 🎛️ Dashboard do Sentry

Após configurar, você terá acesso a:

### 1. **Issues (Erros)**
- Lista de todos os erros capturados
- Frequência de ocorrência
- Usuários afetados
- Stack trace completo

### 2. **Performance**
- Tempo de carregamento de páginas
- Tempo de resposta de APIs
- Transações lentas

### 3. **Replays**
- Vídeo da sessão do usuário quando ocorreu o erro
- Útil para reproduzir bugs

### 4. **Releases**
- Rastreamento de versões
- Comparação de erros entre versões

## 🔧 Comandos Úteis

### Testar Sentry Localmente

```bash
# 1. Configure o .env.local com seu DSN
# 2. Rode o projeto
pnpm run dev

# 3. Abra o console e force um erro
throw new Error('Teste do Sentry');
```

### Ver Logs do Sentry

```bash
# No console do navegador, você verá:
[Sentry] Inicializado com sucesso
[Sentry] Erro capturado: ...
```

## 📈 Planos do Sentry

| Plano | Eventos/Mês | Preço | Recomendado Para |
|-------|-------------|-------|------------------|
| **Developer** | 10.000 | Grátis | Desenvolvimento e MVP |
| **Team** | 50.000 | $26/mês | Pequenas empresas |
| **Business** | 100.000+ | $80/mês | Empresas médias |

**Recomendação:** Comece com o plano gratuito (Developer). Ele é mais do que suficiente para começar.

## ⚠️ Troubleshooting

### Sentry não está capturando erros

1. **Verifique se o DSN está configurado:**
   ```bash
   # No console do navegador
   console.log(import.meta.env.VITE_SENTRY_DSN);
   ```

2. **Verifique se está em produção:**
   ```bash
   # Sentry só funciona em produção por padrão
   console.log(import.meta.env.MODE); // deve ser 'production'
   ```

3. **Verifique os logs:**
   - Abra o console do navegador
   - Procure por mensagens do Sentry

### Muitos erros sendo capturados

Ajuste o `ignoreErrors` em `/src/lib/sentry.ts`:

```typescript
ignoreErrors: [
  'Network request failed',
  'Seu erro específico aqui',
],
```

### Quer desabilitar temporariamente

Remova ou comente a variável `VITE_SENTRY_DSN` nas configurações da Vercel.

## 📚 Recursos Adicionais

- **Documentação Oficial:** https://docs.sentry.io/platforms/javascript/guides/react/
- **Dashboard:** https://sentry.io/
- **Status:** https://status.sentry.io/

## ✅ Checklist de Configuração

- [ ] Criar conta no Sentry
- [ ] Criar projeto React
- [ ] Copiar o DSN
- [ ] Adicionar `VITE_SENTRY_DSN` na Vercel
- [ ] Fazer deploy
- [ ] Testar captura de erro
- [ ] Verificar no dashboard do Sentry
- [ ] Configurar alertas (opcional)

---

**Pronto!** 🎉 Agora você tem monitoramento de erros profissional no Vero iD!