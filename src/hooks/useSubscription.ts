import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  signatures_used: number;
  signatures_limit: number;
  overage_signatures_available: number;
  current_period_end: string;
}

/**
 * 🆕 Interface para status detalhado de assinaturas
 */
export interface SignatureStatus {
  has_active_subscription: boolean;
  signatures_used: number;
  signatures_limit: number;
  overage_available: number;
  total_available: number;
  subscription_status: string;
  plan_type: string;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Usuário não autenticado');
        setSubscription(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar assinatura:', fetchError);
        setError(fetchError.message);
        setSubscription(null);
        return;
      }

      if (data) {
        setSubscription({
          id: data.id,
          plan_type: data.plan_type,
          status: data.status,
          signatures_used: data.signatures_used,
          signatures_limit: data.signatures_limit,
          overage_signatures_available: data.overage_signatures_available || 0,
          current_period_end: data.current_period_end,
        });
      } else {
        setSubscription(null);
      }
    } catch (err) {
      console.error('Erro ao buscar assinatura:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
  };
}

/**
 * 🆕 Hook para obter status detalhado de assinaturas
 * Usa a função SQL get_signature_status para cálculos precisos
 */
export function useSignatureStatus() {
  const [status, setStatus] = useState<SignatureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Usuário não autenticado');
        setStatus(null);
        return;
      }

      const { data, error: rpcError } = await supabase
        .rpc('get_signature_status', { p_user_id: user.id });

      if (rpcError) {
        console.error('Erro ao buscar status de assinaturas:', rpcError);
        setError(rpcError.message);
        setStatus(null);
        return;
      }

      if (data) {
        setStatus(data);
      } else {
        setStatus(null);
      }
    } catch (err) {
      console.error('Erro ao buscar status de assinaturas:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
  };
}

/**
 * 🆕 Função auxiliar para consumir uma assinatura
 * Chama a função SQL consume_signature
 */
export async function consumeSignature(userId: string): Promise<{
  success: boolean;
  message: string;
  signatures_remaining: number;
  subscription_id: string | null;
}> {
  try {
    const { data, error } = await supabase
      .rpc('consume_signature', { p_user_id: userId });

    if (error) {
      console.error('Erro ao consumir assinatura:', error);
      return {
        success: false,
        message: error.message,
        signatures_remaining: 0,
        subscription_id: null,
      };
    }

    return data;
  } catch (err) {
    console.error('Erro ao consumir assinatura:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro desconhecido',
      signatures_remaining: 0,
      subscription_id: null,
    };
  }
}

// ========================================
// 🔧 FUNÇÕES AUXILIARES (MANTIDAS DO CÓDIGO ORIGINAL)
// ========================================

/**
 * Retorna o nome amigável do plano
 */
export function getPlanName(planType: string): string {
  const planNames: Record<string, string> = {
    trial: 'Trial Gratuito',
    creator: 'Creator',
    creator_pro: 'Creator Pro',
    creator_elite: 'Creator Elite',
  };
  return planNames[planType] || planType;
}

/**
 * Retorna as classes CSS para colorir o status
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    trialing: 'text-blue-600 bg-blue-50',
    active: 'text-green-600 bg-green-50',
    past_due: 'text-yellow-600 bg-yellow-50',
    canceled: 'text-red-600 bg-red-50',
    incomplete: 'text-gray-600 bg-gray-50',
    incomplete_expired: 'text-gray-600 bg-gray-50',
    unpaid: 'text-red-600 bg-red-50',
  };
  return colors[status] || 'text-gray-600 bg-gray-50';
}

/**
 * Retorna o label amigável do status
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    trialing: 'Em Período de Teste',
    active: 'Ativo',
    past_due: 'Pagamento Atrasado',
    canceled: 'Cancelado',
    incomplete: 'Incompleto',
    incomplete_expired: 'Expirado',
    unpaid: 'Não Pago',
  };
  return labels[status] || status;
}

/**
 * Formata uma data para o padrão brasileiro
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Calcula quantos dias faltam até a renovação
 */
export function getDaysUntilRenewal(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}