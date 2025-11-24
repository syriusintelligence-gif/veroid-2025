/**
 * Sistema de autenticação com Supabase
 * Gerencia registro, login, logout e recuperação de senha
 */

import { supabase } from './supabase';
import type { Database } from './supabase';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];

export interface User {
  id: string;
  nomeCompleto: string;
  nomePublico: string;
  email: string;
  cpfCnpj: string;
  telefone: string;
  documentoUrl: string;
  selfieUrl: string;
  createdAt: string;
  verified: boolean;
  isAdmin: boolean;
  blocked: boolean;
}

// Converte do formato do banco para o formato da aplicação
function dbUserToAppUser(dbUser: UserRow): User {
  return {
    id: dbUser.id,
    nomeCompleto: dbUser.nome_completo,
    nomePublico: dbUser.nome_publico,
    email: dbUser.email,
    cpfCnpj: dbUser.cpf_cnpj,
    telefone: dbUser.telefone,
    documentoUrl: dbUser.documento_url,
    selfieUrl: dbUser.selfie_url,
    createdAt: dbUser.created_at,
    verified: dbUser.verified,
    isAdmin: dbUser.is_admin,
    blocked: dbUser.blocked || false,
  };
}

// Converte do formato da aplicação para o formato do banco
function appUserToDbUser(appUser: Omit<User, 'id' | 'createdAt'>): UserInsert {
  return {
    nome_completo: appUser.nomeCompleto,
    nome_publico: appUser.nomePublico,
    email: appUser.email,
    cpf_cnpj: appUser.cpfCnpj,
    telefone: appUser.telefone,
    documento_url: appUser.documentoUrl,
    selfie_url: appUser.selfieUrl,
    verified: appUser.verified,
    is_admin: appUser.isAdmin,
    blocked: appUser.blocked,
  };
}

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
  const hasMinLength = password.length >= 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasMinLength && hasUpperCase && hasSpecialChar;
}

/**
 * Registra um novo usuário no Supabase
 */
