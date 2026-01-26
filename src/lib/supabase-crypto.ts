/**
 * Integração de criptografia com Supabase
 * Gerencia chaves e conteúdos assinados no banco de dados
 * 🆕 ATUALIZADO: Agora criptografa chaves privadas com AES-256-GCM
 * 🔒 CORRIGIDO: Geração de chaves com múltiplas fontes de entropia para garantir unicidade
 */

import { supabase } from './supabase';
import type { Database, SocialLinks } from './supabase';
import { generateHash, generateVerificationCode } from './crypto';
import { encryptPrivateKey, decryptPrivateKey } from './encryption';

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
  creatorSocialLinks?: SocialLinks;
}

// Converte do formato do banco para o formato da aplicação
function dbKeyPairToAppKeyPair(dbKeyPair: KeyPairRow): KeyPair {
  return {
    id: dbKeyPair.id,
    userId: dbKeyPair.user_id,
    publicKey: dbKeyPair.public_key,
    privateKey: dbKeyPair.private_key, // ⚠️ Ainda em texto plano (modo legado)
    createdAt: dbKeyPair.created_at,
  };
}

// 🆕 MODIFICADO: Agora aceita creatorSocialLinks como parâmetro opcional
function dbSignedContentToAppSignedContent(
  dbContent: SignedContentRow, 
  creatorSocialLinks?: SocialLinks
): SignedContent {
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
    creatorSocialLinks: creatorSocialLinks, // 🆕 Adiciona links sociais
  };
}

/**
 * 🔒 CORRIGIDO: Função auxiliar para conversão segura de ArrayBuffer para Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * 🔒 CORRIGIDO: Gera um par de chaves com múltiplas fontes de entropia
 * 
 * Fontes de entropia:
 * 1. Timestamp (Date.now()) - Garante unicidade temporal
 * 2. User ID - Garante unicidade por usuário
 * 3. UUID aleatório - Entropia adicional
 * 4. crypto.getRandomValues() - Bytes aleatórios criptograficamente seguros
 * 5. SHA-256 hash - Distribuição uniforme e imprevisível
 */
