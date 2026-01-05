/**
 * Integração de 2FA com Supabase
 * Gerencia configurações de autenticação de dois fatores
 */

import { supabase } from './supabase';
import { generateTOTPSecret, generateBackupCodes, hashBackupCode, verifyTOTPCode, verifyBackupCode } from './totp';

export interface User2FA {
  id: string;
  userId: string;
  secret: string;
  enabled: boolean;
  backupCodes: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

/**
 * Verifica se usuário tem 2FA configurado
 */
export async function has2FAEnabled(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_2fa')
      .select('enabled')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.enabled === true;
  } catch (error) {
    console.error('❌ Erro ao verificar 2FA:', error);
    return false;
  }
}

/**
 * Obtém configurações de 2FA do usuário
 */
export async function get2FASettings(userId: string): Promise<User2FA | null> {
  try {
    const { data, error } = await supabase
      .from('user_2fa')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return {
      id: data.id,
      userId: data.user_id,
      secret: data.secret,
      enabled: data.enabled,
      backupCodes: data.backup_codes || [],
      createdAt: data.created_at,
      lastUsedAt: data.last_used_at,
    };
  } catch (error) {
    console.error('❌ Erro ao buscar configurações 2FA:', error);
    return null;
  }
}

/**
 * Inicia configuração de 2FA (gera secret e códigos de backup)
 */
export async function setup2FA(userId: string): Promise<{
  success: boolean;
  secret?: string;
  backupCodes?: string[];
  error?: string;
}> {
  try {
    console.log('🔐 Iniciando configuração 2FA para usuário:', userId);
    
    // Gera secret TOTP
    const secret = generateTOTPSecret();
    console.log('✅ Secret gerado:', secret.substring(0, 10) + '...');
    
    // Gera códigos de backup
    const backupCodes = generateBackupCodes(10);
    console.log('✅ Códigos de backup gerados:', backupCodes.length);
    
    // Hasheia códigos de backup para armazenamento
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    );
    
    // Verifica se já existe configuração
    const existing = await get2FASettings(userId);
    
    if (existing) {
      // Atualiza configuração existente (mas mantém desabilitado até verificação)
      const { error } = await supabase
        .from('user_2fa')
        .update({
          secret,
          backup_codes: hashedBackupCodes,
          enabled: false, // Mantém desabilitado até verificar código
        })
        .eq('user_id', userId);
      
      if (error) {
        console.error('❌ Erro ao atualizar 2FA:', error);
        return { success: false, error: 'Erro ao atualizar configuração 2FA' };
      }
    } else {
      // Cria nova configuração
      const { error } = await supabase
        .from('user_2fa')
        .insert({
          user_id: userId,
          secret,
          backup_codes: hashedBackupCodes,
          enabled: false, // Mantém desabilitado até verificar código
        });
      
      if (error) {
        console.error('❌ Erro ao criar 2FA:', error);
        return { success: false, error: 'Erro ao criar configuração 2FA' };
      }
    }
    
    console.log('✅ Configuração 2FA salva (aguardando ativação)');
    
    return {
      success: true,
      secret,
      backupCodes, // Retorna códigos em texto plano para o usuário salvar
    };
  } catch (error) {
    console.error('❌ Erro ao configurar 2FA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Ativa 2FA após verificar código TOTP
 */
export async function enable2FA(
  userId: string,
  verificationCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 Ativando 2FA para usuário:', userId);
    
    // Busca configuração
    const settings = await get2FASettings(userId);
    
    if (!settings) {
      return { success: false, error: 'Configuração 2FA não encontrada. Execute setup2FA primeiro.' };
    }
    
    // Verifica código TOTP
    const isValid = await verifyTOTPCode(settings.secret, verificationCode);
    
    if (!isValid) {
      return { success: false, error: 'Código de verificação inválido' };
    }
    
    // Ativa 2FA
    const { error } = await supabase
      .from('user_2fa')
      .update({
        enabled: true,
        last_used_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Erro ao ativar 2FA:', error);
      return { success: false, error: 'Erro ao ativar 2FA' };
    }
    
    console.log('✅ 2FA ativado com sucesso');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao ativar 2FA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Desativa 2FA
 */
export async function disable2FA(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔓 Desativando 2FA para usuário:', userId);
    
    const { error } = await supabase
      .from('user_2fa')
      .update({ enabled: false })
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Erro ao desativar 2FA:', error);
      return { success: false, error: 'Erro ao desativar 2FA' };
    }
    
    console.log('✅ 2FA desativado com sucesso');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erro ao desativar 2FA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Verifica código 2FA durante login
 */
export async function verify2FALogin(
  userId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔐 Verificando código 2FA para login:', userId);
    
    // Busca configuração
    const settings = await get2FASettings(userId);
    
    if (!settings || !settings.enabled) {
      return { success: false, error: '2FA não está ativado para este usuário' };
    }
    
    // Tenta verificar como código TOTP
    const isTOTPValid = await verifyTOTPCode(settings.secret, code);
    
    if (isTOTPValid) {
      // Atualiza last_used_at
      await supabase
        .from('user_2fa')
        .update({ last_used_at: new Date().toISOString() })
        .eq('user_id', userId);
      
      console.log('✅ Código TOTP válido');
      return { success: true };
    }
    
    // Se não for TOTP, tenta verificar como código de backup
    const isBackupValid = await verifyBackupCode(code, settings.backupCodes);
    
    if (isBackupValid) {
      // Remove código de backup usado
      const updatedCodes = settings.backupCodes.filter(
        async (hashedCode) => hashedCode !== await hashBackupCode(code)
      );
      
      await supabase
        .from('user_2fa')
        .update({
          backup_codes: updatedCodes,
          last_used_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      console.log('✅ Código de backup válido (removido da lista)');
      return { success: true };
    }
    
    console.log('❌ Código inválido');
    return { success: false, error: 'Código de verificação inválido' };
  } catch (error) {
    console.error('❌ Erro ao verificar código 2FA:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Regenera códigos de backup
 */
export async function regenerateBackupCodes(userId: string): Promise<{
  success: boolean;
  backupCodes?: string[];
  error?: string;
}> {
  try {
    console.log('🔄 Regenerando códigos de backup para usuário:', userId);
    
    // Gera novos códigos
    const backupCodes = generateBackupCodes(10);
    
    // Hasheia códigos
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => hashBackupCode(code))
    );
    
    // Atualiza no banco
    const { error } = await supabase
      .from('user_2fa')
      .update({ backup_codes: hashedBackupCodes })
      .eq('user_id', userId);
    
    if (error) {
      console.error('❌ Erro ao regenerar códigos:', error);
      return { success: false, error: 'Erro ao regenerar códigos de backup' };
    }
    
    console.log('✅ Códigos de backup regenerados');
    
    return {
      success: true,
      backupCodes, // Retorna em texto plano para o usuário salvar
    };
  } catch (error) {
    console.error('❌ Erro ao regenerar códigos:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}