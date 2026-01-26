/**
 * Funções de criptografia e integração com Supabase
 * 🆕 ATUALIZADO: Criptografia AES-256-GCM para chaves privadas
 */

import { supabase } from './supabase';

// Tipos
export interface KeyPair {
  id: string;
  userId: string;
  publicKey: string;
  privateKey: string;
  createdAt: string;
}

export interface SignedContent {
  id: string;
  userId: string;
  content: string;
  contentHash: string;
  signature: string;
  verificationCode: string;
  publicKey: string;
  platforms?: string[];
  createdAt: string;
  verificationCount?: number;
  thumbnail?: string;
  creatorName?: string;
  creatorSocialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
  filePath?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  storageBucket?: string;
}

// 🆕 Chave de criptografia (em produção, use variável de ambiente)
const ENCRYPTION_KEY = 'veroId-encryption-key-2024-secure-aes256';

/**
 * 🆕 Deriva uma chave AES-256 a partir de uma senha
 */
async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('veroId-salt-2024'),
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
 * 🆕 Criptografa a chave privada usando AES-256-GCM
 */
async function encryptPrivateKey(privateKey: string): Promise<string> {
  console.log('🔐 [encryptPrivateKey] Iniciando criptografia...');
  
  try {
    const key = await deriveKey(ENCRYPTION_KEY);
    const encoder = new TextEncoder();
    const data = encoder.encode(privateKey);
    
    // IV (Initialization Vector) aleatório
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Combina IV + dados criptografados
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);
    
    // Converte para base64
    const encrypted = btoa(String.fromCharCode(...combined));
    
    console.log('✅ [encryptPrivateKey] Chave privada criptografada com sucesso');
    return encrypted;
  } catch (error) {
    console.error('❌ [encryptPrivateKey] Erro ao criptografar:', error);
    throw error;
  }
}

/**
 * 🆕 Descriptografa a chave privada
 */
async function decryptPrivateKey(encryptedPrivateKey: string): Promise<string> {
  console.log('🔓 [decryptPrivateKey] Iniciando descriptografia...');
  
  try {
    const key = await deriveKey(ENCRYPTION_KEY);
    
    // Decodifica de base64
    const combined = Uint8Array.from(atob(encryptedPrivateKey), c => c.charCodeAt(0));
    
    // Separa IV e dados criptografados
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    const privateKey = decoder.decode(decryptedData);
    
    console.log('✅ [decryptPrivateKey] Chave privada descriptografada com sucesso');
    return privateKey;
  } catch (error) {
    console.error('❌ [decryptPrivateKey] Erro ao descriptografar:', error);
    throw error;
  }
}

/**
 * 🆕 Salva par de chaves no Supabase (chave privada criptografada)
 */
