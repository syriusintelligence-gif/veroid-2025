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
import { Shield, FileSignature, CheckCircle2, LogOut, User, Loader2, Key, RefreshCw, Home, Settings, Users, BarChart3, Search, Calendar, ArrowUpDown, Copy, Check, Eye, EyeOff, FileText, CreditCard, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout, isCurrentUserAdmin } from '@/lib/supabase-auth';
import type { User as UserType } from '@/lib/supabase-auth';
import { generateKeyPair, saveKeyPair, getKeyPair, clearAllKeys } from '@/lib/crypto';
import type { KeyPair } from '@/lib/supabase-crypto';
import { getSignedContentsByUserId } from '@/lib/supabase-crypto';
import type { SignedContent } from '@/lib/supabase-crypto';
import ContentCard from '@/components/ContentCard';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import TwoFactorAlert from '@/components/TwoFactorAlert';
import SocialLinksAlert from '@/components/SocialLinksAlert';
import { TrialBanner } from '@/components/TrialBanner';
import { TrialModal } from '@/components/TrialModal';
import { PaymentFailureAlert } from '@/components/PaymentFailureAlert';
import { InstructionsModal } from '@/components/InstructionsModal';
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
  const [showKeyDetails, setShowKeyDetails] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  
  // Estado para o modal de instruções
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState(false);
  
  // Filtros
  const [searchTitle, setSearchTitle] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  
  useEffect(() => {
    // 🆕 CORREÇÃO: Removida dependência de navigate para evitar loop de re-renderização
    // O navigate é estável e não precisa ser uma dependência
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
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
    if (!currentUser) return;
    
    console.log('🚀 === INICIANDO GERAÇÃO DE CHAVES ===');
    console.log('👤 Usuário atual:', { id: currentUser.id, email: currentUser.email });
    
    setIsGeneratingKeys(true);
    try {
      console.log('🔑 Chamando generateKeyPair com userId:', currentUser.id);
      const newKeyPair = await generateKeyPair(currentUser.id);
      console.log('✅ KeyPair gerado com sucesso:', { 
        publicKey: newKeyPair.publicKey.substring(0, 20) + '...',
        userId: newKeyPair.userId 
      });
      
      console.log('💾 Chamando saveKeyPair (irá criptografar antes de salvar)...');
      const saveResult = await saveKeyPair(newKeyPair);
      console.log('📊 Resultado do saveKeyPair:', saveResult);
      
      if (saveResult.success) {
        console.log('✅ Chaves salvas com sucesso (criptografadas no Supabase)! Atualizando estado...');
        setKeyPair(newKeyPair);
        
        // Verifica se as chaves foram realmente salvas
        console.log('🔍 Verificando se as chaves foram realmente salvas...');
        const verifyKeyPair = await getKeyPair(currentUser.id);
        if (verifyKeyPair) {
          console.log('✅✅✅ VERIFICAÇÃO CONFIRMADA! Chaves estão salvas e criptografadas!');
        } else {
          console.error('❌❌❌ ERRO! Chaves não foram encontradas após salvar!');
        }
        
        console.log('🎉 Processo de geração de chaves concluído com sucesso!');
      } else {
        console.error('❌ Falha ao salvar chaves:', saveResult.error);
        alert('Erro ao salvar chaves: ' + saveResult.error);
      }
    } catch (error) {
      console.error('❌ Erro ao gerar chaves:', error);
      alert('Erro ao gerar chaves. Tente novamente.');
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
      {/* 🆕 FASE 2: Modal de Trial (aparece ao fazer login) */}
      {currentUser && <TrialModal userId={currentUser.id} />}
      
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
            {isAdmin && (
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/dashboard')} 
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Admin Dashboard</span>
                <span className="sm:hidden">Admin</span>
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => navigate('/pricing')} 
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Planos</span>
              <span className="sm:hidden">Planos</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsInstructionsModalOpen(true)} 
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
            >
              <BookOpen className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Instruções</span>
              <span className="sm:hidden">Instruções</span>
            </Button>
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
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Olá, {currentUser?.nomePublico || currentUser?.nomeCompleto}! 👋
          </h1>
          <p className="text-muted-foreground">
            Gerencie suas assinaturas digitais e proteja seu conteúdo
          </p>
        </div>
        
        {/* Quick Actions - Ações Principais em Destaque */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Card Assinar Conteúdo - Destaque Principal */}
          <Card 
            className="relative overflow-hidden border-2 border-blue-500 bg-gradient-to-br from-blue-50 via-white to-blue-100 hover:shadow-2xl hover:shadow-blue-200 hover:border-blue-600 transition-all duration-300 cursor-pointer group" 
            onClick={() => navigate('/sign')}
          >
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-300/10 to-cyan-300/10 rounded-full translate-y-12 -translate-x-12 group-hover:scale-150 transition-transform duration-500" />
            
            <CardHeader className="relative z-10 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <FileSignature className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-blue-900 group-hover:text-blue-700 transition-colors">
                    Assinar Conteúdo
                  </CardTitle>
                  <CardDescription className="text-blue-600/80 font-medium">
                    Proteja seu conteúdo digital
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-0">
              <p className="text-sm text-gray-600 mb-4">
                Adicione uma assinatura digital criptografada ao seu conteúdo para comprovar autoria e autenticidade.
              </p>
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 h-12 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300" 
                disabled={!keyPair}
              >
                {keyPair ? (
                  <>
                    <FileSignature className="mr-2 h-5 w-5" />
                    Criar Nova Assinatura
                  </>
                ) : 'Gere suas chaves primeiro'}
              </Button>
            </CardContent>
          </Card>
          
          {/* Card Verificar Conteúdo - Destaque Secundário */}
          <Card 
            className="relative overflow-hidden border-2 border-green-500 bg-gradient-to-br from-green-50 via-white to-emerald-100 hover:shadow-2xl hover:shadow-green-200 hover:border-green-600 transition-all duration-300 cursor-pointer group" 
            onClick={() => navigate('/verify')}
          >
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-300/10 to-teal-300/10 rounded-full translate-y-12 -translate-x-12 group-hover:scale-150 transition-transform duration-500" />
            
            <CardHeader className="relative z-10 pb-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-green-500 to-green-700 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle2 className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-green-900 group-hover:text-green-700 transition-colors">
                    Verificar Conteúdo
                  </CardTitle>
                  <CardDescription className="text-green-600/80 font-medium">
                    Confirme a autenticidade
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-0">
              <p className="text-sm text-gray-600 mb-4">
                Verifique se um conteúdo é autêntico usando o código de verificação ou QR Code do certificado.
              </p>
              <Button 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 h-12 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Verificar Assinatura
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* 🆕 AVISO DE PROBLEMAS DE PAGAMENTO */}
        <PaymentFailureAlert className="mb-6" />
        
        {/* 🆕 FASE 2: Banner de Trial (aparece no topo do dashboard) */}
        <TrialBanner className="mb-6" />
        
        {/* 🔐 2FA Security Alert */}
        {currentUser && (
          <TwoFactorAlert userId={currentUser.id} className="mb-6" />
        )}
        
        {/* 🔗 Social Links Alert */}
        {currentUser && (
          <SocialLinksAlert userId={currentUser.id} className="mb-6" />
        )}
        
        {/* Subscription Card + Key Status Card - Grid 2 colunas (visual moderno) */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Subscription Card - Modernizado */}
          <SubscriptionCard />
          
          {/* Key Status Card - Modernizado e Compacto */}
          <Card className="relative overflow-hidden border-2 border-amber-500 bg-gradient-to-br from-amber-50 via-white to-yellow-100 hover:shadow-2xl hover:shadow-amber-200 hover:border-amber-600 transition-all duration-300 group">
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-400/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-amber-300/10 to-yellow-300/10 rounded-full translate-y-12 -translate-x-12 group-hover:scale-150 transition-transform duration-500" />
            
            <CardHeader className="relative z-10 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Key className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-amber-900">
                      Chaves Criptográficas
                    </CardTitle>
                    <p className="text-sm text-amber-600/80 font-medium">
                      {keyPair ? 'Chaves ativas e seguras' : 'Sem chaves geradas'}
                    </p>
                  </div>
                </div>
                {keyPair && (
                  <Badge className="bg-green-100 text-green-800 flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Ativas
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="relative z-10 pt-2 space-y-3">
              {keyPair ? (
                <>
                  {/* Resumo compacto */}
                  <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-green-900">Criptografadas com AES-256-GCM</p>
                    </div>
                  </div>
                  
                  {/* Botão Ver Detalhes */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKeyDetails(!showKeyDetails)}
                    className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    aria-expanded={showKeyDetails}
                    aria-label={showKeyDetails ? 'Recolher detalhes' : 'Ver detalhes'}
                  >
                    {showKeyDetails ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        Recolher detalhes
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Ver detalhes
                      </>
                    )}
                  </Button>
                  
                  {/* Conteúdo expandido */}
                  {showKeyDetails && (
                    <div className="space-y-4 border-t pt-3">
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
                        <div className="flex items-center justify-between flex-wrap gap-2">
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
                  )}
                </>
              ) : (
                <>
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Gere suas chaves para começar a assinar conteúdo digitalmente. Criptografadas com AES-256-GCM e salvas no Supabase.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    onClick={handleGenerateKeys} 
                    disabled={isGeneratingKeys}
                    className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-semibold shadow-lg"
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
                </>
              )}
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
                      <ContentCard 
                        key={content.id} 
                        content={content} 
                        isCreator={true} 
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Modal de Instruções */}
      <InstructionsModal 
        open={isInstructionsModalOpen} 
        onOpenChange={setIsInstructionsModalOpen} 
      />
    </div>
  );
}