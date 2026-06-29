/**
 * AdminAuditLogs.tsx
 *
 * Dashboard de Logs de Auditoria para Administradores
 *
 * Funcionalidades:
 * - Visualização de todos os logs de auditoria do sistema
 * - Filtros avançados (usuário, ação, período)
 * - Paginação "Carregar mais" otimizada via RPC
 * - Exportação para CSV
 * - Proteção CSRF
 * - Acesso restrito a administradores
 *
 * @author Vero iD Security Team
 * @version 1.1.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  ArrowLeft,
  FileText,
  Search,
  Download,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isCurrentUserAdmin, getUsers, type User as AppUser } from '@/lib/supabase-auth-v2';
import { exportAuditLogsToCSV, AuditAction } from '@/lib/audit-logger';
import { fetchAdminAuditLogs, type AdminAuditLogRow } from '@/lib/admin-stats';
import { getCSRFToken } from '@/lib/csrf-protection';
import { useToast } from '@/hooks/use-toast';

const PAGE_SIZE = 50;

export default function AdminAuditLogs() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estados de autenticação
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Estados de dados
  const [logs, setLogs] = useState<AdminAuditLogRow[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Estados de filtros
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 🔒 CSRF Protection
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfReady, setCsrfReady] = useState(false);

  /**
   * Inicializa token CSRF
   */
  useEffect(() => {
    let mounted = true;

    async function loadToken() {
      try {
        const token = await getCSRFToken();
        if (mounted) {
          setCsrfToken(token);
          setCsrfReady(true);
          console.log('🔐 [AdminAuditLogs] CSRF Token carregado');
        }
      } catch (error) {
        console.error('❌ [AdminAuditLogs] Erro ao carregar token CSRF:', error);
        if (mounted) {
          setCsrfReady(true);
        }
      }
    }

    loadToken();

    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Verifica se usuário é admin e carrega dados iniciais
   */
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const adminStatus = await isCurrentUserAdmin();
        if (!adminStatus) {
          toast({
            title: '🚫 Acesso Negado',
            description: 'Você não tem permissão para acessar esta página.',
            variant: 'destructive',
          });
          navigate('/dashboard');
          return;
        }

        setCurrentUser(user);
        setIsAuthorized(true);

        // Carrega lista de usuários para filtros (uso local, lista pequena)
        const users = await getUsers();
        setAllUsers(users);
      } catch (error) {
        console.error('❌ [AdminAuditLogs] Erro ao verificar autenticação:', error);
        navigate('/dashboard');
      }
    };
    checkAuthAndLoad();
  }, [navigate, toast]);

  /**
   * Converte os filtros do estado em parâmetros da RPC.
   */
  const buildFilters = useCallback(() => {
    const filters: {
      userId: string | null;
      action: string | null;
      startDate: Date | null;
      endDate: Date | null;
    } = {
      userId: filterUserId !== 'all' ? filterUserId : null,
      action: filterAction !== 'all' ? filterAction : null,
      startDate: filterStartDate ? new Date(filterStartDate) : null,
      endDate: null,
    };

    if (filterEndDate) {
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999);
      filters.endDate = endDate;
    }

    return filters;
  }, [filterUserId, filterAction, filterStartDate, filterEndDate]);

  /**
   * Carrega a PRIMEIRA página (reseta offset).
   */
  const loadFirstPage = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters = buildFilters();
      const result = await fetchAdminAuditLogs({
        ...filters,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setLogs(result.items);
      setTotalLogs(result.total);
      console.log(`✅ [AdminAuditLogs] ${result.items.length} logs carregados (total: ${result.total})`);
    } catch (error) {
      console.error('❌ [AdminAuditLogs] Erro ao carregar logs:', error);
      toast({
        title: '❌ Erro ao carregar logs',
        description: 'Não foi possível carregar os logs de auditoria.',
        variant: 'destructive',
      });
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setIsLoading(false);
    }
  }, [buildFilters, toast]);

  /**
   * Carrega mais (botão "Carregar mais").
   */
  const loadMore = useCallback(async () => {
    if (isLoadingMore || logs.length >= totalLogs) return;
    setIsLoadingMore(true);
    try {
      const filters = buildFilters();
      const result = await fetchAdminAuditLogs({
        ...filters,
        limit: PAGE_SIZE,
        offset: logs.length,
      });
      setLogs(prev => [...prev, ...result.items]);
    } catch (error) {
      console.error('❌ [AdminAuditLogs] Erro ao carregar mais logs:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [logs.length, totalLogs, isLoadingMore, buildFilters]);

  // Recarrega quando filtros mudam (após autorizado)
  useEffect(() => {
    if (!isAuthorized) return;
    void loadFirstPage();
  }, [isAuthorized, loadFirstPage]);

  /**
   * Exporta logs para CSV (usa a função existente, intacta)
   */
  const handleExportCSV = async () => {
    setIsExporting(true);

    try {
      console.log('📥 [AdminAuditLogs] Exportando logs para CSV...');

      const filters: {
        userId?: string;
        action?: AuditAction;
        startDate?: Date;
        endDate?: Date;
      } = {};

      if (filterUserId !== 'all') {
        filters.userId = filterUserId;
      }

      if (filterAction !== 'all') {
        filters.action = filterAction as AuditAction;
      }

      if (filterStartDate) {
        filters.startDate = new Date(filterStartDate);
      }

      if (filterEndDate) {
        const endDate = new Date(filterEndDate);
        endDate.setHours(23, 59, 59, 999);
        filters.endDate = endDate;
      }

      const csv = await exportAuditLogsToCSV(filters);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: '✅ Exportação concluída',
        description: 'Os logs foram exportados com sucesso.',
      });
    } catch (error) {
      console.error('❌ [AdminAuditLogs] Erro ao exportar logs:', error);
      toast({
        title: '❌ Erro ao exportar',
        description: 'Não foi possível exportar os logs.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Limpa todos os filtros
   */
  const handleClearFilters = () => {
    setFilterUserId('all');
    setFilterAction('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
  };

  /**
   * Formata data para exibição
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Lookup rápido de usuário por ID
  const userById = useMemo(() => {
    const map = new Map<string, AppUser>();
    allUsers.forEach(u => map.set(u.id, u));
    return map;
  }, [allUsers]);

  /**
   * Obtém nome do usuário pelo ID
   */
  const getUserName = useCallback((userId: string | null): string => {
    if (!userId) return 'Sistema';
    return userById.get(userId)?.nomeCompleto || 'Usuário Desconhecido';
  }, [userById]);

  /**
   * Obtém badge de status da ação
   */
  const getActionBadge = (action: string) => {
    const actionConfig: Record<string, { color: string; icon: React.ReactNode }> = {
      LOGIN: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
      LOGIN_FAILED: { color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
      LOGOUT: { color: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="h-3 w-3" /> },
      USER_CREATED: { color: 'bg-blue-100 text-blue-800', icon: <User className="h-3 w-3" /> },
      USER_UPDATED: { color: 'bg-yellow-100 text-yellow-800', icon: <User className="h-3 w-3" /> },
      USER_DELETED: { color: 'bg-red-100 text-red-800', icon: <User className="h-3 w-3" /> },
      ADMIN_ACTION: { color: 'bg-purple-100 text-purple-800', icon: <Shield className="h-3 w-3" /> },
      SECURITY_EVENT: { color: 'bg-orange-100 text-orange-800', icon: <AlertCircle className="h-3 w-3" /> },
    };

    const config = actionConfig[action] || { color: 'bg-gray-100 text-gray-800', icon: <FileText className="h-3 w-3" /> };

    return (
      <Badge className={`${config.color} hover:${config.color} flex items-center gap-1`}>
        {config.icon}
        {action}
      </Badge>
    );
  };

  /**
   * Filtra logs por termo de busca (busca local nos itens já carregados)
   */
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs;
    const searchLower = searchTerm.toLowerCase();
    return logs.filter(log => {
      const userName = getUserName(log.user_id).toLowerCase();
      const action = log.action.toLowerCase();
      const details = JSON.stringify(log.details).toLowerCase();
      return (
        userName.includes(searchLower) ||
        action.includes(searchLower) ||
        details.includes(searchLower)
      );
    });
  }, [logs, searchTerm, getUserName]);

  const hasMore = logs.length < totalLogs;

  // Se não autorizado, não renderiza nada
  if (!currentUser || !isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vero iD
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-600 hover:bg-red-700">
              <Lock className="h-3 w-3 mr-1" />
              Área Administrativa
            </Badge>
            <Button variant="outline" onClick={() => navigate('/admin/dashboard')}>
              Dashboard Admin
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Alerta de Segurança */}
        <Alert className="mb-6 border-red-200 bg-red-50">
          <Lock className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Área Restrita:</strong> Esta página contém logs sensíveis do sistema.
            Acesso permitido apenas para: <strong>{currentUser.email}</strong>
          </AlertDescription>
        </Alert>

        {/* CSRF Loading Alert */}
        {!csrfReady && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800">
              Carregando proteção de segurança...
            </AlertDescription>
          </Alert>
        )}

        {/* Título */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FileText className="h-10 w-10 text-blue-600" />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground">
            Visualize e analise todas as ações registradas no sistema
          </p>
        </div>

        {/* Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalLogs}
              </div>
              <p className="text-xs text-muted-foreground">Registros no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carregados</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
              <p className="text-xs text-muted-foreground">Nesta sessão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Filtros Ativos</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {[filterUserId !== 'all', filterAction !== 'all', filterStartDate, filterEndDate].filter(Boolean).length}
              </div>
              <p className="text-xs text-muted-foreground">Aplicados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resultados</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredLogs.length}</div>
              <p className="text-xs text-muted-foreground">Logs visíveis</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Busca
            </CardTitle>
            <CardDescription>
              Refine sua busca usando os filtros abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Filtro por Usuário */}
              <div className="space-y-2">
                <Label htmlFor="filter-user">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Usuário
                  </div>
                </Label>
                <Select value={filterUserId} onValueChange={setFilterUserId}>
                  <SelectTrigger id="filter-user">
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {allUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nomeCompleto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Ação */}
              <div className="space-y-2">
                <Label htmlFor="filter-action">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Ação
                  </div>
                </Label>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger id="filter-action">
                    <SelectValue placeholder="Todas as ações" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todas as ações</SelectItem>
                    {Object.values(AuditAction).map(action => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Data Inicial */}
              <div className="space-y-2">
                <Label htmlFor="filter-start-date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data Inicial
                  </div>
                </Label>
                <Input
                  id="filter-start-date"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>

              {/* Filtro por Data Final */}
              <div className="space-y-2">
                <Label htmlFor="filter-end-date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data Final
                  </div>
                </Label>
                <Input
                  id="filter-end-date"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Busca Local */}
            <div className="space-y-2 mb-4">
              <Label htmlFor="search-term">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Busca Local (nos resultados atuais)
                </div>
              </Label>
              <Input
                id="search-term"
                placeholder="Buscar por usuário, ação ou detalhes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                disabled={
                  filterUserId === 'all' &&
                  filterAction === 'all' &&
                  !filterStartDate &&
                  !filterEndDate &&
                  !searchTerm
                }
              >
                Limpar Filtros
              </Button>
              <Button
                variant="outline"
                onClick={loadFirstPage}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={isExporting || totalLogs === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar CSV'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Registros de Auditoria</CardTitle>
            <CardDescription>
              {isLoading
                ? 'Carregando...'
                : `${filteredLogs.length} log(s) visível(eis) • ${logs.length} de ${totalLogs} carregado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum log encontrado com os filtros aplicados
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Detalhes</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm whitespace-nowrap">
                            {formatDate(log.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {getUserName(log.user_id)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getActionBadge(log.action)}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ip_address || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Botão Carregar Mais */}
                {hasMore && (
                  <div className="flex items-center justify-center mt-6">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        <>Carregar mais ({totalLogs - logs.length} restantes)</>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hidden CSRF Token */}
      <input type="hidden" name="csrf_token" value={csrfToken || ''} />
    </div>
  );
}