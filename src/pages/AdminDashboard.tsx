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
import { getCurrentUser, logout, getUsers, User as UserType, isCurrentUserAdmin } from '@/lib/supabase-auth';
import { getSignedContents, SignedContent } from '@/lib/crypto';
import type { SignedContent } from '@/lib/supabase-crypto';
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
    
    // Carrega dados do localStorage
    await loadData();
  };
  
  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // Carrega TODOS os conteúdos assinados do localStorage
      const contents = getAllSignedContents();
      setAllContents(contents);
      
      // Carrega todos os usuários
      const users = await getUsers();
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
        const contentDate = new Date(content.timestamp);
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
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
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
      const date = content.timestamp.split('T')[0];
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
      new Date(content.timestamp).toLocaleDateString('pt-BR'),
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
      'Data': new Date(content.timestamp).toLocaleDateString('pt-BR'),
      'Hora': new Date(content.timestamp).toLocaleTimeString('pt-BR'),
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
      txt += `    Data: ${new Date(content.timestamp).toLocaleString('pt-BR')}\n`;
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
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')} className="cursor-pointer">
                  <Home className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin/users')} className="cursor-pointer">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Gerenciar Usuários</span>
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
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Média de Verificações</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {allContents.length > 0 ? (getTotalVerifications() / allContents.length).toFixed(1) : '0'}
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
          
          {/* Gráfico de Pizza - Distribuição por Plataforma */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Distribuição por Plataforma
              </CardTitle>
              <CardDescription>Conteúdos assinados por plataforma</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
        
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
