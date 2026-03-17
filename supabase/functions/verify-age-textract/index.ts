// =====================================================
// EDGE FUNCTION: verify-age-textract
// Vero iD - Verificação de idade via AWS Textract
// =====================================================
// Esta função extrai a data de nascimento de documentos
// (CNH, RG, Passaporte) usando AWS Textract e verifica
// se o usuário tem 18 anos ou mais.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Configurações AWS
const AWS_ACCESS_KEY_ID = Deno.env.get('AWS_ACCESS_KEY_ID') ?? '';
const AWS_SECRET_ACCESS_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY') ?? '';
const AWS_REGION = Deno.env.get('AWS_REGION') ?? 'us-east-1';

interface VerifyAgeRequest {
  documentBase64: string; // Imagem do documento em base64
  documentType?: 'CNH' | 'RG' | 'PASSAPORTE';
}

interface VerifyAgeResponse {
  success: boolean;
  isAdult: boolean;
  age?: number;
  birthDate?: string;
  extractedText?: string;
  error?: string;
  confidence?: number;
}

/**
 * Gera assinatura AWS Signature Version 4
 */
async function generateAWSSignature(
  method: string,
  service: string,
  host: string,
  region: string,
  requestPayload: string,
  amzDate: string,
  dateStamp: string
): Promise<{ authorizationHeader: string; signedHeaders: string }> {
  const encoder = new TextEncoder();
  
  // Função para criar HMAC-SHA256
  async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string): Promise<ArrayBuffer> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key instanceof ArrayBuffer ? key : key.buffer,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  }
  
  // Função para criar hash SHA256
  async function sha256(message: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(message));
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // Função para converter ArrayBuffer para hex
  function toHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  // Canonical Request
  const payloadHash = await sha256(requestPayload);
  const canonicalRequest = [
    method,
    '/',
    '',
    `content-type:application/x-amz-json-1.1`,
    `host:${host}`,
    `x-amz-date:${amzDate}`,
    `x-amz-target:Textract.DetectDocumentText`,
    '',
    signedHeaders,
    payloadHash
  ].join('\n');
  
  // String to Sign
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');
  
  // Signing Key
  const kDate = await hmacSha256(encoder.encode('AWS4' + AWS_SECRET_ACCESS_KEY), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  
  // Signature
  const signature = toHex(await hmacSha256(kSigning, stringToSign));
  
  // Authorization Header
  const authorizationHeader = `${algorithm} Credential=${AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return { authorizationHeader, signedHeaders };
}

/**
 * Chama AWS Textract para extrair texto do documento
 */
async function callTextract(imageBase64: string): Promise<any> {
  const host = `textract.${AWS_REGION}.amazonaws.com`;
  const endpoint = `https://${host}`;
  
  // Remove prefixo data:image/... se existir
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  
  const requestBody = JSON.stringify({
    Document: {
      Bytes: base64Data
    }
  });
  
  // Gera timestamp
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);
  
  // Gera assinatura
  const { authorizationHeader } = await generateAWSSignature(
    'POST',
    'textract',
    host,
    AWS_REGION,
    requestBody,
    amzDate,
    dateStamp
  );
  
  console.log('🔍 [TEXTRACT] Chamando AWS Textract...');
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Date': amzDate,
      'X-Amz-Target': 'Textract.DetectDocumentText',
      'Authorization': authorizationHeader,
      'Host': host
    },
    body: requestBody
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [TEXTRACT] Erro na resposta:', response.status, errorText);
    throw new Error(`AWS Textract error: ${response.status} - ${errorText}`);
  }
  
  const result = await response.json();
  console.log('✅ [TEXTRACT] Resposta recebida com sucesso');
  
  return result;
}

/**
 * Extrai todo o texto do resultado do Textract
 */
function extractAllText(textractResult: any): string {
  const blocks = textractResult.Blocks || [];
  const lines: string[] = [];
  
  for (const block of blocks) {
    if (block.BlockType === 'LINE' && block.Text) {
      lines.push(block.Text);
    }
  }
  
  return lines.join('\n');
}

/**
 * Extrai data de nascimento do texto usando múltiplos padrões
 */
