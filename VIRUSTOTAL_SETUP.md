# 🛡️ VirusTotal Integration - Guia de Configuração

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Configuração Passo a Passo](#configuração-passo-a-passo)
4. [Configuração no Supabase](#configuração-no-supabase)
5. [Testando a Integração](#testando-a-integração)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Esta integração adiciona **scanning de vírus e malware** em tempo real para todos os arquivos enviados ao sistema usando a API do VirusTotal.

### **Características:**
- ✅ 70+ engines de antivírus
- ✅ Detecção de vírus, trojans, ransomware, malware
- ✅ Scanning assíncrono (não bloqueia upload)
- ✅ Logs detalhados de scanning
- ✅ Notificações ao usuário
- ✅ Integração nativa com Supabase

### **Limitações (Plano Gratuito):**
- ⚠️ 4 requisições por minuto
- ⚠️ 500 requisições por dia
- ⚠️ Arquivos enviados ficam públicos no VirusTotal

---

## 🔑 Pré-requisitos

### **1. Conta no VirusTotal**
- Acesse: https://www.virustotal.com/
- Crie uma conta gratuita
- Confirme seu email

### **2. API Key**
- Acesse: https://www.virustotal.com/gui/my-apikey
- Copie sua API Key
- **IMPORTANTE:** Nunca compartilhe ou commite esta chave!

---

## ⚙️ Configuração Passo a Passo

### **PASSO 1: Obter API Key do VirusTotal**

1. Acesse: https://www.virustotal.com/gui/my-apikey
2. Faça login na sua conta
3. Copie a API Key (formato: `abc123def456...`)
4. **Guarde em local seguro!**

**Exemplo de API Key:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

---

### **PASSO 2: Configurar Variável de Ambiente no Supabase**

#### **Opção A: Via Dashboard do Supabase (Recomendado)**

1. Acesse o dashboard do Supabase: https://app.supabase.com/
2. Selecione seu projeto
3. Navegue para: **Settings** → **Edge Functions** → **Secrets**
4. Clique em **"Add new secret"**
5. Preencha:
   - **Name:** `VIRUSTOTAL_API_KEY`
   - **Value:** [Cole sua API Key aqui]
6. Clique em **"Add secret"**

**Screenshot de referência:**
```
┌─────────────────────────────────────────┐
│ Edge Function Secrets                   │
├─────────────────────────────────────────┤
│ Name: VIRUSTOTAL_API_KEY                │
│ Value: ••••••••••••••••••••••••••••     │
│                                         │
│ [Add secret]                            │
└─────────────────────────────────────────┘
```

#### **Opção B: Via Supabase CLI**

```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Adicionar secret
supabase secrets set VIRUSTOTAL_API_KEY=your_api_key_here
```

---

### **PASSO 3: Verificar Configuração**

Execute este comando no terminal do Supabase CLI:

```bash
supabase secrets list
```

**Saída esperada:**
```
┌──────────────────────┬─────────────────────┐
│ Name                 │ Value               │
├──────────────────────┼─────────────────────┤
│ VIRUSTOTAL_API_KEY   │ ••••••••••••••••    │
└──────────────────────┴─────────────────────┘
```

---

## 🗄️ Configuração no Supabase

### **PASSO 4: Criar Tabela de Scan Results**

Execute esta migration no Supabase SQL Editor:

```sql
-- Esta migration será criada automaticamente na ETAPA 2
-- Por enquanto, apenas documente que será necessária
```

**Localização:** `supabase/migrations/20260115_create_file_scans_table.sql`

**O que esta tabela armazena:**
- ID do arquivo escaneado
- Resultado do scan (limpo/infectado)
- Nome da ameaça detectada (se houver)
- Timestamp do scan
- Detalhes completos do VirusTotal

---

### **PASSO 5: Deploy da Edge Function**

```bash
# Será feito na ETAPA 4
# Por enquanto, apenas documente
```

---

## 🧪 Testando a Integração

### **Teste 1: Arquivo EICAR (Teste Padrão)**

O arquivo EICAR é um arquivo de teste padrão da indústria, **não é um vírus real**, mas todos os antivírus o detectam como malware para fins de teste.

**Como criar arquivo EICAR:**

1. Crie um arquivo de texto chamado `eicar.txt`
2. Cole exatamente este conteúdo:
```
X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*
```
3. Salve o arquivo
4. Tente fazer upload no sistema

**Resultado esperado:**
- ❌ Arquivo deve ser **BLOQUEADO**
- ❌ Mensagem: "Ameaça detectada: EICAR-Test-File"
- ❌ Arquivo não deve ser salvo no storage

---

### **Teste 2: Arquivo Limpo**

1. Crie um arquivo de texto normal: `teste.txt`
2. Escreva qualquer texto: "Este é um arquivo limpo"
3. Tente fazer upload no sistema

**Resultado esperado:**
- ✅ Arquivo deve ser **ACEITO**
- ✅ Mensagem: "Arquivo escaneado e aprovado"
- ✅ Arquivo salvo no storage

---

### **Teste 3: Verificar Logs**

**No Supabase Dashboard:**
1. Navegue para: **Edge Functions** → **Logs**
2. Selecione a função: `scan-uploaded-file`
3. Verifique os logs de execução

**Logs esperados:**
```
[INFO] Scanning file: teste.txt
[INFO] VirusTotal API response: 200
[INFO] Scan result: CLEAN (0/70 engines detected threat)
[SUCCESS] File approved
```

---

## 🐛 Troubleshooting

### **Problema 1: "API Key inválida"**

**Sintomas:**
- Erro 401 Unauthorized
- Mensagem: "Invalid API key"

**Solução:**
1. Verifique se copiou a API Key corretamente
2. Acesse: https://www.virustotal.com/gui/my-apikey
3. Copie novamente a chave
4. Atualize no Supabase: Settings → Edge Functions → Secrets

---

### **Problema 2: "Rate limit exceeded"**

**Sintomas:**
- Erro 429 Too Many Requests
- Mensagem: "Rate limit exceeded"

**Solução:**
1. Plano gratuito: 4 requisições/minuto
2. Aguarde 1 minuto antes de tentar novamente
3. Considere upgrade para plano pago se necessário

---

### **Problema 3: "Timeout ao escanear"**

**Sintomas:**
- Erro de timeout após 30 segundos
- Scan não completa

**Solução:**
1. Verifique conexão com internet
2. Tente novamente (pode ser instabilidade temporária)
3. Verifique status do VirusTotal: https://status.virustotal.com/

---

### **Problema 4: "Edge Function não encontrada"**

**Sintomas:**
- Erro 404 Not Found
- Mensagem: "Function not found"

**Solução:**
1. Verifique se fez deploy da Edge Function
2. Execute: `supabase functions deploy scan-uploaded-file`
3. Verifique logs de deploy

---

## 📊 Monitoramento

### **Métricas Importantes:**

1. **Taxa de detecção:**
   - Quantos arquivos foram bloqueados
   - Tipos de ameaças mais comuns

2. **Performance:**
   - Tempo médio de scan
   - Taxa de sucesso/falha

3. **Uso da API:**
   - Requisições por dia
   - Proximidade do limite

**Query SQL para estatísticas:**
```sql
-- Será fornecida na ETAPA 2
```

---

## 🔐 Segurança

### **Boas Práticas:**

1. ✅ **Nunca commite a API Key no Git**
2. ✅ **Use variáveis de ambiente**
3. ✅ **Rotacione a API Key periodicamente**
4. ✅ **Monitore uso da API**
5. ✅ **Configure alertas de limite**

### **Rotação de API Key:**

1. Acesse: https://www.virustotal.com/gui/my-apikey
2. Clique em "Regenerate API key"
3. Copie a nova chave
4. Atualize no Supabase imediatamente
5. Teste a integração

---

## 📞 Suporte

**Documentação Oficial:**
- VirusTotal API: https://developers.virustotal.com/reference/overview
- Supabase Edge Functions: https://supabase.com/docs/guides/functions

**Problemas Comuns:**
- Consulte a seção [Troubleshooting](#troubleshooting)
- Verifique logs no Supabase Dashboard
- Teste com arquivo EICAR

---

**Última atualização:** 2025-01-15  
**Versão:** 1.0.0  
**Autor:** Alex (Engineer)