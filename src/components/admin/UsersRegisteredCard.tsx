/**
 * UsersRegisteredCard.tsx
 *
 * Substitui o card simples "Usuários Cadastrados" do AdminDashboard.
 * - Mostra a contagem total (sempre) + contagem filtrada por período.
 * - Seletor rápido de período: Hoje / 7 dias / 30 dias / 90 dias / Tudo / Custom.
 * - Mostra variação percentual vs período anterior quando aplicável.
 * - Clicando em "Ver usuários" abre um dialog com a lista paginada do período,
 *   com busca, "Carregar mais", copiar emails e exportar CSV.
 *
 * Fonte de dados: RPCs `admin_users_stats` e `admin_list_users_by_period`
 * (ver supabase/sql/admin_users_date_filter.sql).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Users as UsersIcon,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
  Mail,
  Phone,
  Download,
  Copy,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  fetchAdminUsersStats,
  fetchAdminUsersByPeriod,
  type AdminUserByPeriodRow,
} from '@/lib/admin-stats';
import { getPlanName } from '@/hooks/useSubscription';

type PresetKey = 'all' | 'today' | '7d' | '30d' | '90d' | 'custom';

interface RangeResult {
  from: string | null;
  to: string | null;
  label: string;
}

const PAGE_SIZE = 25;

/** Converte uma date-string `YYYY-MM-DD` para timestamp ISO em UTC (00:00). */
function dateOnlyToISO(d: string): string {
  // Trata como hora local do navegador para o filtro intuitivo, mas converte p/ ISO
  return new Date(`${d}T00:00:00`).toISOString();
}

/** Hoje 00:00 local em ISO. */
function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Amanhã 00:00 local em ISO (limite superior exclusivo para hoje). */
function startOfTomorrowISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

