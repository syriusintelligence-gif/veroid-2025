/**
 * PlanDistributionCard.tsx
 *
 * Card do AdminDashboard que mostra a distribuição de usuários por tipo de
 * plano (Free / Creator / Creator Pro / Creator Elite) e permite clicar em
 * cada plano para abrir um dialog com a lista paginada de usuários daquele
 * plano (drilldown para ações de marketing).
 *
 * Fonte de dados: RPCs `admin_plan_distribution` e `admin_list_users_by_plan`
 * (ver supabase/sql/admin_plan_distribution.sql).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Crown,
  Loader2,
  Search,
  Users as UsersIcon,
  Mail,
  Phone,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  fetchAdminPlanDistribution,
  fetchAdminUsersByPlan,
  type AdminPlanDistributionItem,
  type AdminUserByPlanRow,
} from '@/lib/admin-stats';
import { getPlanName } from '@/hooks/useSubscription';

const PAGE_SIZE = 25;

/**
 * Configuração visual por plano: cor da borda/fundo e gradient.
 * Mantida como const para facilitar futura customização.
 */
const PLAN_VISUALS: Record<
  string,
  { gradient: string; border: string; text: string; accent: string }
> = {
  free: {
    gradient: 'from-slate-50 to-slate-100',
    border: 'border-slate-300',
    text: 'text-slate-700',
    accent: 'text-slate-600',
  },
  creator: {
    gradient: 'from-blue-50 to-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-700',
    accent: 'text-blue-600',
  },
  creator_pro: {
    gradient: 'from-purple-50 to-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-700',
    accent: 'text-purple-600',
  },
  creator_elite: {
    gradient: 'from-amber-50 to-orange-100',
    border: 'border-amber-300',
    text: 'text-amber-700',
    accent: 'text-amber-600',
  },
};

