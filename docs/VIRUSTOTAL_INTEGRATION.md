# 🛡️ VirusTotal Integration - Documentação Técnica

## 📋 Visão Geral da Arquitetura

Esta documentação descreve a integração completa do VirusTotal API com o sistema VeroID.

---

## 🏗️ Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE UPLOAD COM SCANNING                 │
└─────────────────────────────────────────────────────────────────┘

1. [Usuário] 
   ↓ Seleciona arquivo
   
2. [Frontend - SignContent.tsx / Cadastro.tsx]
   ↓ Validação Magic Numbers (EXISTENTE)
   ↓ Validação MIME Type (EXISTENTE)
   ↓ Validação Extensão (EXISTENTE)
   
3. [Supabase Storage]
   ↓ Upload do arquivo
   ↓ Arquivo salvo temporariamente
   
4. [Database Trigger]
   ↓ Detecta novo arquivo
   ↓ Aciona Edge Function
   
5. [Edge Function - scan-uploaded-file]
   ↓ Obtém arquivo do Storage
   ↓ Calcula hash SHA256
   ↓ Envia para VirusTotal API
   
6. [VirusTotal API]
   ↓ Escaneia com 70+ engines
   ↓ Retorna resultado (1-3 segundos)
   
7. [Edge Function]
   ↓ Processa resultado
   ↓ Salva em file_scans table
   
8. [Database]
   ↓ Armazena resultado
   
9. [Frontend]
   ↓ Polling para verificar status
   ↓ Exibe resultado ao usuário
   
   ┌────────────┬─────────────┐
   │   LIMPO    │  INFECTADO  │
   └────────────┴─────────────┘
        ↓              ↓
   Mantém arquivo  Deleta arquivo
        ↓              ↓
   Notifica OK    Notifica ameaça
```

---

## 📁 Estrutura de Arquivos

```
/workspace/github-deploy/
│
├── .env.example                          # Template de variáveis (CRIADO)
│
├── docs/
│   ├── VIRUSTOTAL_SETUP.md              # Guia de configuração (CRIADO)
│   └── VIRUSTOTAL_INTEGRATION.md        # Documentação técnica (CRIADO)
│
├── src/
│   ├── lib/
│   │   ├── file-validator.ts            # EXISTENTE - NÃO MODIFICAR
│   │   └── virustotal-client.ts         # CRIAR NA ETAPA 3
│   │
│   ├── hooks/
│   │   └── useFileScanStatus.ts         # CRIAR NA ETAPA 5
│   │
│   ├── components/
│   │   └── FileScanStatus.tsx           # CRIAR NA ETAPA 5
│   │
│   └── pages/
│       ├── SignContent.tsx              # MODIFICAR NA ETAPA 7
│       └── Cadastro.tsx                 # MODIFICAR NA ETAPA 8
│
└── supabase/
    ├── migrations/
    │   └── 20260115_create_file_scans_table.sql  # CRIAR NA ETAPA 2
    │
    └── functions/
        └── scan-uploaded-file/
            ├── index.ts                 # CRIAR NA ETAPA 4
            └── deno.json                # CRIAR NA ETAPA 4
```

---

## 🗄️ Schema do Banco de Dados

### **Tabela: file_scans**

```sql
CREATE TABLE file_scans (
  -- Identificação
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Arquivo
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_hash_sha256 TEXT NOT NULL,
  
  -- Usuário
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Resultado do Scan
  scan_status TEXT NOT NULL CHECK (scan_status IN ('pending', 'scanning', 'clean', 'infected', 'error')),
  threat_name TEXT,
  threat_category TEXT,
  
  -- Detalhes do VirusTotal
  virustotal_scan_id TEXT,
  virustotal_permalink TEXT,
  engines_detected INTEGER DEFAULT 0,
  engines_total INTEGER DEFAULT 0,
  
  -- Metadados
  scan_started_at TIMESTAMP WITH TIME ZONE,
  scan_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dados completos (JSON)
  virustotal_response JSONB,
  
  -- Índices
  CONSTRAINT unique_file_hash UNIQUE (file_hash_sha256)
);

-- Índices para performance
CREATE INDEX idx_file_scans_user_id ON file_scans(user_id);
CREATE INDEX idx_file_scans_status ON file_scans(scan_status);
CREATE INDEX idx_file_scans_file_path ON file_scans(file_path);
CREATE INDEX idx_file_scans_created_at ON file_scans(created_at DESC);

-- RLS Policies
ALTER TABLE file_scans ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios scans
CREATE POLICY "Users can view own scans"
  ON file_scans
  FOR SELECT
  USING (auth.uid() = user_id);

-- Apenas Edge Functions podem inserir
CREATE POLICY "Service role can insert scans"
  ON file_scans
  FOR INSERT
  WITH CHECK (true);

-- Apenas Edge Functions podem atualizar
CREATE POLICY "Service role can update scans"
  ON file_scans
  FOR UPDATE
  USING (true);
