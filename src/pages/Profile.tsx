import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, ArrowLeft, User, Mail, Phone, FileText, Calendar, CheckCircle2, Camera, Link as LinkIcon, Instagram, Facebook, Twitter, Youtube, Linkedin, Globe, Save, Edit } from 'lucide-react';
import { getCurrentUser, User as UserType, updateSocialLinks } from '@/lib/supabase-auth';
import { SocialLinks } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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
  };

  const handleLogoClick = async () => {
    const user = await getCurrentUser();
    navigate(user ? '/dashboard' : '/');
  };

  const handleSaveSocialLinks = async () => {
    if (!currentUser) return;
    
    setIsSaving(true);
    
    // Remove campos vazios
    const cleanedLinks: SocialLinks = {};
    Object.entries(socialLinks).forEach(([key, value]) => {
      if (value && value.trim()) {
        cleanedLinks[key as keyof SocialLinks] = value.trim();
      }
    });
    
    const result = await updateSocialLinks(currentUser.id, cleanedLinks);
    
    if (result.success) {
      toast({
        title: 'Links atualizados!',
        description: 'Seus links de redes sociais foram salvos com sucesso.',
      });
      setIsEditingSocial(false);
      await loadUser(); // Recarrega os dados
    } else {
      toast({
        title: 'Erro ao salvar',
        description: result.error || 'Não foi possível atualizar os links.',
        variant: 'destructive',
      });
    }
    
    setIsSaving(false);
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
            <button 
              onClick={handleLogoClick}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
              title="Vero iD"
            >
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vero iD
              </span>
            </button>
          </div>
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
                    className="flex-1"
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
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          {getSocialIcon(platform)}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{getPlatformLabel(platform)}</p>
                            <p className="text-xs text-muted-foreground truncate">{url}</p>
                          </div>
                          <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        </a>
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
          <Button onClick={() => navigate('/dashboard')} variant="outline" className="flex-1">
            Voltar ao Dashboard
          </Button>
          <Button onClick={() => navigate('/settings')} className="flex-1">
            Ir para Configurações
          </Button>
        </div>
      </div>
    </div>
  );
}