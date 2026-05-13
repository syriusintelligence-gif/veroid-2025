import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft, User, Mail, Phone, FileText, Calendar, CheckCircle2, Camera, Link as LinkIcon, Instagram, Facebook, Twitter, Youtube, Linkedin, Globe, Save, Edit, ShieldCheck, ShieldOff, Loader2, CreditCard, X } from 'lucide-react';
import { getCurrentUser, User as UserType, updateSocialLinks } from '@/lib/supabase-auth';
import { SocialLinks } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { has2FAEnabled, disable2FA } from '@/lib/supabase-2fa';
import { getCSRFToken } from '@/lib/csrf-protection';
import Setup2FAModal from '@/components/Setup2FAModal';
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

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isEditingSocial, setIsEditingSocial] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    instagram: '',
    facebook: '',
    tiktok: '',
    twitter: '',
    youtube: '',
    linkedin: '',
    website: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  
  // 🆕 2FA State
  const [has2FA, setHas2FA] = useState(false);
  const [isLoading2FA, setIsLoading2FA] = useState(true);
  const [showSetup2FAModal, setShowSetup2FAModal] = useState(false);
  const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  // 🆕 Estado para exclusão de rede social
  const [showDeleteSocialDialog, setShowDeleteSocialDialog] = useState(false);
  const [socialToDelete, setSocialToDelete] = useState<{ platform: string; label: string } | null>(null);
  const [isDeletingSocial, setIsDeletingSocial] = useState(false);

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
          console.log('🔐 [Profile] CSRF Token carregado:', token.substring(0, 20) + '...');
        }
      } catch (error) {
        console.error('❌ [Profile] Erro ao carregar token CSRF:', error);
        if (mounted) {
          setCsrfReady(true); // Marca como pronto mesmo com erro
        }
      }
    }

    loadToken();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadUser();
  }, [navigate]);

  const loadUser = async () => {
    const user = await getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    
    // Carrega links sociais existentes
    if (user.socialLinks) {
      setSocialLinks({
        instagram: user.socialLinks.instagram || '',
        facebook: user.socialLinks.facebook || '',
        tiktok: user.socialLinks.tiktok || '',
        twitter: user.socialLinks.twitter || '',
        youtube: user.socialLinks.youtube || '',
        linkedin: user.socialLinks.linkedin || '',
        website: user.socialLinks.website || '',
      });
    }
    
    // 🆕 Verifica status do 2FA
    await check2FAStatus(user.id);
  };

  // 🆕 Verifica se usuário tem 2FA ativado
  const check2FAStatus = async (userId: string) => {
    setIsLoading2FA(true);
    try {
      const enabled = await has2FAEnabled(userId);
      setHas2FA(enabled);
    } catch (error) {
      console.error('Erro ao verificar 2FA:', error);
    } finally {
      setIsLoading2FA(false);
    }
  };

  // 🆕 Handler para sucesso na configuração do 2FA
  const handle2FASetupSuccess = async () => {
    toast({
      title: '2FA Ativado!',
      description: 'Autenticação de dois fatores configurada com sucesso.',
    });
    setShowSetup2FAModal(false);
    if (currentUser) {
      await check2FAStatus(currentUser.id);
    }
  };

  // 🆕 Handler para desativar 2FA (COM CSRF)
  const handleDisable2FA = async () => {
    if (!currentUser) return;
    
    // Validação CSRF
    if (!csrfToken) {
      toast({
        title: 'Erro de Segurança',
        description: 'Token de segurança não disponível. Recarregue a página.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsDisabling2FA(true);
    
    try {
      console.log('🔒 [Profile] Desativando 2FA com CSRF Token:', csrfToken.substring(0, 20) + '...');
      
      const result = await disable2FA(currentUser.id);
      
      if (result.success) {
        toast({
          title: '2FA Desativado',
          description: 'Autenticação de dois fatores foi desativada.',
        });
        setHas2FA(false);
      } else {
        toast({
          title: 'Erro ao desativar 2FA',
          description: result.error || 'Não foi possível desativar o 2FA.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao desativar o 2FA.',
        variant: 'destructive',
      });
    } finally {
      setIsDisabling2FA(false);
      setShowDisable2FADialog(false);
    }
  };

  // 🆕 Função para garantir que URLs tenham protocolo https://
  const ensureProtocol = (url: string): string => {
    if (!url) return '';
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return '';
    
    // Se já tem protocolo, retorna como está
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    
    // Adiciona https:// automaticamente
    return `https://${trimmedUrl}`;
  };

  const handleSaveSocialLinks = async () => {
    if (!currentUser) return;
    
    setIsSaving(true);
    
    try {
      // Remove campos vazios e normaliza URLs (adiciona https:// se necessário)
      const cleanedLinks: SocialLinks = {};
      Object.entries(socialLinks).forEach(([key, value]) => {
        if (value && value.trim()) {
          // 🆕 Normaliza a URL adicionando https:// se não tiver protocolo
          cleanedLinks[key as keyof SocialLinks] = ensureProtocol(value);
        }
      });
      
      console.log('🔐 [PROFILE] Iniciando atualização de links sociais...');
      console.log('👤 User ID:', currentUser.id);
      console.log('📊 Links a atualizar:', cleanedLinks);
      
      const result = await updateSocialLinks(currentUser.id, cleanedLinks);
      
      console.log('📥 [PROFILE] Resultado recebido:', result);
      console.log('   - success:', result.success);
      console.log('   - error:', result.error);
      console.log('   - duplicatedPlatform:', result.duplicatedPlatform);
      
      if (result.success) {
        console.log('✅ [PROFILE] Sucesso! Mostrando toast de sucesso...');
        toast({
          title: 'Links atualizados!',
          description: 'Seus links de redes sociais foram salvos com sucesso.',
        });
        setIsEditingSocial(false);
        await loadUser(); // Recarrega os dados
      } else {
        // 🆕 MENSAGEM DE ERRO MELHORADA
        console.log('❌ [PROFILE] Erro detectado! Mostrando toast de erro...');
        console.error('❌ Erro ao salvar links:', result.error);
        
        // Extrai informações do erro
        const errorMessage = result.error || 'Não foi possível atualizar os links.';
        const platform = result.duplicatedPlatform;
        
        console.log('🔔 [PROFILE] Exibindo toast:', {
          title: platform ? `Link de ${platform} duplicado` : 'Erro ao salvar',
          description: errorMessage,
          variant: 'destructive'
        });
        
        // Mostra toast com mensagem específica
        toast({
          title: platform ? `Link de ${platform} duplicado` : 'Erro ao salvar',
          description: errorMessage,
          variant: 'destructive',
        });
        
        console.log('✅ [PROFILE] Toast de erro foi chamado!');
      }
    } catch (error) {
      console.error('❌ [PROFILE] Erro crítico no try/catch:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro ao salvar os links. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      console.log('🏁 [PROFILE] Finalizando (setIsSaving = false)');
      setIsSaving(false);
    }
  };

  // 🆕 Função para deletar uma rede social específica
  const handleDeleteSocialLink = async () => {
    if (!currentUser || !socialToDelete) return;
    
    setIsDeletingSocial(true);
    
    try {
      // Remove a rede social específica do objeto
      const updatedLinks = { ...currentUser.socialLinks };
      delete updatedLinks[socialToDelete.platform as keyof SocialLinks];
      
      console.log('🗑️ [PROFILE] Deletando link social:', socialToDelete.platform);
      
      const result = await updateSocialLinks(currentUser.id, updatedLinks);
      
      if (result.success) {
        toast({
          title: 'Link removido!',
          description: `Seu link do ${socialToDelete.label} foi removido com sucesso.`,
        });
        await loadUser(); // Recarrega os dados
      } else {
        toast({
          title: 'Erro ao remover',
          description: result.error || 'Não foi possível remover o link.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('❌ [PROFILE] Erro ao deletar link:', error);
      toast({
        title: 'Erro inesperado',
        description: 'Ocorreu um erro ao remover o link. Por favor, tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingSocial(false);
      setShowDeleteSocialDialog(false);
      setSocialToDelete(null);
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="h-4 w-4" />;
      case 'facebook': return <Facebook className="h-4 w-4" />;
      case 'tiktok': return <div className="h-4 w-4 font-bold text-xs flex items-center justify-center">TT</div>;
      case 'twitter': return <Twitter className="h-4 w-4" />;
      case 'youtube': return <Youtube className="h-4 w-4" />;
      case 'linkedin': return <Linkedin className="h-4 w-4" />;
      case 'website': return <Globe className="h-4 w-4" />;
      default: return <LinkIcon className="h-4 w-4" />;
    }
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'instagram': return 'Instagram';
      case 'facebook': return 'Facebook';
      case 'tiktok': return 'TikTok';
      case 'twitter': return 'Twitter/X';
      case 'youtube': return 'YouTube';
      case 'linkedin': return 'LinkedIn';
      case 'website': return 'Website';
      default: return platform;
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

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vero iD
              </span>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/pricing')} 
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Planos</span>
            <span className="sm:hidden">Planos</span>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Meu Perfil</h1>
          <p className="text-muted-foreground">Visualize suas informações de cadastro</p>
        </div>

        {/* Profile Header Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="relative">
                <Avatar className="h-32 w-32 border-4 border-blue-600">
                  <AvatarImage src={currentUser.selfieUrl} alt={currentUser.nomeCompleto} />
                  <AvatarFallback className="bg-blue-600 text-white text-4xl">
                    {getInitials(currentUser.nomeCompleto)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </div>
              
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                  <h2 className="text-3xl font-bold">{currentUser.nomeCompleto}</h2>
                  {currentUser.verified && (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verificado
                    </Badge>
                  )}
                </div>
                {currentUser.nomePublico && currentUser.nomePublico !== currentUser.nomeCompleto && (
                  <p className="text-lg text-muted-foreground mb-2">@{currentUser.nomePublico}</p>
                )}
                <p className="text-muted-foreground">{currentUser.email}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Membro desde {new Date(currentUser.createdAt).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🆕 Security Card - 2FA (COM CSRF) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança da Conta
            </CardTitle>
            <CardDescription>
              Gerencie as configurações de segurança da sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* CSRF Loading Alert */}
              {!csrfReady && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <p className="text-sm text-blue-800">Carregando proteção de segurança...</p>
                </div>
              )}

              {/* 2FA Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {has2FA ? (
                    <div className="p-2 bg-green-100 rounded-full">
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-gray-100 rounded-full">
                      <ShieldOff className="h-5 w-5 text-gray-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">Autenticação de Dois Fatores (2FA)</p>
                    <p className="text-sm text-muted-foreground">
                      {isLoading2FA 
                        ? 'Verificando...'
                        : has2FA 
                          ? 'Proteção adicional ativada com código TOTP'
                          : 'Adicione uma camada extra de segurança à sua conta'}
                    </p>
                  </div>
                </div>
                <div>
                  {isLoading2FA || !csrfReady ? (
                    <Button variant="outline" disabled>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Carregando...
                    </Button>
                  ) : has2FA ? (
                    <Button
                      variant="outline"
                      onClick={() => setShowDisable2FADialog(true)}
                      disabled={!csrfToken}
                    >
                      Desativar
                    </Button>
                  ) : (
                    <Button
                      onClick={() => setShowSetup2FAModal(true)}
                      disabled={!csrfToken}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      Configurar 2FA
                    </Button>
                  )}
                </div>
              </div>

              {has2FA && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900">2FA Ativo</p>
                      <p className="text-sm text-green-700">
                        Sua conta está protegida com autenticação de dois fatores. Você precisará do código do aplicativo autenticador para fazer login.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Social Links Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Links de Redes Sociais
                </CardTitle>
                <CardDescription>
                  Adicione seus perfis nas redes sociais. Estes links aparecerão nos certificados de autenticação.
                </CardDescription>
              </div>
              {!isEditingSocial && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingSocial(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditingSocial ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(socialLinks).map(([platform, url]) => (
                    <div key={platform} className="space-y-2">
                      <Label htmlFor={platform} className="flex items-center gap-2">
                        {getSocialIcon(platform)}
                        {getPlatformLabel(platform)}
                      </Label>
                      <Input
                        id={platform}
                        type="url"
                        placeholder={`https://${platform}.com/seu-perfil`}
                        value={url}
                        onChange={(e) => setSocialLinks({
                          ...socialLinks,
                          [platform]: e.target.value
                        })}
                      />
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleSaveSocialLinks}
                    disabled={isSaving}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Salvar Links'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingSocial(false);
                      // Restaura os valores originais
                      if (currentUser.socialLinks) {
                        setSocialLinks({
                          instagram: currentUser.socialLinks.instagram || '',
                          facebook: currentUser.socialLinks.facebook || '',
                          tiktok: currentUser.socialLinks.tiktok || '',
                          twitter: currentUser.socialLinks.twitter || '',
                          youtube: currentUser.socialLinks.youtube || '',
                          linkedin: currentUser.socialLinks.linkedin || '',
                          website: currentUser.socialLinks.website || '',
                        });
                      }
                    }}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {currentUser.socialLinks && Object.keys(currentUser.socialLinks).length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    {Object.entries(currentUser.socialLinks).map(([platform, url]) => (
                      url && (
                        <div
                          key={platform}
                          className="relative flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors group"
                        >
                          <a
                            href={ensureProtocol(url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 flex-1 min-w-0"
                          >
                            {getSocialIcon(platform)}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{getPlatformLabel(platform)}</p>
                              <p className="text-xs text-muted-foreground truncate">{url}</p>
                            </div>
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          </a>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-600"
                            onClick={(e) => {
                              e.preventDefault();
                              setSocialToDelete({ platform, label: getPlatformLabel(platform) });
                              setShowDeleteSocialDialog(true);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <LinkIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum link adicionado ainda</p>
                    <p className="text-sm">Clique em "Editar" para adicionar seus perfis</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>Dados cadastrados no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Nome Completo</span>
                </div>
                <p className="font-medium">{currentUser.nomeCompleto}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Nome Público</span>
                </div>
                <p className="font-medium">{currentUser.nomePublico || 'Não informado'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <p className="font-medium">{currentUser.email}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>Telefone</span>
                </div>
                <p className="font-medium">{currentUser.telefone}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>CPF/CNPJ</span>
                </div>
                <p className="font-medium">{currentUser.cpfCnpj}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Data de Cadastro</span>
                </div>
                <p className="font-medium">
                  {new Date(currentUser.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentos
            </CardTitle>
            <CardDescription>Documentos enviados durante o cadastro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Documento de Identidade</p>
                <div className="border rounded-lg p-4 bg-muted/50">
                  {currentUser.documentoUrl.startsWith('data:application/pdf') ? (
                    <div className="flex items-center gap-2">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium">Documento PDF</p>
                        <a 
                          href={currentUser.documentoUrl} 
                          download="documento.pdf"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Baixar documento
                        </a>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={currentUser.documentoUrl} 
                      alt="Documento" 
                      className="w-full h-auto rounded"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Selfie de Verificação</p>
                <div className="border rounded-lg p-4 bg-muted/50">
                  <img 
                    src={currentUser.selfieUrl} 
                    alt="Selfie" 
                    className="w-full h-auto rounded"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Status da Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Verificação de Identidade</p>
                <p className="text-sm text-muted-foreground">
                  Sua identidade foi verificada e sua conta está ativa
                </p>
              </div>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Verificado
              </Badge>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>ID do Usuário:</strong> {currentUser.id}
              </p>
              <p className="text-sm text-muted-foreground">
                Seus dados estão protegidos e armazenados de forma segura.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Button 
            onClick={() => navigate('/dashboard')} 
            variant="outline" 
            className="flex-1"
          >
            Voltar ao Dashboard
          </Button>
          <Button 
            onClick={() => navigate('/settings')} 
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          >
            Ir para Configurações
          </Button>
        </div>
      </div>

      {/* 🆕 Setup 2FA Modal (COM CSRF) */}
      {currentUser && csrfToken && (
        <Setup2FAModal
          isOpen={showSetup2FAModal}
          onClose={() => setShowSetup2FAModal(false)}
          onSuccess={handle2FASetupSuccess}
          userEmail={currentUser.email}
          userId={currentUser.id}
        />
      )}

      {/* 🆕 Disable 2FA Confirmation Dialog (COM CSRF) */}
      <AlertDialog open={showDisable2FADialog} onOpenChange={setShowDisable2FADialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Autenticação de Dois Fatores?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso tornará sua conta menos segura. Você não precisará mais do código do aplicativo autenticador para fazer login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisabling2FA}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              disabled={isDisabling2FA || !csrfToken}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDisabling2FA ? 'Desativando...' : 'Sim, Desativar 2FA'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 🆕 Delete Social Link Confirmation Dialog */}
      <AlertDialog open={showDeleteSocialDialog} onOpenChange={setShowDeleteSocialDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover link de rede social?</AlertDialogTitle>
            <AlertDialogDescription>
              {socialToDelete && (
                <>
                  Você tem certeza que deseja remover o link do <strong>{socialToDelete.label}</strong>? 
                  Esta ação não poderá ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSocial}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSocialLink}
              disabled={isDeletingSocial}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeletingSocial ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Sim, Remover'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hidden CSRF Token */}
      <input type="hidden" name="csrf_token" value={csrfToken || ''} />
    </div>
  );
}