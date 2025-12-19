/**
 * Sistema de Autenticação Robusto com Supabase
 * Versão 2.0 - Solução definitiva para problemas de login
 */

import { supabase } from './supabase';
import type { Database } from './supabase';
import { setUserContext, clearUserContext } from './sentry';

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
}

interface DebugInfo {
  step: string;
  email?: string;
  timestamp?: string;
  authAttempt?: {
    success: boolean;
    error?: string;
    hasUser: boolean;
    userId?: string;
  };
  userInTable?: {
    exists: boolean;
    error?: string;
    userId?: string;
  };
  userDataFetch?: {
    success: boolean;
    error?: string;
    found: boolean;
  };
  userInfo?: {
    email: string;
    isAdmin: boolean;
    verified: boolean;
  };
  error?: string;
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
 * Verifica se usuário existe no Auth
 */
async function checkUserExistsInAuth(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_user_exists_in_auth', {
      user_email: email.toLowerCase()
    });
    
    if (error) {
      console.log('⚠️ Função RPC não disponível, usando método alternativo');
      return false;
    }
    
    return data === true;
  } catch (error) {
    console.log('⚠️ Erro ao verificar usuário no Auth:', error);
    return false;
  }
}

/**
 * Sincroniza usuário entre Auth e tabela users
 */
async function syncUserData(authUserId: string, email: string): Promise<User | null> {
  try {
    // Busca dados do usuário na tabela users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (userError || !userData) {
      console.error('❌ Usuário não encontrado na tabela users:', userError);
      return null;
    }
    
    // Se o ID não corresponder, atualiza
    if (userData.id !== authUserId) {
      console.log('🔄 Sincronizando IDs...');
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ id: authUserId })
        .eq('email', email.toLowerCase())
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Erro ao sincronizar IDs:', updateError);
        return dbUserToAppUser(userData);
      }
      
      return dbUserToAppUser(updatedUser);
    }
    
    return dbUserToAppUser(userData);
  } catch (error) {
    console.error('❌ Erro ao sincronizar dados:', error);
    return null;
  }
}

/**
 * Registra um novo usuário no Supabase
 */
export async function registerUser(
  user: Omit<User, 'id' | 'createdAt' | 'verified' | 'isAdmin'>,
  senha: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    console.log('🔐 [REGISTRO] Iniciando registro de usuário...');
    console.log('📧 Email:', user.email);
    
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
    
    // Verifica se email já existe na tabela users
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
    
    console.log('✅ Validações OK. Criando usuário no Supabase Auth...');
    
    // Cria usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: user.email.toLowerCase(),
      password: senha,
      options: {
        data: {
          nome_completo: user.nomeCompleto,
          nome_publico: user.nomePublico || user.nomeCompleto,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      }
    });
    
    if (authError) {
      console.error('❌ Erro ao criar autenticação:', authError);
      return { success: false, error: authError.message };
    }
    
    if (!authData.user) {
      return { success: false, error: 'Erro ao criar usuário no Auth' };
    }
    
    console.log('✅ Usuário criado no Auth. ID:', authData.user.id);
    
    // Determina se é admin
    const isAdmin = user.email.toLowerCase() === 'syriusintelligence@gmail.com' || 
                    user.email.toLowerCase() === 'marcelo@vsparticipacoes.com';
    
    // Insere dados do usuário na tabela users
    const dbUser = appUserToDbUser({
      ...user,
      verified: true, // Auto-verifica o usuário
      isAdmin,
    });
    
    console.log('💾 Inserindo dados na tabela users...');
    
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
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (e) {
        console.error('❌ Erro ao reverter criação do usuário:', e);
      }
      return { success: false, error: 'Erro ao salvar dados do usuário' };
    }
    
    console.log('✅ Usuário registrado com sucesso!');
    console.log('📊 Dados:', { email: userData.email, isAdmin: userData.is_admin });
    
    // Define contexto do usuário no Sentry
    setUserContext({
      id: userData.id,
      username: userData.nome_publico,
    });
    
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
 * Faz login de um usuário - VERSÃO ROBUSTA
 */
