/**
 * Sistema de Logs de Auditoria
 * 
 * Registra todas as ações importantes do sistema para fins de
 * auditoria, segurança e compliance.
 */

import { supabase } from './supabase';
import * as Sentry from '@sentry/react';

// Tipos de ações auditáveis
export enum AuditAction {
  // Autenticação
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  
  // 2FA
  TWO_FA_SETUP = 'TWO_FA_SETUP',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',
  TWO_FA_VERIFIED = 'TWO_FA_VERIFIED',
  TWO_FA_FAILED = 'TWO_FA_FAILED',
  
  // Usuários
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  
  // Conteúdo
  CONTENT_SIGNED = 'CONTENT_SIGNED',
  CONTENT_VERIFIED = 'CONTENT_VERIFIED',
  CONTENT_DELETED = 'CONTENT_DELETED',
  
  // Chaves Criptográficas
  KEY_PAIR_GENERATED = 'KEY_PAIR_GENERATED',
  KEY_PAIR_BACKED_UP = 'KEY_PAIR_BACKED_UP',
  KEY_PAIR_RESTORED = 'KEY_PAIR_RESTORED',
  
  // Certificados
  CERTIFICATE_VIEWED = 'CERTIFICATE_VIEWED',
  CERTIFICATE_SHARED = 'CERTIFICATE_SHARED',
  
  // Configurações
  SETTINGS_UPDATED = 'SETTINGS_UPDATED',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
  
  // Admin
  ADMIN_ACTION = 'ADMIN_ACTION',
  AUDIT_LOG_VIEWED = 'AUDIT_LOG_VIEWED',
}

// Interface para detalhes do log
export interface AuditLogDetails {
  [key: string]: string | number | boolean | Record<string, unknown> | undefined;
  success?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Interface para entrada de log
interface AuditLogEntry {
  user_id?: string;
  action: AuditAction;
  details?: AuditLogDetails;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Obtém o endereço IP do cliente
 * Nota: Em produção, pode ser necessário usar um serviço externo
 * ou configurar o servidor para passar o IP real
 */
async function getClientIP(): Promise<string | null> {
  try {
    // Em desenvolvimento, retorna localhost
    if (import.meta.env.DEV) {
      return '127.0.0.1';
    }
    
    // Em produção, tenta obter o IP real
    // Nota: Isso pode não funcionar em todos os ambientes
    // Considere usar um serviço como ipify.org ou configurar o servidor
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(2000) // Timeout de 2 segundos
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.ip;
    }
  } catch (error) {
    console.warn('⚠️ [AUDIT] Não foi possível obter IP do cliente:', error);
  }
  
  return null;
}

/**
 * Obtém o User Agent do navegador
 */
function getUserAgent(): string {
  return navigator.userAgent;
}

/**
 * Registra um evento de auditoria
 * 
 * @param action - Tipo de ação executada
 * @param details - Detalhes adicionais da ação
 * @param userId - ID do usuário (opcional, usa o usuário autenticado se não fornecido)
 */
export async function logAuditEvent(
  action: AuditAction,
  details?: AuditLogDetails,
  userId?: string
): Promise<void> {
  try {
    console.log(`📊 [AUDIT] Registrando: ${action}`, details);
    
    // Obter usuário atual se não fornecido
    let finalUserId = userId;
    if (!finalUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      finalUserId = user?.id;
    }
    
    // Obter informações de contexto
    const [ip_address, user_agent] = await Promise.all([
      getClientIP(),
      Promise.resolve(getUserAgent())
    ]);
    
    // Criar entrada de log
    const logEntry: AuditLogEntry = {
      user_id: finalUserId,
      action,
      details: details || {},
      ip_address: ip_address || undefined,
      user_agent
    };
    
    // Inserir no banco de dados
    const { error } = await supabase
      .from('audit_logs')
      .insert(logEntry);
    
    if (error) {
      console.error('❌ [AUDIT] Erro ao registrar log:', error);
      
      // Enviar erro para Sentry
      Sentry.captureException(error, {
        tags: {
          component: 'audit-logger',
          action
        },
        extra: {
          details,
          userId: finalUserId
        }
      });
      
      return;
    }
    
    console.log(`✅ [AUDIT] Log registrado: ${action}`);
    
    // Para ações críticas, também enviar para Sentry
    const criticalActions = [
      AuditAction.LOGIN_FAILED,
      AuditAction.TWO_FA_FAILED,
      AuditAction.USER_DELETED,
      AuditAction.KEY_PAIR_GENERATED,
      AuditAction.ADMIN_ACTION
    ];
    
    if (criticalActions.includes(action)) {
      Sentry.captureMessage(`Audit: ${action}`, {
        level: 'info',
        tags: {
          component: 'audit-logger',
          action
        },
        extra: {
          details,
          userId: finalUserId,
          ip_address,
          user_agent
        }
      });
    }
    
  } catch (error) {
    console.error('❌ [AUDIT] Erro ao registrar evento:', error);
    
    // Enviar erro para Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'audit-logger',
        action
      },
      extra: {
        details,
        userId
      }
    });
  }
}

