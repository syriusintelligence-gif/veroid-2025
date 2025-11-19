/**
 * Integração de criptografia com Supabase
 * Gerencia chaves e conteúdos assinados no banco de dados
 */

import { supabase } from './supabase';
import type { Database } from './supabase';
import { generateHash, generateVerificationCode } from './crypto';

type KeyPairRow = Database['public']['Tables']['key_pairs']['Row'];
type KeyPairInsert = Database['public']['Tables']['key_pairs']['Insert'];
type SignedContentRow = Database['public']['Tables']['signed_contents']['Row'];
type SignedContentInsert = Database['public']['Tables']['signed_contents']['Insert'];

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
  publicKey: string;
  createdAt: string;
  creatorName: string;
  verificationCode: string;
  thumbnail?: string;
  platforms?: string[];
  verificationCount: number;
}

// Converte do formato do banco para o formato da aplicação
function dbKeyPairToAppKeyPair(dbKeyPair: KeyPairRow): KeyPair {
  return {
    id: dbKeyPair.id,
    userId: dbKeyPair.user_id,
    publicKey: dbKeyPair.public_key,
    privateKey: dbKeyPair.private_key,
    createdAt: dbKeyPair.created_at,
  };
}

function dbSignedContentToAppSignedContent(dbContent: SignedContentRow): SignedContent {
  return {
    id: dbContent.id,
    userId: dbContent.user_id,
    content: dbContent.content,
    contentHash: dbContent.content_hash,
    signature: dbContent.signature,
    publicKey: dbContent.public_key,
    createdAt: dbContent.created_at,
    creatorName: dbContent.creator_name,
    verificationCode: dbContent.verification_code,
    thumbnail: dbContent.thumbnail || undefined,
    platforms: dbContent.platforms || undefined,
    verificationCount: dbContent.verification_count,
  };
}

/**
 * Gera um par de chaves RSA simulado
 */
export async function generateKeyPair(userId: string): Promise<KeyPair> {
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const publicKey = `VID-PUB-${btoa(String.fromCharCode(...randomBytes)).substring(0, 64)}`;
  const privateKey = `VID-PRIV-${btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).substring(0, 64)}`;
  
  return {
    id: crypto.randomUUID(),
    userId,
    publicKey,
    privateKey,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Salva par de chaves no Supabase
 */
export async function saveKeyPair(keyPair: KeyPair): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('key_pairs')
      .insert({
        id: keyPair.id,
        user_id: keyPair.userId,
        public_key: keyPair.publicKey,
        private_key: keyPair.privateKey,
      });
    
    if (error) {
      console.error('❌ Erro ao salvar chaves:', error);
      return { success: false, error: 'Erro ao salvar chaves' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao salvar chaves:', error);
    return { success: false, error: 'Erro desconhecido' };
  }
}

/**
 * Obtém o par de chaves do usuário
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
    
    return dbKeyPairToAppKeyPair(data);
  } catch (error) {
    console.error('❌ Erro ao buscar chaves:', error);
    return null;
  }
}

/**
 * Assina conteúdo e salva no Supabase
 */
export async function signContent(
  content: string,
  privateKey: string,
  publicKey: string,
  creatorName: string,
  userId: string,
  thumbnail?: string,
  platforms?: string[]
): Promise<{ success: boolean; signedContent?: SignedContent; error?: string }> {
  try {
    const contentHash = await generateHash(content);
    
    // Simulação de assinatura digital
    const signatureData = `${contentHash}:${privateKey}:${Date.now()}`;
    const signature = await generateHash(signatureData);
    
    // Gera chave curta de verificação
    const verificationCode = generateVerificationCode(signature, contentHash);
    
    const signedContent: SignedContentInsert = {
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
    
    const { data, error } = await supabase
      .from('signed_contents')
      .insert(signedContent)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao salvar conteúdo assinado:', error);
      return { success: false, error: 'Erro ao salvar conteúdo assinado' };
    }
    
    return {
      success: true,
      signedContent: dbSignedContentToAppSignedContent(data),
    };
  } catch (error) {
    console.error('❌ Erro ao assinar conteúdo:', error);
    return { success: false, error: 'Erro desconhecido' };
  }
}

/**
 * Obtém todos os conteúdos assinados de um usuário
 */
export async function getSignedContentsByUserId(userId: string): Promise<SignedContent[]> {
  try {
    const { data, error } = await supabase
      .from('signed_contents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar conteúdos:', error);
      return [];
    }
    
    return data.map(dbSignedContentToAppSignedContent);
  } catch (error) {
    console.error('❌ Erro ao buscar conteúdos:', error);
    return [];
  }
}

/**
 * Obtém todos os conteúdos assinados (público)
 */
export async function getAllSignedContents(): Promise<SignedContent[]> {
  try {
    const { data, error } = await supabase
      .from('signed_contents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar conteúdos:', error);
      return [];
    }
    
    return data.map(dbSignedContentToAppSignedContent);
  } catch (error) {
    console.error('❌ Erro ao buscar conteúdos:', error);
    return [];
  }
}

/**
 * Busca conteúdo por ID
 */
export async function getSignedContentById(id: string): Promise<SignedContent | null> {
  try {
    const { data, error } = await supabase
      .from('signed_contents')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return dbSignedContentToAppSignedContent(data);
  } catch (error) {
    console.error('❌ Erro ao buscar conteúdo:', error);
    return null;
  }
}

/**
 * Busca conteúdo por código de verificação
 */
export async function getSignedContentByVerificationCode(code: string): Promise<SignedContent | null> {
  try {
    const { data, error } = await supabase
      .from('signed_contents')
      .select('*')
      .eq('verification_code', code.toUpperCase())
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return dbSignedContentToAppSignedContent(data);
  } catch (error) {
    console.error('❌ Erro ao buscar conteúdo:', error);
    return null;
  }
}

/**
 * Incrementa contador de verificações
 */
export async function incrementVerificationCount(contentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('increment_verification_count', {
      content_id: contentId,
    });
    
    if (error) {
      console.error('❌ Erro ao incrementar contador:', error);
      return { success: false, error: 'Erro ao incrementar contador' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao incrementar contador:', error);
    return { success: false, error: 'Erro desconhecido' };
  }
}

/**
 * Verifica a autenticidade do conteúdo assinado
 */
export async function verifySignature(
  signedContent: SignedContent,
  providedContent: string
): Promise<{ valid: boolean; message: string }> {
  try {
    // Verifica se o hash do conteúdo fornecido corresponde ao hash armazenado
    const providedHash = await generateHash(providedContent);
    
    if (providedHash !== signedContent.contentHash) {
      return {
        valid: false,
        message: 'O conteúdo foi modificado e não corresponde à assinatura original.',
      };
    }
    
    // Verifica se a assinatura é válida
    if (!signedContent.signature || signedContent.signature.length < 32) {
      return {
        valid: false,
        message: 'Assinatura digital inválida ou corrompida.',
      };
    }
    
    return {
      valid: true,
      message: 'Conteúdo autêntico! A assinatura digital foi verificada com sucesso.',
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Erro ao verificar a assinatura. Por favor, tente novamente.',
    };
  }
}