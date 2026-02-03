/**
 * 🚫 EDGE FUNCTION: CANCEL SUBSCRIPTION
 * 
 * Esta função cancela uma assinatura do Stripe.
 * 
 * Fluxo:
 * 1. Recebe userId do frontend
 * 2. Verifica autenticação do usuário
 * 3. Busca assinatura ativa no banco
 * 4. Cancela assinatura no Stripe
 * 5. Atualiza status no banco de dados
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚫 [CANCEL SUBSCRIPTION] Iniciando cancelamento...');

    // Inicializa Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

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

    console.log('✅ [CANCEL SUBSCRIPTION] Assinatura encontrada:', subscription.stripe_subscription_id);

    // Cancela assinatura no Stripe (ao final do período)
    const canceledSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    console.log('✅ [CANCEL SUBSCRIPTION] Assinatura cancelada no Stripe');

    // Atualiza status no banco
    const { error: updateError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.stripe_subscription_id);

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
        message: 'Assinatura cancelada com sucesso. Você terá acesso até o final do período atual.',
        currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
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