export async function registerUser(
  user: Omit<User, 'id' | 'createdAt' | 'verified' | 'isAdmin' | 'blocked'>,
  senha: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    console.log('🔐 Iniciando registro de usuário no Supabase...');
    
    // Valida email
    if (!isValidEmail(user.email)) {
      return { success: false, error: 'Email inválido' };
    }
    
    // Valida senha
    if (!isValidPassword(senha)) {
      return { 
        success: false, 
        error: 'A senha deve ter no mínimo 6 caracteres, incluindo 1 letra maiúscula e 1 caractere especial' 
      };
    }
    
    // Verifica se email já existe
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', user.email.toLowerCase());
    
    if (checkError) {
      console.error('❌ Erro ao verificar email:', checkError);
      return { success: false, error: 'Erro ao verificar email' };
    }
    
    if (existingUsers && existingUsers.length > 0) {
      return { success: false, error: 'Este email já está cadastrado' };
    }
    
    // Verifica se CPF/CNPJ já existe
    const { data: existingCpf, error: cpfError } = await supabase
      .from('users')
      .select('cpf_cnpj')
      .eq('cpf_cnpj', user.cpfCnpj);
    
    if (cpfError) {
      console.error('❌ Erro ao verificar CPF/CNPJ:', cpfError);
      return { success: false, error: 'Erro ao verificar CPF/CNPJ' };
    }
    
    if (existingCpf && existingCpf.length > 0) {
      return { success: false, error: 'Este CPF/CNPJ já está cadastrado' };
    }
    
    // Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email.toLowerCase(),
      password: senha,
    });
    
    if (authError) {
      console.error('❌ Erro ao criar autenticação:', authError);
      return { success: false, error: authError.message };
    }
    
    if (!authData.user) {
      return { success: false, error: 'Erro ao criar usuário' };
    }
    
    // Determina se é admin (email marcelo@vsparticipacoes.com)
    const isAdmin = user.email.toLowerCase() === 'marcelo@vsparticipacoes.com';
    
    // Insere dados do usuário na tabela users
    const dbUser = appUserToDbUser({
      ...user,
      verified: true,
      isAdmin,
      blocked: false,
    });
    
    const { data: userData, error: insertError } = await supabase
      .from('users')
      .insert({
        ...dbUser,
        id: authData.user.id,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Erro ao inserir dados do usuário:', insertError);
      // Tenta deletar o usuário do Auth se falhar
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: 'Erro ao salvar dados do usuário' };
    }
    
    console.log('✅ Usuário registrado com sucesso:', userData.email);
    
    return {
      success: true,
      user: dbUserToAppUser(userData),
    };
  } catch (error) {
    console.error('❌ Erro ao registrar usuário:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Faz login de um usuário
 */
export async function loginUser(
  email: string,
  senha: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    console.log('🔐 Iniciando login no Supabase...');
    console.log('📧 Email:', email);
    
    // Faz login no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: senha,
    });
    
    if (authError) {
      console.error('❌ Erro de autenticação:', authError);
      return { success: false, error: 'Email ou senha incorretos' };
    }
    
    if (!authData.user) {
      return { success: false, error: 'Erro ao fazer login' };
    }
    
    // Busca dados completos do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    if (userError || !userData) {
      console.error('❌ Erro ao buscar dados do usuário:', userError);
      return { success: false, error: 'Erro ao carregar dados do usuário' };
    }
    
    // Verifica se o usuário está bloqueado
    if (userData.blocked) {
      await supabase.auth.signOut();
      return { success: false, error: 'Sua conta foi bloqueada. Entre em contato com o administrador.' };
    }
    
    console.log('✅ Login realizado com sucesso:', userData.email);
    
    return {
      success: true,
      user: dbUserToAppUser(userData),
    };
  } catch (error) {
    console.error('❌ Erro ao fazer login:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Faz logout do usuário atual
 */
export async function logout(): Promise<void> {
  try {
    console.log('👋 Fazendo logout...');
    await supabase.auth.signOut();
    console.log('✅ Logout realizado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao fazer logout:', error);
  }
}

/**
 * Obtém o usuário atualmente logado
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return null;
    }
    
    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (error || !userData) {
      console.error('❌ Erro ao buscar usuário atual:', error);
      return null;
    }
    
    return dbUserToAppUser(userData);
  } catch (error) {
    console.error('❌ Erro ao obter usuário atual:', error);
    return null;
  }
}

/**
 * Obtém todos os usuários (apenas para admin)
 */
export async function getUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar usuários:', error);
      return [];
    }
    
    return data.map(dbUserToAppUser);
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    return [];
  }
}

/**
 * Verifica se o usuário atual é admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.isAdmin === true;
}

/**
 * Bloqueia um usuário (apenas admin)
 */
