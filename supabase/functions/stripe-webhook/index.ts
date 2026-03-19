import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { createHmac, timingSafeEqual } from 'https://deno.land/std@0.177.0/node/crypto.ts';

// CORS headers para permitir requisições do Stripe
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Mapeamento de Price IDs para plan_type (planos recorrentes)
// IMPORTANTE: Manter ambos os Price IDs (antigos e novos) para compatibilidade
const PRICE_TO_PLAN: Record<string, string> = {
  // Price IDs antigos (podem ainda existir em assinaturas ativas)
  'price_1T4gcAJc1p4mhrHNwOvzI8D8': 'creator',
  'price_1T4gijJc1p4mhrHNW3h3Ajzl': 'creator_pro',
  'price_1T4gmTJc1p4mhrHNuHS9xGN2': 'creator_elite',
  // Price IDs novos (usados atualmente no Pricing.tsx)
  'price_1T9AunJc1p4mhrHNQ3rfZhLa': 'creator',
  'price_1T9AvvJc1p4mhrHNJkTRLWcU': 'creator_pro',
  'price_1T9Ax3Jc1p4mhrHNriVXetzj': 'creator_elite',
};

// Mapeamento de Price IDs para pacotes avulsos (one-time payments)
// IMPORTANTE: Manter ambos os Price IDs (antigos e novos) para compatibilidade
const PRICE_TO_PACKAGE: Record<string, { credits: number; name: string }> = {
  // Price IDs antigos (podem ainda existir em compras anteriores)
  'price_1T4gpIJc1p4mhrHNJL1tt3UY': { credits: 10, name: 'Pacote 10' },
  'price_1T4grUJc1p4mhrHNFJAl6Y4T': { credits: 20, name: 'Pacote 20' },
  'price_1T4gu0Jc1p4mhrHNg8LhOIrJ': { credits: 50, name: 'Pacote 50' },
  // Price IDs novos (usados atualmente no Pricing.tsx)
  'price_1T9AqmJc1p4mhrHNAA8QJKlc': { credits: 10, name: 'Pacote 10' },
  'price_1T9AruJc1p4mhrHNjnzpniQM': { credits: 20, name: 'Pacote 20' },
  'price_1T9AtJJc1p4mhrHNqXqdOCoh': { credits: 50, name: 'Pacote 50' },
};

// Limites de assinaturas por plano
const PLAN_LIMITS: Record<string, number> = {
  trial: 10,
  creator: 50,
  creator_pro: 150,
  creator_elite: 350,
};

// Helper function to verify Stripe webhook signature
function verifyStripeSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const parts = signature.split(',');
    let timestamp = '';
    let signatures: string[] = [];
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') {
        timestamp = value;
      } else if (key === 'v1') {
        signatures.push(value);
      }
    }
    
    if (!timestamp || signatures.length === 0) {
      console.error('❌ Invalid signature format');
      return false;
    }
    
    // Check timestamp (allow 5 minutes tolerance)
    const timestampAge = Math.floor(Date.now() / 1000) - parseInt(timestamp);
    if (timestampAge > 300) {
      console.error('❌ Webhook timestamp too old:', timestampAge, 'seconds');
      return false;
    }
    
    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    
    // Compare signatures
    for (const sig of signatures) {
      try {
        const sigBuffer = new TextEncoder().encode(sig);
        const expectedBuffer = new TextEncoder().encode(expectedSignature);
        if (sigBuffer.length === expectedBuffer.length && timingSafeEqual(sigBuffer, expectedBuffer)) {
          return true;
        }
      } catch {
        // Continue checking other signatures
      }
    }
    
    console.error('❌ Signature mismatch');
    return false;
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    return false;
  }
}

// Helper function to call Stripe API
async function stripeRequest(endpoint: string, method: string = 'GET', body?: string): Promise<Response> {
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  return response;
}

