/**
 * Sistema de Autenticação Robusto com Supabase
 * Versão 2.4 - CORREÇÃO DEFINITIVA: phone no nível raiz do signUp
 */

import { supabase } from './supabase';
import type { Database, SocialLinks } from './supabase';
import { setUserContext, clearUserContext } from './sentry';
import { logAuditEvent, AuditAction } from './audit-logger';

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
  blocked?: boolean;
  socialLinks?: SocialLinks;
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
    blocked: dbUser.blocked || false,
    socialLinks: dbUser.social_links || undefined,
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
    blocked: appUser.blocked || false,
    social_links: appUser.socialLinks || null,
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
 * Registra um novo usuário no Supabase usando Edge Function
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
    
    // 🔒 CORREÇÃO DEFINITIVA: Telefone vazio = NULL, e phone no nível raiz
    const phoneValue = user.telefone && user.telefone.trim() !== '' ? user.telefone : undefined;
    
    console.log('📞 Valor do telefone a ser enviado:', phoneValue || 'undefined (será NULL no banco)');
    
    // Cria usuário no Supabase Auth - phone no nível raiz!
    const signUpData: any = {
      email: user.email.toLowerCase(),
      password: senha,
    };
    
    // Só adiciona phone se tiver valor (undefined = NULL no banco)
    if (phoneValue) {
      signUpData.phone = phoneValue;
    }
    
    console.log('🚀 Chamando supabase.auth.signUp com:', {
      email: signUpData.email,
      phone: signUpData.phone || 'undefined',
    });
    
    const { data: authData, error: authError } = await supabase.auth.signUp(signUpData);
    
    if (authError) {
      console.error('❌ Erro ao criar autenticação:', authError);
      console.error('❌ Detalhes completos do erro:', {
        message: authError.message,
        status: authError.status,
        name: authError.name,
      });
      return { success: false, error: authError.message };
    }
    
    if (!authData.user) {
      return { success: false, error: 'Erro ao criar usuário no Auth' };
    }
    
    console.log('✅ Usuário criado no Auth. ID:', authData.user.id);
    
    // Determina se é admin
    const isAdmin = user.email.toLowerCase() === 'syriusintelligence@gmail.com' || 
                    user.email.toLowerCase() === 'marcelo@vsparticipacoes.com';
    
    console.log('💾 Chamando Edge Function para inserir dados na tabela users...');
    
    // Chama Edge Function para inserir dados usando SERVICE ROLE KEY
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/register-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        id: authData.user.id,
        nome_completo: user.nomeCompleto,
        nome_publico: user.nomePublico,
        email: user.email.toLowerCase(),
        cpf_cnpj: user.cpfCnpj,
        telefone: phoneValue || null, // NULL se vazio
        documento_url: user.documentoUrl,
        selfie_url: user.selfieUrl,
        verified: true,
        is_admin: isAdmin,
      }),
    });
    
    const result = await response.json();
    
    if (!result.success || !result.user) {
      console.error('❌ Erro ao inserir dados do usuário via Edge Function:', result.error);
      // Tenta deletar o usuário do Auth se falhar
      try {
        await supabase.auth.admin.deleteUser(authData.user.id);
      } catch (e) {
        console.error('❌ Erro ao reverter criação do usuário:', e);
      }
      return { success: false, error: result.error || 'Erro ao salvar dados do usuário' };
    }
    
    const userData = result.user;
    
    console.log('✅ Usuário registrado com sucesso!');
    console.log('📊 Dados:', { email: userData.email, isAdmin: userData.is_admin });
    
    // Define contexto do usuário no Sentry
    setUserContext({
      id: userData.id,
      username: userData.nome_publico,
    });
    
    // 📊 Log de auditoria
    await logAuditEvent(AuditAction.USER_CREATED, {
      success: true,
      email: userData.email,
      isAdmin: userData.is_admin,
      metadata: {
        nomeCompleto: userData.nome_completo,
        verified: userData.verified,
      }
    }, userData.id);
    
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
      
      // 📊 Log de auditoria - Login falhou
      await logAuditEvent(AuditAction.LOGIN_FAILED, {
        success: false,
        error: authError.message,
        email: email.toLowerCase(),
        userExists: !!userInTable,
      });
      
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
        
        // 📊 Log de auditoria - Login bem-sucedido
        await logAuditEvent(AuditAction.LOGIN, {
          success: true,
          email: syncedUser.email,
          isAdmin: syncedUser.isAdmin,
          synced: true,
        }, syncedUser.id);
        
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
    
    // 📊 Log de auditoria - Login bem-sucedido
    await logAuditEvent(AuditAction.LOGIN, {
      success: true,
      email: userData.email,
      isAdmin: userData.is_admin,
    }, userData.id);
    
    return {
      success: true,
      user: dbUserToAppUser(userData),
      debugInfo,
    };
  } catch (error) {
    console.error('❌ Erro crítico ao fazer login:', error);
    
    // 📊 Log de auditoria - Erro crítico
    await logAuditEvent(AuditAction.LOGIN_FAILED, {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      email: email.toLowerCase(),
    });
    
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
    
    // Obtém usuário antes do logout para log
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    
    // Limpa contexto do usuário no Sentry
    clearUserContext();
    
    await supabase.auth.signOut();
    console.log('✅ Logout realizado com sucesso');
    
    // 📊 Log de auditoria
    if (userId) {
      await logAuditEvent(AuditAction.LOGOUT, {
        success: true,
      }, userId);
    }
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
    
    const redirectUrl = `${window.location.origin}/auth/callback`;
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
    
    // 📊 Log de auditoria
    await logAuditEvent(AuditAction.PASSWORD_RESET_REQUEST, {
      success: true,
      email: email.toLowerCase(),
    });
    
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
    
    // 📊 Log de auditoria
    if (data.user) {
      await logAuditEvent(AuditAction.PASSWORD_RESET_COMPLETE, {
        success: true,
      }, data.user.id);
    }
    
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

/**
 * Atualiza dados de um usuário (apenas para admin)
 */
export async function updateUser(
  userId: string,
  updates: {
    nomeCompleto?: string;
    nomePublico?: string;
    email?: string;
    telefone?: string;
  }
): Promise<{ success: boolean; user?: User; error?: string }> {
  try {
    console.log('✏️ [UPDATE USER] Atualizando usuário:', userId);
    console.log('📊 Dados a atualizar:', updates);
    
    // Verifica se o usuário atual é admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Apenas administradores podem editar usuários' };
    }
    
    // Prepara os dados para atualização
    const updateData: Record<string, string | null> = {};
    if (updates.nomeCompleto) updateData.nome_completo = updates.nomeCompleto;
    if (updates.nomePublico) updateData.nome_publico = updates.nomePublico;
    if (updates.email) updateData.email = updates.email.toLowerCase();
    if (updates.telefone !== undefined) {
      // 🔒 CORREÇÃO: Telefone vazio = NULL
      updateData.telefone = updates.telefone && updates.telefone.trim() !== '' ? updates.telefone : null;
    }
    
    // Atualiza o usuário na tabela
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
      return { success: false, error: 'Erro ao atualizar usuário' };
    }
    
    console.log('✅ Usuário atualizado com sucesso');
    
    // 📊 Log de auditoria
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await logAuditEvent(AuditAction.USER_UPDATED, {
        success: true,
        targetUserId: userId,
        updates: updates,
      }, currentUser.id);
    }
    
    return {
      success: true,
      user: dbUserToAppUser(data),
    };
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Bloqueia ou desbloqueia um usuário (apenas para admin)
 */
