import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Interface para compras de pacotes avulsos
 */
export interface PackagePurchase {
  package_name: string;
  credits_added: number;
  credits_remaining: number;
  purchase_date: string;
  expiration_date: string;
  stripe_session_id?: string;
  stripe_price_id?: string;
  stripe_payment_intent?: string;
  processed_by?: string;
}

export interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  signatures_used: number;
  signatures_limit: number;
  overage_signatures_available: number;
  current_period_end: string;
  current_period_start: string;
  created_at: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_end: string | null;
  metadata?: {
    package_purchases?: PackagePurchase[];
    last_package_purchase?: PackagePurchase;
    last_renewal?: {
      date: string;
      invoice_id: string;
      previous_signatures_used: number;
      expired_overage_credits: number;
    };
    [key: string]: unknown;
  };
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
          current_period_start: data.current_period_start,
          created_at: data.created_at,
          stripe_subscription_id: data.stripe_subscription_id,
          stripe_customer_id: data.stripe_customer_id,
          cancel_at_period_end: data.cancel_at_period_end || false,
          canceled_at: data.canceled_at,
          trial_end: data.trial_end,
          metadata: data.metadata || {},
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
        setLoading(false);
        return;
      }

      // ✅ CORREÇÃO: A função SQL retorna um array, pegamos o primeiro elemento
      const { data, error: rpcError } = await supabase
        .rpc('get_signature_status', { p_user_id: user.id });

      if (rpcError) {
        console.error('❌ Erro RPC ao buscar status:', rpcError);
        setError(rpcError.message);
        setStatus(null);
        setLoading(false);
        return;
      }

      // ✅ CORREÇÃO: data é um array, pegamos o primeiro elemento
      if (data && Array.isArray(data) && data.length > 0) {
        console.log('✅ Status de assinatura obtido:', data[0]);
        setStatus(data[0]);
      } else if (data && !Array.isArray(data)) {
        // Caso retorne objeto único (não deveria, mas por segurança)
        console.log('✅ Status de assinatura obtido (objeto):', data);
        setStatus(data);
      } else {
        console.warn('⚠️ Nenhum status de assinatura encontrado');
        setStatus({
          has_active_subscription: false,
          signatures_used: 0,
          signatures_limit: 0,
          overage_available: 0,
          total_available: 0,
          subscription_status: 'none',
          plan_type: 'none',
        });
      }
    } catch (err) {
      console.error('❌ Erro ao buscar status de assinaturas:', err);
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
    // ✅ CORREÇÃO: A função SQL retorna um array, pegamos o primeiro elemento
    const { data, error } = await supabase
      .rpc('consume_signature', { p_user_id: userId });

    if (error) {
      console.error('❌ Erro ao consumir assinatura:', error);
      return {
        success: false,
        message: error.message,
        signatures_remaining: 0,
        subscription_id: null,
      };
    }

    // ✅ CORREÇÃO: data é um array, pegamos o primeiro elemento
    if (data && Array.isArray(data) && data.length > 0) {
      console.log('✅ Assinatura consumida:', data[0]);
      return data[0];
    } else if (data && !Array.isArray(data)) {
      // Caso retorne objeto único (não deveria, mas por segurança)
      console.log('✅ Assinatura consumida (objeto):', data);
      return data;
    }

    return {
      success: false,
      message: 'Nenhum resultado retornado',
      signatures_remaining: 0,
      subscription_id: null,
    };
  } catch (err) {
    console.error('❌ Erro ao consumir assinatura:', err);
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro desconhecido',
      signatures_remaining: 0,
      subscription_id: null,
    };
  }
}

// ========================================
// 🔧 FUNÇÕES AUXILIARES
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
 * Formata uma data de forma curta (DD/MM/YYYY)
 */
export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
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

/**
 * Filtra pacotes válidos (não expirados e com créditos)
 */
export function getValidPackages(packages: PackagePurchase[] | undefined): PackagePurchase[] {
  if (!packages || !Array.isArray(packages)) return [];
  
  const now = new Date();
  return packages
    .filter(pkg => {
      const expirationDate = new Date(pkg.expiration_date);
      return expirationDate > now && pkg.credits_remaining > 0;
    })
    .sort((a, b) => {
      // Ordenar por data de expiração (mais próximo primeiro)
      return new Date(a.expiration_date).getTime() - new Date(b.expiration_date).getTime();
    });
}

/**
 * Calcula o total de créditos válidos de pacotes
 */
export function getTotalValidCredits(packages: PackagePurchase[] | undefined): number {
  const validPackages = getValidPackages(packages);
  return validPackages.reduce((sum, pkg) => sum + pkg.credits_remaining, 0);
}

/**
 * Retorna a data de expiração mais próxima dos pacotes válidos
 */
export function getNextExpirationDate(packages: PackagePurchase[] | undefined): string | null {
  const validPackages = getValidPackages(packages);
  if (validPackages.length === 0) return null;
  return validPackages[0].expiration_date;
}