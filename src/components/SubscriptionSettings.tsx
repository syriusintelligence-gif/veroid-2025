import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';
import {
  useSubscription,
  getPlanName,
  getStatusColor,
  getStatusLabel,
  formatDate,
  getDaysUntilRenewal,
} from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const SubscriptionSettings = () => {
  const { subscription, loading, refetch } = useSubscription();
  const [canceling, setCanceling] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Minha Assinatura</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie sua assinatura e pagamentos.
          </p>
        </div>
        <Separator />
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Minha Assinatura</h3>
          <p className="text-sm text-muted-foreground">
            Gerencie sua assinatura e pagamentos.
          </p>
        </div>
        <Separator />
        <Card>
          <CardHeader>
            <CardTitle>Nenhuma Assinatura Ativa</CardTitle>
            <CardDescription>
              Você ainda não possui uma assinatura. Escolha um plano para começar a usar todos os recursos do Vero iD.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/pricing">
              <Button>
                <TrendingUp className="mr-2 h-4 w-4" />
                Ver Planos Disponíveis
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const daysUntilRenewal = getDaysUntilRenewal(subscription.current_period_end);
  const usagePercentage = (subscription.signatures_used / subscription.signatures_limit) * 100;
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  
  // ✅ NOVO: Verificar se é plano FREE/trial (não renovável)
  const isFreeOrTrial = subscription.plan_type === 'trial' || subscription.plan_type === 'free';

  // ✅ IMPLEMENTADO: Função de cancelamento que chama a Edge Function
  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      // Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para cancelar a assinatura.",
          variant: "destructive",
        });
        return;
      }

      // Obter a URL da Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/cancel-subscription`;

      console.log('🚫 Cancelando assinatura para userId:', session.user.id);

      // Chamar a Edge Function
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: session.user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cancelar assinatura');
      }

      console.log('✅ Assinatura cancelada com sucesso:', result);

      // Atualizar os dados da assinatura
      await refetch();

      // Mostrar mensagem de sucesso
      toast({
        title: "Assinatura Cancelada",
        description: result.message || "Sua assinatura foi cancelada com sucesso. Você terá acesso até o final do período atual.",
        variant: "default",
      });

    } catch (error) {
      console.error('❌ Erro ao cancelar assinatura:', error);
      
      toast({
        title: "Erro ao Cancelar",
        description: error instanceof Error ? error.message : 'Erro desconhecido ao cancelar assinatura. Tente novamente.',
        variant: "destructive",
      });
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Minha Assinatura</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie sua assinatura e pagamentos.
        </p>
      </div>
      <Separator />

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Plano Atual
            </CardTitle>
            <Badge className={getStatusColor(subscription.status)}>
              {getStatusLabel(subscription.status)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-gray-500 mb-1">Plano</p>
              <p className="text-2xl font-bold">{getPlanName(subscription.plan_type)}</p>
              {/* ✅ NOVO: Mostrar badge "Teste Único" para FREE/trial */}
              {isFreeOrTrial && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Teste Único - Não Renovável
                </Badge>
              )}
            </div>
            
            {/* ✅ MODIFICADO: Mostrar "Próxima Renovação" APENAS para planos pagos */}
            {isActive && !isFreeOrTrial && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Próxima Renovação</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
                    {daysUntilRenewal > 0 && (
                      <p className="text-sm text-gray-500">
                        Em {daysUntilRenewal} {daysUntilRenewal === 1 ? 'dia' : 'dias'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ✅ NOVO: Mostrar "Válido Até" para planos FREE/trial */}
            {isActive && isFreeOrTrial && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Válido Até</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="font-medium">{formatDate(subscription.current_period_end)}</p>
                    {daysUntilRenewal > 0 && (
                      <p className="text-sm text-orange-600">
                        Expira em {daysUntilRenewal} {daysUntilRenewal === 1 ? 'dia' : 'dias'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ✅ NOVO: Aviso para planos FREE/trial */}
          {isFreeOrTrial && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-orange-900">
                  Período de Teste Único
                </p>
                <p className="text-xs text-orange-700">
                  Este é um teste gratuito de 10 assinaturas válido por 30 dias. Após esgotar as assinaturas ou expirar o período, será necessário assinar um plano pago ou comprar pacotes avulsos para continuar usando o Vero iD.
                </p>
              </div>
            </div>
          )}

          {/* ✅ NOVO: Aviso de cancelamento agendado */}
          {subscription.cancel_at_period_end && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-900">
                  Cancelamento Agendado
                </p>
                <p className="text-xs text-red-700">
                  Sua assinatura será cancelada em {formatDate(subscription.current_period_end)}. Você continuará tendo acesso até essa data. Seus créditos extras (se houver) serão preservados até a data de expiração.
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Usage Stats */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium">Uso de Autenticações</p>
              <p className="text-sm text-gray-600">
                {subscription.signatures_used} / {subscription.signatures_limit}
              </p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  usagePercentage >= 90
                    ? 'bg-red-500'
                    : usagePercentage >= 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(usagePercentage, 100)}%` }}
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              {usagePercentage >= 90 ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">
                    {/* ✅ MODIFICADO: Mensagem diferente para FREE/trial */}
                    {isFreeOrTrial 
                      ? 'Você está próximo do limite. Assine um plano para continuar.'
                      : 'Você está próximo do limite. Considere fazer upgrade.'
                    }
                  </span>
                </>
              ) : usagePercentage >= 70 ? (
                <>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <span className="text-yellow-600">
                    Você usou {Math.round(usagePercentage)}% do seu limite.
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">
                    Você tem {subscription.signatures_limit - subscription.signatures_used} autenticações disponíveis.
                  </span>
                </>
              )}
            </div>
          </div>

          {subscription.overage_signatures_available > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Autenticações Extras Disponíveis
                    </p>
                    <p className="text-xs text-blue-700">
                      Você tem {subscription.overage_signatures_available} autenticações extras de pacotes adicionais
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Assinatura</CardTitle>
          <CardDescription>
            {/* ✅ MODIFICADO: Descrição diferente para FREE/trial */}
            {isFreeOrTrial 
              ? 'Assine um plano para continuar usando o Vero iD após o período de teste.'
              : 'Atualize seu plano ou gerencie suas configurações de pagamento.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <Link to="/pricing">
              <Button variant="default" className="w-full">
                <TrendingUp className="mr-2 h-4 w-4" />
                {/* ✅ MODIFICADO: Texto do botão diferente para FREE/trial */}
                {isFreeOrTrial ? 'Assinar um Plano' : 'Fazer Upgrade do Plano'}
              </Button>
            </Link>

            {subscription.stripe_customer_id && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  // TODO: Implementar link para portal do Stripe
                  alert('Portal de gerenciamento será implementado em breve.');
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Gerenciar Pagamentos no Stripe
              </Button>
            )}

            {/* ✅ MODIFICADO: Ocultar botão de cancelamento para FREE/trial e assinaturas já canceladas */}
            {isActive && !subscription.cancel_at_period_end && !isFreeOrTrial && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancelar Assinatura
                  </Button>
                </AlertDialogTrigger>
                {/* ✅ CORRIGIDO: Layout do AlertDialog com classes personalizadas */}
                <AlertDialogContent className="bg-white border-2 border-gray-200 shadow-2xl max-w-lg">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                      Cancelar Assinatura?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base text-gray-700 leading-relaxed mt-4">
                      <div className="space-y-3">
                        <p>
                          Ao cancelar sua assinatura, você <strong>perderá acesso aos recursos premium</strong> no final do período atual ({formatDate(subscription.current_period_end)}).
                        </p>
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900">
                            ✅ <strong>Seus créditos extras (pacotes avulsos) serão preservados</strong> até a data de expiração deles, mesmo após o cancelamento.
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">
                          Esta ação não pode ser desfeita, mas você pode assinar novamente a qualquer momento.
                        </p>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-6">
                    <AlertDialogCancel className="border-2 hover:bg-gray-100">
                      Voltar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      disabled={canceling}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      {canceling ? 'Cancelando...' : 'Sim, Cancelar Assinatura'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">ID da Assinatura</dt>
              <dd className="font-mono text-xs">{subscription.stripe_subscription_id || 'N/A'}</dd>
            </div>
            <Separator />
            <div className="flex justify-between">
              <dt className="text-gray-500">Data de Início</dt>
              <dd>{formatDate(subscription.current_period_start)}</dd>
            </div>
            <Separator />
            <div className="flex justify-between">
              <dt className="text-gray-500">Criado em</dt>
              <dd>{formatDate(subscription.created_at)}</dd>
            </div>
            {subscription.trial_end && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-gray-500">Período de Teste até</dt>
                  <dd>{formatDate(subscription.trial_end)}</dd>
                </div>
              </>
            )}
            {subscription.cancel_at_period_end && (
              <>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-gray-500 text-red-600">Cancelamento Agendado</dt>
                  <dd className="text-red-600 font-semibold">Sim</dd>
                </div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
};