/**
 * Pricing Page
 * 
 * Displays all available pricing plans organized by type:
 * - Subscription Plans (monthly recurring)
 * - Overage Packages (one-time purchases)
 */

import { useState } from 'react';
import { PricingCard } from '@/components/PricingCard';
import { getSubscriptionPlans, getPackagePlans } from '@/config/plans';
import { Plan } from '@/types/stripe';

export default function Pricing() {
  const [isLoading, setIsLoading] = useState(false);
  
  const subscriptionPlans = getSubscriptionPlans();
  const overagePackages = getPackagePlans();

  const handleSubscribe = async (plan: Plan) => {
    setIsLoading(true);
    
    try {
      // TODO: Implement Stripe Checkout redirect
      console.log('Subscribe to plan:', plan);
      
      // Placeholder for Stripe Checkout integration
      alert(`Redirecionando para checkout do plano: ${plan.name}`);
      
    } catch (error) {
      console.error('Error subscribing:', error);
      alert('Erro ao processar assinatura. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Escolha o Plano Ideal para Você
          </h1>
          <p className="text-lg text-muted-foreground">
            Proteja seu conteúdo com autenticações verificadas. 
            Escolha um plano mensal ou compre pacotes avulsos conforme sua necessidade.
          </p>
        </div>

        {/* Subscription Plans Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Planos Mensais</h2>
            <p className="text-muted-foreground">
              Assinatura recorrente com autenticações mensais
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {subscriptionPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                onSubscribe={handleSubscribe}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>

        {/* Overage Packages Section */}
        <div>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Pacotes Avulsos</h2>
            <p className="text-muted-foreground">
              Compre autenticações extras quando precisar (válido por 30 dias)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {overagePackages.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                onSubscribe={handleSubscribe}
                isLoading={isLoading}
              />
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-6">
            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-2">
                O que são autenticações de conteúdo?
              </h3>
              <p className="text-sm text-muted-foreground">
                Cada autenticação permite verificar a originalidade de um conteúdo digital, 
                garantindo sua procedência e autenticidade.
              </p>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-2">
                Como funcionam os pacotes avulsos?
              </h3>
              <p className="text-sm text-muted-foreground">
                Os pacotes avulsos são compras únicas de autenticações extras que podem ser 
                usadas junto com qualquer plano mensal. Eles têm validade de 30 dias após a compra.
              </p>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-2">
                Posso cancelar minha assinatura a qualquer momento?
              </h3>
              <p className="text-sm text-muted-foreground">
                Sim, você pode cancelar sua assinatura a qualquer momento. 
                O plano permanecerá ativo até o final do período pago.
              </p>
            </div>

            <div className="border border-border rounded-lg p-6">
              <h3 className="font-semibold mb-2">
                O que acontece se eu exceder meu limite mensal?
              </h3>
              <p className="text-sm text-muted-foreground">
                Você pode comprar pacotes avulsos para adicionar mais autenticações ao seu plano atual. 
                Alternativamente, você pode fazer upgrade para um plano maior.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}