import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, getUsers, isCurrentUserAdmin, type User as UserType } from '@/lib/supabase-auth-v2';
import { getAllSignedContents, SignedContent } from '@/lib/supabase-crypto';
import ContentCard from '@/components/ContentCard';
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [allContents, setAllContents] = useState<SignedContent[]>([]);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filtros
  const [searchTitle, setSearchTitle] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  
  useEffect(() => {
    checkAuthAndLoadData();
  }, [navigate]);
  
  const checkAuthAndLoadData = async () => {
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
    
    // Carrega dados do Supabase
    await loadData();
  };
  
  const loadData = async () => {
    setIsLoading(true);
    
    try {
      console.log('📊 [Admin] Carregando TODOS os conteúdos do Supabase...');
      
      // Carrega TODOS os conteúdos assinados do Supabase
      const contents = await getAllSignedContents();
      console.log(`✅ [Admin] ${contents.length} conteúdos carregados do Supabase`);
      setAllContents(contents);
      
      // Carrega todos os usuários
      const users = await getUsers();
      console.log(`✅ [Admin] ${users.length} usuários carregados`);
      setAllUsers(users);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
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
  
  // Função para filtrar e ordenar conteúdos
  const getFilteredAndSortedContents = () => {
    let filtered = [...allContents];
    
    // Filtro por título
    if (searchTitle.trim()) {
      filtered = filtered.filter(content =>
        content.content.toLowerCase().includes(searchTitle.toLowerCase())
      );
    }
    
    // Filtro por usuário
    if (filterUser !== 'all') {
      filtered = filtered.filter(content => content.userId === filterUser);
    }
    
    // Filtro por plataforma
    if (filterPlatform !== 'all') {
      filtered = filtered.filter(content =>
        content.platforms?.includes(filterPlatform)
      );
    }
    
    // Filtro por data
    if (filterDate !== 'all') {
      const now = new Date();
      filtered = filtered.filter(content => {
        const contentDate = new Date(content.createdAt);
        const diffDays = Math.floor((now.getTime() - contentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (filterDate) {
          case 'today':
            return diffDays === 0;
          case 'week':
            return diffDays <= 7;
          case 'month':
            return diffDays <= 30;
          case 'year':
            return diffDays <= 365;
          default:
            return true;
        }
      });
    }
    
    // Ordenação
    switch (sortBy) {
      case 'most-verified':
        filtered.sort((a, b) => (b.verificationCount || 0) - (a.verificationCount || 0));
        break;
      case 'least-verified':
        filtered.sort((a, b) => (a.verificationCount || 0) - (b.verificationCount || 0));
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.content.localeCompare(b.content));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }
    
    return filtered;
  };
  
  // Obter todas as plataformas únicas
  const getAllPlatforms = () => {
    const platforms = new Set<string>();
    allContents.forEach(content => {
      content.platforms?.forEach(platform => platforms.add(platform));
    });
    return Array.from(platforms).sort();
  };
  
  // Calcular total de verificações
  const getTotalVerifications = () => {
    return allContents.reduce((total, content) => total + (content.verificationCount || 0), 0);
  };
  
  // Dados para gráfico de linha (evolução temporal)
  const getTimelineData = () => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split('T')[0];
    });
    
    const dataMap = new Map<string, { date: string; assinaturas: number; verificacoes: number }>();
    
    last30Days.forEach(date => {
      dataMap.set(date, { date, assinaturas: 0, verificacoes: 0 });
    });
    
    allContents.forEach(content => {
      const date = content.createdAt.split('T')[0];
      if (dataMap.has(date)) {
        const entry = dataMap.get(date)!;
        entry.assinaturas += 1;
        entry.verificacoes += content.verificationCount || 0;
      }
    });
    
    return Array.from(dataMap.values()).map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    }));
  };
  
  // Dados para gráfico de barras (por usuário)
  const getUserStatsData = () => {
    const userMap = new Map<string, { nome: string; assinaturas: number; verificacoes: number }>();
    
    allContents.forEach(content => {
      const user = allUsers.find(u => u.id === content.userId);
      const userName = user?.nomeCompleto || 'Desconhecido';
      
      if (!userMap.has(userName)) {
        userMap.set(userName, { nome: userName, assinaturas: 0, verificacoes: 0 });
      }
      
      const entry = userMap.get(userName)!;
      entry.assinaturas += 1;
      entry.verificacoes += content.verificationCount || 0;
    });
    
    return Array.from(userMap.values()).sort((a, b) => b.assinaturas - a.assinaturas).slice(0, 10);
  };
  
  // Dados para gráfico de pizza (por plataforma)
  const getPlatformData = () => {
    const platformMap = new Map<string, number>();
    
    allContents.forEach(content => {
      content.platforms?.forEach(platform => {
        platformMap.set(platform, (platformMap.get(platform) || 0) + 1);
      });
    });
    
    return Array.from(platformMap.entries()).map(([name, value]) => ({ name, value }));
  };
  
  // Exportar para PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    const filteredContents = getFilteredAndSortedContents();
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório Administrativo - Vero iD', 14, 20);
    
    // Estatísticas gerais
    doc.setFontSize(12);
    doc.text(`Total de Conteúdos Assinados: ${allContents.length}`, 14, 35);
    doc.text(`Total de Verificações: ${getTotalVerifications()}`, 14, 42);
    doc.text(`Total de Usuários: ${allUsers.length}`, 14, 49);
    doc.text(`Data do Relatório: ${new Date().toLocaleDateString('pt-BR')}`, 14, 56);
    
    // Tabela de conteúdos
    const tableData = filteredContents.map(content => [
      content.content.substring(0, 50) + (content.content.length > 50 ? '...' : ''),
      content.creatorName,
      new Date(content.createdAt).toLocaleDateString('pt-BR'),
      (content.verificationCount || 0).toString(),
      content.platforms?.join(', ') || 'N/A',
    ]);
    
    doc.autoTable({
      startY: 65,
      head: [['Conteúdo', 'Criador', 'Data', 'Verificações', 'Plataformas']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] },
    });
    
    doc.save(`relatorio-veroid-${new Date().toISOString().split('T')[0]}.pdf`);
  };
  
  // Exportar para Excel
  const exportToExcel = () => {
    const filteredContents = getFilteredAndSortedContents();
    
    const data = filteredContents.map(content => ({
      'Conteúdo': content.content,
      'Criador': content.creatorName,
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
    
    // Adicionar estatísticas em outra aba
    const stats = [
      { 'Métrica': 'Total de Conteúdos Assinados', 'Valor': allContents.length },
      { 'Métrica': 'Total de Verificações', 'Valor': getTotalVerifications() },
      { 'Métrica': 'Total de Usuários', 'Valor': allUsers.length },
      { 'Métrica': 'Data do Relatório', 'Valor': new Date().toLocaleDateString('pt-BR') },
    ];
    
    const wsStats = XLSX.utils.json_to_sheet(stats);
    XLSX.utils.book_append_sheet(wb, wsStats, 'Estatísticas');
    
    XLSX.writeFile(wb, `relatorio-veroid-${new Date().toISOString().split('T')[0]}.xlsx`);
  };
  
  // Exportar para TXT
  const exportToTXT = () => {
    const filteredContents = getFilteredAndSortedContents();
    
    let txt = '='.repeat(80) + '\n';
    txt += 'RELATÓRIO ADMINISTRATIVO - VERO iD\n';
    txt += '='.repeat(80) + '\n\n';
    
    txt += `Data do Relatório: ${new Date().toLocaleString('pt-BR')}\n\n`;
    
    txt += 'ESTATÍSTICAS GERAIS\n';
    txt += '-'.repeat(80) + '\n';
    txt += `Total de Conteúdos Assinados: ${allContents.length}\n`;
    txt += `Total de Verificações: ${getTotalVerifications()}\n`;
    txt += `Total de Usuários Cadastrados: ${allUsers.length}\n`;
    txt += `Conteúdos Filtrados: ${filteredContents.length}\n\n`;
    
    txt += 'LISTA DE CONTEÚDOS ASSINADOS\n';
    txt += '='.repeat(80) + '\n\n';
    
    filteredContents.forEach((content, index) => {
      txt += `[${index + 1}] ${content.content}\n`;
      txt += `    Criador: ${content.creatorName}\n`;
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
  
  const filteredContents = getFilteredAndSortedContents();
  const timelineData = getTimelineData();
  const userStatsData = getUserStatsData();
  const platformData = getPlatformData();
  
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#f43f5e'];
  
  if (!currentUser) {
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
              <Badge className="bg-red-100 text-red-800">Admin</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conteúdos Assinados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{allContents.length}</div>
              <p className="text-xs text-muted-foreground">Total de assinaturas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Verificações</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{getTotalVerifications()}</div>
              <p className="text-xs text-muted-foreground">Verificações realizadas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Cadastrados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{allUsers.length}</div>
              <p className="text-xs text-muted-foreground">Total de usuários</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Novos Indicadores - Cadastros e Atividade */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          {/* Novos Cadastros Hoje */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cadastros Hoje</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {allUsers.filter(u => {
                  const createdDate = new Date(u.createdAt);
                  const today = new Date();
                  return createdDate.toDateString() === today.toDateString();
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">Novos usuários hoje</p>
            </CardContent>
          </Card>
          
          {/* Novos Cadastros Esta Semana */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cadastros (7 dias)</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {allUsers.filter(u => {
                  const createdDate = new Date(u.createdAt);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return createdDate >= weekAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
            </CardContent>
          </Card>
          
          {/* Novos Cadastros Este Mês */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cadastros (30 dias)</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {allUsers.filter(u => {
                  const createdDate = new Date(u.createdAt);
                  const monthAgo = new Date();
                  monthAgo.setDate(monthAgo.getDate() - 30);
                  return createdDate >= monthAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
            </CardContent>
          </Card>
          
          {/* Usuários Bloqueados */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Bloqueados</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {allUsers.filter(u => u.blocked === true).length}
              </div>
              <p className="text-xs text-muted-foreground">Contas bloqueadas</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Novos Indicadores - Verificação e Engajamento */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Taxa de Verificação de Email */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Verificação</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {allUsers.length > 0 
                  ? ((allUsers.filter(u => u.verified === true).length / allUsers.length) * 100).toFixed(1)
                  : '0'}%
              </div>
              <p className="text-xs text-muted-foreground">
                {allUsers.filter(u => u.verified === true).length} de {allUsers.length} verificados
              </p>
            </CardContent>
          </Card>
          
          {/* Conteúdos Nunca Verificados */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nunca Verificados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {allContents.filter(c => (c.verificationCount || 0) === 0).length}
              </div>
              <p className="text-xs text-muted-foreground">
                {allContents.length > 0 
                  ? ((allContents.filter(c => (c.verificationCount || 0) === 0).length / allContents.length) * 100).toFixed(1)
                  : '0'}% do total
              </p>
            </CardContent>
          </Card>
          
          {/* Trials Expirando em Breve */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trials Expirando</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {allUsers.filter(u => {
                  if (!u.trial_ends_at) return false;
                  const trialEnd = new Date(u.trial_ends_at);
                  const now = new Date();
                  const sevenDaysFromNow = new Date();
                  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                  return trialEnd > now && trialEnd <= sevenDaysFromNow;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Estatísticas de Usuários - NOVO */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Contas Ativas/Inativas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contas Ativas vs Inativas
              </CardTitle>
              <CardDescription>Usuários ativos nos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">Contas Ativas</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {allUsers.filter(u => {
                      if (!u.last_login_at) return false;
                      const daysSinceLogin = Math.floor((new Date().getTime() - new Date(u.last_login_at).getTime()) / (1000 * 60 * 60 * 24));
                      return daysSinceLogin <= 30;
                    }).length}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                    <span className="text-sm font-medium">Contas Inativas</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-600">
                    {allUsers.filter(u => {
                      if (!u.last_login_at) return true;
                      const daysSinceLogin = Math.floor((new Date().getTime() - new Date(u.last_login_at).getTime()) / (1000 * 60 * 60 * 24));
                      return daysSinceLogin > 30;
                    }).length}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={[
                          { 
                            name: 'Ativas', 
                            value: allUsers.filter(u => {
                              if (!u.last_login_at) return false;
                              const daysSinceLogin = Math.floor((new Date().getTime() - new Date(u.last_login_at).getTime()) / (1000 * 60 * 60 * 24));
                              return daysSinceLogin <= 30;
                            }).length 
                          },
                          { 
                            name: 'Inativas', 
                            value: allUsers.filter(u => {
                              if (!u.last_login_at) return true;
                              const daysSinceLogin = Math.floor((new Date().getTime() - new Date(u.last_login_at).getTime()) / (1000 * 60 * 60 * 24));
                              return daysSinceLogin > 30;
                            }).length 
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#9ca3af" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Assinaturas por Tipo de Plano */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Assinaturas por Tipo de Plano
              </CardTitle>
              <CardDescription>Distribuição de usuários por plano</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { 
                      plano: 'Free', 
                      usuarios: allUsers.filter(u => !u.subscription_tier || u.subscription_tier === 'free').length 
                    },
                    { 
                      plano: 'Basic', 
                      usuarios: allUsers.filter(u => u.subscription_tier === 'basic').length 
                    },
                    { 
                      plano: 'Premium', 
                      usuarios: allUsers.filter(u => u.subscription_tier === 'premium').length 
                    },
                    { 
                      plano: 'Enterprise', 
                      usuarios: allUsers.filter(u => u.subscription_tier === 'enterprise').length 
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="plano" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="usuarios" fill="#3b82f6" name="Usuários" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        
        {/* Top 5 Usuários Mais Ativos */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top 5 Usuários Mais Ativos
            </CardTitle>
            <CardDescription>Usuários com mais conteúdos assinados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                const userContentCount = new Map<string, { user: UserType; count: number }>();
                
                allContents.forEach(content => {
                  const user = allUsers.find(u => u.id === content.userId);
                  if (user) {
                    const existing = userContentCount.get(user.id);
                    if (existing) {
                      existing.count += 1;
                    } else {
                      userContentCount.set(user.id, { user, count: 1 });
                    }
                  }
                });
                
                const topUsers = Array.from(userContentCount.values())
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5);
                
                if (topUsers.length === 0) {
                  return (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum usuário com conteúdos assinados ainda
                    </p>
                  );
                }
                
                return topUsers.map((item, index) => (
                  <div key={item.user.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{item.user.nomeCompleto}</p>
                        <p className="text-xs text-muted-foreground">@{item.user.nomePublico}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{item.count}</p>
                      <p className="text-xs text-muted-foreground">assinaturas</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </CardContent>
        </Card>
        
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
          
          {/* Gráfico de Pizza - Distribuição por Plataforma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Plataformas Mais Usadas
              </CardTitle>
              <CardDescription>Conteúdos assinados por plataforma</CardDescription>
            </CardHeader>
            <CardContent>
              {platformData.length === 0 ? (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  Nenhuma plataforma registrada ainda
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Horários de Pico - Análise por Hora do Dia */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Horários de Pico de Assinaturas
            </CardTitle>
            <CardDescription>Distribuição de assinaturas por hora do dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={(() => {
                  const hourMap = new Map<number, number>();
                  for (let i = 0; i < 24; i++) {
                    hourMap.set(i, 0);
                  }
                  
                  allContents.forEach(content => {
                    const hour = new Date(content.createdAt).getHours();
                    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
                  });
                  
                  return Array.from(hourMap.entries()).map(([hour, count]) => ({
                    hora: `${hour.toString().padStart(2, '0')}:00`,
                    assinaturas: count,
                  }));
                })()}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hora" style={{ fontSize: '10px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="assinaturas" fill="#10b981" name="Assinaturas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* Gráfico de Barras - Top 10 Usuários */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Top 10 Usuários - Assinaturas e Verificações
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
            <CardDescription>Baixe os dados em diferentes formatos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button onClick={exportToPDF} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={exportToExcel} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Excel (XLS)
              </Button>
              <Button onClick={exportToTXT} variant="outline">
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
                    {allUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.nomeCompleto}
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
                    {getAllPlatforms().map(platform => (
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
                <Select value={sortBy} onValueChange={setSortBy}>
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
                  onClick={() => {
                    setSearchTitle('');
                    setFilterUser('all');
                    setFilterPlatform('all');
                    setFilterDate('all');
                    setSortBy('recent');
                  }}
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
              {filteredContents.length} de {allContents.length} conteúdos
            </div>
          </div>
          
          {allContents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum conteúdo assinado ainda
                </p>
              </CardContent>
            </Card>
          ) : filteredContents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhum conteúdo encontrado com os filtros aplicados
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTitle('');
                    setFilterUser('all');
                    setFilterPlatform('all');
                    setFilterDate('all');
                    setSortBy('recent');
                  }}
                >
                  Limpar Filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContents.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onVerify={handleVerify}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}