```

---

## 🔌 API do VirusTotal

### **Endpoints Utilizados:**

#### **1. Upload de Arquivo**
```
POST https://www.virustotal.com/api/v3/files
```

**Headers:**
```
x-apikey: YOUR_API_KEY
```

**Body:**
```
multipart/form-data
file: [binary data]
```

**Response:**
```json
{
  "data": {
    "type": "analysis",
    "id": "abc123-def456-ghi789",
    "links": {
      "self": "https://www.virustotal.com/api/v3/analyses/abc123"
    }
  }
}
```

---

#### **2. Obter Resultado do Scan**
```
GET https://www.virustotal.com/api/v3/analyses/{id}
```

**Headers:**
```
x-apikey: YOUR_API_KEY
```

**Response:**
```json
{
  "data": {
    "attributes": {
      "status": "completed",
      "stats": {
        "malicious": 0,
        "suspicious": 0,
        "undetected": 70,
        "harmless": 0
      },
      "results": {
        "Kaspersky": {
          "category": "undetected",
          "result": null
        },
        "Avast": {
          "category": "undetected",
          "result": null
        }
        // ... 70+ engines
      }
    }
  }
}
```

---

#### **3. Buscar por Hash (Otimização)**
```
GET https://www.virustotal.com/api/v3/files/{sha256}
```

**Vantagem:** Se arquivo já foi escaneado antes, resultado é instantâneo.

---

## 🔧 Configuração da Edge Function

### **Arquivo: supabase/functions/scan-uploaded-file/deno.json**

```json
{
  "tasks": {
    "start": "deno run --allow-net --allow-env index.ts"
  },
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2"
  }
}
```

---

## 🎯 Fluxo de Integração

### **1. Upload de Arquivo (Frontend)**

```typescript
// SignContent.tsx ou Cadastro.tsx

// PASSO 1: Validação Magic Numbers (EXISTENTE)
const validationResult = await validateFile(file, {
  validateMagicNumbers: true
});

if (!validationResult.valid) {
  alert(validationResult.message);
  return;
}

// PASSO 2: Upload para Supabase Storage
const { data, error } = await supabase.storage
  .from('uploads')
  .upload(`${userId}/${fileName}`, file);

if (error) {
  console.error('Upload failed:', error);
  return;
}

// PASSO 3: Criar registro de scan (status: pending)
const { data: scanRecord } = await supabase
  .from('file_scans')
  .insert({
    file_path: data.path,
    file_name: fileName,
    file_size: file.size,
    user_id: userId,
    scan_status: 'pending'
  })
  .select()
  .single();

// PASSO 4: Acionar Edge Function (via webhook ou manualmente)
await supabase.functions.invoke('scan-uploaded-file', {
  body: {
    file_path: data.path,
    scan_id: scanRecord.id
  }
});

// PASSO 5: Polling para verificar status
const checkScanStatus = setInterval(async () => {
  const { data: scan } = await supabase
    .from('file_scans')
    .select('scan_status, threat_name')
    .eq('id', scanRecord.id)
    .single();
  
  if (scan.scan_status === 'clean') {
    clearInterval(checkScanStatus);
    alert('Arquivo aprovado!');
  } else if (scan.scan_status === 'infected') {
    clearInterval(checkScanStatus);
    alert(`Ameaça detectada: ${scan.threat_name}`);
    // Deletar arquivo
    await supabase.storage
      .from('uploads')
      .remove([data.path]);
  }
}, 2000); // Verifica a cada 2 segundos
```

---

## 🔒 Segurança

### **Princípios de Segurança:**

1. ✅ **Validação em Camadas**
   - Magic Numbers (frontend)
   - MIME Type (frontend)
   - VirusTotal (backend)

2. ✅ **Isolamento de Arquivos**
   - Arquivos são armazenados temporariamente
   - Deletados se infectados

3. ✅ **Logs de Auditoria**
   - Todos os scans são registrados
   - Histórico completo de ameaças

4. ✅ **Rate Limiting**
   - Respeita limites do VirusTotal
   - Implementa retry com backoff

---

## 📊 Monitoramento

### **Métricas Chave:**

```sql
-- Total de arquivos escaneados
SELECT COUNT(*) FROM file_scans;

-- Arquivos infectados
SELECT COUNT(*) FROM file_scans WHERE scan_status = 'infected';

-- Taxa de detecção
SELECT 
  scan_status,
  COUNT(*) as total,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM file_scans), 2) as percentage
FROM file_scans
GROUP BY scan_status;

-- Ameaças mais comuns
SELECT 
  threat_name,
  COUNT(*) as occurrences
FROM file_scans
WHERE scan_status = 'infected'
GROUP BY threat_name
ORDER BY occurrences DESC
LIMIT 10;
```

---

## 🧪 Testes

### **Arquivo EICAR (Teste Padrão)**

```bash
# Criar arquivo de teste
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt

# Fazer upload via interface
# Resultado esperado: BLOQUEADO
```

---

## 📞 Referências

- **VirusTotal API Docs:** https://developers.virustotal.com/reference/overview
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **EICAR Test File:** https://www.eicar.org/

---

**Última atualização:** 2025-01-15  
**Versão:** 1.0.0  
**Autor:** Alex (Engineer)