export async function loginUser(
  email: string,
  senha: string
): Promise<{ success: boolean; user?: User; error?: string; debugInfo?: DebugInfo }> {
  try {
    console.log('🔐 [LOGIN] Iniciando processo de login...');
    console.log('📧 Email:', email);
    
    const debugInfo: DebugInfo = {
      step: 'inicio',
      email: email.toLowerCase(),
      timestamp: new Date().toISOString(),
    };
    
    // Valida email
    if (!isValidEmail(email)) {
      return { success: false, error: 'Email inválido', debugInfo };
    }
    
    debugInfo.step = 'validacao_ok';
    
    // Tenta fazer login no Supabase Auth
    console.log('🔑 Tentando autenticar no Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password: senha,
    });
    
    debugInfo.authAttempt = {
      success: !authError,
      error: authError?.message,
      hasUser: !!authData?.user,
      userId: authData?.user?.id,
    };
    
    if (authError) {
      console.error('❌ Erro de autenticação:', authError.message);
      debugInfo.step = 'auth_error';
      
      // Verifica se o usuário existe na tabela users
      const { data: userInTable, error: tableError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();
      
      debugInfo.userInTable = {
        exists: !!userInTable,
        error: tableError?.message,
        userId: userInTable?.id,
      };
      
      if (userInTable) {
        return { 
          success: false, 
          error: 'Usuário encontrado no sistema, mas a senha está incorreta ou o email não foi confirmado. Use a opção "Esqueceu a senha?" para resetar.',
          debugInfo 
        };
      }
      
      return { 
        success: false, 
        error: 'Email ou senha incorretos',
        debugInfo 
      };
    }
    
    if (!authData.user) {
      debugInfo.step = 'no_user_data';
      return { success: false, error: 'Erro ao fazer login', debugInfo };
    }
    
    console.log('✅ Autenticação bem-sucedida. ID:', authData.user.id);
    debugInfo.step = 'auth_success';
    
    // Busca dados completos do usuário
    console.log('📊 Buscando dados do usuário...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
    
    debugInfo.userDataFetch = {
      success: !userError,
      error: userError?.message,
      found: !!userData,
    };
    
    if (userError || !userData) {
      console.error('❌ Erro ao buscar dados do usuário:', userError);
      
      // Tenta sincronizar pelo email
      console.log('🔄 Tentando sincronizar dados...');
      const syncedUser = await syncUserData(authData.user.id, email);
      
      if (syncedUser) {
        console.log('✅ Dados sincronizados com sucesso!');
        debugInfo.step = 'sync_success';
        
        // Define contexto do usuário no Sentry
        setUserContext({
          id: syncedUser.id,
          username: syncedUser.nomePublico,
        });
        
        return { success: true, user: syncedUser, debugInfo };
      }
      
      debugInfo.step = 'user_data_error';
      return { success: false, error: 'Erro ao carregar dados do usuário', debugInfo };
    }
    
    console.log('✅ Login realizado com sucesso!');
    console.log('👤 Usuário:', userData.email, '| Admin:', userData.is_admin);
    
    debugInfo.step = 'complete';
    debugInfo.userInfo = {
      email: userData.email,
      isAdmin: userData.is_admin,
      verified: userData.verified,
    };
    
    // Define contexto do usuário no Sentry
    setUserContext({
      id: userData.id,
      username: userData.nome_publico,
    });
    
    return {
      success: true,
      user: dbUserToAppUser(userData),
      debugInfo,
    };
  } catch (error) {
    console.error('❌ Erro crítico ao fazer login:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      debugInfo: { step: 'error', error: error instanceof Error ? error.message : 'unknown' }
    };
  }
}

/**
 * Faz logout do usuário atual
 */
export async function logout(): Promise<void> {
  try {
    console.log('👋 Fazendo logout...');
    
    // Limpa contexto do usuário no Sentry
    clearUserContext();
    
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
    
    const user = dbUserToAppUser(userData);
    
    // Define contexto do usuário no Sentry
    setUserContext({
      id: user.id,
      username: user.nomePublico,
    });
    
    return user;
  } catch (error) {
    console.error('❌ Erro ao obter usuário atual:', error);
    return null;
  }
}

/**
 * Solicita recuperação de senha
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log('🔑 [PASSWORD RESET] Iniciando solicitação de recuperação...');
    console.log('📧 Email:', email);
    console.log('🌐 Origin:', window.location.origin);
    
    const redirectUrl = `${window.location.origin}/reset-password`;
    console.log('🔗 Redirect URL gerada:', redirectUrl);
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo: redirectUrl,
    });
    
    console.log('📊 Resposta do Supabase:', { data, error });
    
    if (error) {
      console.error('❌ Erro ao solicitar reset de senha:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      
      return { 
        success: false, 
        message: `Erro ao solicitar recuperação de senha: ${error.message}` 
      };
    }
    
    console.log('✅ Email de recuperação enviado com sucesso');
    console.log('📧 Verifique o email:', email);
    console.log('🔗 O link redirecionará para:', redirectUrl);
    
    return {
      success: true,
      message: 'Email de recuperação enviado com sucesso. Verifique sua caixa de entrada.',
    };
  } catch (error) {
    console.error('❌ Erro crítico ao solicitar reset de senha:', error);
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
    console.log('🔐 [RESET PASSWORD] Iniciando reset de senha...');
    
    if (!isValidPassword(newPassword)) {
      return {
        success: false,
        message: 'A senha deve ter no mínimo 6 caracteres, incluindo 1 letra maiúscula e 1 caractere especial',
      };
    }
    
    console.log('✅ Senha válida, atualizando...');
    
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    console.log('📊 Resposta do updateUser:', { data, error });
    
    if (error) {
      console.error('❌ Erro ao resetar senha:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      
      return { 
        success: false, 
        message: `Erro ao alterar senha: ${error.message}` 
      };
    }
    
    console.log('✅ Senha alterada com sucesso');
    
    return {
      success: true,
      message: 'Senha alterada com sucesso',
    };
  } catch (error) {
    console.error('❌ Erro crítico ao resetar senha:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
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