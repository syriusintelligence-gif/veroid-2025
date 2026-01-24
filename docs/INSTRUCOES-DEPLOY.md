# 🚀 INSTRUÇÕES PARA DEPLOY NO VERCEL

## 📦 PASSO 1: FAZER UPLOAD PARA O GITHUB

### Opção A: Via Interface Web do GitHub (Mais Fácil)

1. **Acesse seu repositório no GitHub**
   - URL: https://github.com/seu-usuario/seu-repositorio

2. **Delete todos os arquivos antigos** (se houver)
   - Selecione todos os arquivos
   - Clique em "Delete file"
   - Faça commit

3. **Faça upload dos novos arquivos**
   - Clique em **"Add file"** → **"Upload files"**
   - **Arraste TODOS os arquivos desta pasta** (`github-deploy`)
   - **IMPORTANTE:** Arraste os arquivos E as pastas (`src`, `public`)
   - Escreva a mensagem: "Deploy completo do VeroID"
   - Clique em **"Commit changes"**

### Opção B: Via Git CLI (Se você tem Git instalado)

```bash
# 1. Clone seu repositório (se ainda não clonou)
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio

# 2. Delete tudo (exceto .git)
rm -rf *

# 3. Copie todos os arquivos desta pasta para o repositório
cp -r /workspace/github-deploy/* .
cp /workspace/github-deploy/.gitignore .

# 4. Adicione e faça commit
git add .
git commit -m "Deploy completo do VeroID"
git push origin main
```

---

## ⚙️ PASSO 2: CONFIGURAR O VERCEL

### 1. Acesse as Configurações do Projeto

1. Vá para: https://vercel.com/dashboard
2. Clique no projeto **"veroid-2025"**
3. Clique em **"Settings"** (menu superior)

### 2. Configure Build & Development Settings

1. No menu lateral, clique em **"General"**
2. Role até **"Build & Development Settings"**
3. Configure assim:

```
Framework Preset: Vite
Build Command: pnpm run build
Output Directory: dist
Install Command: pnpm install
Root Directory: . (ou deixe VAZIO)
Node.js Version: 18.x ou 20.x
```

4. Clique em **"Save"**

### 3. Adicione as Variáveis de Ambiente

1. No menu lateral, clique em **"Environment Variables"**
2. Clique em **"Add New"**

**Variável 1:**
```
Name: VITE_SUPABASE_URL
Value: https://abc47615507043c581cc4c9d333be96f.supabase.co
Environment: Production, Preview, Development (marque todos)
```

**Variável 2:**
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiYzQ3NjE1NTA3MDQzYzU4MWNjNGM5ZDMzM2JlOTZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE2OTU2NjgsImV4cCI6MjA0NzI3MTY2OH0.VWGfWxJxoOiUxN0BdMWVzNI7VZMm_zEbTAKuCLdxqhU
Environment: Production, Preview, Development (marque todos)
```

3. Clique em **"Save"** para cada variável

---

## 🔄 PASSO 3: FAZER REDEPLOY

1. Volte para **"Deployments"** (menu superior)
2. Clique nos **três pontinhos (...)** do último deploy
3. Clique em **"Redeploy"**
4. Aguarde 1-2 minutos

---

## ✅ PASSO 4: TESTAR O SITE

Quando o deploy terminar:

1. Clique no botão **"Visit"** no Vercel
2. Ou acesse: `https://veroid-2025.vercel.app`

**Teste estas funcionalidades:**
- ✅ Site carrega corretamente?
- ✅ Login funciona?
- ✅ Cadastro funciona?
- ✅ Dashboard aparece?

**Credenciais de teste:**
- Email: `admin@veroid.com`
- Senha: `Admin123!@#`

---

## 📋 CHECKLIST FINAL

Antes de considerar concluído:

- [ ] Todos os arquivos foram enviados para o GitHub
- [ ] Root Directory está vazio ou com `.` no Vercel
- [ ] Build Command está como `pnpm run build`
- [ ] Output Directory está como `dist`
- [ ] Variáveis de ambiente foram adicionadas (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY)
- [ ] Redeploy foi feito
- [ ] Site carrega sem erro 404
- [ ] Login funciona
- [ ] Cadastro funciona
- [ ] Dashboard aparece

---

## 🆘 SE AINDA DER ERRO

Se depois de seguir todos os passos ainda houver erro:

1. **Verifique os logs do build:**
   - No Vercel, vá em "Deployments"
   - Clique no último deploy
   - Veja a aba "Building"
   - Procure por mensagens de erro

2. **Verifique se os arquivos estão no GitHub:**
   - Acesse seu repositório
   - Confirme que as pastas `src` e `public` estão lá
   - Confirme que `package.json` está na raiz

3. **Verifique as variáveis de ambiente:**
   - No Vercel, vá em Settings → Environment Variables
   - Confirme que as duas variáveis estão lá
   - Confirme que estão marcadas para Production, Preview e Development

---

## 🎉 SUCESSO!

Se tudo funcionar, você terá:
- ✅ Um site profissional no ar
- ✅ Link estável: `https://veroid-2025.vercel.app`
- ✅ HTTPS seguro automático
- ✅ 99.99% de uptime
- ✅ Deploy automático a cada commit no GitHub

**Parabéns! Seu VeroID está online! 🚀**