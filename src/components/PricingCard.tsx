/**
 * PricingCard Component
 * 
 * Displays a single pricing plan with its features and call-to-action button.
 * Supports both subscription plans and overage packages.
 */

import { Plan, PlanType } from '@/types/stripe';
import { formatPrice } from '@/config/plans';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PricingCardProps {
  plan: Plan;
  onSubscribe?: (plan: Plan) => void;
  isLoading?: boolean;
}

export function PricingCard({ plan, onSubscribe, isLoading = false }: PricingCardProps) {
  const isSubscription = plan.type === PlanType.SUBSCRIPTION || plan.type === PlanType.FREE;
  const isFree = plan.type === PlanType.FREE;
  const isPopular = plan.popular;

  const handleSubscribe = () => {
    if (onSubscribe) {
      onSubscribe(plan);
    }
  };

  return (
    <Card 
      className={`relative flex flex-col bg-slate-900/50 backdrop-blur-sm border-slate-700/50 ${
        isPopular 
          ? 'border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20 scale-105' 
          : 'border border-slate-700/50'
      }`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-1 text-sm font-semibold shadow-lg">
            Mais Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4 pt-6">
        {/* Plan Name */}
        <CardTitle className="text-2xl font-bold text-white">{plan.name}</CardTitle>
        
        {/* Plan Description */}
        <CardDescription className="text-sm mt-2 text-gray-400">
          {plan.description}
        </CardDescription>

        {/* Price */}
        <div className="mt-6">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold tracking-tight text-white">
              {formatPrice(plan.price)}
            </span>
            {isSubscription && !isFree && (
              <span className="text-gray-400 text-sm">/mês</span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Features List */}
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          className={`w-full ${
            isPopular 
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30' 
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
          }`}
          size="lg"
          onClick={handleSubscribe}
          disabled={isLoading || isFree}
        >
          {isFree ? 'Plano Atual' : isSubscription ? 'Assinar Agora' : 'Comprar Pacote'}
        </Button>
      </CardFooter>
    </Card>
  );
}