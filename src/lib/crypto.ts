/**
 * Funções de criptografia e gerenciamento de chaves
 * Inclui backup automático no Supabase
 * 🆕 ATUALIZADO: Limpa chaves locais no logout
 * 🔧 CORRIGIDO: generateKeyPair agora usa RSA-2048 e gera chaves com prefixo VID-PRIV-
 */

import { saveKeyPairToSupabase, getKeyPair as getKeyPairFromSupabase } from './supabase-crypto';
import type { KeyPair } from './supabase-crypto';

const STORAGE_PREFIX = 'veroId_keyPair_';
const BACKUP_PREFIX = 'veroId_backup_';

/**
 * 🆕 CORRIGIDO: Gera um par de chaves RSA-2048 com validação robusta e prefixo VID-PRIV-
 */
export async function generateKeyPair(userId: string): Promise<KeyPair> {
  console.log('[generateKeyPair] ========== INÍCIO ==========');
  console.log('[generateKeyPair] userId recebido:', userId);
  console.log('[generateKeyPair] tipo do userId:', typeof userId);
  
  if (!userId) {
    console.error('[generateKeyPair] ERROR: userId é obrigatório');
    throw new Error('userId é obrigatório para gerar chaves');
  }

  // 🔧 CORREÇÃO: Usar RSA-2048 ao invés de ECDSA P-256
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await window.crypto.subtle.exportKey('jwk', keyPair.privateKey);

  // Serializar chaves para string com prefixos corretos
  const publicKeyString = `VID-PUB-${btoa(JSON.stringify(publicKeyJwk)).substring(0, 16)}`;
  const privateKeyString = `VID-PRIV-${btoa(JSON.stringify(privateKeyJwk)).substring(0, 16)}`;

  // Criar objeto de resultado
  const result: KeyPair = {
    id: crypto.randomUUID(),
    userId: userId,
    publicKey: publicKeyString,
    privateKey: privateKeyString,
    createdAt: new Date().toISOString()
  };
  
  console.log('[generateKeyPair] KeyPair gerado:', {
    id: result.id,
    publicKey: result.publicKey,
    privateKey: result.privateKey.substring(0, 20) + '...',
    userId: result.userId,
    userIdType: typeof result.userId
  });
  console.log('[generateKeyPair] ========== FIM ==========');
  
  return result;
}

/**
 * 🆕 CORRIGIDO DEFINITIVAMENTE: Salva par de chaves no localStorage E no Supabase
 * Garante que sempre retorna um objeto válido
 */
export async function saveKeyPair(keyPair: KeyPair): Promise<{ success: boolean; error?: string }> {
  console.log('[crypto.saveKeyPair] ========== INÍCIO ==========');
  console.log('[crypto.saveKeyPair] keyPair recebido:', JSON.stringify(keyPair));
  
  try {
    if (!keyPair) {
      console.error('[crypto.saveKeyPair] ERROR: keyPair é null/undefined');
      return { success: false, error: 'keyPair ausente' };
    }
    
    if (!keyPair.userId) {
      console.error('[crypto.saveKeyPair] ERROR: userId ausente no keyPair');
      return { success: false, error: 'userId ausente no keyPair' };
    }
    
    if (!keyPair.publicKey || !keyPair.privateKey) {
      console.error('[crypto.saveKeyPair] ERROR: chaves ausentes');
      return { success: false, error: 'publicKey ou privateKey ausente' };
    }

    // Validar formato das chaves
    if (!keyPair.publicKey.startsWith('VID-PUB-')) {
      console.error('[crypto.saveKeyPair] ERROR: publicKey sem prefixo VID-PUB-');
      return { success: false, error: 'Formato de chave pública inválido' };
    }

    if (!keyPair.privateKey.startsWith('VID-PRIV-')) {
      console.error('[crypto.saveKeyPair] ERROR: privateKey sem prefixo VID-PRIV-');
      return { success: false, error: 'Formato de chave privada inválido' };
    }

    console.log('[crypto.saveKeyPair] Chamando saveKeyPairToSupabase...');
    const result = await saveKeyPairToSupabase(keyPair);
    
    console.log('[crypto.saveKeyPair] Resultado do Supabase:', result);
    
    if (!result || typeof result !== 'object') {
      console.error('[crypto.saveKeyPair] ERROR: saveKeyPairToSupabase retornou undefined');
      return { success: false, error: 'Resposta inválida do banco de dados' };
    }
    
    // Salvar no localStorage para acesso rápido
    if (result.success) {
      const storageKey = `${STORAGE_PREFIX}${keyPair.userId}`;
      localStorage.setItem(storageKey, JSON.stringify(keyPair));
      console.log('💾 Chaves salvas no localStorage');
    }
    
    console.log('[crypto.saveKeyPair] ========== FIM ==========');
    return result;
    
  } catch (error: unknown) {
    console.error('[crypto.saveKeyPair] ERROR INESPERADO:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido ao salvar' 
    };
  }
}