export async function blockUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    
    if (!isAdmin) {
      return { success: false, error: 'Apenas administradores podem bloquear usuários' };
    }
    
    const currentUser = await getCurrentUser();
    if (currentUser?.id === userId) {
      return { success: false, error: 'Você não pode bloquear sua própria conta' };
    }
    
    const { error } = await supabase
      .from('users')
      .update({ blocked: true })
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Erro ao bloquear usuário:', error);
      return { success: false, error: 'Erro ao bloquear usuário' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao bloquear usuário:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Desbloqueia um usuário (apenas admin)
 */
export async function unblockUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    
    if (!isAdmin) {
      return { success: false, error: 'Apenas administradores podem desbloquear usuários' };
    }
    
    const { error } = await supabase
      .from('users')
      .update({ blocked: false })
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Erro ao desbloquear usuário:', error);
      return { success: false, error: 'Erro ao desbloquear usuário' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao desbloquear usuário:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Deleta um usuário (apenas admin)
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const isAdmin = await isCurrentUserAdmin();
    
    if (!isAdmin) {
      return { success: false, error: 'Apenas administradores podem deletar usuários' };
    }
    
    const currentUser = await getCurrentUser();
    if (currentUser?.id === userId) {
      return { success: false, error: 'Você não pode deletar sua própria conta' };
    }
    
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Erro ao deletar usuário:', error);
      return { success: false, error: 'Erro ao deletar usuário' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao deletar usuário:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Atualiza dados de um usuário
 */
export async function updateUser(
  userId: string,
  updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin = await isCurrentUserAdmin();
    
    // Verifica permissões
    if (currentUser?.id !== userId && !isAdmin) {
      return { success: false, error: 'Você não tem permissão para atualizar este usuário' };
    }
    
    // Converte updates para formato do banco
    const dbUpdates: Partial<UserInsert> = {};
    if (updates.nomeCompleto) dbUpdates.nome_completo = updates.nomeCompleto;
    if (updates.nomePublico) dbUpdates.nome_publico = updates.nomePublico;
    if (updates.email) dbUpdates.email = updates.email;
    if (updates.cpfCnpj) dbUpdates.cpf_cnpj = updates.cpfCnpj;
    if (updates.telefone) dbUpdates.telefone = updates.telefone;
    if (updates.documentoUrl) dbUpdates.documento_url = updates.documentoUrl;
    if (updates.selfieUrl) dbUpdates.selfie_url = updates.selfieUrl;
    if (updates.verified !== undefined) dbUpdates.verified = updates.verified;
    if (updates.isAdmin !== undefined) dbUpdates.is_admin = updates.isAdmin;
    if (updates.blocked !== undefined) dbUpdates.blocked = updates.blocked;
    
    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      return { success: false, error: 'Erro ao atualizar usuário' };
    }
    
    return {
      success: true,
      user: dbUserToAppUser(data),
    };
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Solicita recuperação de senha
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    
    if (error) {
      console.error('❌ Erro ao solicitar reset de senha:', error);
      return { 
        success: false, 
        message: 'Erro ao solicitar recuperação de senha' 
      };
    }
    
    return {
      success: true,
      message: 'Email de recuperação enviado com sucesso',
    };
  } catch (error) {
    console.error('❌ Erro ao solicitar reset de senha:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Reseta a senha do usuário
 */
export async function resetPassword(
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isValidPassword(newPassword)) {
      return {
        success: false,
        message: 'A senha deve ter no mínimo 6 caracteres, incluindo 1 letra maiúscula e 1 caractere especial',
      };
    }
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) {
      console.error('❌ Erro ao resetar senha:', error);
      return { 
        success: false, 
        message: 'Erro ao alterar senha' 
      };
    }
    
    return {
      success: true,
      message: 'Senha alterada com sucesso',
    };
  } catch (error) {
    console.error('❌ Erro ao resetar senha:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * Cria conta de administrador (apenas se não existir)
 */
export async function createAdminAccount(): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    console.log('🔧 Verificando conta de administrador...');
    
    // Verifica se admin já existe
    const { data: existingAdmin } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'marcelo@vsparticipacoes.com')
      .single();
    
    if (existingAdmin) {
      console.log('✅ Conta de administrador já existe');
      return {
        success: true,
        user: dbUserToAppUser(existingAdmin),
      };
    }
    
    // Cria nova conta de admin
    return await registerUser(
      {
        nomeCompleto: 'Marcelo Administrador',
        nomePublico: 'Marcelo',
        email: 'marcelo@vsparticipacoes.com',
        cpfCnpj: '00000000000000',
        telefone: '(00) 00000-0000',
        documentoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMzMzMiLz48L3N2Zz4=',
        selfieUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMzMzMiLz48L3N2Zz4=',
      },
      'Admin@123'
    );
  } catch (error) {
    console.error('❌ Erro ao criar conta de admin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}
