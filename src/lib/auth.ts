/**
 * Sistema de autenticação simplificado
 * Em produção: usar backend real, JWT, OAuth, etc.
 */

export interface User {
  id: string;
  nomeCompleto: string;
  nomePublico: string;
  email: string;
  senha: string; // Em produção: usar hash (bcrypt, argon2)
  cpfCnpj: string;
  telefone: string;
  documentoUrl: string; // URL ou base64 do documento
  selfieUrl: string; // URL ou base64 da selfie
  createdAt: string;
  verified: boolean;
  isAdmin?: boolean;
}

export interface PasswordResetRequest {
  email: string;
  code: string;
  expiresAt: string;
  createdAt: string;
}

const STORAGE_KEY = 'veroId_users';
const CURRENT_USER_KEY = 'veroId_currentUser';
const RESET_REQUESTS_KEY = 'veroId_resetRequests';
const DEVELOPER_EMAIL = 'admin@veroid.com'; // Email do desenvolvedor/admin

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida formato de CPF (simplificado)
 */
export function isValidCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  return cleanCPF.length === 11;
}

/**
 * Valida formato de CNPJ (simplificado)
 */
export function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  return cleanCNPJ.length === 14;
}

/**
 * Valida senha forte
 */
export function isValidPassword(password: string): boolean {
  // Mínimo 6 caracteres, pelo menos 1 maiúscula e 1 caractere especial
  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasMinLength && hasUpperCase && hasSpecialChar;
}

/**
 * Verifica se o email é do desenvolvedor/admin
 */
function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === DEVELOPER_EMAIL.toLowerCase();
}

/**
 * Obtém todos os usuários
 */
export function getUsers(): User[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      console.log('📂 Nenhum usuário encontrado no localStorage');
      return [];
    }
    const users = JSON.parse(stored);
    console.log(`📂 ${users.length} usuário(s) carregado(s) do localStorage`);
    return users;
  } catch (error) {
    console.error('❌ Erro ao carregar usuários:', error);
    return [];
  }
}

/**
 * Salva lista de usuários
 */
function saveUsers(users: User[]): void {
  try {
    const jsonData = JSON.stringify(users);
    localStorage.setItem(STORAGE_KEY, jsonData);
    console.log(`💾 ${users.length} usuário(s) salvo(s) com sucesso`);
    
    // Verifica imediatamente se foi salvo
    const verification = localStorage.getItem(STORAGE_KEY);
    if (!verification) {
      console.error('⚠️ AVISO: Dados não foram persistidos no localStorage!');
    }
  } catch (error) {
    console.error('❌ Erro ao salvar usuários:', error);
    throw error;
  }
}

/**
 * Registra um novo usuário
 */
export function registerUser(user: Omit<User, 'id' | 'createdAt' | 'verified' | 'isAdmin'>): User {
  const users = getUsers();
  
  // Verifica se email já existe
  if (users.some(u => u.email.toLowerCase() === user.email.toLowerCase())) {
    throw new Error('Este email já está cadastrado');
  }
  
  // Verifica se CPF/CNPJ já existe
  if (users.some(u => u.cpfCnpj === user.cpfCnpj)) {
    throw new Error('Este CPF/CNPJ já está cadastrado');
  }
  
  const isAdminUser = isAdminEmail(user.email);
  
  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    verified: true, // Auto-verificado para demo
    isAdmin: isAdminUser,
  };
  
  users.push(newUser);
  saveUsers(users);
  
  console.log('✅ Novo usuário registrado:', newUser.email);
  
  return newUser;
}

/**
 * Cria conta de administrador automaticamente
 */
export function createAdminAccount(): User {
  console.log('🔧 Criando conta de administrador...');
  
  const adminUser: Omit<User, 'id' | 'createdAt' | 'verified' | 'isAdmin'> = {
    nomeCompleto: 'Administrador do Sistema',
    nomePublico: 'Admin',
    email: 'admin@veroid.com',
    senha: 'Admin@123',
    cpfCnpj: '00000000000000',
    telefone: '(00) 00000-0000',
    documentoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkRvY3VtZW50bzwvdGV4dD48L3N2Zz4=',
    selfieUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzMzMzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPlNlbGZpZTwvdGV4dD48L3N2Zz4='
  };
  
  const users = getUsers();
  
  // Verifica se admin já existe
  const existingAdmin = users.find(u => u.email.toLowerCase() === adminUser.email.toLowerCase());
  if (existingAdmin) {
    console.log('✅ Conta de administrador já existe');
    return existingAdmin;
  }
  
  const newAdmin = registerUser(adminUser);
  console.log('✅ Conta de administrador criada com sucesso!');
  console.log('📧 Email: admin@veroid.com');
  console.log('🔑 Senha: Admin@123');
  
  return newAdmin;
}

/**
 * Autentica um usuário
 */
export function loginUser(email: string, senha: string): User | null {
  try {
    console.log('🔐 Iniciando processo de login...');
    console.log('📧 Email fornecido:', email);
    
    const users = getUsers();
    console.log('📊 Total de usuários no sistema:', users.length);
    
    if (users.length === 0) {
      console.log('⚠️ NENHUM USUÁRIO CADASTRADO NO SISTEMA');
      return null;
    }
    
    // Lista todos os emails cadastrados para debug
    console.log('👥 Emails cadastrados:');
    users.forEach((u, index) => {
      console.log(`  ${index + 1}. ${u.email}`);
    });
    
    const user = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha
    );
    
    if (user) {
      console.log('✅ Usuário encontrado:', user.email);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      
      // Verifica se foi salvo
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      if (saved) {
        console.log('✅ Sessão salva com sucesso');
      } else {
        console.error('❌ ERRO: Sessão não foi salva!');
      }
      
      return user;
    } else {
      console.log('❌ Credenciais inválidas');
      console.log('💡 Verifique se o email e senha estão corretos');
      return null;
    }
  } catch (error) {
    console.error('❌ Erro crítico no loginUser:', error);
    return null;
  }
}

