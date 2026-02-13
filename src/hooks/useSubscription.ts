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