async function getUserIdByEmail(email: string): Promise<string | null> {
  console.log('🔍 [getUserIdByEmail] Buscando user_id para email:', email);
  
  try {
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ [getUserIdByEmail] Erro ao listar usuários:', error);
      return null;
    }

    const user = data.users.find(u => u.email === email);
    
    if (!user) {
      console.error('❌ [getUserIdByEmail] Usuário não encontrado para email:', email);
      return null;
    }

    console.log('✅ [getUserIdByEmail] user_id encontrado:', user.id);
    return user.id;
  } catch (error) {
    console.error('❌ [getUserIdByEmail] Exceção ao buscar usuário:', error);
    return null;
  }
}

async function handleCheckoutSessionCompleted(session: Record<string, unknown>) {
  console.log('🎉 [handleCheckoutSessionCompleted] Checkout concluído:', session.id);
  console.log('📋 [handleCheckoutSessionCompleted] Session mode:', session.mode);
  console.log('📋 [handleCheckoutSessionCompleted] Payment status:', session.payment_status);

  const customerDetails = session.customer_details as Record<string, unknown> | undefined;
  const customerEmail = (session.customer_email as string) || (customerDetails?.email as string);
  if (!customerEmail) {
    console.error('❌ [handleCheckoutSessionCompleted] Email do cliente não encontrado');
    return;
  }

  console.log('📧 [handleCheckoutSessionCompleted] Email do cliente:', customerEmail);

  const userId = await getUserIdByEmail(customerEmail);
  if (!userId) {
    console.error('❌ [handleCheckoutSessionCompleted] Usuário não encontrado para email:', customerEmail);
    return;
  }

  console.log('✅ [handleCheckoutSessionCompleted] User ID obtido:', userId);

  const mode = session.mode as string;
  
  if (mode === 'subscription') {
    console.log('📝 [handleCheckoutSessionCompleted] Processando assinatura recorrente');
    await handleSubscriptionCheckout(session, userId);
  } else if (mode === 'payment') {
    console.log('📦 [handleCheckoutSessionCompleted] Processando pacote avulso');
    await handlePackageCheckout(session, userId);
  } else {
    console.log('⚠️ [handleCheckoutSessionCompleted] Modo desconhecido:', mode);
  }
}

async function handleSubscriptionCheckout(session: Record<string, unknown>, userId: string) {
  console.log('📝 [handleSubscriptionCheckout] Iniciando processamento de assinatura recorrente');
  
  const subscriptionId = session.subscription as string;
  if (!subscriptionId) {
    console.error('❌ [handleSubscriptionCheckout] Subscription ID não encontrado na sessão');
    return;
  }

  console.log('🔍 [handleSubscriptionCheckout] Buscando subscription no Stripe:', subscriptionId);

  // Buscar detalhes da subscription no Stripe
  const subResponse = await stripeRequest(`/subscriptions/${subscriptionId}`);
  const subscription = await subResponse.json();
  
  if (!subResponse.ok) {
    console.error('❌ [handleSubscriptionCheckout] Erro ao buscar subscription:', subscription);
    return;
  }
  
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const planType = PRICE_TO_PLAN[priceId] || 'creator';
  const signaturesLimit = PLAN_LIMITS[planType] || 50;

  console.log('📋 [handleSubscriptionCheckout] Price ID:', priceId);
  console.log('📋 [handleSubscriptionCheckout] Plan Type:', planType);
  console.log('📋 [handleSubscriptionCheckout] Signatures Limit:', signaturesLimit);

  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: priceId,
    plan_type: planType,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    signatures_used: 0,
    signatures_limit: signaturesLimit,
    overage_signatures_available: 0,
    metadata: subscription.metadata || {},
    updated_at: new Date().toISOString(),
  };

  console.log('💾 [handleSubscriptionCheckout] Salvando assinatura recorrente');

  // Verificar se já existe uma assinatura para este usuário
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingSubscription) {
    console.log('🔄 [handleSubscriptionCheckout] Atualizando assinatura existente');
    
    const { error } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [handleSubscriptionCheckout] Erro ao atualizar assinatura:', error);
      throw error;
    }
    console.log('✅ [handleSubscriptionCheckout] Assinatura recorrente atualizada com sucesso');
  } else {
    console.log('➕ [handleSubscriptionCheckout] Criando nova assinatura');
    
    const { error } = await supabase
      .from('subscriptions')
      .insert({
        ...subscriptionData,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('❌ [handleSubscriptionCheckout] Erro ao criar assinatura:', error);
      throw error;
    }
    console.log('✅ [handleSubscriptionCheckout] Assinatura recorrente criada com sucesso');
  }
}

