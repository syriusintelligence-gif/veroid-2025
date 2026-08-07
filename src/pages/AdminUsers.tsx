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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Shield, ArrowLeft, Users, Search, Eye, Trash2, CheckCircle, AlertCircle,
  Lock, Edit, Ban, Loader2, Download, TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, isCurrentUserAdmin, updateUser, toggleBlockUser, deleteUser, type User } from '@/lib/supabase-auth-v2';
import {
  fetchAdminUsersV2,
  fetchAdminUtmSourceOptions,
  fetchAdminUsersForExport,
  type AdminUserRow,
  type AdminUtmSourceOption,
} from '@/lib/admin-stats';
import { getCSRFToken } from '@/lib/csrf-protection';
import { useToast } from '@/hooks/use-toast';

// Quantidade de itens carregados por página no botão "Carregar mais".
const PAGE_SIZE = 25;

/**
 * User estendido com campos UTM (Fase 2). Mantém 100% de compatibilidade
 * com o tipo `User` do resto do app — os campos UTM são opcionais.
 */
type UserWithUtm = User & {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  utmCapturedAt?: string | null;
  utmReferrer?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
};

/**
 * Converte uma linha do payload da RPC `admin_list_users_v2` (snake_case)
 * para o formato `UserWithUtm` (camelCase) usado pelo componente.
 */
function adaptAdminUser(row: AdminUserRow): UserWithUtm {
  return {
    id: row.id,
    nomeCompleto: row.nome_completo,
    nomePublico: row.nome_publico,
    email: row.email,
    cpfCnpj: row.cpf_cnpj,
    telefone: row.telefone,
    documentoUrl: row.documento_url,
    selfieUrl: row.selfie_url,
    createdAt: row.created_at,
    verified: row.verified,
    isAdmin: row.is_admin,
    blocked: row.blocked,
    // UTM (opcionais)
    utmSource: row.utm_source ?? null,
    utmMedium: row.utm_medium ?? null,
    utmCampaign: row.utm_campaign ?? null,
    utmTerm: row.utm_term ?? null,
    utmContent: row.utm_content ?? null,
    utmCapturedAt: row.utm_captured_at ?? null,
    utmReferrer: row.utm_referrer ?? null,
    gclid: row.gclid ?? null,
    fbclid: row.fbclid ?? null,
  };
}