/**
 * Faz logout do usuário atual
 */
export function logout(): void {
  localStorage.removeItem(CURRENT_USER_KEY);
  console.log('👋 Logout realizado');
}

/**
 * Obtém o usuário atualmente logado
 */
export function getCurrentUser(): User | null {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Erro ao carregar usuário atual:', error);
    return null;
  }
}

/**
 * Verifica se o usuário atual é admin
 */
export function isCurrentUserAdmin(): boolean {
  const user = getCurrentUser();
  return user?.isAdmin === true;
}

/**
 * Deleta um usuário (apenas admin)
 */
export function deleteUser(userId: string): boolean {
  if (!isCurrentUserAdmin()) {
    throw new Error('Apenas administradores podem deletar usuários');
  }
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return false;
  }
  
  // Não permite deletar o próprio usuário admin
  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) {
    throw new Error('Você não pode deletar sua própria conta');
  }
  
  users.splice(userIndex, 1);
  saveUsers(users);
  
  return true;
}

/**
 * Atualiza dados de um usuário
 */
export function updateUser(userId: string, updates: Partial<User>): User | null {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return null;
  }
  
  users[userIndex] = { ...users[userIndex], ...updates };
  saveUsers(users);
  
  // Atualiza usuário atual se for o mesmo
  const currentUser = getCurrentUser();
  if (currentUser?.id === userId) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(users[userIndex]));
  }
  
  return users[userIndex];
}

/**
 * Gera código de verificação de 6 dígitos
 */
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Obtém requisições de reset
 */
function getResetRequests(): PasswordResetRequest[] {
  try {
    const stored = localStorage.getItem(RESET_REQUESTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Erro ao carregar requisições de reset:', error);
    return [];
  }
}

/**
 * Salva requisições de reset
 */
function saveResetRequests(requests: PasswordResetRequest[]): void {
  localStorage.setItem(RESET_REQUESTS_KEY, JSON.stringify(requests));
}

/**
 * Inicia processo de recuperação de senha
 */
export function requestPasswordReset(email: string): { success: boolean; code?: string; message: string } {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return {
      success: false,
      message: 'Email não encontrado no sistema'
    };
  }
  
  const code = generateResetCode();
  const resetRequest: PasswordResetRequest = {
    email: email.toLowerCase(),
    code,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // Expira em 15 minutos
  };
  
  // Salva requisição
  const requests = getResetRequests();
  // Remove requisições antigas do mesmo email
  const filteredRequests = requests.filter(r => r.email !== email.toLowerCase());
  filteredRequests.push(resetRequest);
  saveResetRequests(filteredRequests);
  
  return {
    success: true,
    code, // Em produção: enviar por email, não retornar
    message: 'Código de verificação gerado com sucesso'
  };
}

/**
 * Verifica código de reset
 */
export function verifyResetCode(email: string, code: string): { valid: boolean; message: string } {
  const requests = getResetRequests();
  const request = requests.find(
    r => r.email === email.toLowerCase() && r.code === code
  );
  
  if (!request) {
    return {
      valid: false,
      message: 'Código inválido'
    };
  }
  
  // Verifica se expirou
  if (new Date(request.expiresAt) < new Date()) {
    return {
      valid: false,
      message: 'Código expirado. Solicite um novo código.'
    };
  }
  
  return {
    valid: true,
    message: 'Código válido'
  };
}

/**
 * Reseta a senha do usuário
 */
export function resetPassword(email: string, code: string, newPassword: string): { success: boolean; message: string } {
  // Verifica código
  const verification = verifyResetCode(email, code);
  if (!verification.valid) {
    return {
      success: false,
      message: verification.message
    };
  }
  
  // Valida nova senha
  if (!isValidPassword(newPassword)) {
    return {
      success: false,
      message: 'A senha deve ter no mínimo 6 caracteres, incluindo 1 letra maiúscula e 1 caractere especial'
    };
  }
  
  // Atualiza senha
  const users = getUsers();
  const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (userIndex === -1) {
    return {
      success: false,
      message: 'Usuário não encontrado'
    };
  }
  
  users[userIndex].senha = newPassword;
  saveUsers(users);
  
  // Remove requisição usada
  const requests = getResetRequests();
  const filteredRequests = requests.filter(r => !(r.email === email.toLowerCase() && r.code === code));
  saveResetRequests(filteredRequests);
  
  return {
    success: true,
    message: 'Senha alterada com sucesso'
  };
}

/**
 * Limpa requisições expiradas
 */
export function cleanExpiredResetRequests(): void {
  const requests = getResetRequests();
  const now = new Date();
  const validRequests = requests.filter(r => new Date(r.expiresAt) > now);
  saveResetRequests(validRequests);
}

/**
 * Função de debug para verificar estado do localStorage
 */
export function debugStorage(): void {
  console.log('=== DEBUG STORAGE ===');
  console.log('Usuários:', getUsers());
  console.log('Usuário atual:', getCurrentUser());
  console.log('Requisições de reset:', getResetRequests());
  console.log('===================');
}

// Expõe funções globalmente
if (typeof window !== 'undefined') {
  (window as typeof window & { 
    debugAuth: () => void;
    createAdmin: () => User;
  }).debugAuth = debugStorage;
  (window as typeof window & { 
    debugAuth: () => void;
    createAdmin: () => User;
  }).createAdmin = createAdminAccount;
}