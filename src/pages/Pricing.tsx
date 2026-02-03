/**
 * Pricing Page
 * 
 * Displays all available pricing plans organized by type:
 * - Subscription Plans (monthly recurring)
 * - Overage Packages (one-time purchases)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PricingCard } from '@/components/PricingCard';
import { getSubscriptionPlans, getPackagePlans } from '@/config/plans';
import { Plan } from '@/types/stripe';
import { Button } from '@/components/ui/button';
import { Shield, BarChart3 } from 'lucide-react';
import { getCurrentUser, isCurrentUserAdmin } from '@/lib/auth';
import { useEffect } from 'react';

export default function Pricing() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const subscriptionPlans = getSubscriptionPlans();
  const overagePackages = getPackagePlans();

  useEffect(() => {
    const user = getCurrentUser();
    if (user && isCurrentUserAdmin()) {
      setIsAdmin(true);
    }
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Header with Glassmorphism - Same as Index.tsx */}
      <header className="glass-header sticky top-0 z-50 shadow-lg shadow-blue-500/10">
        <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="h-7 w-7 md:h-8 md:w-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
            <span className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Vero iD
            </span>
          </div>
          <nav className="flex gap-2 md:gap-3">
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/dashboard')} 
                className="border-white/20 text-cyan-400 hover:bg-white/10 hover:border-cyan-400/50 hover:text-cyan-300 hover:shadow-lg hover:shadow-cyan-500/20 text-xs md:text-sm px-2 md:px-4 transition-all duration-300"
              >
                <BarChart3 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Admin Dashboard</span>
                <span className="sm:hidden">Admin</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate('/login')} 
              className="border-white/20 bg-white/90 text-slate-900 hover:bg-white hover:border-cyan-400/50 hover:text-slate-950 hover:shadow-lg hover:shadow-white/20 font-semibold text-xs md:text-sm px-3 md:px-4 transition-all duration-300"
            >
              Entrar
            </Button>
            <Button 
              onClick={() => navigate('/cadastro')} 
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-300 text-xs md:text-sm px-3 md:px-4"
            >
              Cadastro
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
            Escolha o Plano Ideal para Você
          </h1>
          <p className="text-lg text-gray-300">
            Proteja seu conteúdo com autenticações verificadas. 
            Escolha um plano mensal ou compre pacotes avulsos conforme sua necessidade.
          </p>
        </div>

        {/* Subscription Plans Section */}
        <div className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2 text-white">Planos Mensais</h2>
            <p className="text-gray-400">
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
            <h2 className="text-3xl font-bold mb-2 text-white">Pacotes Avulsos</h2>
            <p className="text-gray-400">
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
          <h2 className="text-2xl font-bold text-center mb-8 text-white">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-white">
                O que são autenticações de conteúdo?
              </h3>
              <p className="text-sm text-gray-300">
                Cada autenticação permite verificar a originalidade de um conteúdo digital, 
                garantindo sua procedência e autenticidade.
              </p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-white">
                Como funcionam os pacotes avulsos?
              </h3>
              <p className="text-sm text-gray-300">
                Os pacotes avulsos são compras únicas de autenticações extras que podem ser 
                usadas junto com qualquer plano mensal. Eles têm validade de 30 dias após a compra.
              </p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-white">
                Posso cancelar minha assinatura a qualquer momento?
              </h3>
              <p className="text-sm text-gray-300">
                Sim, você pode cancelar sua assinatura a qualquer momento. 
                O plano permanecerá ativo até o final do período pago.
              </p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
              <h3 className="font-semibold mb-2 text-white">
                O que acontece se eu exceder meu limite mensal?
              </h3>
              <p className="text-sm text-gray-300">
                Você pode comprar pacotes avulsos para adicionar mais autenticações ao seu plano atual. 
                Alternativamente, você pode fazer upgrade para um plano maior.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Same as Index.tsx */}
      <footer className="glass-header py-6 md:py-8">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="font-semibold text-white text-sm md:text-base">© {new Date().getFullYear()} Vero iD - Sistema de Autenticação Digital</p>
          <p className="text-xs md:text-sm mt-2">Combatendo desinformação através de criptografia avançada</p>
          <div className="flex justify-center gap-4 mt-4 text-xs md:text-sm">
            <button 
              onClick={() => navigate('/privacy')} 
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-200"
            >
              Política de Privacidade
            </button>
            <span className="text-gray-600">•</span>
            <button 
              onClick={() => navigate('/terms')} 
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-200"
            >
              Termos de Uso
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}