export async function saveKeyPairToSupabase(keyPair: KeyPair): Promise<{ success: boolean; error?: string }> {
  console.log('☁️ [saveKeyPairToSupabase] ========== INÍCIO ==========');
  console.log('📊 [saveKeyPairToSupabase] keyPair recebido:', JSON.stringify({
    id: keyPair?.id,
    userId: keyPair?.userId,
    hasPublicKey: !!keyPair?.publicKey,
    hasPrivateKey: !!keyPair?.privateKey,
  }, null, 2));
  
  try {
    // 🆕 VALIDAÇÃO CRÍTICA 1: Verifica se keyPair existe
    if (!keyPair) {
      console.error('❌ [saveKeyPairToSupabase] ERROR: keyPair é null ou undefined');
      return { success: false, error: 'keyPair ausente' };
    }
    
    // 🆕 VALIDAÇÃO CRÍTICA 2: Verifica se keyPair é um objeto
    if (typeof keyPair !== 'object') {
      console.error('❌ [saveKeyPairToSupabase] ERROR: keyPair não é um objeto, tipo:', typeof keyPair);
      return { success: false, error: 'keyPair deve ser um objeto' };
    }
    
    // 🆕 VALIDAÇÃO CRÍTICA 3: Verifica userId
    if (!keyPair.userId) {
      console.error('❌ [saveKeyPairToSupabase] ERROR: userId está ausente no keyPair');
      console.error('📊 [saveKeyPairToSupabase] keyPair completo:', JSON.stringify(keyPair, null, 2));
      return { success: false, error: 'userId ausente no keyPair' };
    }
    
    // 🆕 VALIDAÇÃO CRÍTICA 4: Verifica publicKey
    if (!keyPair.publicKey) {
      console.error('❌ [saveKeyPairToSupabase] ERROR: publicKey está ausente');
      return { success: false, error: 'publicKey ausente' };
    }
    
    // 🆕 VALIDAÇÃO CRÍTICA 5: Verifica privateKey
    if (!keyPair.privateKey) {
      console.error('❌ [saveKeyPairToSupabase] ERROR: privateKey está ausente');
      return { success: false, error: 'privateKey ausente' };
    }
    
    console.log('✅ [saveKeyPairToSupabase] Todas as validações passaram');
    console.log('🔐 [saveKeyPairToSupabase] Criptografando chave privada...');
    
    // Criptografa a chave privada
    let encryptedPrivateKey: string;
    try {
      encryptedPrivateKey = await encryptPrivateKey(keyPair.privateKey);
      console.log('✅ [saveKeyPairToSupabase] Chave privada criptografada com sucesso');
    } catch (encryptError) {
      console.error('❌ [saveKeyPairToSupabase] Erro ao criptografar chave privada:', encryptError);
      return { 
        success: false, 
        error: `Erro ao criptografar: ${encryptError instanceof Error ? encryptError.message : 'Erro desconhecido'}` 
      };
    }
    
    console.log('💾 [saveKeyPairToSupabase] Salvando no banco de dados...');
    console.log('📊 [saveKeyPairToSupabase] Dados a inserir:', {
      user_id: keyPair.userId,
      public_key: keyPair.publicKey.substring(0, 20) + '...',
      encrypted_private_key: encryptedPrivateKey.substring(0, 20) + '...',
    });
    
    // Salva no Supabase
    const { data, error } = await supabase
      .from('key_pairs')
      .upsert({
        user_id: keyPair.userId,
        public_key: keyPair.publicKey,
        encrypted_private_key: encryptedPrivateKey,
        encryption_algorithm: 'AES-256-GCM',
        key_version: 1,
      })
      .select();
    
    if (error) {
      console.error('❌ [saveKeyPairToSupabase] ERRO do Supabase:', JSON.stringify(error, null, 2));
      return { 
        success: false, 
        error: `Database error: ${error.message} (code: ${error.code})` 
      };
    }
    
    console.log('✅ [saveKeyPairToSupabase] Dados inseridos no Supabase com sucesso');
    console.log('📄 [saveKeyPairToSupabase] Dados retornados:', data);
    console.log('🎉 [saveKeyPairToSupabase] ========== SUCESSO ==========');
    
    // 🆕 GARANTIR RETORNO EXPLÍCITO
    const successResult = { success: true };
    console.log('📊 [saveKeyPairToSupabase] Retornando:', JSON.stringify(successResult));
    return successResult;
    
  } catch (unexpectedError) {
    console.error('❌ [saveKeyPairToSupabase] ERRO INESPERADO NÃO TRATADO:', unexpectedError);
    console.error('📊 [saveKeyPairToSupabase] Tipo do erro:', typeof unexpectedError);
    console.error('📊 [saveKeyPairToSupabase] Stack trace:', unexpectedError instanceof Error ? unexpectedError.stack : 'N/A');
    console.error('📊 [saveKeyPairToSupabase] Erro completo:', JSON.stringify(unexpectedError, null, 2));
    
    // 🆕 GARANTIR RETORNO EXPLÍCITO EM CASO DE ERRO
    const errorResult = { 
      success: false, 
      error: `Unexpected error: ${unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError)}` 
    };
    console.log('📊 [saveKeyPairToSupabase] Retornando erro:', JSON.stringify(errorResult));
    return errorResult;
  }
}

/**
 * 🆕 Obtém o par de chaves do usuário COM DESCRIPTOGRAFIA
 */
