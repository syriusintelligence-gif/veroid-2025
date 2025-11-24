/**
 * Sistema de backup redundante para chaves criptográficas
 * Salva em múltiplos storages para evitar perda de dados
 */

import type { KeyPair } from './crypto';

/**
 * Salva chaves em múltiplos storages (localStorage, sessionStorage, IndexedDB)
 */
export async function backupKeyPair(keyPair: KeyPair): Promise<void> {
  const storageKey = `veroId_keyPair_${keyPair.userId}`;
  const serialized = JSON.stringify(keyPair);
  
  console.log('💾 Iniciando backup redundante das chaves...');
  
  // 1. localStorage (principal)
  try {
    localStorage.setItem(storageKey, serialized);
    console.log('✅ Backup 1/3: localStorage');
  } catch (e) {
    console.error('❌ Falha no backup localStorage:', e);
  }
  
  // 2. sessionStorage (backup secundário)
  try {
    sessionStorage.setItem(storageKey, serialized);
    console.log('✅ Backup 2/3: sessionStorage');
  } catch (e) {
    console.error('❌ Falha no backup sessionStorage:', e);
  }
  
  // 3. IndexedDB (backup terciário - mais robusto)
  try {
    await saveToIndexedDB(storageKey, keyPair);
    console.log('✅ Backup 3/3: IndexedDB');
  } catch (e) {
    console.error('❌ Falha no backup IndexedDB:', e);
  }
  
  console.log('🎉 Backup redundante concluído!');
}

/**
 * Recupera chaves de qualquer storage disponível
 */
export async function restoreKeyPair(userId: string): Promise<KeyPair | null> {
  const storageKey = `veroId_keyPair_${userId}`;
  
  console.log('🔍 Tentando restaurar chaves de backups...');
  
  // 1. Tenta localStorage primeiro
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const keyPair: KeyPair = JSON.parse(stored);
      console.log('✅ Chaves restauradas do localStorage');
      
      // Sincroniza com outros storages
      await backupKeyPair(keyPair);
      return keyPair;
    }
  } catch (e) {
    console.warn('⚠️ Falha ao restaurar do localStorage:', e);
  }
  
  // 2. Tenta sessionStorage
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      const keyPair: KeyPair = JSON.parse(stored);
      console.log('✅ Chaves restauradas do sessionStorage');
      
      // Sincroniza com outros storages
      await backupKeyPair(keyPair);
      return keyPair;
    }
  } catch (e) {
    console.warn('⚠️ Falha ao restaurar do sessionStorage:', e);
  }
  
  // 3. Tenta IndexedDB
  try {
    const keyPair = await loadFromIndexedDB(storageKey);
    if (keyPair) {
      console.log('✅ Chaves restauradas do IndexedDB');
      
      // Sincroniza com outros storages
      await backupKeyPair(keyPair);
      return keyPair;
    }
  } catch (e) {
    console.warn('⚠️ Falha ao restaurar do IndexedDB:', e);
  }
  
  console.log('❌ Nenhum backup encontrado');
  return null;
}

/**
 * Salva no IndexedDB
 */
async function saveToIndexedDB(key: string, data: KeyPair): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VeroIdDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keyPairs')) {
        db.createObjectStore('keyPairs');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['keyPairs'], 'readwrite');
      const store = transaction.objectStore('keyPairs');
      
      const putRequest = store.put(data, key);
      
      putRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      putRequest.onerror = () => {
        db.close();
        reject(putRequest.error);
      };
    };
  });
}

/**
 * Carrega do IndexedDB
 */
async function loadFromIndexedDB(key: string): Promise<KeyPair | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VeroIdDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('keyPairs')) {
        db.createObjectStore('keyPairs');
      }
    };
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('keyPairs')) {
        db.close();
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['keyPairs'], 'readonly');
      const store = transaction.objectStore('keyPairs');
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result || null);
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
  });
}

/**
 * Verifica status de todos os backups
 */
export async function checkBackupStatus(userId: string): Promise<{
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  total: number;
}> {
  const storageKey = `veroId_keyPair_${userId}`;
  const status = {
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
    total: 0,
  };
  
  // Verifica localStorage
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      status.localStorage = true;
      status.total++;
    }
  } catch (e) {
    // Ignorar erro
  }
  
  // Verifica sessionStorage
  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      status.sessionStorage = true;
      status.total++;
    }
  } catch (e) {
    // Ignorar erro
  }
  
  // Verifica IndexedDB
  try {
    const data = await loadFromIndexedDB(storageKey);
    if (data) {
      status.indexedDB = true;
      status.total++;
    }
  } catch (e) {
    // Ignorar erro
  }
  
  return status;
}

/**
 * Remove chaves de todos os storages
 */
export async function deleteAllBackups(userId: string): Promise<void> {
  const storageKey = `veroId_keyPair_${userId}`;
  
  console.log('🗑️ Removendo todos os backups...');
  
  // Remove do localStorage
  try {
    localStorage.removeItem(storageKey);
    console.log('✅ Removido do localStorage');
  } catch (e) {
    console.error('❌ Erro ao remover do localStorage:', e);
  }
  
  // Remove do sessionStorage
  try {
    sessionStorage.removeItem(storageKey);
    console.log('✅ Removido do sessionStorage');
  } catch (e) {
    console.error('❌ Erro ao remover do sessionStorage:', e);
  }
  
  // Remove do IndexedDB
  try {
    await deleteFromIndexedDB(storageKey);
    console.log('✅ Removido do IndexedDB');
  } catch (e) {
    console.error('❌ Erro ao remover do IndexedDB:', e);
  }
  
  console.log('🎉 Todos os backups removidos!');
}

/**
 * Remove do IndexedDB
 */
async function deleteFromIndexedDB(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VeroIdDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('keyPairs')) {
        db.close();
        resolve();
        return;
      }
      
      const transaction = db.transaction(['keyPairs'], 'readwrite');
      const store = transaction.objectStore('keyPairs');
      const deleteRequest = store.delete(key);
      
      deleteRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      
      deleteRequest.onerror = () => {
        db.close();
        reject(deleteRequest.error);
      };
    };
  });
}
