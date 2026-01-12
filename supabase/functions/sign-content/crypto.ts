// =====================================================
// MÓDULO DE CRIPTOGRAFIA BACKEND
// Funções seguras para criptografia e assinatura
// =====================================================

// Chave mestra para criptografia (deve estar em variável de ambiente)
const MASTER_KEY = Deno.env.get('MASTER_ENCRYPTION_KEY') || 'default-key-change-in-production';

/**
 * Gera hash SHA-256 de uma string
 */
export async function generateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Gera código de verificação curto (8 caracteres)
 */
export function generateVerificationCode(signature: string, contentHash: string): string {
  const combined = signature + contentHash;
  const code = combined
    .split('')
    .filter((_, i) => i % 8 === 0)
    .join('')
    .toUpperCase()
    .substring(0, 8);
  return code;
}

/**
 * Deriva chave de criptografia da chave mestra
 */
async function deriveKey(masterKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterKey),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('veroid-salt-v1'), // Salt fixo (em produção, usar salt único por chave)
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa chave privada usando AES-256-GCM
 */
export async function encryptPrivateKey(privateKey: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const key = await deriveKey(MASTER_KEY);
    
    // Gera IV aleatório
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Criptografa
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(privateKey)
    );
    
    // Combina IV + dados criptografados
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Converte para Base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('❌ Erro ao criptografar chave privada:', error);
    throw new Error('Falha na criptografia');
  }
}

/**
 * Descriptografa chave privada usando AES-256-GCM
 */
export async function decryptPrivateKey(encryptedPrivateKey: string): Promise<string> {
  try {
    const decoder = new TextDecoder();
    const key = await deriveKey(MASTER_KEY);
    
    // Decodifica Base64
    const combined = Uint8Array.from(atob(encryptedPrivateKey), c => c.charCodeAt(0));
    
    // Separa IV e dados criptografados
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    // Descriptografa
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );
    
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('❌ Erro ao descriptografar chave privada:', error);
    throw new Error('Falha na descriptografia');
  }
}

/**
 * Assina conteúdo e salva no banco de dados
 */
export async function signContent(
  content: string,
  privateKey: string,
  publicKey: string,
  creatorName: string,
  userId: string,
  thumbnail?: string,
  platforms?: string[]
): Promise<{
  success: boolean;
  signedContent?: {
    id: string;
    content: string;
    contentHash: string;
    signature: string;
    publicKey: string;
    createdAt: string;
    creatorName: string;
    verificationCode: string;
    thumbnail?: string;
    platforms?: string[];
    verificationCount: number;
  };
  error?: string;
}> {
  try {
    console.log('🔐 [1/7] Iniciando processo de assinatura...');
    
    // 1. Gera hash do conteúdo
    console.log('🔐 [2/7] Gerando hash do conteúdo...');
    const contentHash = await generateHash(content);
    console.log('✅ Hash gerado:', contentHash.substring(0, 16) + '...');
    
    // 2. Gera assinatura digital
    console.log('🔐 [3/7] Gerando assinatura digital...');
    const signatureData = `${contentHash}:${privateKey}:${Date.now()}`;
    const signature = await generateHash(signatureData);
    console.log('✅ Assinatura gerada:', signature.substring(0, 16) + '...');
    
    // 3. Gera código de verificação
    console.log('🔐 [4/7] Gerando código de verificação...');
    const verificationCode = generateVerificationCode(signature, contentHash);
    console.log('✅ Código de verificação:', verificationCode);
    
    // 4. Cria cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 5. Prepara dados para inserção
    console.log('🔐 [5/7] Preparando dados para inserção...');
    const signedContentData = {
      user_id: userId,
      content,
      content_hash: contentHash,
      signature,
      public_key: publicKey,
      creator_name: creatorName,
      verification_code: verificationCode,
      thumbnail: thumbnail || null,
      platforms: platforms || null,
      verification_count: 0,
    };
    
    // 6. Salva no banco
    console.log('🔐 [6/7] Salvando no banco de dados...');
    const { data, error } = await supabase
      .from('signed_contents')
      .insert(signedContentData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar no banco:', error);
      return { success: false, error: `Erro ao salvar: ${error.message}` };
    }
    
    console.log('✅ [7/7] Conteúdo salvo com sucesso!');
    console.log('📄 ID do conteúdo:', data.id);
    
    return {
      success: true,
      signedContent: {
        id: data.id,
        content: data.content,
        contentHash: data.content_hash,
        signature: data.signature,
        publicKey: data.public_key,
        createdAt: data.timestamp || new Date().toISOString(),
        creatorName: data.creator_name,
        verificationCode: data.verification_code,
        thumbnail: data.thumbnail || undefined,
        platforms: data.platforms || undefined,
        verificationCount: data.verification_count,
      },
    };
  } catch (error) {
    console.error('❌ [ERRO CRÍTICO] Erro ao assinar conteúdo:', error);
    return { 
      success: false, 
      error: `Erro crítico: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
    };
  }
}