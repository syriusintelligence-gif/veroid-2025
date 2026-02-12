import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Calendar, TrendingUp, Settings } from 'lucide-react';
import {
  useSubscription,
  getPlanName,
  getStatusColor,
  getStatusLabel,
  formatDate,
  getDaysUntilRenewal,
} from '@/hooks/useSubscription';

export const SubscriptionCard = () => {
  const { subscription, loading } = useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Minha Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Minha Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Você ainda não possui uma assinatura ativa.
          </p>
          <Link to="/pricing">
            <Button className="w-full">
              <TrendingUp className="mr-2 h-4 w-4" />
              Ver Planos Disponíveis
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const daysUntilRenewal = getDaysUntilRenewal(subscription.current_period_end);
  const usagePercentage = (subscription.signatures_used / subscription.signatures_limit) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Minha Assinatura
          </div>
          <Badge className={getStatusColor(subscription.status)}>
            {getStatusLabel(subscription.status)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Name */}
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {getPlanName(subscription.plan_type)}
          </p>
          <p className="text-sm text-gray-500">Plano atual</p>
        </div>

        {/* Renewal Date */}
        {subscription.status === 'active' && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              Renova em {formatDate(subscription.current_period_end)}
              {daysUntilRenewal > 0 && (
                <span className="text-gray-400 ml-1">
                  ({daysUntilRenewal} {daysUntilRenewal === 1 ? 'dia' : 'dias'})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Usage Stats */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Autenticações usadas</span>
            <span className="font-medium">
              {subscription.signatures_used} / {subscription.signatures_limit}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                usagePercentage >= 90
                  ? 'bg-red-500'
                  : usagePercentage >= 70
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <Link to="/settings?tab=subscription">
          <Button variant="outline" className="w-full">
            <Settings className="mr-2 h-4 w-4" />
            Gerenciar Assinatura
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
};