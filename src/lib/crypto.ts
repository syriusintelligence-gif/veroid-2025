/**
 * Funções de criptografia e gerenciamento de chaves
 * Inclui backup automático no Supabase
 */

import { saveKeyPair as saveKeyPairToSupabase, getKeyPair as getKeyPairFromSupabase } from './supabase-crypto';
import type { KeyPair } from './supabase-crypto';

const STORAGE_PREFIX = 'veroId_keyPair_';
const BACKUP_PREFIX = 'veroId_backup_';

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
 * Gera um par de chaves e salva no localStorage E no Supabase
 */
export async function generateKeyPair(userId: string): Promise<KeyPair> {
  console.log('🔑 generateKeyPair chamado com userId:', userId);
  
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const publicKey = `VID-PUB-${btoa(String.fromCharCode(...randomBytes)).substring(0, 64)}`;
  const privateKey = `VID-PRIV-${btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).substring(0, 64)}`;
  
  const keyPair: KeyPair = {
    id: crypto.randomUUID(),
    userId,
    publicKey,
    privateKey,
    createdAt: new Date().toISOString(),
  };
  
  console.log('✅ KeyPair gerado:', { publicKey: keyPair.publicKey.substring(0, 20) + '...', userId });
  
  return keyPair;
}

/**
 * Salva par de chaves no localStorage E no Supabase
 */
