/**
 * UtmAnalyticsCard.tsx
 *
 * Card para o AdminDashboard com análise cruzada por UTM (Fase 3).
 *
 * Funcionalidades:
 *   - Overview: distribuição de cadastros com UTM vs sem UTM
 *   - Tabela pivotada por dimensão (Origem/Mídia/Campanha)
 *   - Métricas por bucket: Cadastros, Logaram, Ativaram, Engajaram + %
 *   - Filtro de período (7d/30d/90d/Tudo/Custom)
 *   - Filtro secundário por utm_source (deep-dive em campanhas)
 *   - Ranking visual com barras horizontais
 *   - Export CSV do breakdown
 *
 * 100% somente-leitura. Consome as RPCs Fase 3.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  Loader2,
  Download,
  Target,
  Users as UsersIcon,
  Filter,
  BarChart3,
} from 'lucide-react';
import {
  fetchAdminUtmConversionOverview,
  fetchAdminUtmBreakdown,
  fetchAdminUtmSourceOptions,
  type AdminUtmConversionOverviewResult,
  type AdminUtmBreakdownResult,
  type AdminUtmDimension,
  type AdminUtmSourceOption,
} from '@/lib/admin-stats';

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

/**
 * Escape seguro para CSV (envolve em aspas, duplica aspas internas).
 */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return /[",\n\r;]/.test(str) ? `"${escaped}"` : escaped;
}

/**
 * Constrói CSV do breakdown por dimensão (Excel BR: separador `;` + BOM).
 */