export async function toggleBlockUser(
  userId: string,
  blocked: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🚫 [${blocked ? 'BLOCK' : 'UNBLOCK'} USER] Usuário:`, userId);
    
    // Verifica se o usuário atual é admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Apenas administradores podem bloquear usuários' };
    }
    
    // Atualiza o status de bloqueio
    const { error } = await supabase
      .from('users')
      .update({ blocked })
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Erro ao atualizar status de bloqueio:', error);
      return { success: false, error: 'Erro ao atualizar status de bloqueio' };
    }
    
    console.log(`✅ Usuário ${blocked ? 'bloqueado' : 'desbloqueado'} com sucesso`);
    
    // 📊 Log de auditoria
    const currentUser = await getCurrentUser();
    if (currentUser) {
      await logAuditEvent(AuditAction.ADMIN_ACTION, {
        success: true,
        action: blocked ? 'block_user' : 'unblock_user',
        targetUserId: userId,
      }, currentUser.id);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao bloquear/desbloquear usuário:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Exclui permanentemente um usuário (apenas para admin)
 */
export async function deleteUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ [DELETE USER] Excluindo usuário:', userId);
    
    // Verifica se o usuário atual é admin
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return { success: false, error: 'Apenas administradores podem excluir usuários' };
    }
    
    // Verifica se não está tentando excluir a si mesmo
    const currentUser = await getCurrentUser();
    if (currentUser?.id === userId) {
      return { success: false, error: 'Você não pode excluir sua própria conta' };
    }
    
    // Exclui o usuário da tabela users
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (deleteError) {
      console.error('❌ Erro ao excluir usuário da tabela:', deleteError);
      return { success: false, error: 'Erro ao excluir usuário' };
    }
    
    // Tenta excluir do Auth (requer permissões de admin)
    try {
      await supabase.auth.admin.deleteUser(userId);
      console.log('✅ Usuário excluído do Auth');
    } catch (authError) {
      console.warn('⚠️ Não foi possível excluir do Auth (pode requerer permissões adicionais):', authError);
    }
    
    console.log('✅ Usuário excluído com sucesso');
    
    // 📊 Log de auditoria
    if (currentUser) {
      await logAuditEvent(AuditAction.USER_DELETED, {
        success: true,
        targetUserId: userId,
      }, currentUser.id);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao excluir usuário:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Verifica se um email já existe na tabela users
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao verificar email:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('❌ Erro ao verificar email:', error);
    return false;
  }
}

/**
 * Verifica se um CPF/CNPJ já existe na tabela users
 */
export async function checkCpfCnpjExists(cpfCnpj: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('cpf_cnpj')
      .eq('cpf_cnpj', cpfCnpj)
      .limit(1);
    
    if (error) {
      console.error('❌ Erro ao verificar CPF/CNPJ:', error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('❌ Erro ao verificar CPF/CNPJ:', error);
    return false;
  }
}

/**
 * Atualiza os links de redes sociais do usuário
 */
export async function updateSocialLinks(
  userId: string,
  socialLinks: SocialLinks
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    
    // Verifica se o usuário tem permissão
    if (currentUser?.id !== userId) {
      return { success: false, error: 'Você não tem permissão para atualizar este perfil' };
    }
    
    const { error } = await supabase
      .from('users')
      .update({ social_links: socialLinks })
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Erro ao atualizar links sociais:', error);
      return { success: false, error: 'Erro ao atualizar links das redes sociais' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao atualizar links sociais:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}

/**
 * 🔒 SEGURANÇA: Cria conta de administrador (apenas se não existir)
 * 
 * ⚠️ IMPORTANTE: Esta função foi modificada para usar variável de ambiente
 * ao invés de senha hardcoded. Configure ADMIN_DEFAULT_PASSWORD no .env
 * 
 * @deprecated Esta função deve ser usada apenas para setup inicial.
 * Recomenda-se criar conta de admin manualmente via Supabase Dashboard.
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
    
    // 🔒 SEGURANÇA: Obtém senha de variável de ambiente
    const adminPassword = import.meta.env.VITE_ADMIN_DEFAULT_PASSWORD;
    
    if (!adminPassword || adminPassword === 'YOUR_SECURE_PASSWORD_HERE') {
      console.error('❌ ADMIN_DEFAULT_PASSWORD não configurado no .env');
      return {
        success: false,
        error: 'Senha de administrador não configurada. Configure ADMIN_DEFAULT_PASSWORD no arquivo .env',
      };
    }
    
    // Valida senha
    if (!isValidPassword(adminPassword)) {
      return {
        success: false,
        error: 'A senha configurada não atende aos requisitos de segurança (mínimo 6 caracteres, 1 maiúscula, 1 caractere especial)',
      };
    }
    
    console.log('🔐 Criando nova conta de administrador...');
    
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
      adminPassword
    );
  } catch (error) {
    console.error('❌ Erro ao criar conta de admin:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
}