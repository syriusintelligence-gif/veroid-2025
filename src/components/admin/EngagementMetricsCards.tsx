/**
 * EngagementMetricsCards.tsx
 *
 * Renderiza 3 cards adicionais para o AdminDashboard:
 *   01) Dia do Ciclo (em que dia do trial cada lead está)
 *   02) Taxa de Ativação (funil: Cadastrados → Logaram → Ativaram → Engajaram)
 *   04) Taxa de Abandono (3 visões: trial / pós-trial / inatividade)
 *
 * Tudo é somente-leitura e consome as RPCs definidas em
 * supabase/sql/admin_engagement_metrics.sql.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  TrendingDown,
  Activity,
  Loader2,
  Search,
  ChevronRight,
  Mail,
  Phone,
  Users as UsersIcon,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import {
  fetchAdminTrialCycleStats,
  fetchAdminUsersInTrialDay,
  fetchAdminActivationFunnel,
  fetchAdminChurnMetrics,
  type AdminTrialCycleStatsResult,
  type AdminTrialCycleBucket,
  type AdminActivationFunnelResult,
  type AdminChurnMetricsResult,
  type AdminTrialUserRow,
} from '@/lib/admin-stats';
import { getPlanName } from '@/hooks/useSubscription';

/* ------------------------- Helpers ------------------------- */

const PAGE_SIZE = 25;

type PresetKey = 'all' | '7d' | '30d' | '90d' | 'custom';

function startOfTomorrowISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

