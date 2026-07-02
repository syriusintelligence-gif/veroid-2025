/**
 * RevenueSubcardsInline.tsx
 *
 * Card enxuto para o AdminDashboard, exibindo APENAS os dois sub-blocos
 * do antigo "Receita e Faturamento" que fazem sentido isoladamente:
 *
 *   - Assinaturas por Status
 *   - Mudanças de Plano (upgrades / downgrades / lateral / agendados)
 *
 * Motivação:
 *   Os demais indicadores do card "Receita e Faturamento"
 *   (MRR, ARR, ARPU, Receita acumulada, Pagamentos, Cupons, LTV)
 *   dependem de dados que hoje NÃO são gravados de forma completa em
 *   `billing_audit` e/ou de descontos que não estão persistidos em
 *   `subscriptions.metadata`. Para não exibir métricas incorretas ou
 *   vazias, esses sub-blocos foram ocultados do dashboard. Este componente
 *   mantém apenas as duas visões que são calculadas a partir de dados
 *   confiáveis e já existentes.
 *
 * Comportamento aditivo e seguro:
 *   - Não altera nenhuma RPC, nenhum SQL, nenhum backend, nenhum outro
 *     componente. Apenas reutiliza `fetchAdminRevenueMetrics()` já usado
 *     por `RevenueMetricsCard.tsx`, que continua no repositório e pode ser
 *     religado no futuro sem retrabalho.
 *   - Se a RPC falhar ou vier vazia, o card exibe estado amigável.
 *   - Renderizado inline abaixo do `PlanDistributionCard` no AdminDashboard.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  fetchAdminRevenueMetrics,
  type AdminRevenueMetricsResult,
} from '@/lib/admin-stats';
import { getStatusColor, getStatusLabel } from '@/hooks/useSubscription';

export default function RevenueSubcardsInline() {
  const [metrics, setMetrics] = useState<AdminRevenueMetricsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // O parâmetro `this_month` é irrelevante para os dois sub-blocos
      // exibidos aqui (status_breakdown e plan_changes são agregados
      // globais), mas a RPC exige um range válido.
      const m = await fetchAdminRevenueMetrics('this_month');
      setMetrics(m);
    } catch (err) {
      console.error('❌ [RevenueSubcardsInline] Erro ao carregar métricas:', err);
      setError('Não foi possível carregar essas métricas.');
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const renderContent = () => {
    if (isLoading && !metrics) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      );
    }

    if (error && !metrics) {
      return (
        <div className="text-center py-10">
          <p className="text-sm text-muted-foreground mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      );
    }

    if (!metrics) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assinaturas por Status */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-4 w-4 text-slate-600" />
            <span className="text-sm font-semibold text-slate-900">
              Assinaturas por Status
            </span>
          </div>
          {metrics.status_breakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhuma assinatura registrada.
            </p>
          ) : (
            <div className="space-y-1.5">
              {metrics.status_breakdown.map((item) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between text-sm"
                >
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                      item.status
                    )}`}
                  >
                    {getStatusLabel(item.status)}
                  </span>
                  <span className="font-semibold tabular-nums">{item.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mudanças de Plano */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-semibold text-slate-900">
              Mudanças de Plano
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-700 tabular-nums flex items-center justify-center gap-1">
                <ArrowUpRight className="h-4 w-4" />
                {metrics.plan_changes.upgrades}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">
                Upgrades
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-700 tabular-nums flex items-center justify-center gap-1">
                <ArrowDownRight className="h-4 w-4" />
                {metrics.plan_changes.downgrades}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase">
                Downgrades
              </div>
            </div>
          </div>
          {metrics.plan_changes.scheduled_downgrades > 0 && (
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              {metrics.plan_changes.scheduled_downgrades} downgrade(s)
              agendado(s)
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Status de Assinaturas e Mudanças de Plano
            </CardTitle>
            <CardDescription>
              Visão consolidada do status atual das assinaturas e do histórico
              de upgrades / downgrades.
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void load()}
            disabled={isLoading}
            title="Atualizar métricas"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}