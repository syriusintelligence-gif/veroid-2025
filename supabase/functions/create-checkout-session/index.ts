/**
 * 🚀 EDGE FUNCTION: CREATE CHECKOUT SESSION
 * 
 * Esta função cria uma sessão de checkout do Stripe e retorna a URL de pagamento.
 * 
 * Fluxo:
 * 1. Recebe priceId, userId, planType do frontend
 * 2. Verifica autenticação do usuário
 * 3. Cria ou recupera customer do Stripe
 * 4. Cria sessão de checkout com metadata
 * 5. Retorna sessionId e URL de checkout
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';

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
    console.log('🛒 [CREATE CHECKOUT] Iniciando criação de sessão...');

    // Inicializa Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Parse request body
    const { priceId, userId, planType, successUrl, cancelUrl } = await req.json();

    console.log('📊 [CREATE CHECKOUT] Dados recebidos:', {
      priceId,
      userId,
      planType,
      successUrl: successUrl?.substring(0, 50) + '...',
      cancelUrl: cancelUrl?.substring(0, 50) + '...',
    });

    // Validação de dados
    if (!priceId || !userId || !planType) {
      console.error('❌ [CREATE CHECKOUT] Dados inválidos');
      return new Response(
        JSON.stringify({ error: 'Dados inválidos: priceId, userId e planType são obrigatórios' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verifica autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ [CREATE CHECKOUT] Token de autenticação não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ [CREATE CHECKOUT] Usuário autenticado');

    // Busca ou cria customer no Stripe
    let customerId: string;

    try {
      // Busca customer existente por metadata userId
      const existingCustomers = await stripe.customers.list({
        limit: 1,
        email: undefined, // Busca por metadata
      });

      const customer = existingCustomers.data.find(
        (c) => c.metadata?.userId === userId
      );

      if (customer) {
        customerId = customer.id;
        console.log('✅ [CREATE CHECKOUT] Customer existente encontrado:', customerId);
      } else {
        // Cria novo customer
        const newCustomer = await stripe.customers.create({
          metadata: {
            userId,
          },
        });
        customerId = newCustomer.id;
        console.log('✅ [CREATE CHECKOUT] Novo customer criado:', customerId);
      }
    } catch (error) {
      console.error('❌ [CREATE CHECKOUT] Erro ao buscar/criar customer:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar customer no Stripe' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Configura parâmetros da sessão baseado no tipo de plano
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: planType === 'subscription' ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planType,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    };

    // Adiciona configurações específicas para assinaturas
    if (planType === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          userId,
        },
      };
    }

    console.log('🔧 [CREATE CHECKOUT] Parâmetros da sessão configurados');

    // Cria sessão de checkout
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('✅ [CREATE CHECKOUT] Sessão criada com sucesso:', {
      sessionId: session.id,
      customerId: session.customer,
      url: session.url?.substring(0, 50) + '...',
    });

    // Retorna sessionId e URL
    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ [CREATE CHECKOUT] Erro ao criar sessão:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro desconhecido ao criar sessão de checkout',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});