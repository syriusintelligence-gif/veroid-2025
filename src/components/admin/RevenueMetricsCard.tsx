/**
 * RevenueMetricsCard.tsx
 *
 * Card do AdminDashboard que apresenta o bloco de "Receita e Faturamento":
 *   1) MRR (Monthly Recurring Revenue)
 *   2) ARR (Annual Recurring Revenue)
 *   3) Receita total acumulada
 *   4) Receita do período atual vs anterior (variação %)
 *   5) ARPU (ticket médio por pagante)
 *   6) LTV estimado por plano
 *   7) Pagamentos: processados / falhos / reembolsados
 *   8) Assinaturas por status
 *   9) Renovações OK vs falhas (últimos 30 dias)
 *  10) Upgrades e downgrades (histórico)
 *  11) Cupons/descontos aplicados
 *
 * Fonte de dados:
 *   - RPCs `admin_revenue_metrics` e `admin_revenue_timeline`
 *     (ver supabase/sql/admin_revenue_metrics.sql).
 *
 * Este componente é ADITIVO — foi projetado para ser renderizado logo abaixo
 * do PlanDistributionCard no AdminDashboard, sem interferir em nenhum outro
 * card, filtro ou fluxo existente. Falhas isoladas nas RPCs afetam apenas
 * este bloco (loading/erro locais); o resto do dashboard segue intacto.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  DollarSign,
  Loader2,
  RefreshCw,
  Repeat,
  TrendingUp,
  Users as UsersIcon,
  Wallet,
  TicketPercent,
  ShieldCheck,
  Minus,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchAdminRevenueMetrics,
  fetchAdminRevenueTimeline,
  type AdminRevenueMetricsResult,
  type AdminRevenueRange,
  type AdminRevenueTimelinePoint,
} from '@/lib/admin-stats';
import { getPlanName, getStatusLabel, getStatusColor } from '@/hooks/useSubscription';

/* --------------------------- Helpers --------------------------- */

