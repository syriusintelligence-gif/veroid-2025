/**
 * 🚫 EDGE FUNCTION: CANCEL SUBSCRIPTION
 * 
 * Esta função cancela uma assinatura do Stripe.
 * 
 * Fluxo:
 * 1. Recebe userId do frontend
 * 2. Verifica autenticação do usuário
 * 3. Busca assinatura ativa no banco
 * 4. Se tiver stripe_subscription_id: cancela no Stripe
 * 5. Se NÃO tiver stripe_subscription_id: apenas atualiza o banco
 * 6. Atualiza status no banco de dados
 * 
 * ✅ ATUALIZADO: Agora suporta assinaturas sem Stripe (criadas via fallback)
 * ✅ ATUALIZADO: Usa fetch API diretamente para compatibilidade com Deno
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to call Stripe API
async function stripeRequest(
  endpoint: string, 
  method: string = 'GET', 
  body?: string
): Promise<{ data: Record<string, unknown> | null; error: string | null; status: number }> {
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  
  if (!stripeSecretKey) {
    return { data: null, error: 'STRIPE_SECRET_KEY not configured', status: 500 };
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await response.json();
    
    if (!response.ok) {
      return { 
        data: null, 
        error: data.error?.message || 'Stripe API error', 
        status: response.status 
      };
    }

    return { data, error: null, status: response.status };
  } catch (error) {
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Unknown error', 
      status: 500 
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚫 [CANCEL SUBSCRIPTION] Iniciando cancelamento...');

    // Inicializa Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body
    const { userId } = await req.json();

    console.log('📊 [CANCEL SUBSCRIPTION] UserId recebido:', userId);

    // Validação de dados
    if (!userId) {
      console.error('❌ [CANCEL SUBSCRIPTION] userId não fornecido');
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verifica autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ [CANCEL SUBSCRIPTION] Token de autenticação não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ [CANCEL SUBSCRIPTION] Usuário autenticado');

    // Busca assinatura ativa no banco
    const { data: subscription, error: fetchError } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError || !subscription) {
      console.error('❌ [CANCEL SUBSCRIPTION] Assinatura não encontrada:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Nenhuma assinatura ativa encontrada' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ [CANCEL SUBSCRIPTION] Assinatura encontrada:', subscription.id);
    console.log('📊 [CANCEL SUBSCRIPTION] Stripe Subscription ID:', subscription.stripe_subscription_id);

    let currentPeriodEnd = subscription.current_period_end;

    // ✅ Verifica se a assinatura tem Stripe ID
    if (subscription.stripe_subscription_id) {
      console.log('💳 [CANCEL SUBSCRIPTION] Assinatura com Stripe - Cancelando no Stripe...');
      
      // Cancela assinatura no Stripe (ao final do período) usando fetch API
      const { data: canceledSubscription, error: stripeError } = await stripeRequest(
        `/subscriptions/${subscription.stripe_subscription_id}`,
        'POST',
        'cancel_at_period_end=true'
      );

      if (stripeError) {
        console.error('❌ [CANCEL SUBSCRIPTION] Erro ao cancelar no Stripe:', stripeError);
        
        // Se o erro indicar que a assinatura não existe no Stripe, continua apenas atualizando o banco
        if (stripeError.includes('No such subscription') || stripeError.includes('resource_missing')) {
          console.warn('⚠️ [CANCEL SUBSCRIPTION] Assinatura não encontrada no Stripe, continuando apenas com atualização do banco');
        } else {
          // Se for outro erro, retorna erro
          return new Response(
            JSON.stringify({ error: 'Erro ao cancelar assinatura no Stripe: ' + stripeError }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      } else if (canceledSubscription) {
        console.log('✅ [CANCEL SUBSCRIPTION] Assinatura cancelada no Stripe');
        const periodEnd = canceledSubscription.current_period_end as number;
        if (periodEnd) {
          currentPeriodEnd = new Date(periodEnd * 1000).toISOString();
        }
      }
    } else {
      console.log('📝 [CANCEL SUBSCRIPTION] Assinatura SEM Stripe - Apenas atualizando banco de dados');
    }

    // Atualiza status no banco (para assinaturas COM ou SEM Stripe)
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    if (updateError) {
      console.error('❌ [CANCEL SUBSCRIPTION] Erro ao atualizar banco:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar status da assinatura' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ [CANCEL SUBSCRIPTION] Assinatura cancelada com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: subscription.stripe_subscription_id 
          ? 'Assinatura cancelada com sucesso no Stripe. Você terá acesso até o final do período atual.'
          : 'Assinatura cancelada com sucesso. Você terá acesso até o final do período atual.',
        currentPeriodEnd: currentPeriodEnd,
        hasStripeSubscription: !!subscription.stripe_subscription_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ [CANCEL SUBSCRIPTION] Erro ao cancelar assinatura:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido ao cancelar assinatura',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});