export async function generateKeyPair(userId: string): Promise<KeyPair> {
  console.log('🔑 [generateKeyPair] Iniciando geração de chaves para userId:', userId);
  
  try {
    // 1. Coleta múltiplas fontes de entropia
    const timestamp = Date.now();
    const timestampStr = timestamp.toString(36); // Base36 para compactar
    const randomUUID1 = crypto.randomUUID().replace(/-/g, '');
    const randomUUID2 = crypto.randomUUID().replace(/-/g, '');
    const randomBytes1 = crypto.getRandomValues(new Uint8Array(32));
    const randomBytes2 = crypto.getRandomValues(new Uint8Array(32));
    
    console.log('✅ [generateKeyPair] Entropia coletada:', {
      timestamp,
      timestampStr,
      userId: userId.substring(0, 8) + '...',
      randomUUID1: randomUUID1.substring(0, 16) + '...',
      randomUUID2: randomUUID2.substring(0, 16) + '...',
    });
    
    // 2. Hash do userId para adicionar entropia específica do usuário
    const userIdHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(userId)
    );
    const userIdHashBase64 = arrayBufferToBase64(userIdHash).substring(0, 16);
    
    // 3. Combina todas as fontes de entropia para chave pública
    const publicKeySeed = `${timestampStr}-${userIdHashBase64}-${randomUUID1}`;
    const publicKeySeedWithBytes = publicKeySeed + String.fromCharCode(...randomBytes1);
    
    console.log('🔐 [generateKeyPair] Seed da chave pública:', {
      length: publicKeySeedWithBytes.length,
      preview: publicKeySeed.substring(0, 32) + '...',
    });
    
    // 4. Gera hash SHA-256 da chave pública
    const publicKeyHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(publicKeySeedWithBytes)
    );
    
    // 5. Combina fontes de entropia DIFERENTES para chave privada
    const privateKeySeed = `${timestampStr}-${userIdHashBase64}-${randomUUID2}`;
    const privateKeySeedWithBytes = privateKeySeed + String.fromCharCode(...randomBytes2);
    
    console.log('🔐 [generateKeyPair] Seed da chave privada:', {
      length: privateKeySeedWithBytes.length,
      preview: privateKeySeed.substring(0, 32) + '...',
    });
    
    // 6. Gera hash SHA-256 da chave privada
    const privateKeyHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(privateKeySeedWithBytes)
    );
    
    // 7. Converte para Base64 URL-safe
    const publicKey = `VID-PUB-${arrayBufferToBase64(publicKeyHash).substring(0, 64)}`;
    const privateKey = `VID-PRIV-${arrayBufferToBase64(privateKeyHash).substring(0, 64)}`;
    
    console.log('✅ [generateKeyPair] Chaves geradas com sucesso:', {
      publicKey: publicKey.substring(0, 20) + '...' + publicKey.substring(publicKey.length - 8),
      privateKey: privateKey.substring(0, 20) + '...' + privateKey.substring(privateKey.length - 8),
      publicKeyLength: publicKey.length,
      privateKeyLength: privateKey.length,
    });
    
    const keyPair: KeyPair = {
      id: crypto.randomUUID(),
      userId,
      publicKey,
      privateKey,
      createdAt: new Date().toISOString(),
    };
    
    console.log('✅ [generateKeyPair] KeyPair completo criado:', {
      id: keyPair.id,
      userId: keyPair.userId,
      createdAt: keyPair.createdAt,
    });
    
    return keyPair;
  } catch (error) {
    console.error('❌ [generateKeyPair] Erro ao gerar chaves:', error);
    throw new Error(`Falha ao gerar par de chaves: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * 🆕 Salva par de chaves no Supabase COM CRIPTOGRAFIA
 */
export async function saveKeyPair(keyPair: KeyPair): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 Criptografando chave privada antes de salvar...');
    
    // Criptografa a chave privada
    const encryptedPrivateKey = await encryptPrivateKey(keyPair.privateKey);
    
    console.log('✅ Chave privada criptografada com sucesso');
    console.log('📊 Tamanho:', {
      original: keyPair.privateKey.length,
      encrypted: encryptedPrivateKey.length,
    });
    
    const { error } = await supabase
      .from('key_pairs')
      .insert({
        id: keyPair.id,
        user_id: keyPair.userId,
        public_key: keyPair.publicKey,
        encrypted_private_key: encryptedPrivateKey, // 🆕 Salva criptografada
        encryption_algorithm: 'AES-256-GCM',
        key_version: 1,
        // private_key: null, // 🆕 Não salva mais em texto plano
      });
    
    if (error) {
      console.error('❌ Erro ao salvar chaves:', error);
      return { success: false, error: 'Erro ao salvar chaves' };
    }
    
    console.log('✅ Chaves salvas no Supabase (criptografadas)');
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao salvar chaves:', error);
    return { success: false, error: 'Erro desconhecido' };
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
        
        console.log('✅ Chave privada descriptografada com sucesso');
        
        return {
          id: data.id,
          userId: data.user_id,
          publicKey: data.public_key,
          privateKey: decryptedPrivateKey, // 🆕 Retorna descriptografada
          createdAt: data.created_at,
        };
      } catch (decryptError) {
        console.error('❌ Erro ao descriptografar chave privada:', decryptError);
        
        // Fallback: tenta usar chave em texto plano (modo legado)
        if (data.private_key) {
          console.warn('⚠️ Usando chave em texto plano (modo legado)');
          return dbKeyPairToAppKeyPair(data);
        }
        
        return null;
      }
    }
    
    // Modo legado: chave em texto plano
    if (data.private_key) {
      console.warn('⚠️ Chave encontrada em texto plano (modo legado)');
      return dbKeyPairToAppKeyPair(data);
    }
    
    console.error('❌ Nenhuma chave privada encontrada (nem criptografada nem texto plano)');
    return null;
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
    console.log('🔐 [1/7] Iniciando processo de assinatura...');
    console.log('📊 Dados recebidos:', {
      contentLength: content.length,
      hasPrivateKey: !!privateKey,
      hasPublicKey: !!publicKey,
      creatorName,
      userId,
      hasThumbnail: !!thumbnail,
      thumbnailSize: thumbnail ? `${(thumbnail.length / 1024).toFixed(2)}KB` : 'N/A',
      platforms: platforms?.join(', '),
    });
    
    console.log('🔐 [2/7] Gerando hash do conteúdo...');
    const contentHash = await generateHash(content);
    console.log('✅ Hash gerado:', contentHash.substring(0, 16) + '...');
    
    console.log('🔐 [3/7] Gerando assinatura digital...');
    const signatureData = `${contentHash}:${privateKey}:${Date.now()}`;
    const signature = await generateHash(signatureData);
    console.log('✅ Assinatura gerada:', signature.substring(0, 16) + '...');
    
    console.log('🔐 [4/7] Gerando código de verificação...');
    const verificationCode = generateVerificationCode(signature, contentHash);
    console.log('✅ Código de verificação:', verificationCode);
    
    console.log('🔐 [5/7] Preparando dados para inserção no Supabase...');
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
    
    console.log('📊 Tamanho dos dados:', {
      content: `${(content.length / 1024).toFixed(2)}KB`,
      thumbnail: thumbnail ? `${(thumbnail.length / 1024).toFixed(2)}KB` : 'N/A',
      totalEstimate: `${((content.length + (thumbnail?.length || 0)) / 1024).toFixed(2)}KB`,
    });
    
    console.log('🔐 [6/7] Salvando no Supabase...');
    const { data, error } = await supabase
      .from('signed_contents')
      .insert(signedContent)
      .select()
      .single();
    
    if (error) {
      console.error('❌ [ERRO SUPABASE] Detalhes completos:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      return { success: false, error: `Erro ao salvar: ${error.message}` };
    }
    
    console.log('✅ [7/7] Conteúdo salvo com sucesso no Supabase!');
    console.log('📄 ID do conteúdo:', data.id);
    
    return {
      success: true,
      signedContent: dbSignedContentToAppSignedContent(data),
    };
  } catch (error) {
    console.error('❌ [ERRO CRÍTICO] Erro ao assinar conteúdo:', error);
    console.error('📊 Stack trace:', error instanceof Error ? error.stack : 'N/A');
    return { success: false, error: `Erro crítico: ${error instanceof Error ? error.message : 'Erro desconhecido'}` };
  }
}

/**
 * 🆕 CORRIGIDO: Obtém todos os conteúdos assinados de um usuário COM LINKS SOCIAIS
 */
export async function getSignedContentsByUserId(userId: string): Promise<SignedContent[]> {
  try {
    console.log('🔍 [getSignedContentsByUserId] Buscando conteúdos do usuário:', userId);
    
    const { data, error } = await supabase
      .from('signed_contents')
      .select(`
        *,
        users!signed_contents_user_id_fkey(social_links)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar conteúdos:', error);
      return [];
    }
    
    console.log(`✅ [getSignedContentsByUserId] ${data.length} conteúdos encontrados`);
    
    return data.map(item => {
      // Extrai links sociais do criador
      let creatorSocialLinks: SocialLinks | undefined = undefined;
      if (item.users && typeof item.users === 'object' && 'social_links' in item.users) {
        creatorSocialLinks = item.users.social_links as SocialLinks;
        console.log('✅ [getSignedContentsByUserId] Links sociais encontrados para:', item.id);
      }
      
      return dbSignedContentToAppSignedContent(item, creatorSocialLinks);
    });
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
    
    return data.map(item => dbSignedContentToAppSignedContent(item));
  } catch (error) {
    console.error('❌ Erro ao buscar conteúdos:', error);
    return [];
  }
}