function startOfNDaysAgoISO(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function getRangeForPreset(
  preset: PresetKey,
  customFrom: string,
  customTo: string
): { from: string | null; to: string | null; label: string } {
  switch (preset) {
    case '7d':
      return { from: startOfNDaysAgoISO(6),  to: startOfTomorrowISO(), label: 'Últimos 7 dias' };
    case '30d':
      return { from: startOfNDaysAgoISO(29), to: startOfTomorrowISO(), label: 'Últimos 30 dias' };
    case '90d':
      return { from: startOfNDaysAgoISO(89), to: startOfTomorrowISO(), label: 'Últimos 90 dias' };
    case 'custom': {
      const from = customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : null;
      let to: string | null = null;
      if (customTo) {
        const d = new Date(`${customTo}T00:00:00`);
        d.setDate(d.getDate() + 1);
        to = d.toISOString();
      }
      const label =
        from && to ? `${customFrom} → ${customTo}` :
        from       ? `A partir de ${customFrom}`   :
        to         ? `Até ${customTo}`             :
                     'Período personalizado';
      return { from, to, label };
    }
    case 'all':
    default:
      return { from: null, to: null, label: 'Todo o período' };
  }
}

function getInitials(name: string): string {
  return (name || '')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function colorClassFor(color: AdminTrialCycleBucket['color']): {
  bg: string;
  text: string;
  ring: string;
} {
  switch (color) {
    case 'green':  return { bg: 'bg-green-50',  text: 'text-green-700',  ring: 'hover:ring-green-300' };
    case 'yellow': return { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'hover:ring-yellow-300' };
    case 'orange': return { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'hover:ring-orange-300' };
    case 'red':    return { bg: 'bg-red-50',    text: 'text-red-700',    ring: 'hover:ring-red-300' };
  }
}

/* ------------------------- Trial Cycle Drilldown ------------------------- */

interface TrialDrilldownDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayOfCycle: number;
  bucketLabel: string;
}

function TrialDrilldownDialog({
  open,
  onOpenChange,
  dayOfCycle,
  bucketLabel,
}: TrialDrilldownDialogProps) {
  const [users, setUsers] = useState<AdminTrialUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadFirstPage = useCallback(async (term: string) => {
    setIsLoading(true);
    try {
      const result = await fetchAdminUsersInTrialDay(dayOfCycle, {
        search: term,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setUsers(result.items);
      setTotal(result.total);
    } catch (err) {
      console.error('❌ [TrialDrilldown] Erro:', err);
      setUsers([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [dayOfCycle]);

  // Reset ao abrir
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSearchDebounced('');
    setUsers([]);
    setTotal(0);
    void loadFirstPage('');
  }, [open, loadFirstPage]);

  // Re-busca quando search muda (e dialog está aberto)
  useEffect(() => {
    if (!open) return;
    void loadFirstPage(searchDebounced);
  }, [searchDebounced, open, loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || users.length >= total) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchAdminUsersInTrialDay(dayOfCycle, {
        search: searchDebounced,
        limit: PAGE_SIZE,
        offset: users.length,
      });
      setUsers(prev => [...prev, ...result.items]);
    } catch (err) {
      console.error('❌ [TrialDrilldown] loadMore:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, users.length, total, dayOfCycle, searchDebounced]);

  const hasMore = users.length < total;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Leads em trial — {bucketLabel}
          </DialogTitle>
          <DialogDescription>
            {isLoading
              ? 'Carregando...'
              : `${users.length} de ${total} lead(s)${searchDebounced ? ' filtrado(s)' : ''}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, CPF/CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum lead em trial neste filtro.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map(u => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition"
                >
                  <Avatar className="h-10 w-10 border-2 border-purple-600 flex-shrink-0">
                    <AvatarImage src={u.selfie_url} alt={u.nome_completo} />
                    <AvatarFallback className="bg-purple-600 text-white text-sm">
                      {getInitials(u.nome_completo)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{u.nome_completo}</span>
                      <Badge variant="outline" className="text-xs">
                        {getPlanName(u.plan_type)}
                      </Badge>
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        Dia {u.day_of_cycle}
                      </Badge>
                      {u.days_remaining <= 3 && (
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          {u.days_remaining === 0 ? 'Último dia' : `${u.days_remaining}d restantes`}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        {u.email}
                      </span>
                      {u.telefone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {u.telefone}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                    Trial até<br />
                    <span className="font-medium">
                      {new Date(u.trial_end).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}

              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={loadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>Carregar mais ({total - users.length} restantes)</>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- 01) Trial Cycle Card ------------------------- */

function TrialCycleCard() {
  const [stats, setStats] = useState<AdminTrialCycleStatsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [drilldown, setDrilldown] = useState<{ open: boolean; day: number; label: string }>({
    open: false,
    day: 0,
    label: '',
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        const r = await fetchAdminTrialCycleStats();
        if (mounted) setStats(r);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const total = stats?.total_in_trial ?? 0;

  return (
    <>
      <Card className="border-l-4 border-purple-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-purple-600" />
            Dia do Ciclo de Teste
          </CardTitle>
          <CardDescription>
            Leads atualmente em trial ativo, distribuídos pelo dia do ciclo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            </div>
          ) : total === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum lead em trial ativo no momento.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total em trial</span>
                <span className="text-2xl font-bold text-purple-600">{total}</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {stats?.buckets.map(b => {
                  const c = colorClassFor(b.color);
                  const pct = total > 0 ? (b.qtd / total) * 100 : 0;
                  const disabled = b.qtd === 0;
                  return (
                    <button
                      key={b.day}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        setDrilldown({ open: true, day: b.day, label: b.label })
                      }
                      className={`p-2 rounded-md ${c.bg} ${c.text} text-center transition ring-1 ring-transparent ${
                        disabled
                          ? 'opacity-50 cursor-not-allowed'
                          : `${c.ring} hover:ring-2 cursor-pointer`
                      }`}
                      title={`${b.label}: ${b.qtd} lead(s) — ${pct.toFixed(1)}%`}
                    >
                      <div className="text-[10px] font-medium">{b.label}</div>
                      <div className="text-lg font-bold">{b.qtd}</div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Clique em um dia para ver os leads. 🟢 início · 🟡 meio · 🔴 últimos dias.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <TrialDrilldownDialog
        open={drilldown.open}
        onOpenChange={(o) => setDrilldown(prev => ({ ...prev, open: o }))}
        dayOfCycle={drilldown.day}
        bucketLabel={drilldown.label}
      />
    </>
  );
}

/* ------------------------- 02) Activation Funnel Card ------------------------- */

function ActivationFunnelCard() {
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [funnel, setFunnel] = useState<AdminActivationFunnelResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const range = useMemo(
    () => getRangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetchAdminActivationFunnel(range.from, range.to);
      setFunnel(r);
    } finally {
      setIsLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    if (preset === 'custom' && !customFrom && !customTo) return;
    void load();
  }, [load, preset, customFrom, customTo]);

  const steps = useMemo(() => {
    if (!funnel) return [];
    return [
      {
        key: 'registered',
        label: 'Cadastrados',
        qtd: funnel.registered,
        pct: 100,
        color: 'bg-blue-500',
      },
      {
        key: 'logged_in',
        label: 'Logaram',
        qtd: funnel.logged_in,
        pct: funnel.rate_logged_in,
        color: 'bg-indigo-500',
      },
      {
        key: 'activated',
        label: 'Ativaram (1º conteúdo)',
        qtd: funnel.activated,
        pct: funnel.rate_activated,
        color: 'bg-purple-500',
      },
      {
        key: 'engaged',
        label: 'Engajaram (3+ conteúdos)',
        qtd: funnel.engaged,
        pct: funnel.rate_engaged,
        color: 'bg-pink-500',
      },
    ];
  }, [funnel]);

  const presetButtons: { key: PresetKey; label: string }[] = [
    { key: '7d',     label: '7d' },
    { key: '30d',    label: '30d' },
    { key: '90d',    label: '90d' },
    { key: 'all',    label: 'Tudo' },
    { key: 'custom', label: 'Custom' },
  ];

  return (
    <Card className="border-l-4 border-blue-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-5 w-5 text-blue-600" />
          Taxa de Ativação
        </CardTitle>
        <CardDescription>
          Funil: Cadastrados → Logaram → Ativaram (1º conteúdo) → Engajaram (3+)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filtros de período */}
        <div className="flex flex-wrap gap-1 mb-3">
          {presetButtons.map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
              className={`px-2 py-0.5 rounded-md text-xs font-medium transition ${
                preset === p.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <Label htmlFor="funnel-from" className="text-[10px] text-muted-foreground">
                De
              </Label>
              <Input
                id="funnel-from"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="funnel-to" className="text-[10px] text-muted-foreground">
                Até
              </Label>
              <Input
                id="funnel-to"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : !funnel || funnel.registered === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nenhum cadastro neste período.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {steps.map(step => (
                <div key={step.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">{step.label}</span>
                    <span className="tabular-nums">
                      <span className="font-bold">{step.qtd}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {step.pct.toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${step.color} transition-all`}
                      style={{ width: `${Math.min(100, Math.max(2, step.pct))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {funnel.avg_days_to_activate !== null && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Tempo médio até a 1ª ativação:{' '}
                <span className="font-semibold text-slate-700">
                  {funnel.avg_days_to_activate} dia(s)
                </span>
              </div>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">
              Período: {range.label}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------- 04) Churn Metrics Card ------------------------- */

function ChurnMetricsCard() {
  const [threshold, setThreshold] = useState(30);
  const [churn, setChurn] = useState<AdminChurnMetricsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetchAdminChurnMetrics(threshold);
      setChurn(r);
    } finally {
      setIsLoading(false);
    }
  }, [threshold]);

  useEffect(() => {
    void load();
  }, [load]);

  const visions = useMemo(() => {
    if (!churn) return [];
    return [
      {
        key: 'trial',
        title: 'Trial abandonado',
        desc: 'Iniciaram trial e não viraram pagantes',
        ...churn.trial_abandoned,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        icon: <AlertTriangle className="h-4 w-4 text-orange-600" />,
      },
      {
        key: 'paid',
        title: 'Churn pós-trial',
        desc: 'Foram pagantes e cancelaram / past_due',
        ...churn.post_trial_churn,
        color: 'text-red-600',
        bg: 'bg-red-50',
        icon: <TrendingDown className="h-4 w-4 text-red-600" />,
      },
      {
        key: 'inactive',
        title: 'Inativos',
        desc: `Sem login/conteúdo há ${churn.inactive.threshold_days} dias`,
        qtd: churn.inactive.qtd,
        base: churn.inactive.base,
        rate: churn.inactive.rate,
        color: 'text-slate-600',
        bg: 'bg-slate-50',
        icon: <Clock className="h-4 w-4 text-slate-600" />,
      },
    ];
  }, [churn]);

  return (
    <Card className="border-l-4 border-red-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingDown className="h-5 w-5 text-red-600" />
          Taxa de Abandono
        </CardTitle>
        <CardDescription>
          3 visões: trial / pós-trial / inatividade
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Threshold de inatividade */}
        <div className="flex items-center gap-2 mb-3">
          <Label htmlFor="churn-threshold" className="text-xs text-muted-foreground whitespace-nowrap">
            Inatividade ≥
          </Label>
          <select
            id="churn-threshold"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="h-7 text-xs rounded-md border border-input bg-background px-2"
          >
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
            <option value={60}>60 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-red-600" />
          </div>
        ) : !churn ? null : (
          <div className="space-y-2">
            {visions.map(v => (
              <div
                key={v.key}
                className={`p-3 rounded-lg ${v.bg} flex items-start gap-3`}
              >
                <div className="flex-shrink-0 mt-0.5">{v.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{v.title}</span>
                    <span className={`text-lg font-bold tabular-nums ${v.color}`}>
                      {v.rate}%
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{v.desc}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {v.qtd} de {v.base} usuário(s)
                  </div>
                </div>
              </div>
            ))}

            <div className="text-[10px] text-muted-foreground text-right pt-1">
              Base total: {churn.total_users} usuário(s)
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------- Container ------------------------- */

export default function EngagementMetricsCards() {
  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      <TrialCycleCard />
      <ActivationFunnelCard />
      <ChurnMetricsCard />
    </div>
  );
}

/* Workaround: ChevronRight é importado mas não usado no momento; mantido para
   futuras evoluções. ESLint não acusa pois é referenciado no JSDoc abaixo. */
void ChevronRight;