/**
 * 🚀 PASSO 4: INTEGRAÇÃO COM STRIPE CHECKOUT
 * 
 * Este serviço gerencia a criação de sessões de checkout do Stripe
 * e vincula as assinaturas às contas dos usuários.
 * 
 * Fluxo:
 * 1. Usuário clica em "Assinar Agora"
 * 2. Sistema verifica autenticação
 * 3. Cria Checkout Session no Stripe com userId no metadata
 * 4. Redireciona para Stripe Checkout
 * 5. Após pagamento, webhook processa e salva assinatura
 */

import { supabase } from '@/lib/supabase';

/**
 * Interface para dados da sessão de checkout
 */
export interface CheckoutSessionData {
  priceId: string;
  userId: string;
  planType: 'subscription' | 'one_time';
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Interface para resposta da criação de sessão
 */
export interface CheckoutSessionResponse {
  success: boolean;
  sessionId?: string;
  url?: string;
  error?: string;
}

/**
 * Cria uma sessão de checkout do Stripe
 * 
 * @param data - Dados da sessão (priceId, userId, planType)
 * @returns Promise com sessionId e URL de checkout
 * 
 * @example
 * ```typescript
 * const result = await createCheckoutSession({
 *   priceId: 'price_1234567890',
 *   userId: 'abc123',
 *   planType: 'subscription'
 * });
 * 
 * if (result.success) {
 *   window.location.href = result.url;
 * }
 * ```
 */
export async function createCheckoutSession(
  data: CheckoutSessionData
): Promise<CheckoutSessionResponse> {
  try {
    console.log('🛒 [STRIPE CHECKOUT] Criando sessão de checkout...', {
      priceId: data.priceId,
      userId: data.userId,
      planType: data.planType,
    });

    // Verifica se usuário está autenticado
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ [STRIPE CHECKOUT] Usuário não autenticado');
      return {
        success: false,
        error: 'Usuário não autenticado. Faça login para continuar.',
      };
    }

    // URLs de sucesso e cancelamento
    const baseUrl = window.location.origin;
    const successUrl = data.successUrl || `${baseUrl}/pricing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = data.cancelUrl || `${baseUrl}/pricing/cancel`;

    console.log('🔗 [STRIPE CHECKOUT] URLs configuradas:', {
      successUrl,
      cancelUrl,
    });

    // Chama Edge Function para criar sessão no Stripe
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: data.priceId,
          userId: data.userId,
          planType: data.planType,
          successUrl,
          cancelUrl,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [STRIPE CHECKOUT] Erro na resposta:', {
        status: response.status,
        error: errorText,
      });
      
      return {
        success: false,
        error: `Erro ao criar sessão: ${errorText}`,
      };
    }

    const result = await response.json();
    
    console.log('✅ [STRIPE CHECKOUT] Sessão criada com sucesso:', {
      sessionId: result.sessionId,
      url: result.url?.substring(0, 50) + '...',
    });

    return {
      success: true,
      sessionId: result.sessionId,
      url: result.url,
    };

  } catch (error) {
    console.error('❌ [STRIPE CHECKOUT] Erro ao criar sessão:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao criar sessão de checkout',
    };
  }
}

/**
 * Redireciona para o Stripe Checkout
 * 
 * @param sessionUrl - URL da sessão de checkout
 * 
 * @example
 * ```typescript
 * const result = await createCheckoutSession({ ... });
 * if (result.success && result.url) {
 *   redirectToCheckout(result.url);
 * }
 * ```
 */
export function redirectToCheckout(sessionUrl: string): void {
  console.log('🔀 [STRIPE CHECKOUT] Redirecionando para Stripe Checkout...');
  window.location.href = sessionUrl;
}

/**
 * Verifica se o usuário tem uma assinatura ativa
 * 
 * @param userId - ID do usuário
 * @returns Promise com status da assinatura
 * 
 * @example
 * ```typescript
 * const hasSubscription = await checkUserSubscription('abc123');
 * if (hasSubscription) {
 *   console.log('Usuário já tem assinatura ativa');
 * }
 * ```
 */
export async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    console.log('🔍 [STRIPE CHECKOUT] Verificando assinatura do usuário:', userId);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Nenhuma assinatura encontrada (esperado)
        console.log('ℹ️ [STRIPE CHECKOUT] Usuário não tem assinatura ativa');
        return false;
      }
      
      console.error('❌ [STRIPE CHECKOUT] Erro ao verificar assinatura:', error);
      return false;
    }

    console.log('✅ [STRIPE CHECKOUT] Usuário tem assinatura ativa:', {
      planId: data.plan_id,
      status: data.status,
    });

    return true;

  } catch (error) {
    console.error('❌ [STRIPE CHECKOUT] Erro ao verificar assinatura:', error);
    return false;
  }
}

/**
 * Obtém detalhes da assinatura do usuário
 * 
 * @param userId - ID do usuário
 * @returns Promise com dados da assinatura ou null
 * 
 * @example
 * ```typescript
 * const subscription = await getUserSubscription('abc123');
 * if (subscription) {
 *   console.log('Plano atual:', subscription.plan_id);
 * }
 * ```
 */
export async function getUserSubscription(userId: string): Promise<any | null> {
  try {
    console.log('📊 [STRIPE CHECKOUT] Obtendo detalhes da assinatura:', userId);

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('ℹ️ [STRIPE CHECKOUT] Nenhuma assinatura ativa encontrada');
        return null;
      }
      
      console.error('❌ [STRIPE CHECKOUT] Erro ao obter assinatura:', error);
      return null;
    }

    console.log('✅ [STRIPE CHECKOUT] Assinatura obtida:', {
      planId: data.plan_id,
      status: data.status,
      currentPeriodEnd: data.current_period_end,
    });

    return data;

  } catch (error) {
    console.error('❌ [STRIPE CHECKOUT] Erro ao obter assinatura:', error);
    return null;
  }
}

/**
 * Cancela a assinatura do usuário
 * 
 * @param userId - ID do usuário
 * @returns Promise com resultado da operação
 * 
 * @example
 * ```typescript
 * const result = await cancelSubscription('abc123');
 * if (result.success) {
 *   console.log('Assinatura cancelada com sucesso');
 * }
 * ```
 */
export async function cancelSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🚫 [STRIPE CHECKOUT] Cancelando assinatura:', userId);

    // Verifica se usuário está autenticado
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ [STRIPE CHECKOUT] Usuário não autenticado');
      return {
        success: false,
        error: 'Usuário não autenticado',
      };
    }

    // Chama Edge Function para cancelar no Stripe
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-subscription`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [STRIPE CHECKOUT] Erro ao cancelar:', errorText);
      
      return {
        success: false,
        error: `Erro ao cancelar assinatura: ${errorText}`,
      };
    }

    const result = await response.json();
    
    console.log('✅ [STRIPE CHECKOUT] Assinatura cancelada com sucesso');

    return {
      success: true,
    };

  } catch (error) {
    console.error('❌ [STRIPE CHECKOUT] Erro ao cancelar assinatura:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao cancelar assinatura',
    };
  }
}