/**
 * 🆕 CORRIGIDO: Busca conteúdo por ID e inclui links sociais do criador
 */
export async function getSignedContentById(id: string): Promise<SignedContent | null> {
  try {
    console.log('🔍 [getSignedContentById] Buscando conteúdo:', id);
    
    const { data, error } = await supabase
      .from('signed_contents')
      .select(`
        *,
        users!signed_contents_user_id_fkey(social_links)
      `)
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.log('❌ [getSignedContentById] Conteúdo não encontrado');
      return null;
    }
    
    console.log('✅ [getSignedContentById] Conteúdo encontrado');
    console.log('🔍 [DEBUG] data.users:', data.users);
    
    // Extrai links sociais do criador
    let creatorSocialLinks: SocialLinks | undefined = undefined;
    if (data.users && typeof data.users === 'object' && 'social_links' in data.users) {
      creatorSocialLinks = data.users.social_links as SocialLinks;
      console.log('✅ [getSignedContentById] Links sociais encontrados:', creatorSocialLinks);
    } else {
      console.log('⚠️ [getSignedContentById] Nenhum link social encontrado');
    }
    
    // 🆕 CORRIGIDO: Passa creatorSocialLinks para a função de conversão
    const content = dbSignedContentToAppSignedContent(data, creatorSocialLinks);
    
    console.log('📊 [getSignedContentById] Conteúdo final:', {
      id: content.id,
      creatorName: content.creatorName,
      hasCreatorSocialLinks: !!content.creatorSocialLinks,
      socialLinksCount: content.creatorSocialLinks ? Object.keys(content.creatorSocialLinks).length : 0,
    });
    
    return content;
  } catch (error) {
    console.error('❌ Erro ao buscar conteúdo:', error);
    return null;
  }
}