async function handlePackageCheckout(session: Record<string, unknown>, userId: string) {
  console.log('📦 [handlePackageCheckout] Processando compra de pacote avulso');
  console.log('📋 [handlePackageCheckout] Session ID:', session.id);
  console.log('📋 [handlePackageCheckout] User ID:', userId);

  // Buscar o Price ID do line item
  const lineItemsResponse = await stripeRequest(`/checkout/sessions/${session.id}/line_items`);
  const lineItems = await lineItemsResponse.json();
  
  if (!lineItemsResponse.ok) {
    console.error('❌ [handlePackageCheckout] Erro ao buscar line items:', lineItems);
    return;
  }
  
  const priceId = lineItems.data?.[0]?.price?.id;

  console.log('📋 [handlePackageCheckout] Price ID:', priceId);

  if (!priceId) {
    console.error('❌ [handlePackageCheckout] Price ID não encontrado no checkout');
    return;
  }

  const packageInfo = PRICE_TO_PACKAGE[priceId];
  if (!packageInfo) {
    console.error('❌ [handlePackageCheckout] Pacote não reconhecido para Price ID:', priceId);
    console.log('📋 [handlePackageCheckout] Pacotes disponíveis:', Object.keys(PRICE_TO_PACKAGE));
    return;
  }

  console.log(`📦 [handlePackageCheckout] Pacote identificado: ${packageInfo.name} (${packageInfo.credits} créditos)`);

  // Buscar assinatura existente do usuário
  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError || !subscription) {
    console.error('❌ [handlePackageCheckout] Assinatura não encontrada para o usuário:', userId);
    console.error('❌ [handlePackageCheckout] Erro:', fetchError);
    return;
  }

  console.log('✅ [handlePackageCheckout] Assinatura encontrada:', subscription.id);
  console.log('📋 [handlePackageCheckout] Créditos extras atuais:', subscription.overage_signatures_available);

  // Verificar se esta compra já foi processada (idempotência)
  const metadata = subscription.metadata || {};
  const lastPurchase = metadata.last_package_purchase as { stripe_session_id?: string } | undefined;
  
  if (lastPurchase && lastPurchase.stripe_session_id === session.id) {
    console.log('⚠️ [handlePackageCheckout] Compra já processada anteriormente, ignorando...');
    return;
  }

  // Adicionar créditos extras à assinatura
  const currentOverage = subscription.overage_signatures_available || 0;
  const newOverageCredits = currentOverage + packageInfo.credits;
  
  // Usar a data de criação do checkout session (momento exato da compra) do Stripe
  // session.created é um timestamp Unix em segundos
  const sessionCreatedTimestamp = session.created as number;
  const purchaseDate = sessionCreatedTimestamp 
    ? new Date(sessionCreatedTimestamp * 1000) 
    : new Date();
  
  // Pacote avulso vale 30 dias a partir da data de compra (independente do plano)
  const expirationDate = new Date(purchaseDate);
  expirationDate.setDate(expirationDate.getDate() + 30);
  
  console.log('📅 [handlePackageCheckout] Data de compra (session.created):', purchaseDate.toISOString());
  console.log('📅 [handlePackageCheckout] Data de expiração do pacote:', expirationDate.toISOString());

  const updateData = {
    overage_signatures_available: newOverageCredits,
    metadata: {
      ...metadata,
      last_package_purchase: {
        package_name: packageInfo.name,
        credits_added: packageInfo.credits,
        purchase_date: purchaseDate.toISOString(),
        expiration_date: expirationDate.toISOString(),
        stripe_session_id: session.id,
        stripe_price_id: priceId,
        stripe_payment_intent: session.payment_intent,
        processed_by: 'webhook',
      },
    },
    updated_at: new Date().toISOString(),
  };

  console.log('💾 [handlePackageCheckout] Atualizando créditos extras de', currentOverage, 'para', newOverageCredits);

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('user_id', userId);

  if (updateError) {
    console.error('❌ [handlePackageCheckout] Erro ao adicionar créditos extras:', updateError);
    throw updateError;
  }

  console.log(`✅ [handlePackageCheckout] ${packageInfo.credits} créditos extras adicionados! Total: ${newOverageCredits}`);
}