function extractBirthDate(text: string): { date: Date | null; confidence: number; rawMatch: string | null } {
  console.log('🔍 [EXTRACT] Procurando data de nascimento no texto...');
  
  // Normaliza o texto
  const normalizedText = text.toUpperCase();
  
  // Padrões para encontrar data de nascimento
  const patterns = [
    // CNH - "DATA NASCIMENTO" ou "NASC" seguido de data
    /(?:DATA\s*(?:DE\s*)?NASCIMENTO|NASC(?:IMENTO)?|D\.?\s*NASC\.?|DT\.?\s*NASC\.?)\s*[:\-]?\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
    
    // RG - "NASCIDO EM" ou "NASCIMENTO"
    /(?:NASCIDO\s*(?:EM|A)?|NASCIMENTO)\s*[:\-]?\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
    
    // Passaporte - "DATE OF BIRTH" ou "DOB"
    /(?:DATE\s*OF\s*BIRTH|DOB|D\.O\.B\.?)\s*[:\-]?\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
    
    // Formato genérico com label
    /(?:NASCIMENTO|NASC\.?|BIRTH)\s*[:\-]?\s*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
    
    // Data após "FILIAÇÃO" (comum em RGs) - próxima linha geralmente tem data
    /FILIA[CÇ][AÃ]O[\s\S]{0,100}?(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      let day = parseInt(match[1], 10);
      let month = parseInt(match[2], 10);
      let year = parseInt(match[3], 10);
      
      // Ajusta ano de 2 dígitos
      if (year < 100) {
        year = year > 30 ? 1900 + year : 2000 + year;
      }
      
      // Valida data
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2020) {
        const date = new Date(year, month - 1, day);
        
        // Verifica se a data é válida
        if (date.getDate() === day && date.getMonth() === month - 1) {
          console.log(`✅ [EXTRACT] Data encontrada: ${day}/${month}/${year}`);
          return {
            date,
            confidence: 0.95,
            rawMatch: match[0]
          };
        }
      }
    }
  }
  
  // Tenta encontrar qualquer data que pareça ser de nascimento (pessoa entre 18-100 anos)
  const genericDatePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g;
  let genericMatch;
  const possibleDates: { date: Date; rawMatch: string }[] = [];
  
  while ((genericMatch = genericDatePattern.exec(normalizedText)) !== null) {
    const day = parseInt(genericMatch[1], 10);
    const month = parseInt(genericMatch[2], 10);
    const year = parseInt(genericMatch[3], 10);
    
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1920 && year <= 2010) {
      const date = new Date(year, month - 1, day);
      if (date.getDate() === day && date.getMonth() === month - 1) {
        possibleDates.push({ date, rawMatch: genericMatch[0] });
      }
    }
  }
  
  // Se encontrou datas possíveis, retorna a mais antiga (mais provável ser nascimento)
  if (possibleDates.length > 0) {
    possibleDates.sort((a, b) => a.date.getTime() - b.date.getTime());
    console.log(`⚠️ [EXTRACT] Data encontrada por heurística: ${possibleDates[0].rawMatch}`);
    return {
      date: possibleDates[0].date,
      confidence: 0.7,
      rawMatch: possibleDates[0].rawMatch
    };
  }
  
  console.log('❌ [EXTRACT] Nenhuma data de nascimento encontrada');
  return { date: null, confidence: 0, rawMatch: null };
}

/**
 * Calcula idade a partir da data de nascimento
 */
function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔐 [VERIFY-AGE] Iniciando verificação de idade via AWS Textract...');

    // Valida método HTTP
    if (req.method !== 'POST') {
      throw new Error('Método não permitido. Use POST.');
    }

    // Verifica se as credenciais AWS estão configuradas
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      console.error('❌ [VERIFY-AGE] Credenciais AWS não configuradas');
      throw new Error('Serviço de verificação não configurado. Contate o suporte.');
    }

    // Parse do body
    const body: VerifyAgeRequest = await req.json();
    
    if (!body.documentBase64) {
      throw new Error('Imagem do documento é obrigatória');
    }

    console.log('📄 [VERIFY-AGE] Documento recebido, tipo:', body.documentType || 'não especificado');

    // Chama AWS Textract
    const textractResult = await callTextract(body.documentBase64);
    
    // Extrai texto
    const extractedText = extractAllText(textractResult);
    console.log('📝 [VERIFY-AGE] Texto extraído:', extractedText.substring(0, 500) + '...');
    
    // Extrai data de nascimento
    const { date: birthDate, confidence, rawMatch } = extractBirthDate(extractedText);
    
    if (!birthDate) {
      console.log('❌ [VERIFY-AGE] Não foi possível extrair data de nascimento');
      return new Response(
        JSON.stringify({
          success: false,
          isAdult: false,
          error: 'Não foi possível identificar a data de nascimento no documento. Certifique-se de que a imagem está clara e legível.',
          extractedText: extractedText.substring(0, 1000)
        } as VerifyAgeResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    
    // Calcula idade
    const age = calculateAge(birthDate);
    const isAdult = age >= 18;
    
    console.log(`✅ [VERIFY-AGE] Idade calculada: ${age} anos (${isAdult ? 'MAIOR' : 'MENOR'} de idade)`);
    console.log(`📅 [VERIFY-AGE] Data de nascimento: ${birthDate.toLocaleDateString('pt-BR')}`);
    console.log(`🎯 [VERIFY-AGE] Confiança: ${(confidence * 100).toFixed(0)}%`);

    const response: VerifyAgeResponse = {
      success: true,
      isAdult,
      age,
      birthDate: birthDate.toISOString().split('T')[0],
      confidence,
      extractedText: extractedText.substring(0, 500) // Limita para não expor dados sensíveis
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ [VERIFY-AGE] Erro na Edge Function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        isAdult: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido ao verificar documento',
      } as VerifyAgeResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});