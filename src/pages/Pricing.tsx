import { useState, useEffect } from 'react';
import { Check, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  priceId: string;
  price: string;
  pricePerMonth?: string;
  description: string;
  validations: string;
  popular?: boolean;
  type: 'subscription' | 'one-time';
}

const subscriptionPlans: Plan[] = [
  {
    id: 'vero-id-free',
    name: 'Vero iD Free',
    priceId: 'price_1Sx4uCJbBunj3EyEXSFIlqlV',
    price: 'Grátis',
    description: 'Plano gratuito para começar',
    validations: '10 autenticações de conteúdo por mês',
    type: 'subscription'
  },
  {
    id: 'vero-id-creator',
    name: 'Vero iD Creator',
    priceId: 'price_1Sx54aJbBunj3EyEF078nMOQ',
    price: 'R$ 29,90',
    pricePerMonth: '/mês',
    description: 'Ideal para criadores de conteúdo',
    validations: '50 autenticações de conteúdo por mês',
    type: 'subscription'
  },
  {
    id: 'vero-id-creator-pro',
    name: 'Vero iD Creator Pro',
    priceId: 'price_1Sx57WJbBunj3EyEqWqlhhiV',
    price: 'R$ 79,90',
    pricePerMonth: '/mês',
    description: 'Para profissionais que precisam de mais',
    validations: '150 autenticações de conteúdo por mês',
    popular: true,
    type: 'subscription'
  },
  {
    id: 'vero-id-creator-elite',
    name: 'Vero iD Creator Elite',
    priceId: 'price_1Sx5FPJbBunj3EyE26tqLogH',
    price: 'R$ 139,90',
    pricePerMonth: '/mês',
    description: 'O melhor para empresas e influencers',
    validations: '350 autenticações de conteúdo por mês',
    type: 'subscription'
  }
];

const oneTimePlans: Plan[] = [
  {
    id: 'pacote-10',
    name: 'Pacote 10',
    priceId: 'price_1Sx5OqJbBunj3EyEQQt7S0Pu',
    price: 'R$ 9,90',
    description: 'Compra única',
    validations: '10 autenticações únicas',
    type: 'one-time'
  },
  {
    id: 'pacote-20',
    name: 'Pacote 20',
    priceId: 'price_1Sx5ROJbBunj3EyECeFX4XRT',
    price: 'R$ 19,90',
    description: 'Compra única',
    validations: '20 autenticações únicas',
    popular: true,
    type: 'one-time'
  },
  {
    id: 'pacote-50',
    name: 'Pacote 50',
    priceId: 'price_1Sx5UEJbBunj3EyEBTZfHZGs',
    price: 'R$ 49,90',
    description: 'Compra única',
    validations: '50 autenticações únicas',
    type: 'one-time'
  }
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Debug: Log session info
    console.log('🔍 Session info:', {
      hasUser: !!user,
      hasSession: !!session,
      userId: user?.id,
      hasAccessToken: !!session?.access_token
    });
  }, [user, session]);

  const handleSubscribe = async (plan: Plan) => {
    console.log('📦 Plano selecionado:', { id: plan.id, priceId: plan.priceId });
    setError(null);

    // Verificar se o usuário está logado
    if (!user || !session) {
      console.log('⚠️ Usuário não autenticado, redirecionando para login...');
      navigate('/login-v2', { state: { from: '/pricing', plan: plan.id } });
      return;
    }

    // Plano Free não precisa de checkout
    if (plan.id === 'vero-id-free') {
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

      // Verificar se temos um token de acesso válido
      if (!session.access_token) {
        throw new Error('Token de acesso não encontrado. Por favor, faça login novamente.');
      }

      console.log('🔐 Token obtido, chamando Edge Function...');
      console.log('📊 Session access_token (primeiros 20 chars):', session.access_token.substring(0, 20));

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
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar assinatura:', error);
      const errorMessage = error.message || 'Erro ao processar assinatura. Tente novamente.';
      setError(errorMessage);
      
      // Se for erro de autenticação, redirecionar para login
      if (errorMessage.includes('autenticação') || errorMessage.includes('token')) {
        setTimeout(() => {
          navigate('/login-v2', { state: { from: '/pricing', plan: plan.id } });
        }, 2000);
      }
    } finally {
      setLoading(null);
    }
  };

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
            {user ? (
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => navigate('/dashboard')}>
                Dashboard
              </Button>
            ) : (
              <>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => navigate('/login-v2')}>
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
          
          {!user && (
            <Alert className="mt-6 max-w-2xl mx-auto bg-blue-900/50 border-blue-500/50">
              <AlertCircle className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200">
                Faça login para assinar um plano ou comprar pacotes
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mt-6 max-w-2xl mx-auto bg-red-900/50 border-red-500/50">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {subscriptionPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:border-cyan-500/50 transition-all ${
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
                <CardContent className="pb-6">
                  <div className="flex items-start gap-2 text-gray-300">
                    <Check className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{plan.validations}</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className={`w-full border-2 ${
                      plan.id === 'vero-id-free'
                        ? 'border-slate-600 text-white hover:bg-slate-700'
                        : plan.popular
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500'
                        : 'border-slate-600 text-white hover:bg-slate-700'
                    }`}
                    variant={plan.id === 'vero-id-free' ? 'outline' : plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Processando...' : plan.id === 'vero-id-free' ? 'Plano Atual' : user ? 'Assinar Agora' : 'Fazer Login'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
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
                className={`relative bg-slate-800/50 border-slate-700/50 backdrop-blur-sm hover:border-cyan-500/50 transition-all ${
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
                <CardContent className="pb-6">
                  <div className="flex items-start gap-2 text-gray-300">
                    <Check className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{plan.validations}</span>
                  </div>
                </CardContent>
                <CardFooter>
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
      </div>
    </div>
  );
}