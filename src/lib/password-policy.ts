/**
 * Política de Senhas Avançada
 * 
 * Implementa regras de segurança para senhas:
 * - Expiração de senha (90 dias)
 * - Troca forçada no primeiro login
 * - 🆕 EXCEÇÃO: Administradores são isentos da expiração
 */

import { supabase } from './supabase';

// Constantes de política
export const PASSWORD_EXPIRATION_DAYS = 90;
export const PASSWORD_WARNING_DAYS = 7; // Avisa 7 dias antes de expirar

/**
 * Interface para status de expiração de senha
 */
export interface PasswordExpirationStatus {
  isExpired: boolean;
  daysUntilExpiration: number;
  passwordChangedAt: Date | null;
  mustChangePassword: boolean;
  needsWarning: boolean; // true se faltam menos de 7 dias
  isAdmin: boolean; // 🆕 Indica se é administrador
}

/**
 * Verifica se a senha do usuário está expirada ou precisa ser trocada
 * 
 * 🆕 IMPORTANTE: Administradores são ISENTOS da política de expiração
 * 
 * @param userId - ID do usuário
 * @returns Status de expiração da senha
 */
export async function checkPasswordExpiration(
  userId: string
): Promise<PasswordExpirationStatus> {
  try {
    console.log('🔍 [PASSWORD POLICY] Verificando expiração de senha para usuário:', userId);
    
    const { data: user, error } = await supabase
      .from('users')
      .select('password_changed_at, must_change_password, is_admin')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('❌ [PASSWORD POLICY] Erro ao buscar dados do usuário:', error);
      throw error;
    }
    
    // 🆕 EXCEÇÃO PARA ADMINISTRADORES
    if (user.is_admin === true) {
      console.log('👑 [PASSWORD POLICY] Usuário é ADMINISTRADOR - ISENTO de expiração de senha');
      return {
        isExpired: false,
        daysUntilExpiration: 999999, // Valor alto para indicar "sem expiração"
        passwordChangedAt: user.password_changed_at ? new Date(user.password_changed_at) : null,
        mustChangePassword: false,
        needsWarning: false,
        isAdmin: true,
      };
    }
    
    // Se deve trocar senha obrigatoriamente
    if (user.must_change_password) {
      console.log('⚠️ [PASSWORD POLICY] Usuário deve trocar senha (must_change_password = true)');
      return {
        isExpired: true,
        daysUntilExpiration: 0,
        passwordChangedAt: user.password_changed_at ? new Date(user.password_changed_at) : null,
        mustChangePassword: true,
        needsWarning: false,
        isAdmin: false,
      };
    }
    
    // Se não tem data de última troca, considera como expirada
    if (!user.password_changed_at) {
      console.log('⚠️ [PASSWORD POLICY] Usuário sem data de troca de senha');
      return {
        isExpired: true,
        daysUntilExpiration: 0,
        passwordChangedAt: null,
        mustChangePassword: false,
        needsWarning: false,
        isAdmin: false,
      };
    }
    
    const passwordChangedAt = new Date(user.password_changed_at);
    const now = new Date();
    const daysSinceChange = Math.floor(
      (now.getTime() - passwordChangedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const daysUntilExpiration = PASSWORD_EXPIRATION_DAYS - daysSinceChange;
    const isExpired = daysUntilExpiration <= 0;
    const needsWarning = daysUntilExpiration > 0 && daysUntilExpiration <= PASSWORD_WARNING_DAYS;
    
    console.log(`📊 [PASSWORD POLICY] Dias desde última troca: ${daysSinceChange}`);
    console.log(`📊 [PASSWORD POLICY] Dias até expiração: ${daysUntilExpiration}`);
    console.log(`📊 [PASSWORD POLICY] Senha expirada: ${isExpired}`);
    console.log(`📊 [PASSWORD POLICY] Precisa aviso: ${needsWarning}`);
    
    return {
      isExpired,
      daysUntilExpiration,
      passwordChangedAt,
      mustChangePassword: false,
      needsWarning,
      isAdmin: false,
    };
  } catch (error) {
    console.error('❌ [PASSWORD POLICY] Erro ao verificar expiração:', error);
    throw error;
  }
}

/**
 * Atualiza a data de última troca de senha
 * 
 * @param userId - ID do usuário
 */
export async function updatePasswordChangedAt(userId: string): Promise<void> {
  try {
    console.log('🔄 [PASSWORD POLICY] Atualizando data de troca de senha para:', userId);
    
    const { error } = await supabase
      .from('users')
      .update({
        password_changed_at: new Date().toISOString(),
        must_change_password: false, // Remove flag de troca forçada
      })
      .eq('id', userId);
    
    if (error) {
      console.error('❌ [PASSWORD POLICY] Erro ao atualizar data:', error);
      throw error;
    }
    
    console.log('✅ [PASSWORD POLICY] Data de troca de senha atualizada');
  } catch (error) {
    console.error('❌ [PASSWORD POLICY] Erro ao atualizar data:', error);
    throw error;
  }
}

/**
 * Define flag para forçar troca de senha no próximo login
 * (Usado quando admin cria conta para usuário)
 * 
 * @param userId - ID do usuário
 */
export async function setMustChangePassword(userId: string): Promise<void> {
  try {
    console.log('🔒 [PASSWORD POLICY] Definindo must_change_password para:', userId);
    
    const { error } = await supabase
      .from('users')
      .update({
        must_change_password: true,
      })
      .eq('id', userId);
    
    if (error) {
      console.error('❌ [PASSWORD POLICY] Erro ao definir flag:', error);
      throw error;
    }
    
    console.log('✅ [PASSWORD POLICY] Flag must_change_password definida');
  } catch (error) {
    console.error('❌ [PASSWORD POLICY] Erro ao definir flag:', error);
    throw error;
  }
}

/**
 * Formata mensagem de expiração para exibir ao usuário
 * 
 * @param status - Status de expiração
 * @returns Mensagem formatada
 */
export function getExpirationMessage(status: PasswordExpirationStatus): string {
  // 🆕 Administradores não recebem mensagens de expiração
  if (status.isAdmin) {
    return '';
  }
  
  if (status.mustChangePassword) {
    return 'Você deve trocar sua senha antes de continuar.';
  }
  
  if (status.isExpired) {
    return 'Sua senha expirou. Por segurança, você deve criar uma nova senha.';
  }
  
  if (status.needsWarning) {
    const days = status.daysUntilExpiration;
    if (days === 1) {
      return 'Sua senha expira amanhã. Recomendamos trocá-la agora.';
    }
    return `Sua senha expira em ${days} dias. Recomendamos trocá-la em breve.`;
  }
  
  return '';
}