/** Formata centavos → "R$ 1.234,56" (pt-BR). */
function formatBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return 'R$ 0,00';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Formata centavos → "R$ 1.234" (sem decimais) para KPIs grandes. */
function formatBRLCompact(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return 'R$ 0';
  const value = cents / 100;
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}M`;
  }
  if (value >= 10_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Label amigável para cada range. */
const RANGE_LABELS: Record<AdminRevenueRange, string> = {
  this_month: 'Este mês',
  last_month: 'Mês passado',
  last_90d:   'Últimos 90 dias',
  this_year:  'Este ano',
  all:        'Todo o período',
};

/** Label do período anterior (para tooltip da variação). */
const PREV_RANGE_LABELS: Record<AdminRevenueRange, string> = {
  this_month: 'vs. mês anterior',
  last_month: 'vs. mês retrasado',
  last_90d:   'vs. 90 dias anteriores',
  this_year:  'vs. ano anterior',
  all:        '',
};

/* --------------------------- Component --------------------------- */

export default function RevenueMetricsCard() {
  const [range, setRange] = useState<AdminRevenueRange>('this_month');
  const [metrics, setMetrics] = useState<AdminRevenueMetricsResult | null>(null);
  const [timeline, setTimeline] = useState<AdminRevenueTimelinePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [m, t] = await Promise.all([
        fetchAdminRevenueMetrics(range),
        fetchAdminRevenueTimeline(30),
      ]);
      setMetrics(m);
      setTimeline(t);
    } catch (err) {
      console.error('❌ [RevenueMetricsCard] Erro ao carregar métricas:', err);
      setError('Não foi possível carregar as métricas de receita.');
      setMetrics(null);
      setTimeline([]);
    } finally {
      setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  /* ---------------- Derived data ---------------- */

  const variationDisplay = useMemo(() => {
    if (!metrics) return null;
    if (metrics.variation_pct === null || metrics.variation_pct === undefined) {
      return null;
    }
    const pct = metrics.variation_pct;
    return {
      pct,
      isUp:   pct > 0,
      isDown: pct < 0,
      isFlat: pct === 0,
    };
  }, [metrics]);

  const timelineChartData = useMemo(
    () =>
      timeline.map(pt => ({
        date: new Date(pt.date + 'T00:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        revenue: pt.revenue_cents / 100, // em reais para exibição no gráfico
      })),
    [timeline]
  );

  /* --------------------- Empty / loading / error --------------------- */

  const renderContent = () => {
    if (isLoading && !metrics) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      );
    }

    if (error && !metrics) {
      return (
        <div className="text-center py-12">
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
      <div className="space-y-6">
        {/* --------- KPIs principais --------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* MRR */}
          <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                MRR
              </span>
              <Repeat className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-800">
              {formatBRLCompact(metrics.mrr_cents)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Receita recorrente mensal
            </div>
          </div>

          {/* ARR */}
          <div className="rounded-xl border-2 border-teal-300 bg-gradient-to-br from-teal-50 to-teal-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">
                ARR
              </span>
              <TrendingUp className="h-4 w-4 text-teal-600" />
            </div>
            <div className="text-2xl font-bold text-teal-800">
              {formatBRLCompact(metrics.arr_cents)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Projeção anual (MRR × 12)
            </div>
          </div>

          {/* Receita total acumulada */}
          <div className="rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                Receita acumulada
              </span>
              <Wallet className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-800">
              {formatBRLCompact(metrics.total_accum_cents)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Histórico total processado
            </div>
          </div>

          {/* ARPU */}
          <div className="rounded-xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-purple-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">
                ARPU
              </span>
              <UsersIcon className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-800">
              {formatBRLCompact(metrics.arpu_cents)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {metrics.paying_users} pagante(s) ativo(s)
            </div>
          </div>
        </div>

        {/* --------- Receita no período + variação --------- */}
        <div className="rounded-xl border bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Receita — {RANGE_LABELS[range]}
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {formatBRL(metrics.revenue_range_cents)}
              </div>
              {range !== 'all' && (
                <div className="text-xs text-muted-foreground mt-1">
                  Período anterior: {formatBRL(metrics.revenue_prev_cents)}
                </div>
              )}
            </div>

            {variationDisplay && range !== 'all' && (
              <div className="flex items-center gap-2">
                {variationDisplay.isUp && (
                  <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    +{variationDisplay.pct.toFixed(1)}%
                  </Badge>
                )}
                {variationDisplay.isDown && (
                  <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    {variationDisplay.pct.toFixed(1)}%
                  </Badge>
                )}
                {variationDisplay.isFlat && (
                  <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 gap-1">
                    <Minus className="h-3 w-3" />
                    0,0%
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {PREV_RANGE_LABELS[range]}
                </span>
              </div>
            )}
          </div>

          {/* Mini gráfico de receita — últimos 30 dias */}
          {timelineChartData.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-muted-foreground mb-1">
                Receita diária — últimos 30 dias
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={timelineChartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="date"
                    style={{ fontSize: '10px' }}
                    interval="preserveStartEnd"
                    tick={{ fill: '#64748b' }}
                  />
                  <YAxis
                    style={{ fontSize: '10px' }}
                    tick={{ fill: '#64748b' }}
                    tickFormatter={(v: number) => {
                      if (v >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
                      return `R$ ${v}`;
                    }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                      'Receita',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* --------- Grid: Status + Pagamentos + Renovações + Upgrades + Cupons --------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Assinaturas por status */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900">
                Assinaturas por Status
              </span>
            </div>
            {metrics.status_breakdown.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma assinatura registrada.</p>
            ) : (
              <div className="space-y-1.5">
                {metrics.status_breakdown.map(item => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                      {getStatusLabel(item.status)}
                    </span>
                    <span className="font-semibold tabular-nums">{item.total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Renovações 30d */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Repeat className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-900">
                Renovações (30d)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-emerald-700 tabular-nums">
                  {metrics.renewals_30d.succeeded}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">OK</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-700 tabular-nums">
                  {metrics.renewals_30d.failed}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Falhas</div>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-500 tabular-nums">
                  {metrics.renewals_30d.skipped}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Skipped</div>
              </div>
            </div>
          </div>

          {/* Pagamentos: processados / falhos / reembolsados */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-slate-900">
                Pagamentos (total)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-blue-700 tabular-nums">
                  {metrics.payments.processed}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Processados</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-700 tabular-nums">
                  {metrics.payments.failed}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Falhos</div>
              </div>
              <div>
                <div className="text-lg font-bold text-amber-700 tabular-nums">
                  {metrics.payments.refunded}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Reembolsos</div>
              </div>
            </div>
          </div>

          {/* Upgrades / Downgrades */}
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
                <div className="text-[10px] text-muted-foreground uppercase">Upgrades</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-700 tabular-nums flex items-center justify-center gap-1">
                  <ArrowDownRight className="h-4 w-4" />
                  {metrics.plan_changes.downgrades}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase">Downgrades</div>
              </div>
            </div>
            {metrics.plan_changes.scheduled_downgrades > 0 && (
              <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                {metrics.plan_changes.scheduled_downgrades} downgrade(s) agendado(s)
              </div>
            )}
          </div>

          {/* Cupons */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <TicketPercent className="h-4 w-4 text-pink-600" />
              <span className="text-sm font-semibold text-slate-900">
                Cupons / Descontos
              </span>
            </div>
            {metrics.coupons.has_data ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Aplicados</span>
                  <span className="font-semibold tabular-nums">
                    {metrics.coupons.total_with_coupon}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total descontado</span>
                  <span className="font-semibold tabular-nums">
                    {formatBRL(metrics.coupons.total_discount_cents)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Sem dados de cupons neste histórico.
              </p>
            )}
          </div>

          {/* LTV por plano */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              <span className="text-sm font-semibold text-slate-900">
                LTV Estimado por Plano
              </span>
            </div>
            {metrics.ltv_by_plan.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados suficientes.</p>
            ) : (
              <div className="space-y-1.5">
                {metrics.ltv_by_plan.map(item => (
                  <div
                    key={item.plan_type}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium">
                        {getPlanName(item.plan_type)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {item.sample_size > 0
                          ? `${item.avg_months.toFixed(1)} meses médios • ${item.sample_size} amostra(s)`
                          : 'Sem histórico'}
                      </span>
                    </div>
                    <span className="font-semibold tabular-nums text-indigo-700">
                      {item.ltv_cents === null || item.ltv_cents === 0
                        ? '—'
                        : formatBRLCompact(item.ltv_cents)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-muted-foreground mt-2 italic">
              LTV = preço mensal × duração média (estimativa).
            </div>
          </div>
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
              <DollarSign className="h-5 w-5 text-emerald-600" />
              Receita e Faturamento
            </CardTitle>
            <CardDescription>
              Métricas de MRR, ARR, receita acumulada, ARPU, LTV, renovações e cupons.
              Valores em <strong>R$ (BRL)</strong>.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={range}
              onValueChange={(v) => setRange(v as AdminRevenueRange)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">Este mês</SelectItem>
                <SelectItem value="last_month">Mês passado</SelectItem>
                <SelectItem value="last_90d">Últimos 90 dias</SelectItem>
                <SelectItem value="this_year">Este ano</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => void load()}
              disabled={isLoading}
              title="Atualizar métricas de receita"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}