function visualsFor(plan: string) {
  return PLAN_VISUALS[plan] ?? PLAN_VISUALS.free;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PlanDistributionCard() {
  const { toast } = useToast();

  // Distribuição agregada
  const [items, setItems] = useState<AdminPlanDistributionItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Drilldown
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planUsers, setPlanUsers] = useState<AdminUserByPlanRow[]>([]);
  const [planUsersTotal, setPlanUsersTotal] = useState(0);
  const [isLoadingPlanUsers, setIsLoadingPlanUsers] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [copiedAllEmails, setCopiedAllEmails] = useState(false);

  // Debounce da busca dentro do dialog
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  /** Carregamento da distribuição (carrega 1x no mount). */
  const loadDistribution = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchAdminPlanDistribution();
      setItems(result.items);
      setTotalUsers(result.total_users);
    } catch (err) {
      console.error('❌ [PlanDistributionCard] Erro ao carregar distribuição:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDistribution();
  }, [loadDistribution]);

  /** Carrega a primeira página de usuários do plano selecionado. */
  const loadFirstPage = useCallback(async (plan: string, searchTerm: string) => {
    setIsLoadingPlanUsers(true);
    try {
      const result = await fetchAdminUsersByPlan(plan, {
        search: searchTerm,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setPlanUsers(result.items);
      setPlanUsersTotal(result.total);
    } catch (err) {
      console.error('❌ [PlanDistributionCard] Erro ao carregar usuários do plano:', err);
      setPlanUsers([]);
      setPlanUsersTotal(0);
    } finally {
      setIsLoadingPlanUsers(false);
    }
  }, []);

  /** Quando o usuário clica num card de plano, abre o dialog e carrega dados. */
  const handleOpenPlan = useCallback((plan: string) => {
    setSelectedPlan(plan);
    setSearch('');
    setSearchDebounced('');
    setPlanUsers([]);
    setPlanUsersTotal(0);
    void loadFirstPage(plan, '');
  }, [loadFirstPage]);

  /** Carrega mais para o plano atualmente aberto. */
  const loadMore = useCallback(async () => {
    if (!selectedPlan || isLoadingMore || planUsers.length >= planUsersTotal) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchAdminUsersByPlan(selectedPlan, {
        search: searchDebounced,
        limit: PAGE_SIZE,
        offset: planUsers.length,
      });
      setPlanUsers(prev => [...prev, ...result.items]);
    } catch (err) {
      console.error('❌ [PlanDistributionCard] Erro ao carregar mais usuários:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [selectedPlan, isLoadingMore, planUsers.length, planUsersTotal, searchDebounced]);

  // Recarrega quando a busca muda (com debounce)
  useEffect(() => {
    if (!selectedPlan) return;
    void loadFirstPage(selectedPlan, searchDebounced);
  }, [searchDebounced, selectedPlan, loadFirstPage]);

  /** Exporta os usuários atualmente carregados do plano para CSV. */
  const handleExportCSV = useCallback(() => {
    if (planUsers.length === 0) return;

    const header = ['Nome Completo', 'Nome Público', 'Email', 'Telefone', 'CPF/CNPJ', 'Plano', 'Cadastrado em'];
    const rows = planUsers.map(u => [
      u.nome_completo,
      u.nome_publico ?? '',
      u.email,
      u.telefone ?? '',
      u.cpf_cnpj ?? '',
      getPlanName(u.plan_type),
      new Date(u.created_at).toLocaleString('pt-BR'),
    ]);

    const csv = [header, ...rows]
      .map(line =>
        line
          .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios-${selectedPlan ?? 'plano'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: '✅ Exportação concluída',
      description: `${planUsers.length} usuário(s) exportados para CSV.`,
    });
  }, [planUsers, selectedPlan, toast]);

  /** Copia todos os emails carregados para o clipboard (útil p/ marketing). */
  const handleCopyAllEmails = useCallback(async () => {
    if (planUsers.length === 0) return;
    const emails = planUsers.map(u => u.email).filter(Boolean).join(', ');
    try {
      await navigator.clipboard.writeText(emails);
      setCopiedAllEmails(true);
      setTimeout(() => setCopiedAllEmails(false), 2000);
      toast({
        title: '📋 Emails copiados',
        description: `${planUsers.length} email(s) copiados para a área de transferência.`,
      });
    } catch {
      toast({
        title: '❌ Erro ao copiar',
        description: 'Não foi possível copiar os emails.',
        variant: 'destructive',
      });
    }
  }, [planUsers, toast]);

  // Derivados
  const grandTotal = useMemo(() => items.reduce((acc, i) => acc + i.total, 0), [items]);
  const hasMore = planUsers.length < planUsersTotal;
  const selectedVisuals = selectedPlan ? visualsFor(selectedPlan) : null;

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-purple-600" />
            Distribuição por Plano
          </CardTitle>
          <CardDescription>
            Total de usuários por tipo de plano. Clique num card para ver os usuários e exportar (útil para campanhas).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {items.map(item => {
                const visuals = visualsFor(item.plan_type);
                const pct = grandTotal > 0
                  ? ((item.total / grandTotal) * 100).toFixed(1)
                  : '0';

                return (
                  <button
                    key={item.plan_type}
                    type="button"
                    onClick={() => handleOpenPlan(item.plan_type)}
                    className={`text-left rounded-xl border-2 ${visuals.border} bg-gradient-to-br ${visuals.gradient} p-4 transition hover:scale-[1.02] hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${visuals.text}`}>
                        {getPlanName(item.plan_type)}
                      </span>
                      <UsersIcon className={`h-4 w-4 ${visuals.accent}`} />
                    </div>
                    <div className={`text-3xl font-bold ${visuals.text}`}>
                      {item.total}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {pct}% do total
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="text-xs text-muted-foreground mt-4">
            Total geral: <strong>{totalUsers}</strong> usuário(s) cadastrado(s).
          </div>
        </CardContent>
      </Card>

      {/* Dialog drilldown */}
      <Dialog
        open={!!selectedPlan}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPlan(null);
            setPlanUsers([]);
            setPlanUsersTotal(0);
            setSearch('');
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className={`h-5 w-5 ${selectedVisuals?.accent ?? ''}`} />
              Usuários do plano {selectedPlan ? getPlanName(selectedPlan) : ''}
            </DialogTitle>
            <DialogDescription>
              {isLoadingPlanUsers
                ? 'Carregando...'
                : `${planUsers.length} de ${planUsersTotal} usuário(s) ${searchDebounced ? 'filtrado(s)' : ''}.`}
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
                onClick={handleCopyAllEmails}
                disabled={planUsers.length === 0}
                title="Copiar todos os emails da página atual"
              >
                {copiedAllEmails ? (
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
                disabled={planUsers.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto -mx-6 px-6">
            {isLoadingPlanUsers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : planUsers.length === 0 ? (
              <div className="text-center py-12">
                <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum usuário encontrado{searchDebounced ? ' com este filtro' : ''}.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {planUsers.map(user => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-slate-50 transition"
                  >
                    <Avatar className="h-10 w-10 border-2 border-blue-600 flex-shrink-0">
                      <AvatarImage src={user.selfie_url} alt={user.nome_completo} />
                      <AvatarFallback className="bg-blue-600 text-white text-sm">
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
                        {user.subscription_status && (
                          <Badge variant="outline" className="text-xs">
                            {user.subscription_status}
                          </Badge>
                        )}
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
                        <>Carregar mais ({planUsersTotal - planUsers.length} restantes)</>
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