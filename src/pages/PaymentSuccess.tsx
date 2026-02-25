import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getCurrentUser } from '@/lib/supabase-auth-v2';
import type { User } from '@/lib/supabase-auth-v2';
import { supabase } from '@/lib/supabase';

// 🆕 Mapeamento de Price IDs para PLANOS DE ASSINATURA - PRODUÇÃO
const PRICE_TO_PLAN: Record<string, { plan_type: string; signatures_limit: number; name: string }> = {
  // Planos de assinatura - PRODUÇÃO
  'price_1T4gcAJc1p4mhrHNwOvzI8D8': { plan_type: 'creator', signatures_limit: 50, name: 'Creator' },
  'price_1T4gijJc1p4mhrHNW3h3Ajzl': { plan_type: 'creator_pro', signatures_limit: 150, name: 'Creator Pro' },
  'price_1T4gmTJc1p4mhrHNuHS9xGN2': { plan_type: 'creator_elite', signatures_limit: 350, name: 'Creator Elite' },
};

// Mapeamento de Price IDs para PACOTES AVULSOS - PRODUÇÃO
const PRICE_TO_PACKAGE: Record<string, { credits: number; name: string }> = {
  'price_1T4gpIJc1p4mhrHNJL1tt3UY': { credits: 10, name: 'Pacote 10' },
  'price_1T4grUJc1p4mhrHNFJAl6Y4T': { credits: 20, name: 'Pacote 20' },
  'price_1T4gu0Jc1p4mhrHNg8LhOIrJ': { credits: 50, name: 'Pacote 50' },
};

