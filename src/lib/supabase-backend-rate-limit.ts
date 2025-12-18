/**
 * Backend Rate Limiting com Supabase
 * 
 * Integra o rate limiting do frontend com o backend (Supabase)
 * para garantir persistência e segurança contra bypass.
 */

import { supabase } from './supabase';

export interface BackendRateLimitResult {
  allowed: boolean;
  remaining: number;
  message?: string;
  blockedUntil?: Date;
}

/**
 * Verifica rate limit no backend via Edge Function
 */
export async function checkBackendRateLimit(
  action: string,
  identifier: string
): Promise<BackendRateLimitResult> {
  try {
    console.log(`🔍 [Backend Rate Limit] Verificando: ${action} para ${identifier}`);
    
    const { data, error } = await supabase.functions.invoke('check-rate-limit', {
      body: {
        action,
        identifier,
      },
    });

    if (error) {
      console.error('❌ [Backend Rate Limit] Erro ao verificar:', error);
      // Em caso de erro, permite a ação (fail-open)
      return {
        allowed: true,
        remaining: 5,
        message: 'Verificação de rate limit falhou, permitindo ação',
      };
    }

    console.log('✅ [Backend Rate Limit] Resposta:', data);

    // Converte blockedUntil para Date se existir
    const blockedUntil = data.blockedUntil ? new Date(data.blockedUntil) : undefined;

    return {
      allowed: data.allowed,
      remaining: data.remaining || 0,
      message: data.message,
      blockedUntil,
    };
  } catch (error) {
    console.error('❌ [Backend Rate Limit] Erro crítico:', error);
    // Em caso de erro, permite a ação (fail-open)
    return {
      allowed: true,
      remaining: 5,
      message: 'Erro ao verificar rate limit',
    };
  }
}

/**
 * Registra tentativa de login no backend
 */
export async function recordLoginAttempt(
  identifier: string,
  success: boolean
): Promise<void> {
  try {
    console.log(`📝 [Backend Rate Limit] Registrando tentativa: ${identifier} - ${success ? 'sucesso' : 'falha'}`);
    
    // Registra no backend via Edge Function
    await supabase.functions.invoke('check-rate-limit', {
      body: {
        action: 'LOGIN',
        identifier,
        record: true,
        success,
      },
    });

    console.log('✅ [Backend Rate Limit] Tentativa registrada');
  } catch (error) {
    console.error('❌ [Backend Rate Limit] Erro ao registrar tentativa:', error);
    // Não bloqueia a operação se falhar
  }
}

/**
 * Obtém identificador único do usuário
 * Usa uma combinação de fatores para criar um ID único
 */
export function getUserIdentifier(email?: string): string {
  // Tenta obter fingerprint do navegador
  const fingerprint = getFingerprint();
  
  // Se tiver email, usa hash do email + fingerprint
  if (email) {
    return `${hashString(email.toLowerCase())}_${fingerprint}`;
  }
  
  // Caso contrário, usa apenas fingerprint
  return fingerprint;
}

/**
 * Gera fingerprint do navegador
 */
function getFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ];
  
  const fingerprint = components.join('|');
  return hashString(fingerprint);
}

/**
 * Hash simples de string (não criptográfico)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}