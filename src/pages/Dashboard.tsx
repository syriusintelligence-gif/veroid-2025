import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Shield, Key, FileText, TrendingUp, ArrowLeft, User, LogOut, Settings, Home, Search, Calendar, Eye, ArrowUpDown, Trophy, Users, BarChart3, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isCurrentUserAdmin } from '@/lib/supabase-auth';
import type { User as UserType } from '@/lib/supabase-auth';
import { generateKeyPair, saveKeyPair, getKeyPair, getSignedContentsByUserId } from '@/lib/supabase-crypto';
import type { KeyPair, SignedContent } from '@/lib/supabase-crypto';
import ContentCard from '@/components/ContentCard';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const navigate = useNavigate();
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [signedContents, setSignedContents] = useState<SignedContent[]>([]);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [searchTitle, setSearchTitle] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  
  useEffect(() => {
    loadUserData();
  }, [navigate]);
  
  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      // Verifica se usuário está logado
      const user = await getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      setCurrentUser(user);
      
      // Verifica se é admin
      const adminStatus = await isCurrentUserAdmin();
      setIsAdmin(adminStatus);
      
      // Carrega chaves do usuário
      const userKeyPair = await getKeyPair(user.id);
      setKeyPair(userKeyPair);
      
      // Carrega conteúdos assinados do usuário
      const userContents = await getSignedContentsByUserId(user.id);
      setSignedContents(userContents);
      
      console.log('✅ Dados do usuário carregados:', {
        user: user.email,
        hasKeys: !!userKeyPair,
        contentsCount: userContents.length,
      });
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateKeys = async () => {
    if (!currentUser) {
      alert('Erro: usuário não identificado');
      return;
    }
    
    setIsGenerating(true);
    try {
      const newKeyPair = await generateKeyPair(currentUser.id);
      const result = await saveKeyPair(newKeyPair);
      
      if (result.success) {
        setKeyPair(newKeyPair);
        console.log('✅ Chaves geradas e salvas com sucesso!');
      } else {
        alert(result.error || 'Erro ao salvar chaves. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao gerar chaves:', error);
      alert('Erro ao gerar chaves. Tente novamente.');
    } finally {
      setIsGenerating(false);
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
    let filtered = [...signedContents];
    
    // Filtro por título
    if (searchTitle.trim()) {
      filtered = filtered.filter(content => 
        content.content.toLowerCase().includes(searchTitle.toLowerCase())
      );
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
    signedContents.forEach(content => {
      content.platforms?.forEach(platform => platforms.add(platform));
    });
    return Array.from(platforms).sort();
  };
  
  // Calcular total de verificações
  const getTotalVerifications = () => {
    return signedContents.reduce((total, content) => total + (content.verificationCount || 0), 0);
  };
  
  // Obter ranking (top 3)
  const getTopContents = () => {
    return [...signedContents]
      .sort((a, b) => (b.verificationCount || 0) - (a.verificationCount || 0))
      .slice(0, 3);
  };
  
  const filteredContents = getFilteredAndSortedContents();
  const topContents = getTopContents();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} title="Voltar para Home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              title="Ir para Dashboard"
            >
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vero iD
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/verify')}>
              Verificar
            </Button>
            <Button onClick={() => navigate('/sign')}>
              Assinar Conteúdo
            </Button>
            
            {/* User Profile Dropdown */}
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
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-start gap-3 py-2">
                    <Avatar className="h-16 w-16 border-2 border-blue-600">
                      <AvatarImage src={currentUser.selfieUrl} alt={currentUser.nomeCompleto} />
                      <AvatarFallback className="bg-blue-600 text-white text-xl">
                        {getInitials(currentUser.nomeCompleto)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1 flex-1">
                      <p className="text-sm font-medium leading-none">{currentUser.nomeCompleto}</p>
                      {currentUser.nomePublico && currentUser.nomePublico !== currentUser.nomeCompleto && (
                        <p className="text-xs text-muted-foreground">@{currentUser.nomePublico}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                      {isAdmin && (
                        <Badge className="bg-red-100 text-red-800 w-fit text-xs">Admin</Badge>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                <div className="px-2 py-2">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Informações do Perfil</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF/CNPJ:</span>
                      <span className="font-medium">{currentUser.cpfCnpj}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{currentUser.telefone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className="font-medium text-green-600">
                        {currentUser.verified ? 'Verificado' : 'Pendente'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Membro desde:</span>
                      <span className="font-medium">
                        {new Date(currentUser.createdAt).toLocaleDateString('pt-BR')}
                      </span>
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
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin/users')} className="cursor-pointer text-red-600">
                      <Users className="mr-2 h-4 w-4" />
                      <span>Gerenciar Usuários</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/dashboard')} className="cursor-pointer text-red-600">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      <span>Dashboard Admin</span>
                    </DropdownMenuItem>
                  </>
                )}
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
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Gerencie suas chaves e conteúdos assinados</p>
        </div>
        
        {/* Estatísticas */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conteúdos Assinados</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{signedContents.length}</div>
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
              <CardTitle className="text-sm font-medium">Status das Chaves</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{keyPair ? 'Ativas' : 'Não Geradas'}</div>
              <p className="text-xs text-muted-foreground">
                {keyPair ? 'Chaves configuradas' : 'Configure suas chaves'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Credibilidade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">Alta</div>
              <p className="text-xs text-muted-foreground">Baseado em assinaturas</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Top 3 Ranking */}
        {signedContents.length > 0 && topContents.some(c => (c.verificationCount || 0) > 0) && (
          <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                🏆 Top 3 Conteúdos Mais Verificados
              </CardTitle>
              <CardDescription>Seus conteúdos com maior engajamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topContents.map((content, index) => {
                  const verifications = content.verificationCount || 0;
                  if (verifications === 0) return null;
                  
                  const medals = ['🥇', '🥈', '🥉'];
                  const colors = ['text-yellow-600', 'text-gray-400', 'text-orange-600'];
                  
                  return (
                    <div key={content.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <div className={`text-3xl ${colors[index]}`}>
                        {medals[index]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{content.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {content.creatorName} • {new Date(content.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 font-bold">
                        <Eye className="h-3 w-3 mr-1" />
                        {verifications}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Geração de Chaves */}
        {!keyPair ? (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Gerar Par de Chaves Criptográficas
              </CardTitle>
              <CardDescription>
                Crie suas chaves pública e privada para começar a assinar conteúdo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Suas chaves serão armazenadas de forma segura no Supabase. Em produção, recomendamos o uso de HSM (Hardware Security Module) ou TPM (Trusted Platform Module).
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={handleGenerateKeys}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  'Gerar Chaves'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-green-600" />
                Suas Chaves Criptográficas
              </CardTitle>
              <CardDescription>
                Criador: <span className="font-medium">{currentUser.nomePublico || currentUser.nomeCompleto}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Chave Pública (compartilhável)</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-mono break-all">{keyPair.publicKey}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Chave Privada (mantenha em segredo)</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-mono break-all blur-sm hover:blur-none transition-all">
                    {keyPair.privateKey}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Passe o mouse para revelar. Nunca compartilhe sua chave privada!
                </p>
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p>Gerado em: {new Date(keyPair.createdAt).toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Lista de Conteúdos Assinados com Filtros e Ordenação */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Meus Conteúdos Assinados</h2>
            <div className="text-sm text-muted-foreground">
              {filteredContents.length} de {signedContents.length} conteúdos
            </div>
          </div>
          
          {signedContents.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Filtros e Ordenação
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  {/* Filtro por Título */}
                  <div className="space-y-2">
                    <Label htmlFor="search-title">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Buscar por Título
                      </div>
                    </Label>
                    <Input
                      id="search-title"
                      placeholder="Digite o título..."
                      value={searchTitle}
                      onChange={(e) => setSearchTitle(e.target.value)}
                    />
                  </div>
                  
                  {/* Filtro por Plataforma */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-platform">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Plataforma
                      </div>
                    </Label>
                    <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                      <SelectTrigger id="filter-platform">
                        <SelectValue placeholder="Todas as plataformas" />
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
                  
                  {/* Filtro por Data */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-date">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Data de Publicação
                      </div>
                    </Label>
                    <Select value={filterDate} onValueChange={setFilterDate}>
                      <SelectTrigger id="filter-date">
                        <SelectValue placeholder="Todas as datas" />
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
                  
                  {/* Ordenação */}
                  <div className="space-y-2">
                    <Label htmlFor="sort-by">
                      <div className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Ordenar por
                      </div>
                    </Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger id="sort-by">
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Mais Recentes</SelectItem>
                        <SelectItem value="most-verified">Mais Verificados</SelectItem>
                        <SelectItem value="least-verified">Menos Verificados</SelectItem>
                        <SelectItem value="alphabetical">Ordem Alfabética</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Botão para limpar filtros */}
                {(searchTitle || filterPlatform !== 'all' || filterDate !== 'all' || sortBy !== 'recent') && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTitle('');
                        setFilterPlatform('all');
                        setFilterDate('all');
                        setSortBy('recent');
                      }}
                    >
                      Limpar Filtros e Ordenação
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          {signedContents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Você ainda não assinou nenhum conteúdo
                </p>
                <Button onClick={() => navigate('/sign')}>
                  Assinar Primeiro Conteúdo
                </Button>
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
              {filteredContents.map((content, index) => (
                <div key={content.id} className="relative">
                  {/* Badge de Ranking para Top 3 quando ordenado por verificações */}
                  {sortBy === 'most-verified' && index < 3 && (content.verificationCount || 0) > 0 && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <Badge className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-2 border-white shadow-lg">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} #{index + 1}
                      </Badge>
                    </div>
                  )}
                  <ContentCard
                    content={{
                      ...content,
                      timestamp: content.createdAt,
                    }}
                    onVerify={handleVerify}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}