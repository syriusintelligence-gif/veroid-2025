import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  plan_type: 'trial' | 'creator' | 'creator_pro' | 'creator_elite';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'unpaid';
  current_period_start: string;
  current_period_end: string;
  trial_start: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  ended_at: string | null;
  signatures_used: number;
  signatures_limit: number;
  overage_signatures_available: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSubscription = (): UseSubscriptionReturn => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      console.log('🔄 [useSubscription] Iniciando busca de assinatura...');
      setLoading(true);
      setError(null);

      // Buscar usuário atual diretamente do Supabase
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('❌ [useSubscription] Erro ao buscar usuário:', userError);
        throw userError;
      }

      if (!user) {
        console.log('⚠️ [useSubscription] Nenhum usuário autenticado');
        setSubscription(null);
        setLoading(false);
        return;
      }

      console.log('✅ [useSubscription] Usuário encontrado:', user.id);

      // Buscar assinatura com logs detalhados
      console.log('🔍 [useSubscription] Buscando assinatura para user_id:', user.id);
      
      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Usar maybeSingle() em vez de single() para evitar erro quando não há dados

      console.log('📊 [useSubscription] Resposta da query:', { data, error: fetchError });

      if (fetchError) {
        console.error('❌ [useSubscription] Erro na query:', {
          code: fetchError.code,
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
        });

        // Tratamento específico para erro 406
        if (fetchError.code === '406' || fetchError.message.includes('406')) {
          console.error('🚨 [useSubscription] Erro 406 - Possível problema de RLS ou headers');
          setError('Erro ao acessar dados de assinatura. Verifique as permissões.');
        } else if (fetchError.code === 'PGRST116') {
          // No subscription found (código normal quando não há assinatura)
          console.log('ℹ️ [useSubscription] Nenhuma assinatura encontrada para o usuário');
          setSubscription(null);
        } else {
          throw fetchError;
        }
      } else if (data) {
        console.log('✅ [useSubscription] Assinatura encontrada:', {
          id: data.id,
          plan_type: data.plan_type,
          status: data.status,
          signatures_used: data.signatures_used,
          signatures_limit: data.signatures_limit,
        });
        setSubscription(data);
      } else {
        console.log('ℹ️ [useSubscription] Nenhuma assinatura encontrada (data é null)');
        setSubscription(null);
      }
    } catch (err) {
      console.error('❌ [useSubscription] Erro ao buscar assinatura:', err);
      const errorMessage = err instanceof Error ? err.message : 'Falha ao buscar assinatura';
      setError(errorMessage);
      setSubscription(null);
    } finally {
      setLoading(false);
      console.log('🏁 [useSubscription] Busca finalizada');
    }
  };

  useEffect(() => {
    fetchSubscription();

    // Configurar listener para mudanças na sessão
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 [useSubscription] Auth state changed:', event);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          fetchSubscription();
        } else if (event === 'SIGNED_OUT') {
          setSubscription(null);
          setLoading(false);
        }
      }
    );

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  return {
    subscription,
    loading,
    error,
    refetch: fetchSubscription,
  };
};

// Helper functions
export const getPlanName = (planType: Subscription['plan_type']): string => {
  const planNames: Record<Subscription['plan_type'], string> = {
    trial: 'Trial',
    creator: 'Creator',
    creator_pro: 'Creator Pro',
    creator_elite: 'Creator Elite',
  };
  return planNames[planType] || planType;
};

export const getStatusColor = (status: Subscription['status']): string => {
  const colors: Record<Subscription['status'], string> = {
    trialing: 'text-blue-600 bg-blue-50',
    active: 'text-green-600 bg-green-50',
    past_due: 'text-yellow-600 bg-yellow-50',
    canceled: 'text-red-600 bg-red-50',
    incomplete: 'text-gray-600 bg-gray-50',
    incomplete_expired: 'text-gray-600 bg-gray-50',
    unpaid: 'text-red-600 bg-red-50',
  };
  return colors[status] || 'text-gray-600 bg-gray-50';
};

export const getStatusLabel = (status: Subscription['status']): string => {
  const labels: Record<Subscription['status'], string> = {
    trialing: 'Em Período de Teste',
    active: 'Ativo',
    past_due: 'Pagamento Atrasado',
    canceled: 'Cancelado',
    incomplete: 'Incompleto',
    incomplete_expired: 'Expirado',
    unpaid: 'Não Pago',
  };
  return labels[status] || status;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const getDaysUntilRenewal = (endDate: string): number => {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};