import { useState, useEffect } from 'react';
import { Check, Shield, AlertCircle, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase-auth-v2';
import type { User } from '@/lib/supabase-auth-v2';
import { useNavigate } from 'react-router-dom';

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
    priceId: 'price_1T4gcAJc1p4mhrHNwOvzI8D8',
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
    priceId: 'price_1T4gijJc1p4mhrHNW3h3Ajzl',
    price: 'R$ 329,90',
    pricePerMonth: '/mês',
    description: 'Plano intermediário com 150 autenticações mensais',
    validations: '150 autenticações de conteúdo por mês',
    type: 'subscription'
  },
  {
    id: 'creator-elite',
    name: 'Vero iD Creator Elite',
    priceId: 'price_1T4gmTJc1p4mhrHNuHS9xGN2',
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
    priceId: 'price_1T4grUJc1p4mhrHNFJAl6Y4T',
    price: 'R$ 69,90',
    description: 'Pacote intermediário - compra única',
    validations: '20 autenticações avulsas (válido por 30 dias)',
    popular: true,
    type: 'one-time'
  },
  {
    id: 'package-50',
    name: 'Vero iD Pacote 50',
    priceId: 'price_1T4gu0Jc1p4mhrHNg8LhOIrJ',
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
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      
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

  const handleSubscribe = async (plan: Plan) => {
    console.log('📦 Plano selecionado:', { id: plan.id, priceId: plan.priceId });
    setError(null);

    // Verificar se o usuário está logado
    if (!user) {
      console.log('⚠️ Usuário não autenticado, redirecionando para login...');
      navigate('/login-v2', { state: { from: '/pricing', plan: plan.id } });
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
    } catch (error) {
      console.error('❌ Erro ao processar assinatura:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao processar assinatura. Tente novamente.';
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

  // Filtrar planos para exibição (remover Free da lista principal)
  const displaySubscriptionPlans = subscriptionPlans.filter(plan => plan.id !== 'free');

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
            {displaySubscriptionPlans.map((plan) => (
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
                      plan.popular
                        ? 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500'
                        : 'border-slate-600 text-white hover:bg-slate-700'
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Processando...' : user ? 'Assinar Agora' : 'Fazer Login'}
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
      </div>
    </div>
  );
}