/**
 * Busca logs de auditoria com filtros
 * 
 * @param filters - Filtros para a busca
 * @returns Lista de logs de auditoria
 */
export async function getAuditLogs(filters?: {
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    console.log('🔍 [AUDIT] Buscando logs com filtros:', filters);
    
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Aplicar filtros
    if (filters?.userId) {
      query = query.eq('user_id', filters.userId);
    }
    
    if (filters?.action) {
      query = query.eq('action', filters.action);
    }
    
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString());
    }
    
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString());
    }
    
    // Aplicar paginação
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('❌ [AUDIT] Erro ao buscar logs:', error);
      throw error;
    }
    
    console.log(`✅ [AUDIT] ${data?.length || 0} logs encontrados (total: ${count})`);
    
    return {
      logs: data || [],
      total: count || 0
    };
    
  } catch (error) {
    console.error('❌ [AUDIT] Erro ao buscar logs:', error);
    throw error;
  }
}

/**
 * Exporta logs de auditoria para CSV
 * 
 * @param filters - Filtros para a exportação
 * @returns String CSV com os logs
 */
export async function exportAuditLogsToCSV(filters?: {
  userId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
}): Promise<string> {
  try {
    console.log('📥 [AUDIT] Exportando logs para CSV...');
    
    // Buscar todos os logs sem limite
    const { logs } = await getAuditLogs({
      ...filters,
      limit: 10000 // Limite máximo para exportação
    });
    
    // Criar cabeçalho CSV
    const headers = ['ID', 'User ID', 'Action', 'Details', 'IP Address', 'User Agent', 'Created At'];
    const csvLines = [headers.join(',')];
    
    // Adicionar linhas de dados
    for (const log of logs) {
      const row = [
        log.id,
        log.user_id || 'N/A',
        log.action,
        JSON.stringify(log.details || {}).replace(/"/g, '""'), // Escapar aspas
        log.ip_address || 'N/A',
        (log.user_agent || 'N/A').replace(/"/g, '""'), // Escapar aspas
        new Date(log.created_at).toISOString()
      ];
      
      csvLines.push(row.map(cell => `"${cell}"`).join(','));
    }
    
    const csv = csvLines.join('\n');
    console.log(`✅ [AUDIT] ${logs.length} logs exportados`);
    
    return csv;
    
  } catch (error) {
    console.error('❌ [AUDIT] Erro ao exportar logs:', error);
    throw error;
  }
}

/**
 * Limpa logs antigos (mais de X dias)
 * Deve ser executado periodicamente por um cron job
 * 
 * @param daysToKeep - Número de dias para manter os logs (padrão: 90)
 */
export async function cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
  try {
    console.log(`🧹 [AUDIT] Limpando logs com mais de ${daysToKeep} dias...`);
    
    const { data, error } = await supabase
      .rpc('cleanup_old_audit_logs', { days_to_keep: daysToKeep });
    
    if (error) {
      console.error('❌ [AUDIT] Erro ao limpar logs:', error);
      throw error;
    }
    
    const deletedCount = data || 0;
    console.log(`✅ [AUDIT] ${deletedCount} logs antigos removidos`);
    
    return deletedCount;
    
  } catch (error) {
    console.error('❌ [AUDIT] Erro ao limpar logs:', error);
    throw error;
  }
}