/**
 * Escape seguro para valores de célula CSV.
 * - Envolve em aspas duplas
 * - Duplica aspas duplas internas
 * - Trata null/undefined como string vazia
 */
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  const needsQuote = /[",\n\r;]/.test(str);
  const escaped = str.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

/**
 * Constrói CSV pronto para Excel (BOM UTF-8 + separador ; que o Excel BR entende
 * sem precisar de "Text to Columns"). Cabeçalho em português.
 */
function buildUsersCsv(rows: AdminUserRow[]): string {
  const headers = [
    'ID', 'Nome Completo', 'Nome Público', 'Email', 'CPF/CNPJ', 'Telefone',
    'Verificado', 'Admin', 'Bloqueado', 'Data de Cadastro',
    // UTM columns
    'UTM Source (Origem)', 'UTM Medium (Mídia)', 'UTM Campaign (Campanha)',
    'UTM Term (Termo)', 'UTM Content (Conteúdo)',
    'UTM Capturado em', 'UTM Referrer', 'Google Click ID (gclid)', 'Facebook Click ID (fbclid)',
  ];

  const lines: string[] = [];
  lines.push(headers.map(csvEscape).join(';'));

  for (const r of rows) {
    lines.push([
      r.id,
      r.nome_completo,
      r.nome_publico,
      r.email,
      r.cpf_cnpj,
      r.telefone,
      r.verified ? 'Sim' : 'Não',
      r.is_admin ? 'Sim' : 'Não',
      r.blocked ? 'Sim' : 'Não',
      r.created_at,
      r.utm_source ?? '',
      r.utm_medium ?? '',
      r.utm_campaign ?? '',
      r.utm_term ?? '',
      r.utm_content ?? '',
      r.utm_captured_at ?? '',
      r.utm_referrer ?? '',
      r.gclid ?? '',
      r.fbclid ?? '',
    ].map(csvEscape).join(';'));
  }

  // BOM UTF-8 para Excel BR reconhecer acentos
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Faz o download do CSV como arquivo local.
 */
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

export default function AdminUsers() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<UserWithUtm[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [withUtmCount, setWithUtmCount] = useState(0);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchTermDebounced, setSearchTermDebounced] = useState('');

  // 🆕 Fase 2: filtro por origem (utm_source)
  const [utmSourceFilter, setUtmSourceFilter] = useState<string>('all');
  const [utmSourceOptions, setUtmSourceOptions] = useState<AdminUtmSourceOption[]>([]);

  const [selectedUser, setSelectedUser] = useState<UserWithUtm | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados para edição
  const [editNomeCompleto, setEditNomeCompleto] = useState('');
  const [editNomePublico, setEditNomePublico] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editTelefone, setEditTelefone] = useState('');

  // 🔒 CSRF Protection
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [csrfReady, setCsrfReady] = useState(false);

  // Inicializa token CSRF
  useEffect(() => {
    let mounted = true;

    async function loadToken() {
      try {
        const token = await getCSRFToken();
        if (mounted) {
          setCsrfToken(token);
          setCsrfReady(true);
          console.log('🔐 [AdminUsers] CSRF Token carregado:', token.substring(0, 20) + '...');
        }
      } catch (error) {
        console.error('❌ [AdminUsers] Erro ao carregar token CSRF:', error);
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

  // Debounce do campo de busca
  useEffect(() => {
    const handle = setTimeout(() => setSearchTermDebounced(searchTerm), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const adminStatus = await isCurrentUserAdmin();
      if (!adminStatus) {
        navigate('/dashboard');
        return;
      }

      setCurrentUser(user);
      setIsAuthorized(true);
    };
    checkAuth();
  }, [navigate]);

  // 🆕 Carrega opções de UTM source apenas uma vez após autorização
  useEffect(() => {
    if (!isAuthorized) return;
    (async () => {
      try {
        const opts = await fetchAdminUtmSourceOptions();
        setUtmSourceOptions(opts);
      } catch (err) {
        console.error('❌ [AdminUsers] Erro ao carregar utm_source options:', err);
      }
    })();
  }, [isAuthorized]);

  /**
   * Carrega a PRIMEIRA página da lista (zera offset).
   */
  const loadFirstPage = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const utmSource = utmSourceFilter === 'all' ? null : utmSourceFilter;
      const result = await fetchAdminUsersV2({
        search: searchTermDebounced,
        utmSource,
        limit: PAGE_SIZE,
        offset: 0,
      });
      setUsers(result.items.map(adaptAdminUser));
      setTotalUsers(result.total);
      setVerifiedCount(result.verified_count);
      setAdminCount(result.admin_count);
      setTodayCount(result.today_count);
      setWithUtmCount(result.with_utm_count ?? 0);
    } catch (err) {
      console.error('❌ [AdminUsers] Erro ao carregar usuários:', err);
      setUsers([]);
      setTotalUsers(0);
    } finally {
      setIsLoadingList(false);
    }
  }, [searchTermDebounced, utmSourceFilter]);

  // Botão "Carregar mais"
  const loadMore = useCallback(async () => {
    if (isLoadingMore || users.length >= totalUsers) return;
    setIsLoadingMore(true);
    try {
      const utmSource = utmSourceFilter === 'all' ? null : utmSourceFilter;
      const result = await fetchAdminUsersV2({
        search: searchTermDebounced,
        utmSource,
        limit: PAGE_SIZE,
        offset: users.length,
      });
      setUsers(prev => [...prev, ...result.items.map(adaptAdminUser)]);
    } catch (err) {
      console.error('❌ [AdminUsers] Erro ao carregar mais usuários:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [users.length, totalUsers, isLoadingMore, searchTermDebounced, utmSourceFilter]);

  // Carrega lista quando autorizado ou quando filtros mudam
  useEffect(() => {
    if (!isAuthorized) return;
    void loadFirstPage();
  }, [isAuthorized, loadFirstPage]);

  // Recarrega após operações de mutação (edit/block/delete)
  const refreshList = useCallback(async () => {
    await loadFirstPage();
  }, [loadFirstPage]);

  // 🆕 Handler: exportar CSV (respeita filtros atuais)
  const handleExportCsv = useCallback(async () => {
    setIsExporting(true);
    try {
      const utmSource = utmSourceFilter === 'all' ? null : utmSourceFilter;
      const rows = await fetchAdminUsersForExport({
        search: searchTermDebounced,
        utmSource,
      });

      if (rows.length === 0) {
        toast({
          title: 'Nenhum usuário para exportar',
          description: 'Ajuste os filtros e tente novamente.',
        });
        return;
      }

      const csv = buildUsersCsv(rows);
      const ts = new Date().toISOString().slice(0, 10);
      const suffix = utmSource ? `_${utmSource}` : '';
      downloadCsv(`vero_usuarios${suffix}_${ts}.csv`, csv);

      toast({
        title: '✅ Exportação concluída',
        description: `${rows.length} usuário(s) exportado(s) para CSV.`,
      });
    } catch (err) {
      console.error('❌ [AdminUsers] Erro ao exportar CSV:', err);
      toast({
        title: '❌ Erro ao exportar',
        description: 'Não foi possível gerar o CSV. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, [searchTermDebounced, utmSourceFilter, toast]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleViewDetails = (user: UserWithUtm) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (user: UserWithUtm) => {
    setSelectedUser(user);
    setEditNomeCompleto(user.nomeCompleto);
    setEditNomePublico(user.nomePublico);
    setEditEmail(user.email);
    setEditTelefone(user.telefone);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    if (!csrfToken) {
      toast({
        title: 'Erro de Segurança',
        description: 'Token de segurança não disponível. Recarregue a página.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateUser(selectedUser.id, {
        nomeCompleto: editNomeCompleto,
        nomePublico: editNomePublico,
        email: editEmail,
        telefone: editTelefone,
      });

      if (result.success) {
        toast({
          title: "✅ Usuário atualizado",
          description: "Os dados do usuário foram atualizados com sucesso.",
        });
        await refreshList();
        setIsEditDialogOpen(false);
      } else {
        toast({
          title: "❌ Erro ao atualizar",
          description: result.error || "Não foi possível atualizar o usuário.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Ocorreu um erro ao atualizar o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBlockDialog = (user: UserWithUtm) => {
    setSelectedUser(user);
    setIsBlockDialogOpen(true);
  };

  const handleToggleBlock = async () => {
    if (!selectedUser) return;

    if (!csrfToken) {
      toast({
        title: 'Erro de Segurança',
        description: 'Token de segurança não disponível. Recarregue a página.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const newBlockedStatus = !selectedUser.blocked;
      const result = await toggleBlockUser(selectedUser.id, newBlockedStatus);

      if (result.success) {
        toast({
          title: newBlockedStatus ? "🚫 Usuário bloqueado" : "✅ Usuário desbloqueado",
          description: newBlockedStatus
            ? "O usuário foi bloqueado e não poderá mais acessar o sistema."
            : "O usuário foi desbloqueado e pode acessar o sistema novamente.",
        });
        await refreshList();
        setIsBlockDialogOpen(false);
      } else {
        toast({
          title: "❌ Erro",
          description: result.error || "Não foi possível alterar o status do usuário.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Ocorreu um erro ao alterar o status do usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDeleteDialog = (user: UserWithUtm) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    if (!csrfToken) {
      toast({
        title: 'Erro de Segurança',
        description: 'Token de segurança não disponível. Recarregue a página.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await deleteUser(selectedUser.id);

      if (result.success) {
        toast({
          title: "🗑️ Usuário excluído",
          description: "O usuário foi excluído permanentemente do sistema.",
        });
        await refreshList();
        setIsDeleteDialogOpen(false);
      } else {
        toast({
          title: "❌ Erro ao excluir",
          description: result.error || "Não foi possível excluir o usuário.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erro",
        description: "Ocorreu um erro ao excluir o usuário.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasMore = useMemo(() => users.length < totalUsers, [users.length, totalUsers]);

  const hasActiveFilter = useMemo(
    () => searchTermDebounced.length > 0 || utmSourceFilter !== 'all',
    [searchTermDebounced, utmSourceFilter]
  );

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
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Alert className="mb-6 border-red-200 bg-red-50">
          <Lock className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Área Restrita:</strong> Esta página é visível apenas para administradores do sistema.
            Você está logado como: <strong>{currentUser.email}</strong>
          </AlertDescription>
        </Alert>

        {!csrfReady && (
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800">
              Carregando proteção de segurança...
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Users className="h-10 w-10 text-blue-600" />
            Gerenciamento de Usuários
          </h1>
          <p className="text-muted-foreground">Visualize e gerencie todos os usuários cadastrados no sistema</p>
        </div>

        {/* Estatísticas — agora com card de "Com UTM" */}
        <div className="grid md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingList ? <Loader2 className="h-6 w-6 animate-spin" /> : totalUsers}
              </div>
              <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verificados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isLoadingList ? <Loader2 className="h-6 w-6 animate-spin" /> : verifiedCount}
              </div>
              <p className="text-xs text-muted-foreground">Contas verificadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Shield className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {isLoadingList ? <Loader2 className="h-6 w-6 animate-spin" /> : adminCount}
              </div>
              <p className="text-xs text-muted-foreground">Usuários admin</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cadastros Hoje</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {isLoadingList ? <Loader2 className="h-6 w-6 animate-spin" /> : todayCount}
              </div>
              <p className="text-xs text-muted-foreground">Novos usuários</p>
            </CardContent>
          </Card>

          {/* 🆕 Card de rastreamento UTM */}
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Rastreamento (UTM)</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {isLoadingList ? <Loader2 className="h-6 w-6 animate-spin" /> : withUtmCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Origem identificada
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros + Exportar */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar e Filtrar Usuários
            </CardTitle>
            <CardDescription>
              Pesquise por nome, email, CPF/CNPJ, nome público, campanha ou origem UTM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-[1fr_240px_auto] gap-3 items-end">
              <div>
                <Label htmlFor="search-users" className="text-xs mb-1 block">Buscar</Label>
                <Input
                  id="search-users"
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="utm-filter" className="text-xs mb-1 block">Origem (UTM Source)</Label>
                <Select value={utmSourceFilter} onValueChange={setUtmSourceFilter}>
                  <SelectTrigger id="utm-filter">
                    <SelectValue placeholder="Todas as origens" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as origens</SelectItem>
                    <SelectItem value="__none__">Sem UTM (orgânico/direto)</SelectItem>
                    {utmSourceOptions.map((opt) => (
                      <SelectItem key={opt.utm_source} value={opt.utm_source}>
                        {opt.utm_source} ({opt.total})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                {(searchTerm || utmSourceFilter !== 'all') && (
                  <Button
                    variant="outline"
                    onClick={() => { setSearchTerm(''); setUtmSourceFilter('all'); }}
                  >
                    Limpar
                  </Button>
                )}
                <Button
                  variant="default"
                  onClick={handleExportCsv}
                  disabled={isExporting || isLoadingList}
                  className="bg-green-600 hover:bg-green-700"
                  title="Exportar todos os usuários (respeitando filtros) para CSV"
                >
                  {isExporting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Exportando...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-2" /> Exportar CSV</>
                  )}
                </Button>
              </div>
            </div>

            {hasActiveFilter && (
              <p className="text-sm text-muted-foreground mt-3">
                Encontrados: {users.length} de {totalUsers} usuários
                {utmSourceFilter !== 'all' && (
                  <> · Filtro de origem: <Badge variant="secondary" className="ml-1">{utmSourceFilter}</Badge></>
                )}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              {isLoadingList ? 'Carregando...' : `${users.length} de ${totalUsers} usuário(s) carregado(s)`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingList ? (
              <div className="text-center py-12">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {hasActiveFilter ? 'Nenhum usuário encontrado com os critérios de busca' : 'Nenhum usuário cadastrado ainda'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>CPF/CNPJ</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border-2 border-blue-600">
                                <AvatarImage src={user.selfieUrl} alt={user.nomeCompleto} />
                                <AvatarFallback className="bg-blue-600 text-white">
                                  {getInitials(user.nomeCompleto)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.nomeCompleto}</p>
                                {user.nomePublico && user.nomePublico !== user.nomeCompleto && (
                                  <p className="text-xs text-muted-foreground">@{user.nomePublico}</p>
                                )}
                                <div className="flex gap-1 mt-1">
                                  {user.isAdmin && (
                                    <Badge className="bg-red-100 text-red-800 text-xs">
                                      Admin
                                    </Badge>
                                  )}
                                  {user.blocked && (
                                    <Badge className="bg-gray-100 text-gray-800 text-xs">
                                      Bloqueado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="font-mono text-sm">{user.cpfCnpj}</TableCell>
                          <TableCell>{user.telefone}</TableCell>
                          {/* 🆕 Coluna de Origem UTM */}
                          <TableCell>
                            {user.utmSource ? (
                              <div className="flex flex-col gap-0.5">
                                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-xs w-fit">
                                  {user.utmSource}
                                </Badge>
                                {user.utmCampaign && (
                                  <span className="text-xs text-muted-foreground truncate max-w-[160px]" title={user.utmCampaign}>
                                    {user.utmCampaign}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Direto/Orgânico</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.verified ? (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verificado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(user)}
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenEditDialog(user)}
                                title="Editar usuário"
                                disabled={!csrfReady || !csrfToken}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenBlockDialog(user)}
                                title={user.blocked ? "Desbloquear usuário" : "Bloquear usuário"}
                                disabled={!csrfReady || !csrfToken}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDeleteDialog(user)}
                                title="Excluir usuário"
                                className="text-red-600 hover:text-red-700"
                                disabled={!csrfReady || !csrfToken}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-6">
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
                        <>Carregar mais ({totalUsers - users.length} restantes)</>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Dialog de Detalhes */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes do Usuário</DialogTitle>
              <DialogDescription>
                Informações completas do usuário selecionado
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border-4 border-blue-600">
                    <AvatarImage src={selectedUser.selfieUrl} alt={selectedUser.nomeCompleto} />
                    <AvatarFallback className="bg-blue-600 text-white text-2xl">
                      {getInitials(selectedUser.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">{selectedUser.nomeCompleto}</h3>
                    <p className="text-muted-foreground">@{selectedUser.nomePublico}</p>
                    <div className="flex gap-2 mt-2">
                      {selectedUser.isAdmin && (
                        <Badge className="bg-red-100 text-red-800">Admin</Badge>
                      )}
                      {selectedUser.verified && (
                        <Badge className="bg-green-100 text-green-800">Verificado</Badge>
                      )}
                      {selectedUser.blocked && (
                        <Badge className="bg-gray-100 text-gray-800">Bloqueado</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CPF/CNPJ</Label>
                    <p className="font-medium font-mono">{selectedUser.cpfCnpj}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{selectedUser.telefone}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Cadastro</Label>
                    <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                </div>

                {/* 🆕 Bloco de rastreamento UTM (Fase 2) */}
                <div className="border rounded-lg p-4 bg-purple-50/50 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      Origem do Lead (UTM Tracking)
                    </Label>
                    {selectedUser.utmSource ? (
                      <Badge className="bg-purple-100 text-purple-800">Rastreado</Badge>
                    ) : (
                      <Badge variant="secondary">Sem rastreamento</Badge>
                    )}
                  </div>

                  {selectedUser.utmSource ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Origem (utm_source)</Label>
                        <p className="font-medium">{selectedUser.utmSource}</p>
                      </div>
                      {selectedUser.utmMedium && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Mídia (utm_medium)</Label>
                          <p className="font-medium">{selectedUser.utmMedium}</p>
                        </div>
                      )}
                      {selectedUser.utmCampaign && (
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">Campanha (utm_campaign)</Label>
                          <p className="font-medium break-all">{selectedUser.utmCampaign}</p>
                        </div>
                      )}
                      {selectedUser.utmTerm && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Termo (utm_term)</Label>
                          <p className="font-medium">{selectedUser.utmTerm}</p>
                        </div>
                      )}
                      {selectedUser.utmContent && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Conteúdo (utm_content)</Label>
                          <p className="font-medium">{selectedUser.utmContent}</p>
                        </div>
                      )}
                      {selectedUser.utmCapturedAt && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Capturado em</Label>
                          <p className="font-medium">{formatDate(selectedUser.utmCapturedAt)}</p>
                        </div>
                      )}
                      {selectedUser.utmReferrer && (
                        <div className="col-span-2">
                          <Label className="text-xs text-muted-foreground">Referrer</Label>
                          <p className="font-medium text-xs break-all">{selectedUser.utmReferrer}</p>
                        </div>
                      )}
                      {(selectedUser.gclid || selectedUser.fbclid) && (
                        <div className="col-span-2 flex flex-wrap gap-2 pt-2 border-t">
                          {selectedUser.gclid && (
                            <Badge variant="outline" className="text-xs" title={selectedUser.gclid}>
                              🔵 Google Ads (gclid)
                            </Badge>
                          )}
                          {selectedUser.fbclid && (
                            <Badge variant="outline" className="text-xs" title={selectedUser.fbclid}>
                              🔷 Meta Ads (fbclid)
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Este usuário se cadastrou por acesso direto ou orgânico (sem parâmetros UTM na URL).
                    </p>
                  )}
                </div>

                {/* Documento de Identidade */}
                {selectedUser.documentoUrl && (() => {
                  const docUrl = selectedUser.documentoUrl;
                  const isPdf = docUrl.startsWith('data:application/pdf');
                  const isImage = docUrl.startsWith('data:image/');
                  const formatoLabel = isPdf ? 'PDF' : (isImage ? 'JPEG' : 'Documento');
                  const safeName = selectedUser.nomeCompleto
                    ? selectedUser.nomeCompleto.replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase()
                    : 'usuario';
                  const downloadName = `documento_${safeName}.${isPdf ? 'pdf' : 'jpg'}`;
                  return (
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-semibold">Documento de Identidade</Label>
                          <Badge variant="secondary" className="text-xs">{formatoLabel}</Badge>
                        </div>
                      </div>

                      <Alert className="border-yellow-200 bg-yellow-50 py-2">
                        <Lock className="h-4 w-4 text-yellow-700" />
                        <AlertDescription className="text-yellow-900 text-xs">
                          <strong>Dado pessoal sensível — LGPD aplicável.</strong> Acesso restrito a administradores.
                        </AlertDescription>
                      </Alert>

                      {isImage && (
                        <div className="flex justify-center bg-white rounded border overflow-hidden">
                          <img
                            src={docUrl}
                            alt="Documento de identidade"
                            className="max-h-48 w-auto object-contain"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {isPdf && (
                        <div className="flex items-center justify-center bg-white rounded border py-6 text-sm text-muted-foreground">
                          Documento em formato PDF — use os botões abaixo para visualizar ou baixar.
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(docUrl, '_blank', 'noopener,noreferrer')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {isPdf ? 'Abrir PDF em nova aba' : 'Ver em tamanho grande'}
                        </Button>
                        <a
                          href={docUrl}
                          download={downloadName}
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                        >
                          ↓ Baixar documento
                        </a>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Edição */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
              <DialogDescription>
                Altere as informações do usuário selecionado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editNomeCompleto">Nome Completo</Label>
                <Input
                  id="editNomeCompleto"
                  value={editNomeCompleto}
                  onChange={(e) => setEditNomeCompleto(e.target.value)}
                  disabled={!csrfReady || !csrfToken}
                />
              </div>
              <div>
                <Label htmlFor="editNomePublico">Nome Público</Label>
                <Input
                  id="editNomePublico"
                  value={editNomePublico}
                  onChange={(e) => setEditNomePublico(e.target.value)}
                  disabled={!csrfReady || !csrfToken}
                />
              </div>
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  disabled={!csrfReady || !csrfToken}
                />
              </div>
              <div>
                <Label htmlFor="editTelefone">Telefone</Label>
                <Input
                  id="editTelefone"
                  value={editTelefone}
                  onChange={(e) => setEditTelefone(e.target.value)}
                  disabled={!csrfReady || !csrfToken}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={isLoading || !csrfToken}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog de Bloqueio */}
        <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedUser?.blocked ? 'Desbloquear Usuário' : 'Bloquear Usuário'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedUser?.blocked
                  ? `Tem certeza que deseja desbloquear ${selectedUser?.nomeCompleto}? O usuário poderá acessar o sistema novamente.`
                  : `Tem certeza que deseja bloquear ${selectedUser?.nomeCompleto}? O usuário não poderá mais acessar o sistema.`
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleBlock} disabled={isLoading || !csrfToken}>
                {isLoading ? 'Processando...' : (selectedUser?.blocked ? 'Desbloquear' : 'Bloquear')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialog de Exclusão */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Usuário Permanentemente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir permanentemente {selectedUser?.nomeCompleto}?
                Esta ação não pode ser desfeita e todos os dados do usuário serão removidos do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                disabled={isLoading || !csrfToken}
                className="bg-red-600 hover:bg-red-700"
              >
                {isLoading ? 'Excluindo...' : 'Excluir Permanentemente'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Hidden CSRF Token */}
      <input type="hidden" name="csrf_token" value={csrfToken || ''} />
    </div>
  );
}