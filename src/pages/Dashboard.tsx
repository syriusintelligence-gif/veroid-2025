import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield, FileSignature, CheckCircle2, LogOut, User, Loader2, Key, RefreshCw, Home, Settings, Users, BarChart3, Search, Calendar, ArrowUpDown, Copy, Check, Eye, EyeOff, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isCurrentUserAdmin } from '@/lib/supabase-auth';
import type { User as UserType } from '@/lib/supabase-auth';
import { generateKeyPair, saveKeyPair, getKeyPair, clearAllKeys } from '@/lib/crypto';
import type { KeyPair } from '@/lib/supabase-crypto';
import { getSignedContentsByUserId } from '@/lib/supabase-crypto';
import type { SignedContent } from '@/lib/supabase-crypto';
import ContentCard from '@/components/ContentCard';
import FolderManager from '@/components/FolderManager';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [signedContents, setSignedContents] = useState<SignedContent[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Estados para copiar chaves
  const [copiedPublicKey, setCopiedPublicKey] = useState(false);
  const [copiedPrivateKey, setCopiedPrivateKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  
  // Filtros
  const [searchTitle, setSearchTitle] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  
  // 🆕 Sistema de Pastas
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  
  useEffect(() => {
    loadUserData();
  }, [navigate]);
  
  const loadUserData = async () => {
    try {
      console.log('🔄 Iniciando carregamento de dados do usuário...');
      setIsLoading(true);
      
      const user = await getCurrentUser();
      if (!user) {
        console.log('❌ Usuário não autenticado, redirecionando...');
        navigate('/login');
        return;
      }
      
      console.log('✅ Usuário autenticado:', user.email, 'ID:', user.id);
      console.log('👤 Status admin:', user.isAdmin);
      setCurrentUser(user);
      
      // Verifica se é admin
      const adminStatus = await isCurrentUserAdmin();
      setIsAdmin(adminStatus);
      
      // 🆕 Tenta carregar chaves (localStorage ou Supabase - descriptografa automaticamente)
      console.log('🔍 Tentando carregar chaves para userId:', user.id);
      const userKeyPair = await getKeyPair(user.id);
      console.log('🔑 Resultado da busca de chaves:', userKeyPair ? 'ENCONTRADAS' : 'NÃO ENCONTRADAS');
      
      setKeyPair(userKeyPair);
      
      console.log('✅ Dados do usuário carregados:', {
        email: user.email,
        hasKeys: !!userKeyPair,
        keySource: userKeyPair ? 'localStorage ou Supabase (descriptografadas)' : 'nenhuma',
      });
      
      // Carrega conteúdos assinados
      const contents = await getSignedContentsByUserId(user.id);
      setSignedContents(contents);
      console.log('📄 Conteúdos assinados carregados:', contents.length);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGenerateKeys = async () => {
    console.log('🚀 === INICIANDO GERAÇÃO DE CHAVES ===');
    console.log('👤 Usuário atual (currentUser):', currentUser);
    console.log('👤 currentUser?.id:', currentUser?.id);
    console.log('👤 Tipo de currentUser?.id:', typeof currentUser?.id);
    
    // 🆕 VALIDAÇÃO CRÍTICA 1: Verifica se currentUser existe
    if (!currentUser) {
      console.error('❌ ERRO CRÍTICO: currentUser é null ou undefined');
      alert('Erro: Nenhum usuário autenticado. Por favor, faça login novamente.');
      return;
    }
    
    // 🆕 VALIDAÇÃO CRÍTICA 2: Verifica se currentUser.id existe
    if (!currentUser.id) {
      console.error('❌ ERRO CRÍTICO: currentUser.id é null ou undefined');
      console.error('📊 currentUser completo:', JSON.stringify(currentUser, null, 2));
      alert('Erro: ID do usuário não encontrado. Por favor, faça login novamente.');
      return;
    }
    
    console.log('✅ Validação de currentUser passou');
    console.log('📊 currentUser.id:', currentUser.id);
    console.log('📊 Tipo de currentUser.id:', typeof currentUser.id);
    
    setIsGeneratingKeys(true);
    
    try {
      console.log('🔑 Chamando generateKeyPair com userId:', currentUser.id);
      
      // 🆕 CRÍTICO: Passar currentUser.id explicitamente
      const keyPair = await generateKeyPair(currentUser.id);
      
      console.log('✅ KeyPair gerado');
      console.log('📊 keyPair completo:', JSON.stringify(keyPair, null, 2));
      console.log('📊 keyPair.userId:', keyPair?.userId);
      console.log('📊 Tipo de keyPair.userId:', typeof keyPair?.userId);
      
      // 🆕 VALIDAÇÃO CRÍTICA 3: Verifica se keyPair foi gerado corretamente
      if (!keyPair) {
        console.error('❌ ERRO: generateKeyPair retornou null ou undefined');
        console.error('❌ keyPair recebido:', keyPair);
        alert('Erro: Falha ao gerar chaves (retorno nulo)');
        return;
      }
      
      // 🆕 VALIDAÇÃO CRÍTICA 4: Verifica se userId está presente no keyPair
      if (!keyPair.userId) {
        console.error('❌ ERRO: KeyPair gerado sem userId!');
        console.error('📊 KeyPair gerado:', JSON.stringify(keyPair, null, 2));
        alert('Erro: KeyPair gerado sem userId. Por favor, tente novamente.');
        return;
      }
      
      console.log('✅ Validação de KeyPair passou');
      console.log('💾 Chamando saveKeyPair...');
      
      const result = await saveKeyPair(keyPair);
      
      console.log('📊 Resultado do saveKeyPair:', JSON.stringify(result, null, 2));
      console.log('📊 Tipo do resultado:', typeof result);
      console.log('📊 result?.success:', result?.success);
      
      // 🆕 VALIDAÇÃO CRÍTICA 5: Verifica se result é válido
      if (!result) {
        console.error('❌ ERRO: saveKeyPair retornou null ou undefined');
        console.error('❌ result recebido:', result);
        alert('Erro: Falha ao salvar chaves (retorno nulo). Por favor, tente novamente.');
        return;
      }
      
      if (typeof result !== 'object') {
        console.error('❌ ERRO: saveKeyPair retornou tipo inválido:', typeof result);
        console.error('❌ result recebido:', result);
        alert('Erro: Falha ao salvar chaves (tipo de retorno inválido). Por favor, tente novamente.');
        return;
      }
      
      if (typeof result.success === 'undefined') {
        console.error('❌ ERRO: saveKeyPair retornou objeto sem propriedade success');
        console.error('📊 Objeto retornado:', JSON.stringify(result, null, 2));
        alert('Erro: Resposta inválida ao salvar chaves. Por favor, tente novamente.');
        return;
      }
      
      if (result.success) {
        console.log('✅ Chaves salvas com sucesso!');
        setKeyPair(keyPair);
        
        // Verifica se as chaves foram realmente salvas
        console.log('🔍 Verificando se as chaves foram realmente salvas...');
        const verifyKeyPair = await getKeyPair(currentUser.id);
        
        if (verifyKeyPair) {
          console.log('✅✅✅ VERIFICAÇÃO CONFIRMADA! Chaves estão salvas e criptografadas!');
          alert('✅ Chaves criptográficas geradas e salvas com sucesso!');
          
          // Recarrega a página para atualizar todos os dados
          console.log('🔄 Recarregando página para atualizar dados...');
          window.location.reload();
        } else {
          console.error('❌❌❌ ERRO! Chaves não foram encontradas após salvar!');
          alert('⚠️ Chaves geradas mas não foram encontradas após salvar. Por favor, tente gerar novamente.');
        }
      } else {
        console.error('❌ Falha ao salvar chaves:', result.error);
        alert(`Erro ao salvar chaves: ${result.error || 'Erro desconhecido'}. Por favor, tente novamente.`);
      }
    } catch (error) {
      console.error('❌ ERRO INESPERADO na geração de chaves:', error);
      console.error('📊 Tipo do erro:', typeof error);
      console.error('📊 Stack trace:', error instanceof Error ? error.stack : 'N/A');
      console.error('📊 error.message:', error instanceof Error ? error.message : String(error));
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Erro ao gerar chaves: ${errorMessage}. Por favor, tente novamente.`);
    } finally {
      setIsGeneratingKeys(false);
      console.log('🏁 === FIM DO PROCESSO DE GERAÇÃO ===');
    }
  };
  
  const handleCopyPublicKey = async () => {
    if (!keyPair) return;
    try {
      await navigator.clipboard.writeText(keyPair.publicKey);
      setCopiedPublicKey(true);
      setTimeout(() => setCopiedPublicKey(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar chave pública:', err);
    }
  };
  
  const handleCopyPrivateKey = async () => {
    if (!keyPair) return;
    try {
      await navigator.clipboard.writeText(keyPair.privateKey);
      setCopiedPrivateKey(true);
      setTimeout(() => setCopiedPrivateKey(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar chave privada:', err);
    }
  };
  
  const handleLogout = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      
      // 🆕 Limpa chaves locais ANTES do logout
      if (currentUser) {
        console.log('🗑️ Limpando chaves locais...');
        clearAllKeys(currentUser.id);
        console.log('✅ Chaves locais limpas com sucesso!');
      }
      
      console.log('ℹ️ As chaves permanecem no Supabase (criptografadas) e serão restauradas no próximo login!');
      
      await logout();
      navigate('/');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    }
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
    
    // 🆕 Filtro por pasta
    if (selectedFolderId !== null) {
      filtered = filtered.filter(content => content.folderId === selectedFolderId);
    }
    
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
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.content.localeCompare(b.content));
        break;
      case 'most-verified':
        filtered.sort((a, b) => (b.verificationCount || 0) - (a.verificationCount || 0));
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
  
  const filteredContents = getFilteredAndSortedContents();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vero iD
            </span>
          </div>
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10 border-2 border-blue-600">
                    <AvatarImage src={currentUser?.selfieUrl} alt={currentUser?.nomeCompleto} />
                    <AvatarFallback className="bg-blue-600 text-white">
                      {currentUser ? getInitials(currentUser.nomeCompleto) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80 bg-white" align="end">
                {currentUser && (
                  <>
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-12 w-12 border-2 border-blue-600">
                          <AvatarImage src={currentUser.selfieUrl} alt={currentUser.nomeCompleto} />
                          <AvatarFallback className="bg-blue-600 text-white text-lg">
                            {getInitials(currentUser.nomeCompleto)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {isAdmin ? 'Administrador Sistema' : currentUser.nomeCompleto}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">@{currentUser.nomePublico || 'User'}</p>
                          <p className="text-xs text-muted-foreground truncate">{currentUser.email}</p>
                          {isAdmin && (
                            <Badge className="bg-red-100 text-red-800 text-xs mt-1">Admin</Badge>
                          )}
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
                        
                        <DropdownMenuItem onClick={() => navigate('/admin/audit-logs')} className="cursor-pointer text-red-600">
                          <FileText className="mr-2 h-4 w-4" />
                          <span>Logs de Auditoria</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sair</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* 🆕 Layout com Sidebar */}
        <div className="flex gap-6">
          {/* Sidebar - FolderManager */}
          <aside className="w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              <Card className="overflow-hidden">
                <FolderManager
                  userId={currentUser?.id || ''}
                  onFolderSelect={setSelectedFolderId}
                  selectedFolderId={selectedFolderId}
                />
              </Card>
            </div>
          </aside>
          
          {/* Conteúdo Principal */}
          <main className="flex-1 min-w-0">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">
                Olá, {currentUser?.nomePublico || currentUser?.nomeCompleto}! 👋
              </h1>
              <p className="text-muted-foreground">
                Gerencie suas assinaturas digitais e proteja seu conteúdo
              </p>
            </div>
        
        {/* Key Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Status das Chaves Criptográficas
            </CardTitle>
            <CardDescription>
              🔐 Suas chaves privadas são criptografadas com AES-256-GCM antes de serem salvas no Supabase
            </CardDescription>
          </CardHeader>
          <CardContent>
            {keyPair ? (
              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Chaves Ativas e Criptografadas</p>
                    <p className="text-sm text-green-700">Sincronizadas com Supabase e prontas para uso</p>
                  </div>
                </div>
                
                {/* Chave Pública */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Key className="h-4 w-4 text-blue-600" />
                      Chave Pública
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyPublicKey}
                      className="h-8"
                    >
                      {copiedPublicKey ? (
                        <>
                          <Check className="h-4 w-4 mr-1 text-green-600" />
                          <span className="text-green-600">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="bg-muted p-3 rounded-lg border">
                    <code className="text-xs font-mono break-all block">
                      {keyPair.publicKey}
                    </code>
                  </div>
                </div>
                
                {/* Chave Privada */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Key className="h-4 w-4 text-red-600" />
                      Chave Privada
                      <Badge variant="destructive" className="text-xs">Confidencial</Badge>
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPrivateKey(!showPrivateKey)}
                        className="h-8"
                      >
                        {showPrivateKey ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Mostrar
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyPrivateKey}
                        className="h-8"
                        disabled={!showPrivateKey}
                      >
                        {copiedPrivateKey ? (
                          <>
                            <Check className="h-4 w-4 mr-1 text-green-600" />
                            <span className="text-green-600">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copiar
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="bg-muted p-3 rounded-lg border">
                    <code className="text-xs font-mono break-all block">
                      {showPrivateKey ? keyPair.privateKey : '•'.repeat(keyPair.privateKey.length)}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Nunca compartilhe sua chave privada. Ela é usada para assinar seu conteúdo digitalmente.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Você ainda não possui chaves criptográficas. Gere suas chaves para começar a assinar conteúdo digitalmente.
                    As chaves serão criptografadas com AES-256-GCM e salvas no Supabase para backup automático.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={handleGenerateKeys} 
                  disabled={isGeneratingKeys}
                  className="w-full"
                  size="lg"
                >
                  {isGeneratingKeys ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Gerando e criptografando...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-5 w-5" />
                      Gerar Chaves Criptográficas
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/sign')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-5 w-5 text-blue-600" />
                Assinar Conteúdo
              </CardTitle>
              <CardDescription>
                Adicione uma assinatura digital ao seu conteúdo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full border-2 border-blue-600 hover:scale-105 hover:shadow-lg transition-all duration-300" 
                disabled={!keyPair}
              >
                {keyPair ? 'Criar Nova Assinatura' : 'Gere suas chaves primeiro'}
              </Button>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/verify')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Verificar Conteúdo
              </CardTitle>
              <CardDescription>
                Verifique a autenticidade de um conteúdo assinado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                className="w-full border-2 border-gray-300 hover:scale-105 hover:shadow-lg transition-all duration-300"
              >
                Verificar Assinatura
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Signed Contents */}
        <Card>
          <CardHeader>
            <CardTitle>Meus Conteúdos Assinados</CardTitle>
            <CardDescription>
              {signedContents.length} {signedContents.length === 1 ? 'conteúdo assinado' : 'conteúdos assinados'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signedContents.length === 0 ? (
              <div className="text-center py-12">
                <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Você ainda não assinou nenhum conteúdo
                </p>
                <Button onClick={() => navigate('/sign')} disabled={!keyPair}>
                  {keyPair ? 'Assinar Primeiro Conteúdo' : 'Gere suas chaves primeiro'}
                </Button>
              </div>
            ) : (
              <>
                {/* Filtros */}
                <Card className="mb-6 bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Search className="h-5 w-5" />
                      Filtros e Ordenação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="search-title" className="text-sm font-medium">
                          Buscar por Título
                        </Label>
                        <Input
                          id="search-title"
                          placeholder="Digite o título..."
                          value={searchTitle}
                          onChange={(e) => setSearchTitle(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="filter-platform" className="text-sm font-medium">
                          Plataforma
                        </Label>
                        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                          <SelectTrigger id="filter-platform">
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
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
                        <Label htmlFor="filter-date" className="text-sm font-medium">
                          Data
                        </Label>
                        <Select value={filterDate} onValueChange={setFilterDate}>
                          <SelectTrigger id="filter-date">
                            <SelectValue placeholder="Todas" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="all">Todas as datas</SelectItem>
                            <SelectItem value="today">Hoje</SelectItem>
                            <SelectItem value="week">Última semana</SelectItem>
                            <SelectItem value="month">Último mês</SelectItem>
                            <SelectItem value="year">Último ano</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sort-by" className="text-sm font-medium">
                          Ordenar por
                        </Label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger id="sort-by">
                            <SelectValue placeholder="Ordenar" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="recent">Mais Recentes</SelectItem>
                            <SelectItem value="oldest">Mais Antigos</SelectItem>
                            <SelectItem value="alphabetical">Alfabética (A-Z)</SelectItem>
                            <SelectItem value="most-verified">Mais Verificados</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {(searchTitle || filterPlatform !== 'all' || filterDate !== 'all' || sortBy !== 'recent') && (
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Mostrando {filteredContents.length} de {signedContents.length} conteúdos
                        </p>
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
                          Limpar Filtros
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Lista de Conteúdos */}
                {filteredContents.length === 0 ? (
                  <div className="text-center py-12">
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
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredContents.map((content) => (
                      <ContentCard key={content.id} content={content} />
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
          </main>
        </div>
      </div>
    </div>
  );
}