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
      className={`relative flex flex-col ${
        isPopular 
          ? 'border-2 border-primary shadow-lg scale-105' 
          : 'border border-border'
      }`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-semibold">
            Mais Popular
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-4">
        {/* Plan Name */}
        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
        
        {/* Plan Description */}
        <CardDescription className="text-sm mt-2">
          {plan.description}
        </CardDescription>

        {/* Price */}
        <div className="mt-6">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold tracking-tight">
              {formatPrice(plan.price)}
            </span>
            {isSubscription && !isFree && (
              <span className="text-muted-foreground text-sm">/mês</span>
            )}
          </div>
          
          {/* Authentications Count */}
          {plan.maxProfiles && (
            <p className="text-sm text-muted-foreground mt-2">
              {plan.maxProfiles} autenticações{isSubscription ? ' por mês' : ''}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Features List */}
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="pt-4">
        <Button
          className="w-full"
          size="lg"
          variant={isPopular ? 'default' : 'outline'}
          onClick={handleSubscribe}
          disabled={isLoading || isFree}
        >
          {isFree ? 'Plano Atual' : isSubscription ? 'Assinar Agora' : 'Comprar Pacote'}
        </Button>
      </CardFooter>
    </Card>
  );
}