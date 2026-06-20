import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Calendar, TrendingUp, Settings, Package, Clock, ChevronDown, ChevronUp, ArrowDownCircle } from 'lucide-react';
import {
  useSubscription,
  getPlanName,
  getStatusColor,
  getStatusLabel,
  formatDate,
  formatDateShort,
  getValidPackages,
  getDaysUntilRenewal,
  getScheduledDowngradeInfo,
} from '@/hooks/useSubscription';

export const SubscriptionCard = () => {
  const { subscription, loading } = useSubscription();
  const [isExpanded, setIsExpanded] = useState(false);

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-2 border-purple-500 bg-gradient-to-br from-purple-50 via-white to-purple-100">
        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-purple-900">
                Minha Assinatura
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 pt-0">
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
      <Card className="relative overflow-hidden border-2 border-purple-500 bg-gradient-to-br from-purple-50 via-white to-purple-100 hover:shadow-2xl hover:shadow-purple-200 hover:border-purple-600 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full -translate-y-16 translate-x-16" />
        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-purple-900">
                Minha Assinatura
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative z-10 pt-0 space-y-4">
          <p className="text-sm text-gray-600">
            Você ainda não possui uma assinatura ativa.
          </p>
          <Link to="/pricing">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-lg">
              <TrendingUp className="mr-2 h-4 w-4" />
              Ver Planos Disponíveis
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // ✅ CORREÇÃO: Calcular créditos APENAS de pacotes válidos (não expirados)
  const signaturesRemaining = Math.max(0, subscription.signatures_limit - subscription.signatures_used);
  
  // 🆕 Obtém pacotes válidos (não expirados e com créditos)
  const validPackages = getValidPackages(subscription.metadata?.package_purchases);
  const hasValidPackages = validPackages.length > 0;
  
  // ✅ CORREÇÃO CRÍTICA: Usar soma dos créditos dos pacotes VÁLIDOS em vez de overage_signatures_available
  const overageAvailable = validPackages.reduce((sum, pkg) => sum + pkg.credits_remaining, 0);
  const totalAvailable = signaturesRemaining + overageAvailable;
  
  // Calcula a porcentagem baseada no total (plano + extras válidos)
  const totalLimit = subscription.signatures_limit + overageAvailable;
  const usagePercentage = totalLimit > 0 ? (subscription.signatures_used / totalLimit) * 100 : 0;

  // ✅ Detecta se a assinatura foi cancelada
  const isCanceled = subscription.cancel_at_period_end === true;

  // 🆕 Detecta se há um downgrade agendado (e ainda não executado)
  const scheduledDowngrade = getScheduledDowngradeInfo(subscription);

  return (
    <Card className="relative overflow-hidden border-2 border-purple-500 bg-gradient-to-br from-purple-50 via-white to-purple-100 hover:shadow-2xl hover:shadow-purple-200 hover:border-purple-600 transition-all duration-300 group">
      {/* Decoração de fundo */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-300/10 to-pink-300/10 rounded-full translate-y-12 -translate-x-12 group-hover:scale-150 transition-transform duration-500" />
      
      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-purple-900">
                Minha Assinatura
              </CardTitle>
              <p className="text-sm text-purple-600/80 font-medium">
                {getPlanName(subscription.plan_type)}
              </p>
            </div>
          </div>
          <Badge className={`${getStatusColor(subscription.status)} flex-shrink-0`}>
            {getStatusLabel(subscription.status)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 pt-2 space-y-3">
        {/* 🆕 Aviso de downgrade agendado */}
        {scheduledDowngrade && (
          <div
            className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-lg"
            role="status"
            aria-live="polite"
          >
            <ArrowDownCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 leading-snug">
              <p className="font-semibold">Downgrade agendado</p>
              <p>
                Seu plano atual continuará ativo até{' '}
                <span className="font-medium">{formatDate(scheduledDowngrade.scheduledFor)}</span>.
                Depois disso, será alterado automaticamente para{' '}
                <span className="font-medium">{scheduledDowngrade.toPlanName}</span>.
              </p>
            </div>
          </div>
        )}

        {/* Total Disponível - DESTAQUE COMPACTO */}
        <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div>
            <p className="text-xs font-semibold text-blue-900">Total Disponível</p>
            <p className="text-xs text-gray-500">Autenticações restantes</p>
          </div>
          <span className="text-3xl font-bold text-blue-600">
            {totalAvailable}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-600">
            <span>Usadas: {subscription.signatures_used}</span>
            <span>Limite: {totalLimit}</span>
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
        
        {/* Botão Ver Detalhes */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Recolher detalhes' : 'Ver detalhes'}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-2" />
              Recolher detalhes
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-2" />
              Ver detalhes
            </>
          )}
        </Button>
        
        {/* Conteúdo expandido */}
        {isExpanded && (
          <div className="space-y-3 border-t pt-3">
            {/* Renewal Date */}
            {subscription.status === 'active' && (
              <div className="flex items-center gap-2 text-sm">
                {isCanceled ? (
                  <Clock className="h-4 w-4 text-red-500" />
                ) : (
                  <Calendar className="h-4 w-4 text-gray-400" />
                )}
                <span className={isCanceled ? "text-red-600" : "text-gray-600"}>
                  {isCanceled ? 'Expira em' : 'Renova em'} {formatDate(subscription.current_period_end)}
                  {!isCanceled && (
                    <span className="text-gray-400 ml-1">
                      ({getDaysUntilRenewal(subscription.current_period_end)} dias)
                    </span>
                  )}
                </span>
              </div>
            )}
            
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
            
            {/* Action Button */}
            <Link to="/settings?tab=subscription">
              <Button variant="outline" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Gerenciar Assinatura
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
};