async function handleSubscriptionUpdated(subscription: Record<string, unknown>) {
  console.log('🔄 [handleSubscriptionUpdated] Subscription atualizada:', subscription.id);

  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', subscription.id)
    .single();

  if (!existingSubscription) {
    console.error('❌ [handleSubscriptionUpdated] Assinatura não encontrada no banco de dados');
    return;
  }

  const items = subscription.items as { data: Array<{ price: { id: string } }> } | undefined;
  const priceId = items?.data?.[0]?.price?.id;
  const planType = priceId ? (PRICE_TO_PLAN[priceId] || 'creator') : 'creator';
  const signaturesLimit = PLAN_LIMITS[planType] || 50;

  const updateData = {
    stripe_price_id: priceId,
    plan_type: planType,
    status: subscription.status,
    current_period_start: new Date((subscription.current_period_start as number) * 1000).toISOString(),
    current_period_end: new Date((subscription.current_period_end as number) * 1000).toISOString(),
    trial_start: subscription.trial_start ? new Date((subscription.trial_start as number) * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date((subscription.trial_end as number) * 1000).toISOString() : null,
    canceled_at: subscription.canceled_at ? new Date((subscription.canceled_at as number) * 1000).toISOString() : null,
    ended_at: subscription.ended_at ? new Date((subscription.ended_at as number) * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    signatures_limit: signaturesLimit,
    metadata: subscription.metadata || {},
    updated_at: new Date().toISOString(),
  };

  console.log('💾 [handleSubscriptionUpdated] Atualizando assinatura');

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('❌ [handleSubscriptionUpdated] Erro ao atualizar assinatura:', error);
    throw error;
  }
  console.log('✅ [handleSubscriptionUpdated] Assinatura atualizada com sucesso');
}

async function handleSubscriptionDeleted(subscription: Record<string, unknown>) {
  console.log('🗑️ [handleSubscriptionDeleted] Subscription deletada:', subscription.id);

  const updateData = {
    status: 'canceled',
    ended_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('subscriptions')
    .update(updateData)
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('❌ [handleSubscriptionDeleted] Erro ao deletar assinatura:', error);
    throw error;
  }
  console.log('✅ [handleSubscriptionDeleted] Assinatura marcada como cancelada');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🌐 [serve] Webhook recebido');
  console.log('📋 [serve] Method:', req.method);
  console.log('📋 [serve] URL:', req.url);
  
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('❌ [serve] Assinatura do webhook ausente');
    return new Response('Webhook signature missing', { 
      status: 400,
      headers: corsHeaders 
    });
  }

  console.log('✅ [serve] Signature presente');

  try {
    const body = await req.text();
    console.log('📋 [serve] Body length:', body.length);
    
    console.log('🔐 [serve] Verificando assinatura do webhook...');
    
    if (!verifyStripeSignature(body, signature, webhookSecret)) {
      console.error('❌ [serve] Assinatura inválida');
      return new Response('Invalid signature', { 
        status: 400,
        headers: corsHeaders 
      });
    }

    const event = JSON.parse(body);

    console.log('✅ [serve] Assinatura verificada com sucesso');
    console.log('📨 [serve] Evento recebido:', event.type);
    console.log('📋 [serve] Event ID:', event.id);

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('🎯 [serve] Processando checkout.session.completed');
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        console.log('🎯 [serve] Processando customer.subscription.updated');
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        console.log('🎯 [serve] Processando customer.subscription.deleted');
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'customer.subscription.trial_will_end':
        console.log('⏰ [serve] Trial vai terminar em breve');
        break;

      default:
        console.log('ℹ️ [serve] Evento não tratado:', event.type);
    }

    console.log('✅ [serve] Webhook processado com sucesso');
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('❌ [serve] Erro no webhook:', err);
    console.error('❌ [serve] Stack trace:', err instanceof Error ? err.stack : 'N/A');
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});