export async function saveKeyPair(keyPair: KeyPair): Promise<{ success: boolean; error?: string }> {
  console.log('💾 saveKeyPair chamado:', { userId: keyPair.userId, publicKey: keyPair.publicKey.substring(0, 20) + '...' });
  
  try {
    const storageKey = `${STORAGE_PREFIX}${keyPair.userId}`;
    const serialized = JSON.stringify(keyPair);
    
    // 1. Salva no localStorage
    console.log('📝 Salvando em localStorage com chave:', storageKey);
    localStorage.setItem(storageKey, serialized);
    console.log('📦 Dados serializados (' + serialized.length + ' bytes):', serialized.substring(0, 100) + '...');
    
    // Verifica se foi salvo
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      console.error('❌ Falha ao salvar no localStorage');
      return { success: false, error: 'Falha ao salvar no localStorage' };
    }
    
    console.log('✅ Chaves salvas e verificadas para o usuário:', keyPair.userId);
    console.log('✅ Chave de storage:', storageKey);
    
    // 2. Backup redundante
    console.log('🔄 Iniciando backup redundante...');
    await createRedundantBackup(keyPair);
    
    // 3. 🆕 SALVA NO SUPABASE
    console.log('☁️ Salvando no Supabase...');
    const supabaseResult = await saveKeyPairToSupabase(keyPair);
    
    if (supabaseResult.success) {
      console.log('✅ Chaves salvas no Supabase com sucesso!');
    } else {
      console.warn('⚠️ Falha ao salvar no Supabase:', supabaseResult.error);
      console.warn('⚠️ Mas as chaves estão salvas localmente');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao salvar chaves:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Obtém par de chaves do localStorage ou Supabase
 */
export async function getKeyPair(userId: string): Promise<KeyPair | null> {
  console.log('🔍 getKeyPair chamado com userId:', userId);
  
  const storageKey = `${STORAGE_PREFIX}${userId}`;
  console.log('🔍 Procurando chave:', storageKey);
  
  try {
    // 1. Tenta carregar do localStorage primeiro
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      console.log('📦 Chave encontrada (' + stored.length + ' bytes)');
      const keyPair = JSON.parse(stored) as KeyPair;
      console.log('✅ Chaves recuperadas para o usuário:', userId);
      console.log('✅ Chave pública:', keyPair.publicKey.substring(0, 20) + '...');
      console.log('✅ Timestamp:', keyPair.createdAt);
      
      // Backup redundante sempre que recuperar
      await createRedundantBackup(keyPair);
      
      return keyPair;
    }
    
    console.log('ℹ️ Nenhuma chave encontrada no localStorage para:', userId);
    console.log('ℹ️ Chave de storage procurada:', storageKey);
    
    // 2. 🆕 Tenta restaurar do Supabase
    console.log('☁️ Tentando restaurar do Supabase...');
    const supabaseKeyPair = await getKeyPairFromSupabase(userId);
    
    if (supabaseKeyPair) {
      console.log('✅ Chaves encontradas no Supabase! Restaurando...');
      
      // Salva no localStorage para acesso rápido
      localStorage.setItem(storageKey, JSON.stringify(supabaseKeyPair));
      await createRedundantBackup(supabaseKeyPair);
      
      console.log('✅ Chaves restauradas do Supabase com sucesso!');
      return supabaseKeyPair;
    }
    
    console.log('ℹ️ Nenhuma chave encontrada no Supabase');
    
    // 3. Tenta restaurar de backups redundantes
    console.log('🔄 Tentando restaurar de backups redundantes...');
    const restoredKeyPair = await restoreFromBackup(userId);
    
    if (restoredKeyPair) {
      console.log('✅ Chaves restauradas de backup redundante!');
      // Salva de volta no localStorage principal
      localStorage.setItem(storageKey, JSON.stringify(restoredKeyPair));
      return restoredKeyPair;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Erro ao recuperar chaves:', error);
    return null;
  }
}

/**
 * Cria backups redundantes das chaves
 */
async function createRedundantBackup(keyPair: KeyPair): Promise<void> {
  console.log('💾 Iniciando backup redundante das chaves...');
  
  try {
    const serialized = JSON.stringify(keyPair);
    const backupKey = `${BACKUP_PREFIX}${keyPair.userId}`;
    
    // Backup 1: localStorage (já feito na função principal)
    console.log('✅ Backup 1/3: localStorage');
    
    // Backup 2: sessionStorage
    sessionStorage.setItem(backupKey, serialized);
    console.log('✅ Backup 2/3: sessionStorage');
    
    // Backup 3: IndexedDB
    try {
      const db = await openDatabase();
      await saveToIndexedDB(db, keyPair.userId, keyPair);
      console.log('✅ Backup 3/3: IndexedDB');
    } catch (error) {
      console.warn('⚠️ Falha no backup IndexedDB:', error);
    }
    
    console.log('🎉 Backup redundante concluído!');
  } catch (error) {
    console.error('❌ Erro ao criar backup redundante:', error);
  }
}

/**
 * Restaura chaves de backups redundantes
 */
async function restoreFromBackup(userId: string): Promise<KeyPair | null> {
  console.log('🔍 Tentando restaurar chaves de backups...');
  
  // Lista todas as chaves disponíveis
  const allKeys = Object.keys(localStorage);
  console.log('📋 Chaves disponíveis no localStorage:', allKeys.filter(k => k.includes('veroId')));
  
  try {
    // Tenta sessionStorage
    const backupKey = `${BACKUP_PREFIX}${userId}`;
    const sessionBackup = sessionStorage.getItem(backupKey);
    if (sessionBackup) {
      console.log('✅ Backup encontrado no sessionStorage');
      return JSON.parse(sessionBackup) as KeyPair;
    }
    
    // Tenta IndexedDB
    try {
      const db = await openDatabase();
      const indexedDBBackup = await getFromIndexedDB(db, userId);
      if (indexedDBBackup) {
        console.log('✅ Backup encontrado no IndexedDB');
        return indexedDBBackup;
      }
    } catch (error) {
      console.warn('⚠️ Erro ao acessar IndexedDB:', error);
    }
    
    console.log('❌ Nenhum backup encontrado');
    return null;
  } catch (error) {
    console.error('❌ Erro ao restaurar de backup:', error);
    return null;
  }
}

/**
 * Abre banco de dados IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VeroIdKeyStore', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keyPairs')) {
        db.createObjectStore('keyPairs', { keyPath: 'userId' });
      }
    };
  });
}

/**
 * Salva no IndexedDB
 */
function saveToIndexedDB(db: IDBDatabase, userId: string, keyPair: KeyPair): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['keyPairs'], 'readwrite');
    const store = transaction.objectStore('keyPairs');
    const request = store.put(keyPair);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Recupera do IndexedDB
 */
function getFromIndexedDB(db: IDBDatabase, userId: string): Promise<KeyPair | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['keyPairs'], 'readonly');
    const store = transaction.objectStore('keyPairs');
    const request = store.get(userId);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Remove todas as chaves (logout)
 */
export function clearAllKeys(userId: string): void {
  console.log('🗑️ Limpando todas as chaves para userId:', userId);
  
  // Remove do localStorage
  const storageKey = `${STORAGE_PREFIX}${userId}`;
  localStorage.removeItem(storageKey);
  
  // Remove do sessionStorage
  const backupKey = `${BACKUP_PREFIX}${userId}`;
  sessionStorage.removeItem(backupKey);
  
  // Remove do IndexedDB
  openDatabase().then(db => {
    const transaction = db.transaction(['keyPairs'], 'readwrite');
    const store = transaction.objectStore('keyPairs');
    store.delete(userId);
  }).catch(error => {
    console.warn('⚠️ Erro ao limpar IndexedDB:', error);
  });
  
  console.log('✅ Chaves locais limpas (mas mantidas no Supabase)');
}
