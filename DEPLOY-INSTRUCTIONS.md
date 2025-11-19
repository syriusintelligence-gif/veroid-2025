# 🚀 INSTRUÇÕES DE DEPLOY - VEROID

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter:

- ✅ Node.js instalado (versão 18 ou superior)
- ✅ pnpm instalado
- ✅ Conta no Vercel (https://vercel.com)
- ✅ Acesso ao terminal/prompt de comando

---

## 🔧 MÉTODO 1: Deploy Automático (Recomendado)

### Passo 1: Instalar Vercel CLI

Abra o terminal e execute:

```bash
npm install -g vercel
```

Ou com pnpm:

```bash
pnpm add -g vercel
```

### Passo 2: Fazer Login

```bash
vercel login
```

Isso abrirá seu navegador. Faça login com sua conta Vercel.

### Passo 3: Executar o Script de Deploy

No diretório do projeto (`/workspace/github-deploy`), execute:

**No Mac/Linux:**
```bash
chmod +x deploy.sh
./deploy.sh
```

**No Windows (Git Bash):**
```bash
bash deploy.sh
```

**No Windows (PowerShell):**
```powershell
.\deploy.ps1
```

O script vai:
1. ✅ Verificar se Vercel CLI está instalado
2. ✅ Verificar se você está logado
3. ✅ Limpar builds anteriores
4. ✅ Instalar dependências
5. ✅ Fazer build do projeto
6. ✅ Fazer deploy para produção

---

## 🔧 MÉTODO 2: Deploy Manual (Passo a Passo)

Se preferir fazer manualmente, siga estes passos:

### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

### 2. Fazer Login

```bash
vercel login
```

### 3. Navegar até o diretório do projeto

```bash
cd /workspace/github-deploy
```

### 4. Limpar builds anteriores

```bash
rm -rf dist
rm -rf .vercel
```

### 5. Instalar dependências

```bash
pnpm install
```

### 6. Fazer build

```bash
pnpm run build
```

### 7. Fazer deploy

```bash
vercel --prod
```

Durante o deploy, o Vercel vai perguntar:

- **Set up and deploy?** → Yes
- **Which scope?** → Selecione sua conta
- **Link to existing project?** → Yes (se já existe) ou No (para criar novo)
- **What's your project's name?** → veroid-2025 (ou o nome que preferir)
- **In which directory is your code located?** → ./ (diretório atual)

---

## 🎯 MÉTODO 3: Deploy via Interface Web do Vercel

Se os métodos acima não funcionarem, você pode fazer upload manual:

### 1. Fazer Build Local

```bash
cd /workspace/github-deploy
pnpm install
pnpm run build
```

### 2. Acessar Vercel Dashboard

1. Vá para: https://vercel.com/dashboard
2. Clique em "Add New..." → "Project"
3. Clique em "Import Git Repository" ou "Deploy from CLI"

### 3. Fazer Upload da Pasta `dist`

1. Se escolher "Deploy from CLI", siga as instruções na tela
2. Ou faça upload manual da pasta `dist` gerada

---

## ✅ VERIFICAÇÃO PÓS-DEPLOY

Após o deploy, verifique:

### 1. Acesse o site
```
https://veroid-2025.vercel.app
```

### 2. Teste o Dashboard
```
https://veroid-2025.vercel.app/dashboard
```

### 3. Gere uma NOVA assinatura

**IMPORTANTE:** As assinaturas antigas ainda usam a rota `/c` que não funciona. Você PRECISA gerar uma nova assinatura para testar o QR Code com a rota `/certificate`.

### 4. Teste o QR Code

1. Baixe o QR Code da nova assinatura
2. Escaneie com seu celular
3. Deve abrir: `https://veroid-2025.vercel.app/certificate?d=...`
4. O certificado deve carregar corretamente! 🎉

---

## 🐛 SOLUÇÃO DE PROBLEMAS

### Erro: "Vercel CLI não encontrado"

**Solução:**
```bash
npm install -g vercel
# ou
pnpm add -g vercel
```

### Erro: "Not logged in"

**Solução:**
```bash
vercel login
```

### Erro: "Build failed"

**Solução:**
```bash
# Limpe o cache e tente novamente
rm -rf node_modules
rm -rf dist
pnpm install
pnpm run build
```

### Erro: "Permission denied" (Mac/Linux)

**Solução:**
```bash
chmod +x deploy.sh
./deploy.sh
```

### QR Code ainda não funciona

**Possíveis causas:**

1. **Você está testando uma assinatura antiga**
   - Solução: Gere uma NOVA assinatura após o deploy

2. **Deploy não foi concluído**
   - Solução: Verifique o status no dashboard do Vercel

3. **Cache do navegador**
   - Solução: Limpe o cache ou use modo anônimo

---

## 📞 PRECISA DE AJUDA?

Se encontrar problemas:

1. Verifique os logs do Vercel: https://vercel.com/dashboard
2. Verifique os logs do terminal durante o deploy
3. Teste manualmente a URL: `https://veroid-2025.vercel.app/certificate`

---

## 🎉 SUCESSO!

Se tudo funcionou:

✅ Site no ar: https://veroid-2025.vercel.app
✅ Dashboard acessível
✅ QR Code funcionando
✅ Certificados carregando corretamente

**Parabéns! Seu sistema VeroID está funcionando perfeitamente!** 🚀