export async function getKeyPair(userId: string): Promise<KeyPair | null> {
  try {
    const { data, error } = await supabase
      .from('key_pairs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    // 🆕 Verifica se tem chave criptografada
    if (data.encrypted_private_key) {
      console.log('🔓 Descriptografando chave privada...');
      
      try {
        const decryptedPrivateKey = await decryptPrivateKey(data.encrypted_private_key);
        
        return {
          id: data.id || crypto.randomUUID(),
          userId: data.user_id,
          publicKey: data.public_key,
          privateKey: decryptedPrivateKey,
          createdAt: data.created_at,
        };
      } catch (decryptError) {
        console.error('❌ Erro ao descriptografar chave privada:', decryptError);
        return null;
      }
    }
    
    // Fallback para chaves antigas não criptografadas (se houver)
    return {
      id: data.id || crypto.randomUUID(),
      userId: data.user_id,
      publicKey: data.public_key,
      privateKey: data.private_key || '',
      createdAt: data.created_at,
    };
  } catch (error) {
    console.error('❌ Erro ao buscar chaves do Supabase:', error);
    return null;
  }
}

/**
 * Salva conteúdo assinado no Supabase
 */
export async function saveSignedContent(signedContent: Omit<SignedContent, 'id' | 'createdAt'>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('signed_contents')
      .insert({
        user_id: signedContent.userId,
        content: signedContent.content,
        content_hash: signedContent.contentHash,
        signature: signedContent.signature,
        verification_code: signedContent.verificationCode,
        public_key: signedContent.publicKey,
        platforms: signedContent.platforms || [],
      });
    
    if (error) {
      console.error('❌ Erro ao salvar conteúdo assinado:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar conteúdo assinado:', error);
    return false;
  }
}

/**
 * Busca conteúdos assinados por um usuário
 */
export async function getSignedContentsByUserId(userId: string): Promise<SignedContent[]> {
  try {
    const { data, error } = await supabase
      .from('signed_contents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar conteúdos assinados:', error);
      return [];
    }
    
    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      content: item.content,
      contentHash: item.content_hash,
      signature: item.signature,
      verificationCode: item.verification_code,
      publicKey: item.public_key,
      platforms: item.platforms || [],
      createdAt: item.created_at,
      verificationCount: item.verification_count || 0,
      thumbnail: item.thumbnail,
      creatorName: item.creator_name,
      creatorSocialLinks: item.creator_social_links,
      filePath: item.file_path,
      fileName: item.file_name,
      mimeType: item.mime_type,
      fileSize: item.file_size,
      storageBucket: item.storage_bucket,
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar conteúdos assinados:', error);
    return [];
  }
}

/**
 * Busca conteúdo assinado por código de verificação
 */
export async function getSignedContentByVerificationCode(code: string): Promise<SignedContent | null> {
  try {
    const { data, error } = await supabase
      .from('signed_contents')
      .select('*')
      .eq('verification_code', code)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      userId: data.user_id,
      content: data.content,
      contentHash: data.content_hash,
      signature: data.signature,
      verificationCode: data.verification_code,
      publicKey: data.public_key,
      platforms: data.platforms || [],
      createdAt: data.created_at,
      verificationCount: data.verification_count || 0,
    };
  } catch (error) {
    console.error('❌ Erro ao buscar conteúdo por código:', error);
    return null;
  }
}

/**
 * Incrementa contador de verificações
 */
export async function incrementVerificationCount(contentId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('increment_verification_count', {
      content_id: contentId,
    });
    
    if (error) {
      console.error('❌ Erro ao incrementar contador:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao incrementar contador:', error);
    return false;
  }
}
/**
 * Busca todos os conteúdos assinados (para admin)
 */
export async function getAllSignedContents(): Promise<SignedContent[]> {
  try {
    const { data, error } = await supabase
      .from('signed_contents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar todos os conteúdos:', error);
      return [];
    }
    
    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      content: item.content,
      contentHash: item.content_hash,
      signature: item.signature,
      verificationCode: item.verification_code,
      publicKey: item.public_key,
      platforms: item.platforms || [],
      createdAt: item.created_at,
      verificationCount: item.verification_count || 0,
    }));
  } catch (error) {
    console.error('❌ Erro ao buscar todos os conteúdos:', error);
    return [];
  }
}

/**
 * Busca conteúdo assinado por ID
 */
export async function getSignedContentById(contentId: string): Promise<SignedContent | null> {
  try {
    const { data, error } = await supabase
      .from('signed_contents')
      .select('*')
      .eq('id', contentId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      userId: data.user_id,
      content: data.content,
      contentHash: data.content_hash,
      signature: data.signature,
      verificationCode: data.verification_code,
      publicKey: data.public_key,
      platforms: data.platforms || [],
      createdAt: data.created_at,
      verificationCount: data.verification_count || 0,
    };
  } catch (error) {
    console.error('❌ Erro ao buscar conteúdo por ID:', error);
    return null;
  }
}
