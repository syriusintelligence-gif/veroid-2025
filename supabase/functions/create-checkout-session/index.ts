import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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
    // 1. Validate JWT token and get user info
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client to validate token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Invalid token:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.email);

    // 2. Get request body
    const { priceId, planId, planName, mode } = await req.json();

    if (!priceId) {
      console.error('❌ Missing priceId');
      return new Response(
        JSON.stringify({ error: 'priceId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📦 Creating checkout session:', {
      priceId,
      planId,
      planName,
      mode,
      userId: user.id,
      userEmail: user.email
    });

    // 3. Initialize Stripe using fetch API directly
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('❌ STRIPE_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Create Stripe Checkout Session using fetch API
    const origin = req.headers.get('origin') || 'https://veroid.com.br';
    
    const checkoutData = new URLSearchParams({
      'customer_email': user.email || '',
      'client_reference_id': user.id,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'mode': mode || 'subscription',
      'allow_promotion_codes': 'true',
      'success_url': `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&price_id=${priceId}`,
      'cancel_url': `${origin}/payment/cancel`,
      'metadata[userId]': user.id,
      'metadata[userEmail]': user.email || '',
      'metadata[planId]': planId || '',
      'metadata[planName]': planName || '',
      'metadata[priceId]': priceId,
    });

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: checkoutData.toString(),
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error('❌ Stripe API error:', session);
      return new Response(
        JSON.stringify({ error: session.error?.message || 'Failed to create checkout session' }),
        { status: stripeResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Checkout session created:', session.id);
    console.log('📋 Success URL:', session.success_url);

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create checkout session',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});