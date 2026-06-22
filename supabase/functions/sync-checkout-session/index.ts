import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// =====================================================================
// sync-checkout-session
//
// Função usada como FALLBACK SÍNCRONO pelo Dashboard quando o usuário
// volta do Stripe Checkout (URL contém `?session_id=cs_xxx`) e o webhook
// `checkout.session.completed` ainda não chegou (ou falhou).
//
// Comportamento:
//   1. Recebe `sessionId` (cs_xxx) do frontend autenticado.
//   2. Busca a Checkout Session direto na Stripe API.
//   3. Valida que ela pertence ao usuário autenticado (metadata.user_id).
//   4. Se a session estiver `complete` e tiver uma subscription anexada,
//      busca os dados da subscription no Stripe e ESPELHA na tabela
//      `subscriptions` do Supabase — mas APENAS quando a row local
//      ainda estiver "vazia" (sem stripe_subscription_id) ou
//      pertencer ao mesmo stripe_subscription_id (idempotente).
//
// Idempotência: se o webhook já populou a row, esta função NÃO sobrescreve.
// Isso garante que rodar a função múltiplas vezes / em paralelo com o
// webhook nunca corrompe os dados.
//
// IMPORTANTE: esta função NÃO substitui o webhook. Ela é uma "rede de
// segurança" para o usuário não ficar preso em TRIAL no dashboard quando
// o webhook atrasa ou falha. O webhook continua sendo a fonte de verdade
// principal.
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')!;

// Mesmas tabelas de mapeamento usadas pelo webhook (manter sincronizado!)
const PRICE_TO_PLAN: Record<string, string> = {
  'price_1T4gcAJc1p4mhrHNwOvzI8D8': 'creator',
  'price_1T4gijJc1p4mhrHNW3h3Ajzl': 'creator_pro',
  'price_1T4gmTJc1p4mhrHNuHS9xGN2': 'creator_elite',
  'price_1T9AunJc1p4mhrHNQ3rfZhLa': 'creator',
  'price_1T9AvvJc1p4mhrHNJkTRLWcU': 'creator_pro',
  'price_1T9Ax3Jc1p4mhrHNriVXetzj': 'creator_elite',
};

const PLAN_LIMITS: Record<string, number> = {
  trial: 10,
  creator: 50,
  creator_pro: 150,
  creator_elite: 350,
};

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =====================================================================
// Helpers para compatibilidade com mudanças na API do Stripe
// (current_period_start/end migrou para items.data[i] em versões novas).
// =====================================================================
function getSubscriptionPeriodStart(subscription: Record<string, unknown>): number | null {
  const root = subscription.current_period_start as number | undefined | null;
  if (typeof root === 'number' && Number.isFinite(root)) return root;
  const items = subscription.items as { data?: Array<Record<string, unknown>> } | undefined;
  const fromItem = items?.data?.[0]?.current_period_start as number | undefined | null;
  if (typeof fromItem === 'number' && Number.isFinite(fromItem)) return fromItem;
  return null;
}

function getSubscriptionPeriodEnd(subscription: Record<string, unknown>): number | null {
  const root = subscription.current_period_end as number | undefined | null;
  if (typeof root === 'number' && Number.isFinite(root)) return root;
  const items = subscription.items as { data?: Array<Record<string, unknown>> } | undefined;
  const fromItem = items?.data?.[0]?.current_period_end as number | undefined | null;
  if (typeof fromItem === 'number' && Number.isFinite(fromItem)) return fromItem;
  return null;
}

function unixToIsoOrNull(ts: number | null | undefined): string | null {
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null;
  return new Date(ts * 1000).toISOString();
}

