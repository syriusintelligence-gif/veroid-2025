import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!signature || !webhookSecret) {
    return new Response('Webhook signature ou secret ausente', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );

    console.log('📨 Webhook recebido:', event.type);

    // Initialize Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials não configuradas');
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ Checkout completado:', session.id);

        const userId = session.metadata?.user_id;
        const planId = session.metadata?.plan_id;
        const planName = session.metadata?.plan_name;

        if (!userId) {
          console.error('❌ user_id não encontrado nos metadados');
          break;
        }

        // Determine validations limit based on plan
        const validationsMap: Record<string, number> = {
          'vero-id-free': 10,
          'vero-id-creator': 50,
          'vero-id-creator-pro': 150,
          'vero-id-creator-elite': 350,
          'pacote-10': 10,
          'pacote-20': 20,
          'pacote-50': 50,
        };

        const validationsLimit = validationsMap[planId || ''] || 0;

        if (session.mode === 'subscription' && session.subscription) {
          // Handle subscription
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await supabase.from('subscriptions').upsert({
            user_id: userId,
            plan_id: planId,
            plan_name: planName,
            status: subscription.status,
            stripe_subscription_id: subscription.id,
            stripe_customer_id: session.customer as string,
            stripe_price_id: subscription.items.data[0].price.id,
            validations_limit: validationsLimit,
            validations_used: 0,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
          });

          console.log('✅ Assinatura salva no banco:', subscription.id);
        } else if (session.mode === 'payment') {
          // Handle one-time payment (pacotes avulsos)
          await supabase.from('subscriptions').upsert({
            user_id: userId,
            plan_id: planId,
            plan_name: planName,
            status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_price_id: session.metadata?.price_id,
            validations_limit: validationsLimit,
            validations_used: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
            cancel_at_period_end: false,
          });

          console.log('✅ Pacote avulso salvo no banco');
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Assinatura atualizada:', subscription.id);

        // Find user by stripe_customer_id
        const { data: customer } = await supabase
          .from('stripe_customers')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer as string)
          .single();

        if (!customer) {
          console.error('❌ Cliente não encontrado:', subscription.customer);
          break;
        }

        // Determine validations limit
        const priceId = subscription.items.data[0].price.id;
        const validationsMap: Record<string, number> = {
          'price_1Sx4uCJbBunj3EyEXSFIlqlV': 10,  // Free
          'price_1Sx55HJbBunj3EyElTWIGj2O': 50,  // Creator
          'price_1Sx58MJbBunj3EyEQn1MNT5x': 150, // Creator Pro
          'price_1Sx5GCJbBunj3EyEyfGjJRGH': 350, // Creator Elite
        };

        const validationsLimit = validationsMap[priceId] || 0;

        await supabase.from('subscriptions').upsert({
          user_id: customer.user_id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          stripe_price_id: priceId,
          status: subscription.status,
          validations_limit: validationsLimit,
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        });

        console.log('✅ Assinatura atualizada no banco');
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Assinatura cancelada:', subscription.id);

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', subscription.id);

        console.log('✅ Status atualizado para cancelado');
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Pagamento bem-sucedido:', invoice.id);

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );

          // Find user by stripe_customer_id
          const { data: customer } = await supabase
            .from('stripe_customers')
            .select('user_id')
            .eq('stripe_customer_id', subscription.customer as string)
            .single();

          if (customer) {
            // Reset validations_used for the new period
            await supabase
              .from('subscriptions')
              .update({
                status: 'active',
                validations_used: 0,
                current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              })
              .eq('stripe_subscription_id', subscription.id);

            console.log('✅ Validações resetadas para novo período');
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('⚠️ Pagamento falhou:', invoice.id);

        if (invoice.subscription) {
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', invoice.subscription as string);

          console.log('✅ Status atualizado para past_due');
        }
        break;
      }

      default:
        console.log('ℹ️ Evento não tratado:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});