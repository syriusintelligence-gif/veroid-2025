import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Calendar, TrendingUp, Settings, Package, Clock } from 'lucide-react';
import {
  useSubscription,
  getPlanName,
  getStatusColor,
  getStatusLabel,
  formatDate,
  formatDateShort,
  getValidPackages,
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

  // 🆕 Cálculo correto dos créditos
  const signaturesRemaining = Math.max(0, subscription.signatures_limit - subscription.signatures_used);
  const overageAvailable = subscription.overage_signatures_available || 0;
  const totalAvailable = signaturesRemaining + overageAvailable;
  
  // Calcula a porcentagem baseada no total (plano + extras)
  const totalLimit = subscription.signatures_limit + overageAvailable;
  const usagePercentage = totalLimit > 0 ? (subscription.signatures_used / totalLimit) * 100 : 0;

  // ✅ Detecta se a assinatura foi cancelada
  const isCanceled = subscription.cancel_at_period_end === true;

  // 🆕 Obtém pacotes válidos (não expirados e com créditos)
  const validPackages = getValidPackages(subscription.metadata?.package_purchases);
  const hasValidPackages = validPackages.length > 0;

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

        {/* ✅ MODIFICADO: Renewal Date - Mostra "Expira em" se cancelado */}
        {subscription.status === 'active' && (
          <div className="flex items-center gap-2 text-sm">
            {isCanceled ? (
              <Clock className="h-4 w-4 text-red-500" />
            ) : (
              <Calendar className="h-4 w-4 text-gray-400" />
            )}
            <span className={isCanceled ? "text-red-600" : "text-gray-600"}>
              {/* ✅ Texto condicional baseado em cancelamento - apenas data */}
              {isCanceled ? 'Expira em' : 'Renova em'} {formatDate(subscription.current_period_end)}
              {!isCanceled && (
                <span className="text-gray-400 ml-1">
                  ({getDaysUntilRenewal(subscription.current_period_end)} dias)
                </span>
              )}
            </span>
          </div>
        )}

        {/* 🆕 Usage Stats - ATUALIZADO COM CRÉDITOS EXTRAS */}
        <div className="space-y-3">
          {/* Total Disponível - DESTAQUE */}
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm font-semibold text-blue-900">Total Disponível</span>
            <span className="text-2xl font-bold text-blue-600">
              {totalAvailable}
            </span>
          </div>

          {/* Detalhamento */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Autenticações usadas</span>
              <span className="font-medium text-gray-900">
                {subscription.signatures_used}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Restantes do plano</span>
              <span className="font-medium text-gray-900">
                {signaturesRemaining} / {subscription.signatures_limit}
              </span>
            </div>
            
            {/* 🆕 ATUALIZADO: Mostra todos os pacotes válidos com suas datas */}
            {hasValidPackages && (
              <div className="flex flex-col gap-2 p-2 bg-green-50 rounded border border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-green-700 flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    Créditos extras (pacotes)
                  </span>
                  <span className="font-bold text-green-700">
                    +{overageAvailable}
                  </span>
                </div>
                
                {/* 🆕 Lista de pacotes com datas individuais */}
                <div className="space-y-1 mt-1">
                  {validPackages.map((pkg, index) => (
                    <div key={index} className="flex items-center justify-between text-xs text-green-600 bg-green-100/50 rounded px-2 py-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {pkg.package_name}: {pkg.credits_remaining} créditos
                      </span>
                      <span className="font-medium">
                        até {formatDateShort(pkg.expiration_date)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Progress Bar */}
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