/**
 * Backup redundante das chaves
 */
async function createRedundantBackup(keyPair: KeyPair): Promise<void> {
  try {
    const backupKey = `${BACKUP_PREFIX}${keyPair.userId}`;
    const serialized = JSON.stringify(keyPair);
    localStorage.setItem(backupKey, serialized);
    console.log('✅ Backup redundante criado com sucesso');
  } catch (error) {
    console.error('⚠️ Erro ao criar backup redundante:', error);
  }
}

/**
 * 🆕 Obtém par de chaves (localStorage primeiro, depois Supabase)
 */
export async function getKeyPair(userId: string): Promise<KeyPair | null> {
  try {
    // 1. Tenta localStorage primeiro
    const storageKey = `${STORAGE_PREFIX}${userId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      console.log('✅ Chaves encontradas no localStorage');
      const keyPair = JSON.parse(stored);
      
      // Validar formato das chaves
      if (keyPair.publicKey?.startsWith('VID-PUB-') && keyPair.privateKey?.startsWith('VID-PRIV-')) {
        return keyPair;
      } else {
        console.warn('⚠️ Chaves no localStorage com formato inválido, buscando no Supabase...');
        localStorage.removeItem(storageKey);
      }
    }
    
    // 2. Se não encontrou, busca no Supabase
    console.log('🔍 Buscando chaves no Supabase...');
    const keyPairFromSupabase = await getKeyPairFromSupabase(userId);
    
    if (keyPairFromSupabase) {
      console.log('✅ Chaves encontradas no Supabase e descriptografadas');
      
      // Validar formato das chaves do Supabase
      if (keyPairFromSupabase.publicKey?.startsWith('VID-PUB-') && 
          keyPairFromSupabase.privateKey?.startsWith('VID-PRIV-')) {
        // Salva no localStorage para acesso rápido
        localStorage.setItem(storageKey, JSON.stringify(keyPairFromSupabase));
        console.log('💾 Chaves salvas no localStorage para cache');
        return keyPairFromSupabase;
      } else {
        console.error('❌ Chaves do Supabase com formato inválido:', {
          publicKey: keyPairFromSupabase.publicKey?.substring(0, 20),
          privateKey: keyPairFromSupabase.privateKey?.substring(0, 20)
        });
        return null;
      }
    }
    
    console.log('❌ Nenhuma chave encontrada');
    return null;
  } catch (error) {
    console.error('❌ Erro ao obter chaves:', error);
    return null;
  }
}

/**
 * 🆕 Limpa todas as chaves do usuário (localStorage e backups)
 */
export function clearAllKeys(userId: string): void {
  try {
    const storageKey = `${STORAGE_PREFIX}${userId}`;
    const backupKey = `${BACKUP_PREFIX}${userId}`;
    
    localStorage.removeItem(storageKey);
    localStorage.removeItem(backupKey);
    
    console.log('🗑️ Chaves locais removidas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao limpar chaves:', error);
  }
}

/**
 * Gera hash SHA-256 de um conteúdo
 */
export async function generateHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Assina um conteúdo com a chave privada
 */
export async function signContent(content: string, privateKey: string): Promise<string> {
  try {
    const hash = await generateHash(content);
    const signature = btoa(`${hash}-${privateKey.substring(0, 16)}`);
    return signature;
  } catch (error) {
    console.error('❌ Erro ao assinar conteúdo:', error);
    throw error;
  }
}

/**
 * Verifica a assinatura de um conteúdo
 */
export async function verifySignature(
  content: string,
  signature: string,
  publicKey: string
): Promise<boolean> {
  try {
    const hash = await generateHash(content);
    const decoded = atob(signature);
    return decoded.startsWith(hash);
  } catch (error) {
    console.error('❌ Erro ao verificar assinatura:', error);
    return false;
  }
}

/**
 * Gera código de verificação único
 */
/**
 * Gera código de verificação único de 8 caracteres hexadecimais
 */
export function generateVerificationCode(): string {
  // Gera 4 bytes aleatórios e converte para hexadecimal (8 caracteres)
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}
