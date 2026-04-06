/**
 * ============================================
 * HOOK: useTrialStatus
 * ============================================
 * 
 * Hook isolado para verificar status do período de teste.
 * 
 * ⚠️ FASE 1: Este hook APENAS RETORNA INFORMAÇÕES
 * Não bloqueia nada, não afeta funcionalidades existentes.
 * 
 * Será usado nas próximas fases para:
 * - Mostrar banner de aviso
 * - Exibir dias restantes
 * - Bloquear acesso quando expirado (Fase 3)
 * 
 * ============================================
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Interface para o status do trial
 */
export interface TrialStatus {
  // Status do trial
  isActive: boolean;           // Trial ainda está ativo?
  isExpired: boolean;          // Trial expirou?
  hasNoTrial: boolean;         // Usuário não tem trial (grandfathered)?
  
  // Datas
  trialStartsAt: string | null;
  trialEndsAt: string | null;
  
  // Informações calculadas
  daysRemaining: number;       // Dias restantes (pode ser negativo se expirado)
  daysTotal: number;           // Total de dias do trial (geralmente 7)
  percentageUsed: number;      // Porcentagem do trial já usado (0-100)
  
  // Tier de assinatura
  subscriptionTier: string;    // 'free', 'basic', 'premium', etc.
  
  // Flags úteis
  isWarningPeriod: boolean;    // Faltam 3 dias ou menos?
  isCriticalPeriod: boolean;   // Falta 1 dia ou menos?
}

interface UseTrialStatusReturn {
  trialStatus: TrialStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Calcula o status do trial baseado nas datas
 */
function calculateTrialStatus(
  trialStartsAt: string | null,
  trialEndsAt: string | null,
  subscriptionTier: string
): TrialStatus {
  const now = new Date();
  
  // Se não tem trial_ends_at, é usuário grandfathered (acesso vitalício)
  if (!trialEndsAt) {
    return {
      isActive: false,
      isExpired: false,
      hasNoTrial: true,
      trialStartsAt,
      trialEndsAt,
      daysRemaining: Infinity,
      daysTotal: 0,
      percentageUsed: 0,
      subscriptionTier,
      isWarningPeriod: false,
      isCriticalPeriod: false,
    };
  }
  
  const startDate = trialStartsAt ? new Date(trialStartsAt) : now;
  const endDate = new Date(trialEndsAt);
  
  // Calcula dias restantes
  const diffTime = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Calcula total de dias do trial
  const totalTime = endDate.getTime() - startDate.getTime();
  const daysTotal = Math.ceil(totalTime / (1000 * 60 * 60 * 24));
  
  // Calcula porcentagem usada
  const usedTime = now.getTime() - startDate.getTime();
  const percentageUsed = Math.min(100, Math.max(0, (usedTime / totalTime) * 100));
  
  // Verifica status
  const isExpired = now > endDate;
  const isActive = !isExpired;
  const isWarningPeriod = daysRemaining <= 3 && daysRemaining > 0;
  const isCriticalPeriod = daysRemaining <= 1 && daysRemaining > 0;
  
  return {
    isActive,
    isExpired,
    hasNoTrial: false,
    trialStartsAt,
    trialEndsAt,
    daysRemaining,
    daysTotal,
    percentageUsed,
    subscriptionTier,
    isWarningPeriod,
    isCriticalPeriod,
  };
}

/**
 * Hook para obter status do trial do usuário atual
 * 
 * @returns {UseTrialStatusReturn} Status do trial, loading e error
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { trialStatus, loading, error } = useTrialStatus();
 *   
 *   if (loading) return <div>Carregando...</div>;
 *   if (error) return <div>Erro: {error}</div>;
 *   
 *   if (trialStatus?.isExpired) {
 *     return <div>Seu trial expirou! Assine um plano.</div>;
 *   }
 *   
 *   if (trialStatus?.isWarningPeriod) {
 *     return <div>Faltam {trialStatus.daysRemaining} dias!</div>;
 *   }
 *   
 *   return <div>Trial ativo</div>;
 * }
 * ```
 */
export function useTrialStatus(): UseTrialStatusReturn {
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrialStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtém usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Usuário não autenticado');
        setTrialStatus(null);
        return;
      }

      // Busca dados do trial na tabela users
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('trial_starts_at, trial_ends_at, subscription_tier')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('❌ Erro ao buscar status do trial:', fetchError);
        setError(fetchError.message);
        setTrialStatus(null);
        return;
      }

      if (!userData) {
        setError('Dados do usuário não encontrados');
        setTrialStatus(null);
        return;
      }

      // Calcula status do trial
      const status = calculateTrialStatus(
        userData.trial_starts_at,
        userData.trial_ends_at,
        userData.subscription_tier || 'free'
      );

      console.log('✅ Status do trial calculado:', status);
      setTrialStatus(status);
      
    } catch (err) {
      console.error('❌ Erro ao buscar status do trial:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setTrialStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrialStatus();
  }, []);

  return {
    trialStatus,
    loading,
    error,
    refetch: fetchTrialStatus,
  };
}

/**
 * Função auxiliar para formatar dias restantes
 * 
 * @param daysRemaining - Número de dias restantes
 * @returns String formatada (ex: "3 dias", "1 dia", "Hoje")
 */
export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining < 0) return 'Expirado';
  if (daysRemaining === 0) return 'Hoje';
  if (daysRemaining === 1) return '1 dia';
  return `${daysRemaining} dias`;
}

/**
 * Função auxiliar para obter cor do status
 * 
 * @param trialStatus - Status do trial
 * @returns Classes CSS do Tailwind
 */
export function getTrialStatusColor(trialStatus: TrialStatus | null): string {
  if (!trialStatus) return 'text-gray-600 bg-gray-50';
  
  if (trialStatus.hasNoTrial) return 'text-blue-600 bg-blue-50';
  if (trialStatus.isExpired) return 'text-red-600 bg-red-50';
  if (trialStatus.isCriticalPeriod) return 'text-orange-600 bg-orange-50';
  if (trialStatus.isWarningPeriod) return 'text-yellow-600 bg-yellow-50';
  if (trialStatus.isActive) return 'text-green-600 bg-green-50';
  
  return 'text-gray-600 bg-gray-50';
}

/**
 * Função auxiliar para obter mensagem do status
 * 
 * @param trialStatus - Status do trial
 * @returns Mensagem amigável
 */
export function getTrialStatusMessage(trialStatus: TrialStatus | null): string {
  if (!trialStatus) return 'Carregando...';
  
  if (trialStatus.hasNoTrial) {
    return 'Acesso completo';
  }
  
  if (trialStatus.isExpired) {
    return 'Período de teste expirado';
  }
  
  if (trialStatus.isCriticalPeriod) {
    return `⚠️ Último dia de teste!`;
  }
  
  if (trialStatus.isWarningPeriod) {
    return `Faltam ${formatDaysRemaining(trialStatus.daysRemaining)} de teste`;
  }
  
  if (trialStatus.isActive) {
    return `${formatDaysRemaining(trialStatus.daysRemaining)} de teste restantes`;
  }
  
  return 'Status desconhecido';
}