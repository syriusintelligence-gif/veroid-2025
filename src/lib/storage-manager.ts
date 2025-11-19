/**
 * Sistema de gerenciamento de armazenamento robusto
 * Garante persistência de dados mesmo após limpeza do localStorage
 */

const STORAGE_KEYS = {
  users: 'veroId_users',
  backup: 'veroId_users_backup',
  currentUser: 'veroId_currentUser',
  resetRequests: 'veroId_resetRequests',
  lastSync: 'veroId_lastSync',
  sessionBackup: 'veroId_session_backup'
};

let isInitialized = false;

/**
 * Salva dados com múltiplas camadas de backup
 */
export function saveToStorage<T>(key: string, data: T): void {
  try {
    const jsonData = JSON.stringify(data);
    
    // Salva no localStorage principal
    localStorage.setItem(key, jsonData);
    
    // Cria backup automático
    localStorage.setItem(`${key}_backup`, jsonData);
    
    // Salva timestamp da última sincronização
    localStorage.setItem(STORAGE_KEYS.lastSync, new Date().toISOString());
    
    // Salva em sessionStorage como backup adicional
    sessionStorage.setItem(`${key}_session`, jsonData);
  } catch (error) {
    console.error(`❌ Erro ao salvar dados: ${key}`, error);
    throw error;
  }
}

/**
 * Recupera dados com fallback automático para backups
 */
export function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    // Tenta carregar do localStorage principal
    let stored = localStorage.getItem(key);
    
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Tenta carregar do backup do localStorage
    stored = localStorage.getItem(`${key}_backup`);
    if (stored) {
      const data = JSON.parse(stored);
      // Restaura no storage principal (sem recursão)
      localStorage.setItem(key, stored);
      return data;
    }
    
    // Tenta carregar do sessionStorage
    stored = sessionStorage.getItem(`${key}_session`);
    if (stored) {
      const data = JSON.parse(stored);
      // Restaura no storage principal (sem recursão)
      localStorage.setItem(key, stored);
      localStorage.setItem(`${key}_backup`, stored);
      return data;
    }
    
    return defaultValue;
  } catch (error) {
    console.error(`❌ Erro ao carregar dados: ${key}`, error);
    return defaultValue;
  }
}

/**
 * Verifica integridade dos dados e tenta recuperar se necessário
 */
export function verifyAndRepairStorage(): void {
  const keys = [
    STORAGE_KEYS.users,
    STORAGE_KEYS.currentUser,
    STORAGE_KEYS.resetRequests
  ];
  
  keys.forEach(key => {
    const mainData = localStorage.getItem(key);
    const backupData = localStorage.getItem(`${key}_backup`);
    const sessionData = sessionStorage.getItem(`${key}_session`);
    
    // Se dados principais estão faltando mas backup existe, restaura
    if (!mainData && backupData) {
      localStorage.setItem(key, backupData);
    }
    
    // Se dados principais estão faltando mas sessionStorage existe, restaura
    if (!mainData && !backupData && sessionData) {
      localStorage.setItem(key, sessionData);
      localStorage.setItem(`${key}_backup`, sessionData);
    }
  });
}

/**
 * Cria snapshot completo de todos os dados
 */
export function createFullBackup(): void {
  try {
    const backup = {
      timestamp: new Date().toISOString(),
      users: localStorage.getItem(STORAGE_KEYS.users),
      currentUser: localStorage.getItem(STORAGE_KEYS.currentUser),
      resetRequests: localStorage.getItem(STORAGE_KEYS.resetRequests)
    };
    
    localStorage.setItem(STORAGE_KEYS.sessionBackup, JSON.stringify(backup));
    sessionStorage.setItem(STORAGE_KEYS.sessionBackup, JSON.stringify(backup));
  } catch (error) {
    console.error('❌ Erro ao criar backup completo:', error);
  }
}

/**
 * Restaura snapshot completo
 */
export function restoreFullBackup(): boolean {
  try {
    let backupStr = localStorage.getItem(STORAGE_KEYS.sessionBackup);
    
    if (!backupStr) {
      backupStr = sessionStorage.getItem(STORAGE_KEYS.sessionBackup);
    }
    
    if (!backupStr) {
      return false;
    }
    
    const backup = JSON.parse(backupStr);
    
    if (backup.users) {
      localStorage.setItem(STORAGE_KEYS.users, backup.users);
      localStorage.setItem(`${STORAGE_KEYS.users}_backup`, backup.users);
    }
    
    if (backup.currentUser) {
      localStorage.setItem(STORAGE_KEYS.currentUser, backup.currentUser);
    }
    
    if (backup.resetRequests) {
      localStorage.setItem(STORAGE_KEYS.resetRequests, backup.resetRequests);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao restaurar backup completo:', error);
    return false;
  }
}

/**
 * Inicializa sistema de armazenamento
 */
export function initializeStorage(): void {
  if (isInitialized) {
    return; // Evita inicialização múltipla
  }
  
  isInitialized = true;
  
  // Verifica e repara dados
  verifyAndRepairStorage();
  
  // Cria backup inicial
  createFullBackup();
  
  // Configura backup automático a cada 30 segundos
  setInterval(() => {
    createFullBackup();
  }, 30000);
}

interface StorageManagerDebug {
  verify: () => void;
  backup: () => void;
  restore: () => boolean;
  getUsers: () => unknown;
}

// Expõe funções globalmente para debug
if (typeof window !== 'undefined') {
  (window as typeof window & { storageManager: StorageManagerDebug }).storageManager = {
    verify: verifyAndRepairStorage,
    backup: createFullBackup,
    restore: restoreFullBackup,
    getUsers: () => getFromStorage(STORAGE_KEYS.users, [])
  };
}