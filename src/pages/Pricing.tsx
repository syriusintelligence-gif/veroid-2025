import { useState, useEffect } from 'react';
import { Check, Shield, AlertCircle, Gift, Building2, ArrowRight, CreditCard, Lock, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase-auth';
import type { User } from '@/lib/supabase-auth';
import { useNavigate } from 'react-router-dom';
import { UpgradeConfirmDialog } from '@/components/UpgradeConfirmDialog';

interface Plan {
  id: string;
  name: string;
  priceId: string;
  price: string;
  originalPrice?: string;
  pricePerMonth?: string;
  description: string;
  validations: string;
  popular?: boolean;
  type: 'subscription' | 'one-time';
}

// Planos de assinatura mensal recorrente
const subscriptionPlans: Plan[] = [
  {
    id: 'free',
    name: 'Vero iD Free',
    priceId: '',
    price: 'Grátis',
    description: '10 assinaturas únicas para teste',
    validations: '10 autenticações únicas (primeiro cadastro)',
    type: 'subscription'
  },
  {
    id: 'creator',
    name: 'Vero iD Creator',
    priceId: 'price_1T9AunJc1p4mhrHNQ3rfZhLa',
    price: 'R$ 129,90',
    pricePerMonth: '/mês',
    description: 'Plano básico com 50 autenticações mensais',
    validations: '50 autenticações de conteúdo por mês',
    popular: true,
    type: 'subscription'
  },
  {
    id: 'creator-pro',
    name: 'Vero iD Creator Pro',
    priceId: 'price_1T9AvvJc1p4mhrHNJkTRLWcU',
    price: 'R$ 329,90',
    pricePerMonth: '/mês',
    description: 'Plano intermediário com 150 autenticações mensais',
    validations: '150 autenticações de conteúdo por mês',
    type: 'subscription'
  },
  {
    id: 'creator-elite',
    name: 'Vero iD Creator Elite',
    priceId: 'price_1T9Ax3Jc1p4mhrHNriVXetzj',
    price: 'R$ 589,90',
    pricePerMonth: '/mês',
    description: 'Plano premium com 350 autenticações mensais',
    validations: '350 autenticações de conteúdo por mês',
    type: 'subscription'
  }
];

// Pacotes avulsos - compra única com validade de 30 dias
const oneTimePlans: Plan[] = [
  {
    id: 'package-10',
    name: 'Vero iD Pacote 10',
    priceId: 'price_1T9AqmJc1p4mhrHNAA8QJKlc',
    price: 'R$ 39,90',
    description: 'Pacote básico - compra única',
    validations: '10 autenticações avulsas (válido por 30 dias)',
    type: 'one-time'
  },
  {
    id: 'package-20',
    name: 'Vero iD Pacote 20',
    priceId: 'price_1T9AruJc1p4mhrHNjnzpniQM',
    price: 'R$ 69,90',
    description: 'Pacote intermediário - compra única',
    validations: '20 autenticações avulsas (válido por 30 dias)',
    popular: true,
    type: 'one-time'
  },
  {
    id: 'package-50',
    name: 'Vero iD Pacote 50',
    priceId: 'price_1T9AtJJc1p4mhrHNqXqdOCoh',
    price: 'R$ 159,90',
    description: 'Pacote premium - compra única',
    validations: '50 autenticações avulsas (válido por 30 dias)',
    type: 'one-time'
  }
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<{
    status: string;
    stripe_subscription_id: string;
    stripe_price_id: string;
  } | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown> | null>(null);
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // 🆕 Tipo de processamento para customizar o overlay de loading
  const [processingType, setProcessingType] = useState<'checkout' | 'upgrade' | null>(null);
  const [processingPlanName, setProcessingPlanName] = useState<string>('');
  const [processingStep, setProcessingStep] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        // Buscar TODAS assinaturas ativas do usuário (pode haver múltiplas)
        const { data: subscriptions, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        if (subError) {
          console.error('❌ [Pricing] Erro ao buscar subscriptions:', subError);
        }
        
        console.log('🔍 [Pricing] All active subscriptions:', subscriptions);
        
        // Filtrar apenas subscriptions mensais (não pacotes avulsos)
        // Identificamos por plan_type que não seja de pacote avulso (package-*)
        const activeMonthlySubscription = subscriptions?.find(sub => 
          sub.plan_type && 
          typeof sub.plan_type === 'string' &&
          !sub.plan_type.startsWith('package-') // Exclui pacotes avulsos (package-10, package-20, package-50)
        );
        
        if (activeMonthlySubscription) {
          console.log('✅ [Pricing] Active monthly subscription found:', {
            id: activeMonthlySubscription.id,
            stripe_subscription_id: activeMonthlySubscription.stripe_subscription_id,
            stripe_price_id: activeMonthlySubscription.stripe_price_id,
            status: activeMonthlySubscription.status
          });
          
          setCurrentSubscription({
            status: activeMonthlySubscription.status,
            stripe_subscription_id: activeMonthlySubscription.stripe_subscription_id,
            stripe_price_id: activeMonthlySubscription.stripe_price_id
          });
        } else {
          console.log('ℹ️ [Pricing] No active monthly subscription found');
          setCurrentSubscription(null);
        }
      }
      
      // Debug: Log session info
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔍 Session info:', {
        hasUser: !!currentUser,
        hasSession: !!session,
        userId: currentUser?.id,
        hasAccessToken: !!session?.access_token
      });
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    }
  }

  const handleConfirmUpgrade = async () => {
    if (!pendingPlan || !user) return;

    try {
      setLoading(pendingPlan.id);
      setIsProcessing(true);
      setProcessingType('upgrade');
      setProcessingPlanName(pendingPlan.name);
      setProcessingStep(1);
      setShowUpgradeDialog(false);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado');
      }

      setProcessingStep(2);
      console.log('🔐 [Pricing] Confirmando mudança de plano...');

      const { data, error } = await supabase.functions.invoke('update-subscription', {
        body: { newPriceId: pendingPlan.priceId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        console.error('❌ [Pricing] Erro ao atualizar assinatura:', error);
        throw error;
      }

      console.log('✅ [Pricing] Assinatura atualizada com sucesso:', data);

      // 🆕 Traduzir mensagem de sucesso para português
      let successMessage = data.message || 'Plano atualizado com sucesso!';
      
      // Tradução das mensagens mais comuns do backend
      const translations: Record<string, string> = {
        'Subscription upgraded successfully': 'Upgrade realizado com sucesso',
        'Subscription downgraded successfully': 'Downgrade realizado com sucesso',
        'Plan changed successfully': 'Plano alterado com sucesso',
        'Subscription updated successfully': 'Assinatura atualizada com sucesso',
        'Upgrade completed': 'Upgrade concluído',
        'Downgrade completed': 'Downgrade concluído'
      };

      // Aplicar tradução se houver correspondência
      for (const [english, portuguese] of Object.entries(translations)) {
        if (successMessage.includes(english)) {
          successMessage = successMessage.replace(english, portuguese);
        }
      }

      setProcessingStep(3);
      // Pequena pausa para o usuário ver a etapa final concluída antes do alert
      await new Promise((resolve) => setTimeout(resolve, 800));

      alert(`✅ ${successMessage}`);

      await checkUser();
      navigate('/dashboard');
    } catch (error) {
      console.error('❌ Erro ao confirmar mudança:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar plano. Tente novamente.';
      setError(errorMessage);
    } finally {
      setLoading(null);
      setIsProcessing(false);
      setProcessingType(null);
      setProcessingPlanName('');
      setProcessingStep(0);
      setPendingPlan(null);
      setPreviewData(null);
    }
  };

  const handleSubscribe = async (plan: Plan) => {
    console.log('📦 Plano selecionado:', { id: plan.id, priceId: plan.priceId });
    setError(null);

    // Verificar se o usuário está logado
    if (!user) {
      console.log('⚠️ Usuário não autenticado, redirecionando para login...');
      navigate('/login', { state: { from: '/pricing', plan: plan.id } });
      return;
    }

    // 🆕 VERIFICAÇÃO: Bloquear clique no plano atual (redundância de segurança)
    const isCurrentPlan = currentSubscription?.stripe_price_id === plan.priceId;
    if (isCurrentPlan) {
      console.log('⚠️ [Pricing] Usuário tentou clicar no plano atual - bloqueando ação');
      setError('Você já está inscrito neste plano.');
      return;
    }

    // Plano Free não precisa de checkout
    if (plan.id === 'free') {
      try {
        setLoading(plan.id);
        
        const { error } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            plan_id: plan.id,
            plan_name: plan.name,
            status: 'active',
            validations_limit: 10,
            validations_used: 0,
            stripe_price_id: plan.priceId,
            current_period_start: new Date().toISOString(),
            current_period_end: null,
            cancel_at_period_end: false
          });

        if (error) throw error;

        alert('✅ Plano Free ativado com sucesso!');
        navigate('/dashboard');
      } catch (error) {
        console.error('❌ Erro ao ativar plano Free:', error);
        setError('Erro ao ativar plano Free. Tente novamente.');
      } finally {
        setLoading(null);
      }
      return;
    }

    try {
      setLoading(plan.id);

      // Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession();

      // Verificar se temos um token de acesso válido
      if (!session?.access_token) {
        throw new Error('Token de acesso não encontrado. Por favor, faça login novamente.');
      }

      // 🆕 CORREÇÃO CRÍTICA: Verificar se é upgrade/downgrade de plano existente
      const isSubscriptionPlan = plan.type === 'subscription';
      
      // SEMPRE BUSCAR ASSINATURA ATIVA EM TEMPO REAL ANTES DE PROCESSAR
      console.log('🔍 [Pricing] Buscando assinatura ativa em tempo real ANTES de processar...');
      
      // 🔑 USAR SERVICE ROLE para garantir acesso completo aos dados
      const { data: activeSubscriptions, error: fetchError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error('❌ [Pricing] Erro ao buscar subscriptions:', fetchError);
        // Não bloquear o fluxo, mas logar o erro
      }
      
      console.log('📊 [Pricing] Total active subscriptions:', activeSubscriptions?.length || 0);
      console.log('📋 [Pricing] All active subscriptions:', activeSubscriptions);
      
      // Filtrar subscriptions mensais (plan_type NÃO começa com 'package-')
      const monthlySubscriptions = activeSubscriptions?.filter(sub => 
        sub.plan_type && 
        typeof sub.plan_type === 'string' &&
        !sub.plan_type.startsWith('package-') // Ignora pacotes avulsos (package-10, package-20, package-50)
      ) || [];
      
      console.log('📊 [Pricing] Monthly subscriptions found:', monthlySubscriptions.length);
      console.log('📋 [Pricing] Monthly subscriptions details:', monthlySubscriptions);
      
      // Se houver múltiplas subscriptions mensais, usar a mais recente
      const activeMonthlySubscription = monthlySubscriptions.length > 0 ? monthlySubscriptions[0] : null;
      
      const hasActiveSubscription = !!activeMonthlySubscription;
      
      console.log('🔍 [Pricing] Subscription detection result:', {
        hasActiveSubscription,
        subscriptionId: activeMonthlySubscription?.stripe_subscription_id,
        currentPriceId: activeMonthlySubscription?.stripe_price_id,
        currentPlanType: activeMonthlySubscription?.plan_type,
        targetPriceId: plan.priceId,
        targetPlanId: plan.id,
        isSubscriptionPlan
      });

      // 🚨 DECISÃO CRÍTICA: Se é plano mensal E tem subscription ativa = SEMPRE UPDATE
      if (isSubscriptionPlan && hasActiveSubscription) {
        console.log('🔄 [Pricing] ⚠️ DETECTADO UPGRADE/DOWNGRADE DE PLANO ⚠️');
        console.log('📋 [Pricing] Plano atual (Price ID):', activeMonthlySubscription.stripe_price_id);
        console.log('📋 [Pricing] Novo plano (Price ID):', plan.priceId);
        console.log('📋 [Pricing] Subscription ID no Stripe:', activeMonthlySubscription.stripe_subscription_id);

        // Verificar se é o mesmo plano (evitar update desnecessário)
        if (activeMonthlySubscription.stripe_price_id === plan.priceId) {
          console.log('⚠️ [Pricing] Usuário já está no plano selecionado');
          setError('Você já está inscrito neste plano.');
          setLoading(null);
          return;
        }

        // 🆕 BUSCAR PREVIEW ANTES DE CONFIRMAR
        console.log('🔍 [Pricing] Buscando preview da mudança de plano...');
        
        const { data: preview, error: previewError } = await supabase.functions.invoke('preview-upgrade', {
          body: { newPriceId: plan.priceId },
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (previewError) {
          console.error('❌ [Pricing] Erro ao buscar preview:', previewError);
          throw previewError;
        }

        console.log('✅ [Pricing] Preview recebido:', preview);

        // Transformar dados do preview para o formato esperado pelo dialog
        const formattedPreview = {
          isUpgrade: preview.isUpgrade,
          isDowngrade: preview.isDowngrade,
          currentPlan: preview.currentPlan,
          newPlan: preview.newPlan,
          prorationAmount: preview.prorationAmount || 0,
          daysRemaining: preview.daysRemaining || 0,
          message: preview.message || ''
        };

        console.log('✅ [Pricing] Preview formatado:', formattedPreview);

        // Salvar dados e mostrar dialog de confirmação
        setPreviewData(formattedPreview);
        setPendingPlan(plan);
        setShowUpgradeDialog(true);
        setLoading(null);
        return;
      }

      console.log('➡️ [Pricing] Criando nova checkout session (primeira assinatura ou pacote avulso)');
      console.log('📋 [Pricing] Motivo:', !isSubscriptionPlan ? 'É pacote avulso' : 'Não tem assinatura ativa');

      // 🆕 Ativar overlay visual de checkout
      setIsProcessing(true);
      setProcessingType('checkout');
      setProcessingPlanName(plan.name);
      setProcessingStep(1);

      // Se não tem assinatura ativa OU é pacote avulso = CRIAR NOVA CHECKOUT SESSION
      console.log('🔐 Token obtido, chamando Edge Function...');
      console.log('📊 Session access_token (primeiros 20 chars):', session.access_token.substring(0, 20));

      setProcessingStep(2);

      // Chamar a Edge Function com o token de autenticação
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: plan.priceId,
          planId: plan.id,
          planName: plan.name,
          mode: plan.type === 'subscription' ? 'subscription' : 'payment'
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('❌ Erro ao criar sessão de checkout:', error);
        throw error;
      }

      if (data?.url) {
        console.log('✅ Redirecionando para checkout:', data.url);
        setProcessingStep(3);
        // Pequena pausa para o usuário ver a etapa final concluída antes do redirect
        await new Promise((resolve) => setTimeout(resolve, 800));
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error) {
      console.error('❌ Erro ao processar assinatura:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar assinatura. Tente novamente.';
      setError(errorMessage);
      
      // 🆕 Resetar overlay em caso de erro
      setIsProcessing(false);
      setProcessingType(null);
      setProcessingPlanName('');
      setProcessingStep(0);
      
      // Se for erro de autenticação, redirecionar para login
      if (errorMessage.includes('autenticação') || errorMessage.includes('token')) {
        setTimeout(() => {
          navigate('/login', { state: { from: '/pricing', plan: plan.id } });
        }, 2000);
      }
    } finally {
      setLoading(null);
    }
  };

  // Filtrar planos para exibição (remover Free da lista principal)
  const displaySubscriptionPlans = subscriptionPlans.filter(plan => plan.id !== 'free');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative">
      {/* 🆕 Loading Overlay - Visual moderno com etapas */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-300">
          {/* Fundo com gradiente e blur */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-950/95 to-slate-900/95 backdrop-blur-md" />

          {/* Partículas decorativas animadas */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          {/* Card principal */}
          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-3xl p-8 md:p-10 shadow-2xl border border-cyan-500/30 max-w-md w-full mx-4 animate-in zoom-in-95 duration-500">
            {/* Borda gradiente animada */}
            <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-3xl opacity-50 blur-sm animate-pulse" />
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 md:p-10">

              {/* Ícone central animado com Shield (Vero iD) */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {/* Anéis pulsantes ao redor do ícone */}
                  <div className="absolute inset-0 rounded-full bg-cyan-500/30 animate-ping" />
                  <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-pulse" />

                  {/* Container do ícone */}
                  <div className="relative w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/50">
                    {processingType === 'checkout' ? (
                      <CreditCard className="h-10 w-10 text-white" strokeWidth={2.5} />
                    ) : (
                      <Sparkles className="h-10 w-10 text-white" strokeWidth={2.5} />
                    )}
                  </div>

                  {/* Pequeno escudo Vero iD no canto */}
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center border-2 border-cyan-400">
                    <Shield className="h-4 w-4 text-cyan-400" />
                  </div>
                </div>
              </div>

              {/* Título contextual */}
              <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                {processingType === 'checkout' ? 'Preparando seu Checkout' : 'Atualizando seu Plano'}
              </h3>

              {/* Nome do plano */}
              {processingPlanName && (
                <p className="text-cyan-300 text-center text-sm font-medium mb-1">
                  {processingPlanName}
                </p>
              )}

              {/* Descrição contextual */}
              <p className="text-gray-400 text-center text-sm mb-8">
                {processingType === 'checkout'
                  ? 'Estamos preparando o ambiente seguro de pagamento. Aguarde só um instante...'
                  : 'Estamos confirmando a alteração do seu plano. Aguarde um momento...'}
              </p>

              {/* Etapas do processo */}
              <div className="space-y-3 mb-6">
                {/* Etapa 1 */}
                <div className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
                  processingStep >= 1 ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-slate-700/30 border border-slate-700/50'
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    processingStep > 1 ? 'bg-green-500' : processingStep === 1 ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}>
                    {processingStep > 1 ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : processingStep === 1 ? (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    ) : (
                      <Lock className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${processingStep >= 1 ? 'text-white' : 'text-slate-500'}`}>
                    Validando autenticação
                  </span>
                </div>

                {/* Etapa 2 */}
                <div className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
                  processingStep >= 2 ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-slate-700/30 border border-slate-700/50'
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    processingStep > 2 ? 'bg-green-500' : processingStep === 2 ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}>
                    {processingStep > 2 ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : processingStep === 2 ? (
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${processingStep >= 2 ? 'text-white' : 'text-slate-500'}`}>
                    {processingType === 'checkout' ? 'Criando sessão de pagamento' : 'Processando alteração'}
                  </span>
                </div>

                {/* Etapa 3 */}
                <div className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-500 ${
                  processingStep >= 3 ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-slate-700/30 border border-slate-700/50'
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                    processingStep >= 3 ? 'bg-green-500' : 'bg-slate-700'
                  }`}>
                    {processingStep >= 3 ? (
                      <CheckCircle2 className="h-5 w-5 text-white" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${processingStep >= 3 ? 'text-white' : 'text-slate-500'}`}>
                    {processingType === 'checkout' ? 'Redirecionando ao Stripe' : 'Concluindo'}
                  </span>
                </div>
              </div>

              {/* Barra de progresso animada */}
              <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden mb-4">
                <div
                  className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-full transition-all duration-700 ease-out relative overflow-hidden"
                  style={{ width: `${Math.min((processingStep / 3) * 100, 100)}%` }}
                >
                  {/* Efeito shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                </div>
              </div>

              {/* Aviso de segurança */}
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Lock className="h-3 w-3" />
                <span>Conexão segura e criptografada</span>
              </div>

              {/* Aviso para não fechar */}
              <p className="text-center text-xs text-slate-500 mt-4 italic">
                Por favor, não feche esta janela
              </p>
            </div>
          </div>
        </div>
      )}

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
            {user ? (
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => navigate('/login')}>
                  Entrar
                </Button>
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => navigate('/cadastro')}>
                  Cadastro
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Escolha o Plano Ideal para Você
          </h1>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            Proteja seu conteúdo com autenticações verificadas. Escolha um plano mensal ou compre pacotes avulsos conforme sua necessidade.
          </p>
          
          {/* Aviso sobre plano Free para novos usuários */}
          <Alert className="mt-6 max-w-2xl mx-auto bg-green-900/50 border-green-500/50">
            <Gift className="h-4 w-4 text-green-400" />
            <AlertDescription className="text-green-200">
              <strong>Novos usuários:</strong> Ao criar sua conta, você recebe <strong>10 autenticações gratuitas</strong> para testar o produto!
            </AlertDescription>
          </Alert>
          
          {!user && (
            <Alert className="mt-4 max-w-2xl mx-auto bg-blue-900/50 border-blue-500/50">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200">
                Faça login para assinar um plano ou comprar pacotes
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mt-4 max-w-2xl mx-auto bg-red-900/50 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Subscription Plans */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-3">
            Planos Mensais
          </h2>
          <p className="text-center text-gray-400 mb-8">
            Assinatura recorrente com autenticações mensais
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {displaySubscriptionPlans.map((plan) => {
              // Mapeamento de Price IDs antigos -> novos (para detectar plano atual mesmo com ID legado)
              const LEGACY_PRICE_ID_MAP: Record<string, string> = {
                'price_1T4gcAJc1p4mhrHNwOvzI8D8': 'price_1T9AunJc1p4mhrHNQ3rfZhLa', // Creator antigo -> novo
                'price_1T4gijJc1p4mhrHNW3h3Ajzl': 'price_1T9AvvJc1p4mhrHNJkTRLWcU', // Creator Pro antigo -> novo
                'price_1T4gmTJc1p4mhrHNuHS9xGN2': 'price_1T9Ax3Jc1p4mhrHNriVXetzj', // Creator Elite antigo -> novo
              };

              // Resolve o price_id atual considerando o mapeamento legado
              const currentPriceId = currentSubscription?.stripe_price_id || '';
              const normalizedCurrentPriceId = LEGACY_PRICE_ID_MAP[currentPriceId] || currentPriceId;

              // Verificar se este é o plano atual do usuário (ID exato OU equivalente legado)
              const isCurrentPlan =
                currentPriceId === plan.priceId ||
                normalizedCurrentPriceId === plan.priceId;

              return (
              <Card
                key={plan.id}
                className={`relative bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:border-cyan-500/50 transition-all flex flex-col ${
                  isCurrentPlan ? 'border-2 border-green-500 shadow-lg shadow-green-500/20' : 
                  plan.popular ? 'border-2 border-cyan-500 shadow-lg shadow-cyan-500/20' : ''
                }`}
              >
                {/* Badge de Plano Atual tem prioridade sobre Mais Popular */}
                {isCurrentPlan ? (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      ✓ Plano Atual
                    </span>
                  </div>
                ) : plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-cyan-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl text-white mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-400 text-sm mb-4">
                    {plan.description}
                  </CardDescription>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">
                      {plan.price}
                    </span>
                    {plan.pricePerMonth && (
                      <span className="text-gray-400 text-lg">{plan.pricePerMonth}</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pb-6 flex-grow">
                  <div className="flex items-start gap-2 text-gray-300">
                    <Check className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{plan.validations}</span>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button
                    className={`w-full border-2 ${
                      isCurrentPlan
                        ? 'bg-green-600 hover:bg-green-700 text-white border-green-600 cursor-not-allowed opacity-75'
                        : plan.popular
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500'
                        : 'border-slate-600 text-white hover:bg-slate-700'
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id || isCurrentPlan}
                  >
                    {loading === plan.id ? 'Processando...' : 
                     isCurrentPlan ? '✓ Plano Ativo' :
                     user ? 'Assinar Agora' : 'Fazer Login'}
                  </Button>
                </CardFooter>
              </Card>
            );
            })}
          </div>
        </div>

        {/* One-Time Plans */}
        <div>
          <h2 className="text-3xl font-bold text-white text-center mb-3">
            Pacotes Avulsos
          </h2>
          <p className="text-center text-gray-400 mb-8">
            Compre autenticações extras quando precisar (válido por 30 dias)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {oneTimePlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:border-cyan-500/50 transition-all flex flex-col ${
                  plan.popular ? 'border-2 border-cyan-500 shadow-lg shadow-cyan-500/20' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-cyan-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl text-white mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-400 text-sm mb-4">
                    {plan.description}
                  </CardDescription>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-white">
                      {plan.price}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pb-6 flex-grow">
                  <div className="flex items-start gap-2 text-gray-300">
                    <Check className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{plan.validations}</span>
                  </div>
                </CardContent>
                <CardFooter className="mt-auto">
                  <Button
                    className={`w-full border-2 ${
                      plan.popular
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500'
                        : 'border-slate-600 text-white hover:bg-slate-700'
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Processando...' : user ? 'Comprar Agora' : 'Fazer Login'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Informação adicional */}
        <div className="mt-16 text-center">
          <p className="text-gray-400 text-sm">
            Após utilizar suas 10 autenticações gratuitas de primeiro cadastro, 
            você deverá assinar um plano mensal ou adquirir um pacote avulso para continuar autenticando seu conteúdo.
          </p>
        </div>

        {/* CTA para Empresas */}
        <div className="mt-16 max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 p-[2px]">
            <div className="relative bg-slate-900/95 backdrop-blur-xl rounded-2xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                      Precisa de mais volume?
                    </h3>
                    <p className="text-gray-300 text-lg">
                      Planos personalizados para <span className="text-cyan-400 font-semibold">empresas e agências</span> com preços especiais para alto volume.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/empresas')}
                  className="flex-shrink-0 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 group"
                >
                  Falar com Comercial
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Confirmação de Upgrade/Downgrade */}
      <UpgradeConfirmDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        onConfirm={handleConfirmUpgrade}
        previewData={previewData}
        loading={loading !== null}
      />
    </div>
  );
}