/** Há N dias 00:00 local em ISO. */
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
): RangeResult {
  switch (preset) {
    case 'today':
      return { from: startOfTodayISO(), to: startOfTomorrowISO(), label: 'Hoje' };
    case '7d':
      return { from: startOfNDaysAgoISO(6), to: startOfTomorrowISO(), label: 'Últimos 7 dias' };
    case '30d':
      return { from: startOfNDaysAgoISO(29), to: startOfTomorrowISO(), label: 'Últimos 30 dias' };
    case '90d':
      return { from: startOfNDaysAgoISO(89), to: startOfTomorrowISO(), label: 'Últimos 90 dias' };
    case 'custom': {
      const from = customFrom ? dateOnlyToISO(customFrom) : null;
      // Para "to" inclusivo na UI, somamos 1 dia (limite superior exclusivo)
      let to: string | null = null;
      if (customTo) {
        const d = new Date(`${customTo}T00:00:00`);
        d.setDate(d.getDate() + 1);
        to = d.toISOString();
      }
      const label = from && to
        ? `${customFrom} → ${customTo}`
        : from
          ? `A partir de ${customFrom}`
          : to
            ? `Até ${customTo}`
            : 'Período personalizado';
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

export default function UsersRegisteredCard() {
  const { toast } = useToast();

  // Estado do filtro
  const [preset, setPreset] = useState<PresetKey>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo(
    () => getRangeForPreset(preset, customFrom, customTo),
    [preset, customFrom, customTo]
  );

  // Stats
  const [totalAll, setTotalAll] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [growthPct, setGrowthPct] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Drilldown
  const [drilldownOpen, setDrilldownOpen] = useState(false);
  const [users, setUsers] = useState<AdminUserByPeriodRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [copiedEmails, setCopiedEmails] = useState(false);

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  /** Refaz a contagem sempre que o range muda. */
  const loadStats = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchAdminUsersStats(range.from, range.to);
      setTotalAll(result.total_all);
      setTotalFiltered(result.total_filtered);
      setGrowthPct(result.growth_pct);
    } catch (err) {
      console.error('❌ [UsersRegisteredCard] Erro ao carregar stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    // Só consulta quando o range custom estiver "completo" o suficiente
    if (preset === 'custom' && !customFrom && !customTo) {
      return;
    }
    void loadStats();
  }, [loadStats, preset, customFrom, customTo]);

  /** Carrega a primeira página do drilldown. */
  const loadFirstPage = useCallback(async (searchTerm: string) => {
    setIsLoadingUsers(true);
    try {
      const result = await fetchAdminUsersByPeriod(range.from, range.to, {
        search: searchTerm,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setUsers(result.items);
      setUsersTotal(result.total);
    } catch (err) {
      console.error('❌ [UsersRegisteredCard] Erro no drilldown:', err);
      setUsers([]);
      setUsersTotal(0);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [range.from, range.to]);

  /** Abre o dialog do drilldown. */
  const handleOpenDrilldown = useCallback(() => {
    setSearch('');
    setSearchDebounced('');
    setUsers([]);
    setUsersTotal(0);
    setDrilldownOpen(true);
    void loadFirstPage('');
  }, [loadFirstPage]);

  // Recarrega lista quando a busca muda (já com o dialog aberto)
  useEffect(() => {
    if (!drilldownOpen) return;
    void loadFirstPage(searchDebounced);
  }, [searchDebounced, drilldownOpen, loadFirstPage]);

  /** Carrega mais usuários (paginação). */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || users.length >= usersTotal) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchAdminUsersByPeriod(range.from, range.to, {
        search: searchDebounced,
        limit: PAGE_SIZE,
        offset: users.length,
      });
      setUsers(prev => [...prev, ...result.items]);
    } catch (err) {
      console.error('❌ [UsersRegisteredCard] Erro ao carregar mais:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, users.length, usersTotal, searchDebounced, range.from, range.to]);

  /** CSV export da página atual. */
  const handleExportCSV = useCallback(() => {
    if (users.length === 0) return;
    const header = ['Nome Completo', 'Email', 'Telefone', 'CPF/CNPJ', 'Plano', 'Cadastrado em'];
    const rows = users.map(u => [
      u.nome_completo,
      u.email,
      u.telefone ?? '',
      u.cpf_cnpj ?? '',
      getPlanName(u.plan_type),
      new Date(u.created_at).toLocaleString('pt-BR'),
    ]);
    const csv = [header, ...rows]
      .map(line => line.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios-periodo-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: '✅ Exportação concluída',
      description: `${users.length} usuário(s) exportados.`,
    });
  }, [users, toast]);

  /** Copia emails carregados. */
  const handleCopyEmails = useCallback(async () => {
    if (users.length === 0) return;
    const emails = users.map(u => u.email).filter(Boolean).join(', ');
    try {
      await navigator.clipboard.writeText(emails);
      setCopiedEmails(true);
      setTimeout(() => setCopiedEmails(false), 2000);
      toast({
        title: '📋 Emails copiados',
        description: `${users.length} email(s) na área de transferência.`,
      });
    } catch {
      toast({
        title: '❌ Erro ao copiar',
        description: 'Não foi possível copiar os emails.',
        variant: 'destructive',
      });
    }
  }, [users, toast]);

  // Derivados
  const isFiltered = preset !== 'all';
  const hasMore = users.length < usersTotal;
  const growthBadge = growthPct === null ? null : (
    <Badge
      variant="outline"
      className={`text-xs gap-1 ${
        growthPct >= 0
          ? 'border-green-300 text-green-700 bg-green-50'
          : 'border-red-300 text-red-700 bg-red-50'
      }`}
    >
      {growthPct >= 0 ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {growthPct >= 0 ? '+' : ''}
      {growthPct}% vs período anterior
    </Badge>
  );

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Usuários Cadastrados</CardTitle>
          <UsersIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {/* Contagem principal */}
          <div className="text-2xl font-bold text-purple-600">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              isFiltered ? totalFiltered : totalAll
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isFiltered
              ? `${range.label} (de ${totalAll} no total)`
              : 'Total de usuários'}
          </p>

          {/* Badge de variação */}
          {growthBadge && (
            <div className="mt-2">{growthBadge}</div>
          )}

          {/* Filtro de período */}
          <div className="mt-3 flex flex-wrap gap-1">
            {([
              { key: 'today', label: 'Hoje' },
              { key: '7d',    label: '7d' },
              { key: '30d',   label: '30d' },
              { key: '90d',   label: '90d' },
              { key: 'all',   label: 'Tudo' },
              { key: 'custom', label: 'Custom' },
            ] as { key: PresetKey; label: string }[]).map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPreset(p.key)}
                className={`px-2 py-0.5 rounded-md text-xs font-medium transition ${
                  preset === p.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Inputs de data quando custom */}
          {preset === 'custom' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="users-from" className="text-[10px] text-muted-foreground">
                  De
                </Label>
                <Input
                  id="users-from"
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label htmlFor="users-to" className="text-[10px] text-muted-foreground">
                  Até
                </Label>
                <Input
                  id="users-to"
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
            </div>
          )}

          {/* Botão de drilldown */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 -ml-2"
            onClick={handleOpenDrilldown}
            disabled={isLoading}
          >
            Ver usuários
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Drilldown dialog */}
      <Dialog open={drilldownOpen} onOpenChange={setDrilldownOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Usuários cadastrados — {range.label}
            </DialogTitle>
            <DialogDescription>
              {isLoadingUsers
                ? 'Carregando...'
                : `${users.length} de ${usersTotal} usuário(s) ${searchDebounced ? 'filtrado(s)' : ''}.`}
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="flex-1 relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, CPF/CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyEmails}
                disabled={users.length === 0}
              >
                {copiedEmails ? (
                  <>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar emails
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={users.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum usuário encontrado neste período
                  {searchDebounced ? ' com este filtro' : ''}.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition"
                  >
                    <Avatar className="h-10 w-10 border-2 border-purple-600 flex-shrink-0">
                      <AvatarImage src={user.selfie_url} alt={user.nome_completo} />
                      <AvatarFallback className="bg-purple-600 text-white text-sm">
                        {getInitials(user.nome_completo)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{user.nome_completo}</span>
                        {user.is_admin && (
                          <Badge className="bg-red-100 text-red-800 text-xs">Admin</Badge>
                        )}
                        {user.blocked && (
                          <Badge className="bg-gray-200 text-gray-800 text-xs">Bloqueado</Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {getPlanName(user.plan_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </span>
                        {user.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.telefone}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      <div className="text-[10px]">
                        {new Date(user.created_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <Button
                      variant="outline"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        <>Carregar mais ({usersTotal - users.length} restantes)</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}