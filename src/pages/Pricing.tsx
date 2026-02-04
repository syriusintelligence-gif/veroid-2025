import { useState } from 'react';
import { Check, Zap, Crown, Sparkles, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Plan {
  id: string;
  name: string;
  priceId: string;
  price: string;
  description: string;
  validations: string;
  icon: React.ReactNode;
  popular?: boolean;
  type: 'subscription' | 'one-time';
}

const subscriptionPlans: Plan[] = [
  {
    id: 'vero-id-free',
    name: 'Vero iD Free',
    priceId: 'price_1Sx4uCJbBunj3EyEXSFIlqlV',
    price: 'R$ 0',
    description: 'Ideal para começar',
    validations: '10 validações únicas',
    icon: <Zap className="h-6 w-6" />,
    type: 'subscription'
  },
  {
    id: 'vero-id-creator',
    name: 'Vero iD Creator',
    priceId: 'price_1Sx55HJbBunj3EyElTWIGj2O',
    price: 'R$ 29,90',
    description: 'Para criadores de conteúdo',
    validations: '50 validações/mês',
    icon: <Sparkles className="h-6 w-6" />,
    type: 'subscription'
  },
  {
    id: 'vero-id-creator-pro',
    name: 'Vero iD Creator Pro',
    priceId: 'price_1Sx58MJbBunj3EyEQn1MNT5x',
    price: 'R$ 79,90',
    description: 'Para profissionais',
    validations: '150 validações/mês',
    icon: <Crown className="h-6 w-6" />,
    popular: true,
    type: 'subscription'
  },
  {
    id: 'vero-id-creator-elite',
    name: 'Vero iD Creator Elite',
    priceId: 'price_1Sx5GCJbBunj3EyEyfGjJRGH',
    price: 'R$ 139,90',
    description: 'Para empresas',
    validations: '350 validações/mês',
    icon: <Crown className="h-6 w-6 text-yellow-500" />,
    type: 'subscription'
  }
];

const oneTimePlans: Plan[] = [
  {
    id: 'pacote-10',
    name: 'Pacote 10',
    priceId: 'price_1Sx5PdJbBunj3EyE09582RVh',
    price: 'R$ 9,90',
    description: 'Pagamento único',
    validations: '10 validações únicas',
    icon: <Zap className="h-6 w-6" />,
    type: 'one-time'
  },
  {
    id: 'pacote-20',
    name: 'Pacote 20',
    priceId: 'price_1Sx5RhJbBunj3EyEmPAR5EQA',
    price: 'R$ 19,90',
    description: 'Pagamento único',
    validations: '20 validações únicas',
    icon: <Sparkles className="h-6 w-6" />,
    type: 'one-time'
  },
  {
    id: 'pacote-50',
    name: 'Pacote 50',
    priceId: 'price_1Sx5UUJbBunj3EyE0VQdHSMe',
    price: 'R$ 49,90',
    description: 'Pagamento único',
    validations: '50 validações únicas',
    icon: <Crown className="h-6 w-6" />,
    type: 'one-time'
  }
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubscribe = async (plan: Plan) => {
    console.log('📦 Plano selecionado:', { id: plan.id, priceId: plan.priceId });

    if (!user) {
      navigate('/login', { state: { from: '/pricing' } });
      return;
    }

    // Plano Free não precisa de checkout
    if (plan.id === 'vero-id-free') {
      try {
        setLoading(plan.id);
        
        // Ativar plano Free diretamente no banco
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
            current_period_end: null, // Free plan não expira
            cancel_at_period_end: false
          });

        if (error) throw error;

        alert('✅ Plano Free ativado com sucesso!');
        navigate('/dashboard');
      } catch (error) {
        console.error('❌ Erro ao ativar plano Free:', error);
        alert('Erro ao ativar plano Free. Tente novamente.');
      } finally {
        setLoading(null);
      }
      return;
    }

    try {
      setLoading(plan.id);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          priceId: plan.priceId,
          planId: plan.id,
          planName: plan.name,
          mode: plan.type === 'subscription' ? 'subscription' : 'payment'
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
      alert('Erro ao processar assinatura. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vero iD
            </span>
          </div>
          <nav className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/login')}>
              Entrar
            </Button>
            <Button onClick={() => navigate('/cadastro')}>
              Cadastro
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-20">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h1 className="text-5xl font-bold mb-4">
            Escolha o Plano Ideal para Você
          </h1>
          <p className="text-xl text-muted-foreground">
            Planos flexíveis para todas as necessidades
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-8">
            Planos Mensais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {subscriptionPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative hover:shadow-lg transition-all ${
                  plan.popular
                    ? 'border-2 border-blue-500 shadow-xl scale-105'
                    : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Mais Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">{plan.icon}</div>
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    {plan.id !== 'vero-id-free' && (
                      <span className="text-gray-600">/mês</span>
                    )}
                  </div>
                  <p className="text-sm text-blue-600 font-semibold mt-2">
                    {plan.validations}
                  </p>
                </CardHeader>
                <CardFooter>
                  <Button
                    className="w-full border-2"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Processando...' : 'Assinar Agora'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* One-Time Plans */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-4">
            Pacotes Avulsos
          </h2>
          <p className="text-center text-muted-foreground mb-8 text-lg">
            Compre validações únicas sem compromisso mensal
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {oneTimePlans.map((plan) => (
              <Card key={plan.id} className="border border-gray-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">{plan.icon}</div>
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                  </div>
                  <p className="text-sm text-purple-600 font-semibold mt-2">
                    {plan.validations}
                  </p>
                </CardHeader>
                <CardFooter>
                  <Button
                    className="w-full border-2"
                    variant="outline"
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? 'Processando...' : 'Comprar Agora'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ or Additional Info */}
        <div className="mt-20 text-center">
          <p className="text-muted-foreground text-lg">
            Tem dúvidas? Entre em contato com nosso{' '}
            <a href="/support" className="text-blue-600 hover:underline font-semibold">
              suporte
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/50 py-8 mt-20">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Vero iD - Sistema de Autenticação Digital</p>
          <p className="text-sm mt-2">Combatendo desinformação através de criptografia</p>
        </div>
      </footer>
    </div>
  );
}