function buildBreakdownCsv(
  result: AdminUtmBreakdownResult,
  dimensionLabel: string,
  rangeLabel: string
): string {
  const headers = [
    dimensionLabel,
    'Cadastros',
    'Logaram',
    'Ativaram (1º conteúdo)',
    'Engajaram (3+ conteúdos)',
    '% Logaram',
    '% Ativaram',
    '% Engajaram',
  ];

  const lines: string[] = [];
  // Metadados no topo (comentários informativos)
  lines.push(csvEscape(`Análise por ${dimensionLabel} — ${rangeLabel}`));
  lines.push(csvEscape(`Total no período: ${result.total_registered} cadastro(s)`));
  if (result.utm_source_filter) {
    lines.push(csvEscape(`Filtro de origem: ${result.utm_source_filter}`));
  }
  lines.push(''); // linha em branco
  lines.push(headers.map(csvEscape).join(';'));

  for (const item of result.items) {
    lines.push([
      item.bucket,
      item.registered,
      item.logged_in,
      item.activated,
      item.engaged,
      `${item.rate_logged_in}%`,
      `${item.rate_activated}%`,
      `${item.rate_engaged}%`,
    ].map(csvEscape).join(';'));
  }

  return '\uFEFF' + lines.join('\r\n');
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Retorna a classe Tailwind para colorir a barra de progresso de acordo
 * com a taxa de ativação (verde = alta conversão, vermelho = baixa).
 */
function activationBarColor(rate: number): string {
  if (rate >= 40) return 'bg-green-500';
  if (rate >= 20) return 'bg-yellow-500';
  if (rate >= 10) return 'bg-orange-500';
  return 'bg-red-400';
}

export default function UtmAnalyticsCard() {
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const [dimension, setDimension] = useState<AdminUtmDimension>('source');
  const [utmSourceFilter, setUtmSourceFilter] = useState<string>('all');
  const [utmSourceOptions, setUtmSourceOptions] = useState<AdminUtmSourceOption[]>([]);

  const [overview, setOverview] = useState<AdminUtmConversionOverviewResult | null>(null);
  const [breakdown, setBreakdown] = useState<AdminUtmBreakdownResult | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const range = useMemo(
    () => getRangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  // Carrega options de utm_source apenas uma vez
  useEffect(() => {
    (async () => {
      try {
        const opts = await fetchAdminUtmSourceOptions();
        setUtmSourceOptions(opts);
      } catch (err) {
        console.error('❌ [UtmAnalytics] Erro ao carregar options:', err);
      }
    })();
  }, []);

  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const r = await fetchAdminUtmConversionOverview(range.from, range.to);
      setOverview(r);
    } finally {
      setIsLoadingOverview(false);
    }
  }, [range.from, range.to]);

  const loadBreakdown = useCallback(async () => {
    setIsLoadingBreakdown(true);
    try {
      const utmSource = utmSourceFilter === 'all' ? null : utmSourceFilter;
      const r = await fetchAdminUtmBreakdown(dimension, range.from, range.to, utmSource, 50);
      setBreakdown(r);
    } finally {
      setIsLoadingBreakdown(false);
    }
  }, [dimension, range.from, range.to, utmSourceFilter]);

  useEffect(() => {
    if (preset === 'custom' && !customFrom && !customTo) return;
    void loadOverview();
    void loadBreakdown();
  }, [loadOverview, loadBreakdown, preset, customFrom, customTo]);

  const handleExportCsv = useCallback(async () => {
    if (!breakdown || breakdown.items.length === 0) return;
    setIsExporting(true);
    try {
      const dimensionLabel = dimension === 'source' ? 'Origem (utm_source)'
                           : dimension === 'medium' ? 'Mídia (utm_medium)'
                           : 'Campanha (utm_campaign)';
      const csv = buildBreakdownCsv(breakdown, dimensionLabel, range.label);
      const ts = new Date().toISOString().slice(0, 10);
      const suffix = utmSourceFilter !== 'all' ? `_${utmSourceFilter}` : '';
      downloadCsv(`vero_utm_${dimension}${suffix}_${ts}.csv`, csv);
    } finally {
      setIsExporting(false);
    }
  }, [breakdown, dimension, range.label, utmSourceFilter]);

  const presetButtons: { key: PresetKey; label: string }[] = [
    { key: '7d',     label: '7d' },
    { key: '30d',    label: '30d' },
    { key: '90d',    label: '90d' },
    { key: 'all',    label: 'Tudo' },
    { key: 'custom', label: 'Custom' },
  ];

  // Melhor bucket do breakdown (maior taxa de ativação com >= 3 cadastros)
  const bestBucket = useMemo(() => {
    if (!breakdown || breakdown.items.length === 0) return null;
    const eligible = breakdown.items.filter(i => i.registered >= 3);
    if (eligible.length === 0) return null;
    return eligible.reduce((best, cur) =>
      cur.rate_activated > best.rate_activated ? cur : best
    , eligible[0]);
  }, [breakdown]);

  // Max cadastros para normalizar as barras horizontais
  const maxRegistered = useMemo(() => {
    if (!breakdown || breakdown.items.length === 0) return 1;
    return Math.max(...breakdown.items.map(i => i.registered), 1);
  }, [breakdown]);

  const dimensionLabel = dimension === 'source' ? 'Origem'
                       : dimension === 'medium' ? 'Mídia'
                       : 'Campanha';

  return (
    <Card className="border-l-4 border-purple-500 mb-8">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              Análise por Origem (UTM) — Fase 3
            </CardTitle>
            <CardDescription>
              Conversão de cadastros em ativos por canal de tráfego (Instagram, Google, orgânico, etc.)
            </CardDescription>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportCsv}
            disabled={isExporting || isLoadingBreakdown || !breakdown || breakdown.items.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isExporting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exportando...</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Exportar CSV</>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* --- Filtros --- */}
        <div className="flex flex-wrap items-end gap-3">
          {/* Preset de período */}
          <div>
            <Label className="text-xs text-muted-foreground block mb-1">Período</Label>
            <div className="flex flex-wrap gap-1">
              {presetButtons.map(p => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPreset(p.key)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                    preset === p.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <>
              <div>
                <Label htmlFor="utm-from" className="text-xs text-muted-foreground block mb-1">De</Label>
                <Input
                  id="utm-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div>
                <Label htmlFor="utm-to" className="text-xs text-muted-foreground block mb-1">Até</Label>
                <Input
                  id="utm-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
            </>
          )}

          {/* Dimensão */}
          <div>
            <Label className="text-xs text-muted-foreground block mb-1">Dimensão</Label>
            <Select value={dimension} onValueChange={(v) => setDimension(v as AdminUtmDimension)}>
              <SelectTrigger className="h-8 w-40 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="source">Origem (utm_source)</SelectItem>
                <SelectItem value="medium">Mídia (utm_medium)</SelectItem>
                <SelectItem value="campaign">Campanha (utm_campaign)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Deep-dive: filtro secundário por utm_source (só faz sentido para medium/campaign) */}
          {dimension !== 'source' && (
            <div>
              <Label className="text-xs text-muted-foreground block mb-1 flex items-center gap-1">
                <Filter className="h-3 w-3" />
                Filtrar por Origem
              </Label>
              <Select value={utmSourceFilter} onValueChange={setUtmSourceFilter}>
                <SelectTrigger className="h-8 w-44 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  {utmSourceOptions.map(opt => (
                    <SelectItem key={opt.utm_source} value={opt.utm_source}>
                      {opt.utm_source} ({opt.total})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* --- Overview: totais UTM vs sem UTM --- */}
        {isLoadingOverview ? (
          <div className="py-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        ) : overview && overview.total_registered > 0 ? (
          <div className="grid md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Total cadastros</span>
                <UsersIcon className="h-3 w-3 text-slate-500" />
              </div>
              <div className="text-2xl font-bold text-slate-700">{overview.total_registered}</div>
              <p className="text-[10px] text-muted-foreground mt-1">{range.label}</p>
            </div>

            <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Com UTM (rastreado)</span>
                <TrendingUp className="h-3 w-3 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-purple-600">{overview.with_utm_registered}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {overview.total_registered > 0
                  ? `${((overview.with_utm_registered / overview.total_registered) * 100).toFixed(1)}% do total`
                  : '—'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Sem UTM (direto/orgânico)</span>
                <UsersIcon className="h-3 w-3 text-slate-500" />
              </div>
              <div className="text-2xl font-bold text-slate-600">{overview.without_utm_registered}</div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {overview.total_registered > 0
                  ? `${((overview.without_utm_registered / overview.total_registered) * 100).toFixed(1)}% do total`
                  : '—'}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Ativação média</span>
                <Target className="h-3 w-3 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">{overview.avg_activation_rate}%</div>
              <p className="text-[10px] text-muted-foreground mt-1">1º conteúdo assinado</p>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-sm text-muted-foreground">
            Nenhum cadastro no período selecionado.
          </div>
        )}

        {/* --- Best bucket highlight --- */}
        {bestBucket && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <Target className="h-5 w-5 text-green-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-green-800 font-medium">🏆 Melhor {dimensionLabel} do período</p>
              <p className="text-sm font-bold text-green-900">
                <span className="truncate inline-block max-w-[300px] align-bottom">{bestBucket.bucket}</span>
                {' · '}
                <span className="text-green-700">{bestBucket.rate_activated}% de ativação</span>
                {' · '}
                <span className="text-green-600">{bestBucket.registered} cadastro(s)</span>
              </p>
            </div>
          </div>
        )}

        {/* --- Breakdown Table --- */}
        {isLoadingBreakdown ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        ) : !breakdown || breakdown.items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Sem dados para o breakdown selecionado.
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">
                Breakdown por {dimensionLabel}
                {breakdown.utm_source_filter && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    dentro de: {breakdown.utm_source_filter}
                  </Badge>
                )}
              </h4>
              <span className="text-xs text-muted-foreground">
                {breakdown.items.length} bucket(s)
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">{dimensionLabel}</th>
                    <th className="text-right px-3 py-2 font-semibold">Cadastros</th>
                    <th className="text-right px-3 py-2 font-semibold">Logaram</th>
                    <th className="text-right px-3 py-2 font-semibold">Ativaram</th>
                    <th className="text-right px-3 py-2 font-semibold">Engajaram</th>
                    <th className="text-left px-3 py-2 font-semibold w-32">Conversão</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.items.map((item, idx) => {
                    const widthPct = (item.registered / maxRegistered) * 100;
                    const isEmpty = item.bucket.startsWith('(sem');
                    return (
                      <tr
                        key={`${item.bucket}-${idx}`}
                        className={`border-t ${isEmpty ? 'bg-slate-50/50' : 'hover:bg-purple-50/50'}`}
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {isEmpty ? (
                              <span className="text-xs italic text-muted-foreground truncate">
                                {item.bucket}
                              </span>
                            ) : (
                              <Badge className="bg-purple-100 text-purple-800 text-xs font-normal truncate max-w-[200px]" title={item.bucket}>
                                {item.bucket}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden w-16 hidden sm:block">
                              <div
                                className="h-full bg-purple-400 transition-all"
                                style={{ width: `${widthPct}%` }}
                              />
                            </div>
                            <span>{item.registered}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <div>{item.logged_in}</div>
                          <div className="text-[10px] text-muted-foreground">{item.rate_logged_in}%</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <div className="font-semibold">{item.activated}</div>
                          <div className="text-[10px] text-muted-foreground">{item.rate_activated}%</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <div>{item.engaged}</div>
                          <div className="text-[10px] text-muted-foreground">{item.rate_engaged}%</div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex-1 min-w-[60px]">
                              <div
                                className={`h-full ${activationBarColor(item.rate_activated)} transition-all`}
                                style={{ width: `${Math.min(100, item.rate_activated)}%` }}
                              />
                            </div>
                            <span className="text-xs tabular-nums font-medium w-10 text-right">
                              {item.rate_activated}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-2 text-[10px] text-muted-foreground">
              💡 A barra de conversão mostra a taxa de ativação (%1º conteúdo assinado / cadastros). Verde ≥ 40% · Amarelo ≥ 20% · Laranja ≥ 10% · Vermelho abaixo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}