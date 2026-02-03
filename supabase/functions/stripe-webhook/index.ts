/**
 * 🔔 EDGE FUNCTION: STRIPE WEBHOOK
 * 
 * Esta função processa eventos do Stripe (webhooks) e atualiza o banco de dados.
 * 
 * Eventos processados:
 * - checkout.session.completed: Cria/atualiza assinatura após pagamento bem-sucedido
 * - customer.subscription.updated: Atualiza status da assinatura
 * - customer.subscription.deleted: Cancela assinatura
 * - invoice.payment_succeeded: Renova assinatura
 * - invoice.payment_failed: Marca assinatura como inadimplente
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔔 [WEBHOOK] Recebendo evento do Stripe...');

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

    // Verifica assinatura do webhook
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      console.error('❌ [WEBHOOK] Assinatura do webhook não fornecida');
      return new Response('Webhook signature missing', { status: 400 });
    }

    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET não configurado');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // Constrói e verifica evento
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ [WEBHOOK] Evento verificado:', event.type);
    } catch (err) {
      console.error('❌ [WEBHOOK] Erro ao verificar assinatura:', err);
      return new Response(`Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`, {
        status: 400,
      });
    }

    // Processa evento baseado no tipo
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 [WEBHOOK] Checkout completado:', session.id);

        const userId = session.metadata?.userId;
        const planType = session.metadata?.planType;

        if (!userId) {
          console.error('❌ [WEBHOOK] userId não encontrado no metadata');
          break;
        }

        // Para assinaturas
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          
          console.log('📊 [WEBHOOK] Dados da assinatura:', {
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            status: subscription.status,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          });

          // Salva/atualiza assinatura no banco
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
              user_id: userId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              plan_id: subscription.items.data[0].price.id,
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'stripe_subscription_id',
            });

          if (error) {
            console.error('❌ [WEBHOOK] Erro ao salvar assinatura:', error);
          } else {
            console.log('✅ [WEBHOOK] Assinatura salva com sucesso');
          }
        }

        // Para pagamentos únicos (pacotes overage)
        if (session.mode === 'payment') {
          console.log('💰 [WEBHOOK] Pagamento único processado');
          
          // Aqui você pode adicionar lógica para creditar autenticações extras
          // Por exemplo, adicionar créditos na tabela user_credits
        }

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 [WEBHOOK] Assinatura atualizada:', subscription.id);

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('❌ [WEBHOOK] Erro ao atualizar assinatura:', error);
        } else {
          console.log('✅ [WEBHOOK] Assinatura atualizada com sucesso');
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🗑️ [WEBHOOK] Assinatura cancelada:', subscription.id);

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('❌ [WEBHOOK] Erro ao cancelar assinatura:', error);
        } else {
          console.log('✅ [WEBHOOK] Assinatura cancelada com sucesso');
        }

        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('✅ [WEBHOOK] Pagamento de fatura bem-sucedido:', invoice.id);

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: subscription.status,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);

          if (error) {
            console.error('❌ [WEBHOOK] Erro ao atualizar assinatura após pagamento:', error);
          } else {
            console.log('✅ [WEBHOOK] Assinatura renovada com sucesso');
          }
        }

        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('❌ [WEBHOOK] Falha no pagamento de fatura:', invoice.id);

        if (invoice.subscription) {
          const { error } = await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription as string);

          if (error) {
            console.error('❌ [WEBHOOK] Erro ao marcar assinatura como inadimplente:', error);
          } else {
            console.log('⚠️ [WEBHOOK] Assinatura marcada como inadimplente');
          }
        }

        break;
      }

      default:
        console.log(`ℹ️ [WEBHOOK] Evento não processado: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ [WEBHOOK] Erro ao processar webhook:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar webhook',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});