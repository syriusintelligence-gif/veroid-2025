/**
 * Utilitário para debug de storage
 */

interface User {
  id: string;
  email: string;
  nomeCompleto: string;
  [key: string]: string | boolean;
}

export function debugStorage() {
  console.log('=== DEBUG STORAGE ===');
  
  // LocalStorage
  console.log('\n📦 LocalStorage:');
  const localUsers = localStorage.getItem('veroId_users');
  const localCurrentUser = localStorage.getItem('veroId_currentUser');
  
  if (localUsers) {
    const users = JSON.parse(localUsers) as User[];
    console.log(`✅ ${users.length} usuário(s) encontrado(s)`);
    users.forEach((user: User, index: number) => {
      console.log(`\nUsuário ${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Nome: ${user.nomeCompleto}`);
      console.log(`  ID: ${user.id}`);
    });
  } else {
    console.log('❌ Nenhum usuário no localStorage');
  }
  
  if (localCurrentUser) {
    const current = JSON.parse(localCurrentUser) as User;
    console.log(`\n👤 Usuário logado: ${current.email}`);
  } else {
    console.log('\n👤 Nenhum usuário logado');
  }
  
  // SessionStorage
  console.log('\n📦 SessionStorage:');
  const sessionUsers = sessionStorage.getItem('veroId_users');
  const sessionCurrentUser = sessionStorage.getItem('veroId_currentUser');
  
  if (sessionUsers) {
    const users = JSON.parse(sessionUsers) as User[];
    console.log(`✅ ${users.length} usuário(s) encontrado(s)`);
  } else {
    console.log('❌ Nenhum usuário no sessionStorage');
  }
  
  if (sessionCurrentUser) {
    const current = JSON.parse(sessionCurrentUser) as User;
    console.log(`👤 Usuário logado: ${current.email}`);
  } else {
    console.log('👤 Nenhum usuário logado');
  }
  
  console.log('\n===================');
}

export function clearAllStorage() {
  console.log('🗑️ Limpando todos os dados...');
  localStorage.clear();
  sessionStorage.clear();
  console.log('✅ Dados limpos com sucesso!');
}

export function exportStorage() {
  const data = {
    localStorage: {
      users: localStorage.getItem('veroId_users'),
      currentUser: localStorage.getItem('veroId_currentUser'),
      signedContents: localStorage.getItem('veroId_signedContents'),
    },
    sessionStorage: {
      users: sessionStorage.getItem('veroId_users'),
      currentUser: sessionStorage.getItem('veroId_currentUser'),
      signedContents: sessionStorage.getItem('veroId_signedContents'),
    }
  };
  
  console.log('📤 Exportando dados:', JSON.stringify(data, null, 2));
  return data;
}

// Expõe funções globalmente para debug no console
if (typeof window !== 'undefined') {
  (window as Record<string, unknown>).debugStorage = debugStorage;
  (window as Record<string, unknown>).clearAllStorage = clearAllStorage;
  (window as Record<string, unknown>).exportStorage = exportStorage;
}