import { useState } from 'react';
import { Check, Sparkles, Zap, Crown } from 'lucide-react';
import { createCheckoutSession } from '@/lib/services/stripe-checkout';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface PricingTier {
  id: string;
  name: string;
  price: string;
  priceId: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    id: 'basic',
    name: 'Básico',
    price: 'R$ 29,90',
    priceId: 'price_1Sx55HJbBunj3EyElTWIGj2O',
    description: 'Perfeito para começar',
    icon: <Sparkles className="w-6 h-6" />,
    features: [
      'Até 10 conteúdos assinados',
      'Verificação básica',
      'Suporte por email',
      'Armazenamento de 1GB',
    ],
  },
  {
    id: 'pro',
    name: 'Profissional',
    price: 'R$ 79,90',
    priceId: 'price_pro_monthly',
    description: 'Para criadores sérios',
    icon: <Zap className="w-6 h-6" />,
    popular: true,
    features: [
      'Conteúdos ilimitados',
      'Verificação avançada',
      'Suporte prioritário',
      'Armazenamento de 10GB',
      'Analytics detalhados',
      'API de integração',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'R$ 199,90',
    priceId: 'price_enterprise_monthly',
    description: 'Para grandes organizações',
    icon: <Crown className="w-6 h-6" />,
    features: [
      'Tudo do Profissional',
      'Suporte 24/7',
      'Armazenamento ilimitado',
      'White label',
      'Gerente de conta dedicado',
      'SLA garantido',
      'Treinamento personalizado',
    ],
  },
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string>('');

  const handleSubscribe = async (priceId: string, tierId: string) => {
    try {
      setLoading(tierId);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error('Você precisa estar logado para assinar um plano');
        return;
      }

      const { url } = await createCheckoutSession({
        priceId,
        userId: session.user.id,
        userEmail: session.user.email!,
      });

      window.location.href = url;
    } catch (error) {
      console.error('Erro ao criar sessão de checkout:', error);
      toast.error('Erro ao processar assinatura. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const runDiagnostic = async () => {
    setDiagnosing(true);
    setDiagnosticResult('🔍 Iniciando diagnóstico...\n\n');

    try {
      // Passo 1: Verificar sessão
      setDiagnosticResult(prev => prev + '📋 PASSO 1: Verificando sessão do Supabase...\n');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setDiagnosticResult(prev => prev + `❌ Erro ao obter sessão: ${sessionError.message}\n`);
        return;
      }

      if (!session) {
        setDiagnosticResult(prev => prev + '❌ Usuário não autenticado\n');
        return;
      }

      setDiagnosticResult(prev => prev + 
        `✅ Sessão encontrada!\n` +
        `   👤 User ID: ${session.user.id}\n` +
        `   📧 Email: ${session.user.email}\n` +
        `   🔑 Token: ${session.access_token.substring(0, 50)}...\n` +
        `   📅 Expira em: ${new Date(session.expires_at! * 1000).toLocaleString('pt-BR')}\n\n`
      );

      // Passo 2: Testar Edge Function diretamente
      setDiagnosticResult(prev => prev + '📋 PASSO 2: Testando Edge Function diretamente...\n');

      const testData = {
        priceId: 'price_1Sx55HJbBunj3EyElTWIGj2O',
        userId: session.user.id,
        userEmail: session.user.email,
      };

      setDiagnosticResult(prev => prev + 
        `📤 Enviando requisição:\n` +
        `   URL: ${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session\n` +
        `   Body: ${JSON.stringify(testData, null, 2)}\n\n`
      );

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testData),
        }
      );

      setDiagnosticResult(prev => prev + 
        `📥 Resposta recebida:\n` +
        `   Status: ${response.status} ${response.statusText}\n`
      );

      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (response.ok) {
        setDiagnosticResult(prev => prev + 
          `✅ SUCESSO! Edge Function respondeu corretamente!\n` +
          `   Resposta: ${JSON.stringify(responseData, null, 2)}\n\n` +
          `🎉 DIAGNÓSTICO: A integração está funcionando!\n` +
          `   O erro 401 pode estar em outro lugar.\n`
        );
      } else {
        setDiagnosticResult(prev => prev + 
          `❌ ERRO ${response.status}!\n` +
          `   Resposta: ${JSON.stringify(responseData, null, 2)}\n\n` +
          `🔍 DIAGNÓSTICO:\n`
        );

        if (response.status === 401) {
          setDiagnosticResult(prev => prev + 
            `   ❌ A Edge Function está rejeitando a autenticação\n` +
            `   🔧 Causa provável: Falta validação JWT na Edge Function\n` +
            `   💡 Solução: Adicionar createClient do Supabase na Edge Function\n`
          );
        } else {
          setDiagnosticResult(prev => prev + 
            `   ❌ Erro inesperado: ${response.status}\n` +
            `   📋 Verifique os logs da Edge Function no Supabase Dashboard\n`
          );
        }
      }

      // Passo 3: Verificar variáveis de ambiente
      setDiagnosticResult(prev => prev + 
        `\n📋 PASSO 3: Verificando configuração...\n` +
        `   SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado'}\n` +
        `   SUPABASE_ANON_KEY: ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado'}\n`
      );

    } catch (error: any) {
      setDiagnosticResult(prev => prev + 
        `\n❌ ERRO FATAL:\n` +
        `   ${error.message}\n` +
        `   Stack: ${error.stack}\n`
      );
    } finally {
      setDiagnosing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Escolha seu plano
          </h1>
          <p className="text-xl text-gray-600">
            Proteja seu conteúdo digital com a tecnologia blockchain
          </p>
        </div>

        {/* Botão de Diagnóstico */}
        <div className="mb-8 flex justify-center">
          <button
            onClick={runDiagnostic}
            disabled={diagnosing}
            className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {diagnosing ? '🔍 Diagnosticando...' : '🔧 Executar Diagnóstico de Autenticação'}
          </button>
        </div>

        {/* Resultado do Diagnóstico */}
        {diagnosticResult && (
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="bg-gray-900 text-green-400 p-6 rounded-lg shadow-xl font-mono text-sm overflow-x-auto">
              <pre className="whitespace-pre-wrap">{diagnosticResult}</pre>
            </div>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                tier.popular ? 'ring-2 ring-purple-500' : ''
              }`}
            >
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  Mais Popular
                </div>
              )}

              <div className="p-8">
                {/* Icon */}
                <div className="inline-flex p-3 bg-gradient-to-br from-purple-100 to-blue-100 rounded-xl mb-4">
                  {tier.icon}
                </div>

                {/* Title & Price */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {tier.name}
                </h3>
                <p className="text-gray-600 mb-4">{tier.description}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">
                    {tier.price}
                  </span>
                  <span className="text-gray-600">/mês</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(tier.priceId, tier.id)}
                  disabled={loading === tier.id}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                    tier.popular
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === tier.id ? 'Processando...' : 'Assinar agora'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold cursor-pointer">
                Como funciona a assinatura?
              </summary>
              <p className="mt-2 text-gray-600">
                Após escolher seu plano, você será redirecionado para o checkout
                seguro do Stripe. Sua assinatura será ativada imediatamente após
                o pagamento.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold cursor-pointer">
                Posso cancelar a qualquer momento?
              </summary>
              <p className="mt-2 text-gray-600">
                Sim! Você pode cancelar sua assinatura a qualquer momento sem
                multas. Você continuará tendo acesso até o fim do período pago.
              </p>
            </details>
            <details className="bg-white rounded-lg shadow p-6">
              <summary className="font-semibold cursor-pointer">
                Quais formas de pagamento são aceitas?
              </summary>
              <p className="mt-2 text-gray-600">
                Aceitamos cartões de crédito e débito através do Stripe, uma das
                plataformas de pagamento mais seguras do mundo.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}