import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Shield,
  FileText,
  Eye,
  ArrowLeft,
  User,
  LogOut,
  Settings,
  Home,
  Search,
  Calendar,
  ArrowUpDown,
  Users,
  Download,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isCurrentUserAdmin, type User as UserType } from '@/lib/supabase-auth-v2';
import { SignedContent } from '@/lib/supabase-crypto';
import {
  fetchAdminDashboardStats,
  fetchAdminSignedContents,
  fetchAdminUserOptions,
  adaptAdminSignedContent,
  type AdminDashboardStats,
  type AdminUserOption,
  type AdminListContentsFilters,
} from '@/lib/admin-stats';
import ContentCard from '@/components/ContentCard';
import PlanDistributionCard from '@/components/admin/PlanDistributionCard';
import UsersRegisteredCard from '@/components/admin/UsersRegisteredCard';
import EngagementMetricsCards from '@/components/admin/EngagementMetricsCards';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Quantidade de itens carregados por página no botão "Carregar mais".
const PAGE_SIZE = 24;

type SortOption = 'recent' | 'most-verified' | 'least-verified' | 'alphabetical';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);

  // Estatísticas agregadas (vêm prontas do Postgres via RPC)
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Lista paginada de conteúdos
  const [contents, setContents] = useState<SignedContent[]>([]);
  const [totalContents, setTotalContents] = useState(0);
  const [isLoadingContents, setIsLoadingContents] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Opções de usuário do filtro (apenas autores que possuem conteúdo)
  const [userOptions, setUserOptions] = useState<AdminUserOption[]>([]);

  // Filtros
  const [searchTitle, setSearchTitle] = useState('');
  const [searchTitleDebounced, setSearchTitleDebounced] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  // Debounce do campo de busca para evitar uma RPC por tecla
  useEffect(() => {
    const handle = setTimeout(() => setSearchTitleDebounced(searchTitle), 300);
    return () => clearTimeout(handle);
  }, [searchTitle]);

  // Mapeia filterDate -> p_days
  const daysFromFilter = useMemo<number | null>(() => {
    switch (filterDate) {
      case 'today':
        return 1;
      case 'week':
        return 7;
      case 'month':
        return 30;
      case 'year':
        return 365;
      default:
        return null;
    }
  }, [filterDate]);

  // Monta o pacote de filtros que vai para a RPC.
  const currentFilters = useMemo<AdminListContentsFilters>(() => ({
    search:   searchTitleDebounced,
    userId:   filterUser,
    platform: filterPlatform,
    days:     daysFromFilter,
    sort:     sortBy,
    limit:    PAGE_SIZE,
    offset:   0,
  }), [searchTitleDebounced, filterUser, filterPlatform, daysFromFilter, sortBy]);

  /* --------------------------- Autenticação --------------------------- */

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
    };
    checkAuth();
  }, [navigate]);

  /* --------------------------- Carregamentos --------------------------- */

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const next = await fetchAdminDashboardStats();
      setStats(next);
    } catch (err) {
      console.error('❌ [AdminDashboard] Erro ao carregar estatísticas:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const loadUserOptions = useCallback(async () => {
    try {
      const opts = await fetchAdminUserOptions();
      setUserOptions(opts);
    } catch (err) {
      console.error('❌ [AdminDashboard] Erro ao carregar opções de usuário:', err);
    }
  }, []);

  // Recarrega a primeira página da lista de conteúdos sempre que os filtros mudarem.
  const loadFirstPage = useCallback(async () => {
    setIsLoadingContents(true);
    try {
      const { items, total } = await fetchAdminSignedContents(currentFilters);
      setContents(items.map(adaptAdminSignedContent));
      setTotalContents(total);
    } catch (err) {
      console.error('❌ [AdminDashboard] Erro ao carregar conteúdos:', err);
      setContents([]);
      setTotalContents(0);
    } finally {
      setIsLoadingContents(false);
    }
  }, [currentFilters]);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || contents.length >= totalContents) return;
    setIsLoadingMore(true);
    try {
      const { items } = await fetchAdminSignedContents({
        ...currentFilters,
        offset: contents.length,
      });
      setContents(prev => [...prev, ...items.map(adaptAdminSignedContent)]);
    } catch (err) {
      console.error('❌ [AdminDashboard] Erro ao carregar mais conteúdos:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [contents.length, totalContents, isLoadingMore, currentFilters]);

  // Carregamento inicial (stats + lista + opções) — em paralelo
  useEffect(() => {
    if (!currentUser) return;
    void loadStats();
    void loadUserOptions();
  }, [currentUser, loadStats, loadUserOptions]);

  // Recarrega lista a cada mudança nos filtros (depois de autenticado)
  useEffect(() => {
    if (!currentUser) return;
    void loadFirstPage();
  }, [currentUser, loadFirstPage]);

  // Botão "Atualizar"
  const handleRefresh = useCallback(async () => {
    await Promise.all([loadStats(), loadFirstPage(), loadUserOptions()]);
  }, [loadStats, loadFirstPage, loadUserOptions]);

  /* --------------------------- Helpers UI --------------------------- */

  const handleVerify = (id: string) => {
    navigate(`/verify?id=${id}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleClearFilters = useCallback(() => {
    setSearchTitle('');
    setFilterUser('all');
    setFilterPlatform('all');
    setFilterDate('all');
    setSortBy('recent');
  }, []);

  /* --------------------------- Derivados (useMemo) --------------------------- */

  const totalVerifications = stats?.total_verifications ?? 0;
  const totalAuthors = stats?.total_users ?? 0;
  const totalContentsGlobal = stats?.total_contents ?? 0;
  const averageVerifications = useMemo(() => {
    if (!stats || stats.total_contents === 0) return '0';
    return (stats.total_verifications / stats.total_contents).toFixed(1);
  }, [stats]);

  const timelineData = useMemo(() => {
    if (!stats) return [];
    return stats.timeline.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
    }));
  }, [stats]);

  const userStatsData = useMemo(() => {
    if (!stats) return [];
    return stats.top_users.map(u => ({
      nome: u.nome,
      assinaturas: u.assinaturas,
      verificacoes: u.verificacoes,
    }));
  }, [stats]);

  const platformData = useMemo(() => {
    // Ordena do mais relevante para o menos relevante (decrescente por valor).
    // Isso garante que a fatia maior fique no topo da legenda e o gráfico
    // siga uma sequência visual lógica.
    const raw = stats?.platforms ?? [];
    return [...raw].sort((a, b) => b.value - a.value);
  }, [stats]);

  // Total absoluto das plataformas (soma de todas as fatias) — usado para
  // calcular o percentual exibido na legenda lateral.
  const platformsTotal = useMemo(
    () => platformData.reduce((acc, p) => acc + p.value, 0),
    [platformData]
  );

  const allPlatformOptions = useMemo(() => {
    const set = new Set<string>();
    platformData.forEach(p => set.add(p.name));
    // Plataformas só vindas do payload de stats podem não cobrir 100% se nenhum
    // conteúdo na janela ainda — mas o filtro é por valor exato e o resultado
    // vazio é tratado. Isso evita uma query extra.
    return Array.from(set).sort();
  }, [platformData]);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f43f5e'];

  /* --------------------------- Exportações --------------------------- */
  // Exporta usando a lista JÁ CARREGADA (paginada). Para volumes grandes o
  // usuário pode aplicar filtros mais estreitos antes de exportar.

  const exportToPDF = () => {
    const doc = new jsPDF();
    const list = contents;

    doc.setFontSize(18);
    doc.text('Relatório Administrativo - Vero iD', 14, 20);

    doc.setFontSize(12);
    doc.text(`Total de Conteúdos Assinados: ${totalContentsGlobal}`, 14, 35);
    doc.text(`Total de Verificações: ${totalVerifications}`, 14, 42);
    doc.text(`Total de Usuários: ${totalAuthors}`, 14, 49);
    doc.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}`, 14, 56);
    doc.setFontSize(9);
    doc.text(
      `Exportação contém ${list.length} de ${totalContents} conteúdo(s) carregados nesta sessão.`,
      14, 62
    );

    const tableData = list.map(content => [
      content.content.substring(0, 50) + (content.content.length > 50 ? '...' : ''),
      content.creatorName ?? '—',
      new Date(content.createdAt).toLocaleDateString('pt-BR'),
      (content.verificationCount || 0).toString(),
      content.platforms?.join(', ') || 'N/A',
    ]);

    (doc as unknown as { autoTable: (opts: Record<string, unknown>) => void }).autoTable({
      startY: 70,
      head: [['Conteúdo', 'Criador', 'Data', 'Verificações', 'Plataformas']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });

    doc.save(`relatorio-veroid-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const list = contents;

    const data = list.map(content => ({
      'Conteúdo': content.content,
      'Criador': content.creatorName ?? '—',
      'Data': new Date(content.createdAt).toLocaleDateString('pt-BR'),
      'Hora': new Date(content.createdAt).toLocaleTimeString('pt-BR'),
      'Verificações': content.verificationCount || 0,
      'Plataformas': content.platforms?.join(', ') || 'N/A',
      'Código de Verificação': content.verificationCode,
      'ID': content.id,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Conteúdos');

    const statsRows = [
      { 'Métrica': 'Total de Conteúdos Assinados', 'Valor': totalContentsGlobal },
      { 'Métrica': 'Total de Verificações', 'Valor': totalVerifications },
      { 'Métrica': 'Total de Usuários', 'Valor': totalAuthors },
      { 'Métrica': 'Itens exportados (página atual)', 'Valor': list.length },
      { 'Métrica': 'Total filtrado', 'Valor': totalContents },
      { 'Métrica': 'Data do Relatório', 'Valor': new Date().toLocaleDateString('pt-BR') },
    ];

    const wsStats = XLSX.utils.json_to_sheet(statsRows);
    XLSX.utils.book_append_sheet(wb, wsStats, 'Estatísticas');

    XLSX.writeFile(wb, `relatorio-veroid-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToTXT = () => {
    const list = contents;

    let txt = '='.repeat(80) + '\n';
    txt += 'RELATÓRIO ADMINISTRATIVO - VERO iD\n';
    txt += '='.repeat(80) + '\n\n';

    txt += `Data do Relatório: ${new Date().toLocaleString('pt-BR')}\n\n`;

    txt += 'ESTATÍSTICAS GERAIS\n';
    txt += '-'.repeat(80) + '\n';
    txt += `Total de Conteúdos Assinados: ${totalContentsGlobal}\n`;
    txt += `Total de Verificações: ${totalVerifications}\n`;
    txt += `Total de Usuários Cadastrados: ${totalAuthors}\n`;
    txt += `Conteúdos exportados (página atual): ${list.length}\n`;
    txt += `Total filtrado: ${totalContents}\n\n`;

    txt += 'LISTA DE CONTEÚDOS ASSINADOS\n';
    txt += '='.repeat(80) + '\n\n';

    list.forEach((content, index) => {
      txt += `[${index + 1}] ${content.content}\n`;
      txt += `    Criador: ${content.creatorName ?? '—'}\n`;
      txt += `    Data: ${new Date(content.createdAt).toLocaleString('pt-BR')}\n`;
      txt += `    Verificações: ${content.verificationCount || 0}\n`;
      txt += `    Plataformas: ${content.platforms?.join(', ') || 'N/A'}\n`;
      txt += `    Código: ${content.verificationCode}\n`;
      txt += `    ID: ${content.id}\n`;
      txt += '-'.repeat(80) + '\n\n';
    });

    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-veroid-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* --------------------------- Render --------------------------- */

  if (!currentUser) {
    return null;
  }

  const isAnyLoading = isLoadingStats || isLoadingContents;
  const hasMore = contents.length < totalContents;

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
              <Badge className="bg-red-100 text-red-800">Admin</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isAnyLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnyLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-blue-600">
                    <AvatarImage src={currentUser.selfieUrl} alt={currentUser.nomeCompleto} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {getInitials(currentUser.nomeCompleto)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12 border-2 border-blue-600">
                      <AvatarImage src={currentUser.selfieUrl} alt={currentUser.nomeCompleto} />
                      <AvatarFallback className="bg-blue-600 text-white text-lg">
                        {getInitials(currentUser.nomeCompleto)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">Administrador Sistema</p>
                      <p className="text-xs text-muted-foreground truncate">@{currentUser.nomePublico || 'Admin'}</p>
                      <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                      <Badge className="bg-red-100 text-red-800 text-xs mt-1">Admin</Badge>
                    </div>
                  </div>

                  <div className="border-t pt-3 space-y-1 text-sm">
                    <div className="font-semibold mb-2">Informações do Perfil</div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF/CNPJ:</span>
                      <span className="font-medium">{currentUser.cpfCnpj || '000000000000'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{currentUser.telefone || '(00) 00000-0000'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-green-600">Verificado</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Membro desde:</span>
                      <span className="font-medium">{new Date(currentUser.createdAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => navigate('/admin/users')} className="cursor-pointer text-red-600">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Gerenciar Usuários</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/admin/dashboard')} className="cursor-pointer text-red-600">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  <span>Dashboard Admin</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => navigate('/admin/audit-logs')} className="cursor-pointer text-red-600">
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Logs de Auditoria</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard Administrativo</h1>
          <p className="text-muted-foreground">Visão geral de todos os conteúdos assinados e verificações</p>
        </div>

        {/* Estatísticas Principais */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conteúdos Assinados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : totalContentsGlobal}
              </div>
              <p className="text-xs text-muted-foreground">Total de assinaturas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Verificações</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : totalVerifications}
              </div>
              <p className="text-xs text-muted-foreground">Verificações realizadas</p>
            </CardContent>
          </Card>

          <UsersRegisteredCard />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média de Verificações</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : averageVerifications}
              </div>
              <p className="text-xs text-muted-foreground">Por conteúdo</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos de Desempenho */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Gráfico de Linha - Evolução Temporal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Evolução nos Últimos 30 Dias
              </CardTitle>
              <CardDescription>Assinaturas e verificações ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="assinaturas" stroke="#3b82f6" name="Assinaturas" />
                  <Line type="monotone" dataKey="verificacoes" stroke="#8b5cf6" name="Verificações" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Pizza - Distribuição por Plataforma
              Layout: pizza compacta à esquerda + legenda lateral à direita
              com cor / nome / quantidade / percentual, ordenada por
              relevância (maior → menor). Labels sobre as fatias foram
              removidos para evitar sobreposição em itens pequenos. */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Distribuição por Plataforma
              </CardTitle>
              <CardDescription>Conteúdos assinados por plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              {platformData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados de plataformas para exibir.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Pizza compacta */}
                  <div className="w-full sm:w-1/2 flex-shrink-0">
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={platformData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {platformData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            const pct = platformsTotal > 0
                              ? ((value / platformsTotal) * 100).toFixed(1)
                              : '0';
                            return [`${value} (${pct}%)`, name];
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legenda lateral — relevância decrescente */}
                  <div className="w-full sm:w-1/2 space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {platformData.map((p, index) => {
                      const pct = platformsTotal > 0
                        ? ((p.value / platformsTotal) * 100).toFixed(1)
                        : '0';
                      return (
                        <div
                          key={p.name}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="inline-block h-3 w-3 rounded-sm flex-shrink-0"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              aria-hidden
                            />
                            <span className="truncate font-medium" title={p.name}>
                              {p.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 tabular-nums">
                            <span className="text-muted-foreground">{p.value}</span>
                            <span className="text-xs font-semibold text-blue-600 min-w-[3rem] text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Métricas de Engajamento — Dia do Ciclo, Ativação, Abandono */}
        <EngagementMetricsCards />

        {/* Distribuição por Tipo de Plano (drilldown clicável) */}
        <PlanDistributionCard />

        {/* Gráfico de Barras - Top 10 Usuários */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top 10 Usuários Mais Ativos
            </CardTitle>
            <CardDescription>Usuários com mais assinaturas e verificações</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={userStatsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" style={{ fontSize: '12px' }} angle={-45} textAnchor="end" height={100} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="assinaturas" fill="#3b82f6" name="Assinaturas" />
                <Bar dataKey="verificacoes" fill="#8b5cf6" name="Verificações" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Botões de Exportação */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Dados
            </CardTitle>
            <CardDescription>
              Exporta os {contents.length} conteúdo(s) atualmente carregado(s) (de {totalContents} filtrado(s)).
              Use os filtros para refinar antes de exportar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={exportToPDF} variant="outline" disabled={contents.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={exportToExcel} variant="outline" disabled={contents.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel (XLS)
              </Button>
              <Button onClick={exportToTXT} variant="outline" disabled={contents.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Exportar TXT
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Filtros e Ordenação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-title">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Buscar Título
                  </div>
                </Label>
                <Input
                  id="search-title"
                  placeholder="Digite o título..."
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-user">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Usuário
                  </div>
                </Label>
                <Select value={filterUser} onValueChange={setFilterUser}>
                  <SelectTrigger id="filter-user">
                    <SelectValue placeholder="Todos os usuários" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {userOptions.map(opt => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.nome_completo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-platform">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Plataforma
                  </div>
                </Label>
                <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                  <SelectTrigger id="filter-platform">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as plataformas</SelectItem>
                    {allPlatformOptions.map(platform => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data
                  </div>
                </Label>
                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger id="filter-date">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as datas</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mês</SelectItem>
                    <SelectItem value="year">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sort-by">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Ordenar
                  </div>
                </Label>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger id="sort-by">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Mais Recentes</SelectItem>
                    <SelectItem value="most-verified">Mais Verificados</SelectItem>
                    <SelectItem value="least-verified">Menos Verificados</SelectItem>
                    <SelectItem value="alphabetical">Alfabética</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(searchTitle || filterUser !== 'all' || filterPlatform !== 'all' || filterDate !== 'all' || sortBy !== 'recent') && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  Limpar Filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Conteúdos */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Todos os Conteúdos Assinados</h2>
            <div className="text-sm text-muted-foreground">
              {isLoadingContents ? 'Carregando...' : `${contents.length} de ${totalContents} carregados`}
            </div>
          </div>

          {isLoadingContents ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Carregando conteúdos...</p>
              </CardContent>
            </Card>
          ) : totalContents === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {totalContentsGlobal === 0
                    ? 'Nenhum conteúdo assinado ainda'
                    : 'Nenhum conteúdo encontrado com os filtros aplicados'}
                </p>
                {totalContentsGlobal > 0 && (
                  <Button variant="outline" onClick={handleClearFilters}>
                    Limpar Filtros
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contents.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onVerify={handleVerify}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-8">
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
                      <>Carregar mais ({totalContents - contents.length} restantes)</>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}