interface SubscriptionMetadata {
  last_package_purchase?: {
    package_name: string;
    credits_added: number;
    purchase_date: string;
    expiration_date: string;
    stripe_session_id: string;
    stripe_price_id: string;
    processed_by: string;
  };
  [key: string]: unknown;
}

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [creditsAdded, setCreditsAdded] = useState<number | null>(null);
  const [planActivated, setPlanActivated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const sessionId = searchParams.get('session_id');
  const priceId = searchParams.get('price_id');

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      // Se houver sessionId e priceId, processar compra
      if (currentUser && sessionId && priceId) {
        await processPayment(currentUser.id, sessionId, priceId);
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
      setError('Erro ao verificar usuário. Por favor, contate o suporte.');
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  }

  async function processPayment(userId: string, sessionId: string, priceId: string) {
    console.log('🔍 [PaymentSuccess] Processando pagamento...');
    console.log('📋 [PaymentSuccess] userId:', userId);
    console.log('📋 [PaymentSuccess] sessionId:', sessionId);
    console.log('📋 [PaymentSuccess] priceId:', priceId);

    setProcessing(true);

    try {
      // 🆕 1. Verificar se é um PLANO DE ASSINATURA
      const planInfo = PRICE_TO_PLAN[priceId];
      if (planInfo) {
        console.log(`📋 [PaymentSuccess] Plano identificado: ${planInfo.name}`);
        await activateSubscriptionPlan(userId, sessionId, priceId, planInfo);
        return;
      }

      // 2. Verificar se é um PACOTE AVULSO
      const packageInfo = PRICE_TO_PACKAGE[priceId];
      if (packageInfo) {
        console.log(`📦 [PaymentSuccess] Pacote identificado: ${packageInfo.name}`);
        await processPackagePurchase(userId, sessionId, priceId, packageInfo);
        return;
      }

      // 3. Se não for nem plano nem pacote
      console.log('⚠️ [PaymentSuccess] Price ID não reconhecido');
      console.log('ℹ️ [PaymentSuccess] Planos disponíveis:', Object.keys(PRICE_TO_PLAN));
      console.log('ℹ️ [PaymentSuccess] Pacotes disponíveis:', Object.keys(PRICE_TO_PACKAGE));
      
    } catch (error) {
      console.error('❌ [PaymentSuccess] Erro ao processar pagamento:', error);
      setError('Erro ao processar pagamento. Por favor, contate o suporte.');
    } finally {
      setProcessing(false);
    }
  }

  // 🆕 Função para ativar plano de assinatura
  async function activateSubscriptionPlan(
    userId: string, 
    sessionId: string, 
    priceId: string, 
    planInfo: { plan_type: string; signatures_limit: number; name: string }
  ) {
    console.log(`🎯 [PaymentSuccess] Ativando plano ${planInfo.name}...`);

    try {
      // 1. Buscar assinatura existente
      const { data: existingSubscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1); // 30 dias

      if (existingSubscription) {
        // Atualizar assinatura existente
        console.log('📝 [PaymentSuccess] Atualizando assinatura existente...');
        
        const { error: updateError } = await supabase
          .from('subscriptions')
          .update({
            plan_type: planInfo.plan_type,
            signatures_limit: planInfo.signatures_limit,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            stripe_price_id: priceId,
            updated_at: now.toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('❌ [PaymentSuccess] Erro ao atualizar assinatura:', updateError);
          setError('Erro ao ativar plano. Por favor, contate o suporte.');
          return;
        }
      } else {
        // Criar nova assinatura
        console.log('✨ [PaymentSuccess] Criando nova assinatura...');
        
        const { error: insertError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_type: planInfo.plan_type,
            signatures_limit: planInfo.signatures_limit,
            signatures_used: 0,
            overage_signatures_available: 0,
            status: 'active',
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            stripe_price_id: priceId,
            metadata: {
              activated_by: 'payment_success_fallback',
              activation_date: now.toISOString(),
              stripe_session_id: sessionId,
            },
          });

        if (insertError) {
          console.error('❌ [PaymentSuccess] Erro ao criar assinatura:', insertError);
          setError('Erro ao ativar plano. Por favor, contate o suporte.');
          return;
        }
      }

      console.log(`✅ [PaymentSuccess] Plano ${planInfo.name} ativado com sucesso!`);
      setPlanActivated(planInfo.name);

    } catch (error) {
      console.error('❌ [PaymentSuccess] Erro ao ativar plano:', error);
      setError('Erro ao ativar plano. Por favor, contate o suporte.');
    }
  }

  // Função para processar pacote avulso (já existente, mantida)
  async function processPackagePurchase(
    userId: string, 
    sessionId: string, 
    priceId: string,
    packageInfo: { credits: number; name: string }
  ) {
    console.log(`📦 [PaymentSuccess] Processando pacote ${packageInfo.name}...`);

    try {
      // Buscar assinatura do usuário
      const { data: subscription, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError || !subscription) {
        console.error('❌ [PaymentSuccess] Assinatura não encontrada:', fetchError);
        setError('Assinatura não encontrada. Por favor, contate o suporte.');
        return;
      }

      console.log('✅ [PaymentSuccess] Assinatura encontrada:', subscription.id);

      // Verificar idempotência
      const metadata = (subscription.metadata as SubscriptionMetadata) || {};
      const lastPurchase = metadata.last_package_purchase;
      
      if (lastPurchase && lastPurchase.stripe_session_id === sessionId) {
        console.log('⚠️ [PaymentSuccess] Compra já processada anteriormente');
        setCreditsAdded(packageInfo.credits);
        return;
      }

      // Adicionar créditos extras
      const currentOverage = subscription.overage_signatures_available || 0;
      const newOverage = currentOverage + packageInfo.credits;
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      const updateData = {
        overage_signatures_available: newOverage,
        metadata: {
          ...metadata,
          last_package_purchase: {
            package_name: packageInfo.name,
            credits_added: packageInfo.credits,
            purchase_date: new Date().toISOString(),
            expiration_date: expirationDate.toISOString(),
            stripe_session_id: sessionId,
            stripe_price_id: priceId,
            processed_by: 'payment_success_fallback',
          },
        },
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ [PaymentSuccess] Erro ao adicionar créditos:', updateError);
        setError('Erro ao adicionar créditos. Por favor, contate o suporte.');
        return;
      }

      console.log(`✅ [PaymentSuccess] ${packageInfo.credits} créditos adicionados com sucesso!`);
      setCreditsAdded(packageInfo.credits);

    } catch (error) {
      console.error('❌ [PaymentSuccess] Erro ao processar pacote:', error);
      setError('Erro ao processar pacote. Por favor, contate o suporte.');
    }
  }

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login-v2');
    }
  }, [loading, user, navigate]);

  if (loading || processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
            <p className="text-white text-lg">
              {processing ? 'Processando seu pagamento...' : 'Carregando...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="h-8 w-8 text-cyan-400" />
            <span className="text-2xl font-bold text-white">
              Vero iD
            </span>
          </div>
          <nav className="flex gap-3">
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-2xl bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/20 p-4 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-400" />
              </div>
            </div>
            <CardTitle className="text-3xl text-white mb-2">
              Pagamento Realizado com Sucesso! 🎉
            </CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              {planActivated 
                ? `Seu plano ${planActivated} foi ativado e você já pode começar a usar todos os recursos!`
                : creditsAdded 
                ? `${creditsAdded} créditos foram adicionados à sua conta e você já pode começar a usá-los!`
                : 'Sua compra foi processada com sucesso!'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Alerta de sucesso para planos */}
            {planActivated && (
              <Alert className="bg-blue-500/10 border-blue-500/50">
                <CheckCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-300">
                  <strong>Plano Ativado!</strong> Seu plano {planActivated} está ativo e pronto para uso.
                </AlertDescription>
              </Alert>
            )}

            {/* Alerta de sucesso para pacotes */}
            {creditsAdded && (
              <Alert className="bg-green-500/10 border-green-500/50">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  <strong>Pacote Ativado!</strong> Você recebeu {creditsAdded} autenticações extras válidas por 30 dias.
                </AlertDescription>
              </Alert>
            )}

            {/* Alerta de erro */}
            {error && (
              <Alert className="bg-red-500/10 border-red-500/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  <strong>Atenção:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {sessionId && (
              <div className="bg-slate-700/30 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">ID da Transação:</p>
                <p className="text-white font-mono text-sm break-all">{sessionId}</p>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-white font-semibold text-lg">Próximos Passos:</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Acesse seu Dashboard para ver os detalhes da sua assinatura</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Comece a autenticar seu conteúdo imediatamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Você receberá um email de confirmação em breve</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={() => navigate('/dashboard')}
              >
                Ir para o Dashboard
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                onClick={() => navigate('/')}
              >
                Voltar para Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}