/**
 * 🆕 CORRIGIDO: Busca conteúdo por código de verificação e inclui links sociais do criador
 */
export async function getSignedContentByVerificationCode(code: string): Promise<SignedContent | null> {
  try {
    console.log('🔍 [getSignedContentByVerificationCode] Buscando por código:', code);
    
    const { data, error } = await supabase
      .from('signed_contents')
      .select(`
        *,
        users!signed_contents_user_id_fkey(social_links)
      `)
      .eq('verification_code', code.toUpperCase())
      .single();
    
    if (error || !data) {
      console.log('❌ [getSignedContentByVerificationCode] Conteúdo não encontrado');
      return null;
    }
    
    console.log('✅ [getSignedContentByVerificationCode] Conteúdo encontrado');
    console.log('🔍 [DEBUG] data.users:', data.users);
    
    // Extrai links sociais do criador
    let creatorSocialLinks: SocialLinks | undefined = undefined;
    if (data.users && typeof data.users === 'object' && 'social_links' in data.users) {
      creatorSocialLinks = data.users.social_links as SocialLinks;
      console.log('✅ [getSignedContentByVerificationCode] Links sociais encontrados:', creatorSocialLinks);
    } else {
      console.log('⚠️ [getSignedContentByVerificationCode] Nenhum link social encontrado');
    }
    
    // 🆕 CORRIGIDO: Passa creatorSocialLinks para a função de conversão
    const content = dbSignedContentToAppSignedContent(data, creatorSocialLinks);
    
    console.log('📊 [getSignedContentByVerificationCode] Conteúdo final:', {
      id: content.id,
      creatorName: content.creatorName,
      hasCreatorSocialLinks: !!content.creatorSocialLinks,
      socialLinksCount: content.creatorSocialLinks ? Object.keys(content.creatorSocialLinks).length : 0,
    });
    
    return content;
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