async function stripeGet(endpoint: string): Promise<Response> {
  return await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.log('🔄 [sync-checkout-session] Iniciando...');

  try {
    // 1) Autenticação obrigatória
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ [sync-checkout-session] Missing authorization header');
      return jsonResponse({ error: 'Missing authorization header' }, 401);
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return jsonResponse({ error: 'Empty bearer token' }, 401);
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      console.error('❌ [sync-checkout-session] User not authenticated:', userError?.message);
      return jsonResponse({ error: 'User not authenticated' }, 401);
    }

    console.log('✅ [sync-checkout-session] User autenticado:', user.id, user.email);

    // 2) Parse body
    let body: { sessionId?: string };
    try {
      body = await req.json();
    } catch (_e) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const sessionId = body.sessionId;
    if (!sessionId || typeof sessionId !== 'string') {
      return jsonResponse({ error: 'sessionId é obrigatório' }, 400);
    }

    // Sanity check no formato (cs_live_... ou cs_test_...)
    if (!sessionId.startsWith('cs_')) {
      return jsonResponse({ error: 'sessionId inválido' }, 400);
    }

    console.log('🔍 [sync-checkout-session] Buscando session no Stripe:', sessionId);

    // 3) Buscar a Checkout Session no Stripe
    const sessionResp = await stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (!sessionResp.ok) {
      const errTxt = await sessionResp.text();
      console.error('❌ [sync-checkout-session] Erro ao buscar session:', errTxt);
      return jsonResponse(
        { error: 'Falha ao buscar checkout session no Stripe', details: errTxt },
        400,
      );
    }

    const session = await sessionResp.json();
    console.log('📋 [sync-checkout-session] Session status:', session.status,
      '| payment_status:', session.payment_status,
      '| mode:', session.mode);

    // 4) Validar dono da session (segurança crítica: impede usuário X
    //    sincronizar checkout de outro usuário Y).
    const sessionMetadata = (session.metadata || {}) as Record<string, string>;
    const sessionUserId = sessionMetadata.user_id;
    if (sessionUserId && sessionUserId !== user.id) {
      console.error('❌ [sync-checkout-session] Session pertence a outro usuário:',
        sessionUserId, '!=', user.id);
      return jsonResponse({ error: 'Esta sessão não pertence ao usuário autenticado' }, 403);
    }

    // 5) Verificar se a session está completa e paga
    if (session.status !== 'complete') {
      console.log('ℹ️ [sync-checkout-session] Session ainda não completa, status:', session.status);
      return jsonResponse({
        ok: false,
        status: 'pending',
        sessionStatus: session.status,
        message: 'Checkout ainda não foi concluído',
      }, 200);
    }

    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      console.log('ℹ️ [sync-checkout-session] Pagamento ainda não confirmado:', session.payment_status);
      return jsonResponse({
        ok: false,
        status: 'pending_payment',
        paymentStatus: session.payment_status,
        message: 'Pagamento ainda não confirmado',
      }, 200);
    }

    // 6) Suporte apenas para mode=subscription nesta versão.
    //    Pacotes avulsos (mode=payment) já são tratados via webhook em
    //    handlePackageCheckout — não duplicamos aqui para não correr risco
    //    de adicionar créditos em duplicidade.
    if (session.mode !== 'subscription') {
      console.log('ℹ️ [sync-checkout-session] Mode != subscription, deixando para o webhook:', session.mode);
      return jsonResponse({
        ok: true,
        skipped: true,
        reason: 'mode_not_subscription',
        mode: session.mode,
      }, 200);
    }

    const stripeSubscriptionId = session.subscription as string | undefined;
    if (!stripeSubscriptionId) {
      console.error('❌ [sync-checkout-session] Session sem subscription anexada');
      return jsonResponse({ error: 'Subscription não encontrada na session' }, 400);
    }

    // 7) Buscar detalhes da subscription no Stripe
    console.log('🔍 [sync-checkout-session] Buscando subscription no Stripe:', stripeSubscriptionId);
    const subResp = await stripeGet(`/subscriptions/${encodeURIComponent(stripeSubscriptionId)}`);
    if (!subResp.ok) {
      const errTxt = await subResp.text();
      console.error('❌ [sync-checkout-session] Erro ao buscar subscription:', errTxt);
      return jsonResponse(
        { error: 'Falha ao buscar subscription no Stripe', details: errTxt },
        400,
      );
    }

    const stripeSubscription = await subResp.json();

    // Item / price (com fallbacks de segurança)
    const items = (stripeSubscription.items as { data?: Array<Record<string, unknown>> } | undefined)?.data;
    const firstItem = items && items[0] ? (items[0] as Record<string, unknown>) : undefined;
    const priceObj = firstItem?.price as { id?: string } | undefined;
    const priceId = priceObj?.id || '';
    const planType = PRICE_TO_PLAN[priceId] || 'creator';
    const signaturesLimit = PLAN_LIMITS[planType] || 50;

    const periodStartUnix = getSubscriptionPeriodStart(stripeSubscription);
    const periodEndUnix = getSubscriptionPeriodEnd(stripeSubscription);

    console.log('📋 [sync-checkout-session] Plano resolvido:', {
      priceId, planType, signaturesLimit,
      periodStart: unixToIsoOrNull(periodStartUnix),
      periodEnd: unixToIsoOrNull(periodEndUnix),
    });

    // 8) Buscar a row existente no banco para decidir se atualiza
    //    (idempotência: não sobrescreve dados que o webhook já gravou).
    const { data: existingRows, error: fetchErr } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (fetchErr) {
      console.error('❌ [sync-checkout-session] Erro ao buscar row local:', fetchErr.message);
      return jsonResponse({ error: 'Falha ao buscar assinatura local' }, 500);
    }

    // Procurar uma row que JÁ corresponda a esta subscription (idempotência forte)
    const matchingRow = (existingRows || []).find(
      (r) => r.stripe_subscription_id === stripeSubscriptionId,
    );

    if (matchingRow) {
      console.log('✅ [sync-checkout-session] Row já existe para esta subscription — webhook já processou. Nada a fazer.');
      return jsonResponse({
        ok: true,
        synced: false,
        alreadyPersisted: true,
        subscriptionId: matchingRow.id,
        planType: matchingRow.plan_type,
        status: matchingRow.status,
      }, 200);
    }

    // Procurar a row "trial" / vazia desta conta (o caso que queremos consertar)
    const trialRow = (existingRows || []).find(
      (r) => !r.stripe_subscription_id && (r.plan_type === 'trial' || !r.plan_type),
    );

    // Preservar metadata interno (package_purchases, etc.) caso exista
    const existingMetadata = (trialRow?.metadata as Record<string, unknown>) || {};

    const subscriptionData = {
      user_id: user.id,
      stripe_customer_id: stripeSubscription.customer as string,
      stripe_subscription_id: stripeSubscriptionId,
      stripe_price_id: priceId,
      plan_type: planType,
      status: stripeSubscription.status,
      current_period_start: unixToIsoOrNull(periodStartUnix),
      current_period_end: unixToIsoOrNull(periodEndUnix),
      trial_start: stripeSubscription.trial_start
        ? new Date((stripeSubscription.trial_start as number) * 1000).toISOString()
        : null,
      trial_end: stripeSubscription.trial_end
        ? new Date((stripeSubscription.trial_end as number) * 1000).toISOString()
        : null,
      canceled_at: stripeSubscription.canceled_at
        ? new Date((stripeSubscription.canceled_at as number) * 1000).toISOString()
        : null,
      ended_at: stripeSubscription.ended_at
        ? new Date((stripeSubscription.ended_at as number) * 1000).toISOString()
        : null,
      cancel_at_period_end: stripeSubscription.cancel_at_period_end || false,
      // Mantém contadores existentes da row trial (geralmente 0/limite do trial)
      signatures_used: (trialRow?.signatures_used as number) ?? 0,
      signatures_limit: signaturesLimit,
      overage_signatures_available: (trialRow?.overage_signatures_available as number) ?? 0,
      metadata: existingMetadata,
      updated_at: new Date().toISOString(),
    };

    if (trialRow) {
      console.log('🔄 [sync-checkout-session] Atualizando row trial existente:', trialRow.id);
      const { error: updErr } = await supabaseAdmin
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', trialRow.id);

      if (updErr) {
        console.error('❌ [sync-checkout-session] Erro ao atualizar row:', updErr.message);
        return jsonResponse({ error: 'Falha ao atualizar assinatura', details: updErr.message }, 500);
      }
    } else {
      console.log('➕ [sync-checkout-session] Criando nova row de assinatura');
      const { error: insErr } = await supabaseAdmin
        .from('subscriptions')
        .insert({
          ...subscriptionData,
          created_at: new Date().toISOString(),
        });

      if (insErr) {
        console.error('❌ [sync-checkout-session] Erro ao inserir row:', insErr.message);
        return jsonResponse({ error: 'Falha ao criar assinatura', details: insErr.message }, 500);
      }
    }

    console.log('✅ [sync-checkout-session] Sincronização concluída com sucesso');

    return jsonResponse({
      ok: true,
      synced: true,
      planType,
      status: stripeSubscription.status,
      stripeSubscriptionId,
      currentPeriodEnd: unixToIsoOrNull(periodEndUnix),
    }, 200);
  } catch (error) {
    console.error('❌ [sync-checkout-session] Erro inesperado:', error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      500,
    );
  }
});