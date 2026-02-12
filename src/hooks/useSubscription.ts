import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No subscription found
          setSubscription(null);
        } else {
          throw fetchError;
        }
      } else {
        setSubscription(data);
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

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