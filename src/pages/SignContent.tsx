import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, ArrowLeft, Loader2, FileText, Image as ImageIcon, Video, FileType, Music, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/supabase-auth';
import type { User as UserType } from '@/lib/supabase-auth';
import { getKeyPair, signContent } from '@/lib/crypto';
import type { KeyPair, SignedContent } from '@/lib/crypto';
import ContentCard from '@/components/ContentCard';

type ContentType = 'text' | 'image' | 'video' | 'document' | 'music';
type SocialPlatform = 'Instagram' | 'YouTube' | 'Twitter' | 'TikTok' | 'Facebook' | 'LinkedIn' | 'Website' | 'Outros';

const contentTypes: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Texto', icon: <FileText className="h-5 w-5" /> },
  { value: 'image', label: 'Imagem', icon: <ImageIcon className="h-5 w-5" /> },
  { value: 'video', label: 'Vídeo', icon: <Video className="h-5 w-5" /> },
  { value: 'document', label: 'Documento', icon: <FileType className="h-5 w-5" /> },
  { value: 'music', label: 'Música', icon: <Music className="h-5 w-5" /> },
];

const socialPlatforms: { value: SocialPlatform; label: string; logo: string }[] = [
  { value: 'Instagram', label: 'Instagram', logo: '📷' },
  { value: 'YouTube', label: 'YouTube', logo: '▶️' },
  { value: 'Twitter', label: 'X/Twitter', logo: '🐦' },
  { value: 'TikTok', label: 'TikTok', logo: '🎵' },
  { value: 'Facebook', label: 'Facebook', logo: '👥' },
  { value: 'LinkedIn', label: 'LinkedIn', logo: '💼' },
  { value: 'Website', label: 'Website', logo: '🌐' },
  { value: 'Outros', label: 'Outros', logo: '📱' },
];

export default function SignContent() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<ContentType>('text');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [signedContent, setSignedContent] = useState<SignedContent | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  
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
      
      // Carrega chaves do usuário
      const userKeyPair = getKeyPair(user.id);
      setKeyPair(userKeyPair);
      
      console.log('✅ Dados carregados:', {
        user: user.email,
        hasKeys: !!userKeyPair,
        hasSocialLinks: !!user.socialLinks,
      });
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFilePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };
  
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
  };
  
  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };
  
  const handleSign = async () => {
    if (!title.trim()) {
      alert('Por favor, insira o título do conteúdo');
      return;
    }
    
    if (!content.trim() && !uploadedFile) {
      alert('Por favor, insira o conteúdo ou faça upload de um arquivo');
      return;
    }
    
    if (selectedPlatforms.length === 0) {
      alert('Por favor, selecione pelo menos uma rede social');
      return;
    }
    
    if (!keyPair) {
      alert('Você precisa gerar suas chaves primeiro');
      navigate('/dashboard');
      return;
    }
    
    if (!currentUser) {
      alert('Erro: usuário não identificado');
      return;
    }
    
    setIsSigning(true);
    try {
      // Combine all information into the content to be signed
      const fullContent = `
Título: ${title}
Tipo: ${contentTypes.find(t => t.value === contentType)?.label}
Redes: ${selectedPlatforms.join(', ')}
${uploadedFile ? `Arquivo: ${uploadedFile.name}` : ''}

Conteúdo:
${content}
      `.trim();
      
      console.log('📝 Assinando conteúdo no localStorage...');
      console.log('🔗 Links sociais do usuário:', currentUser.socialLinks);
      
      // 🆕 Normaliza os links sociais para garantir que tenham https://
      const normalizedSocialLinks = currentUser.socialLinks ? {
        instagram: currentUser.socialLinks.instagram?.startsWith('http') 
          ? currentUser.socialLinks.instagram 
          : currentUser.socialLinks.instagram ? `https://${currentUser.socialLinks.instagram}` : undefined,
        facebook: currentUser.socialLinks.facebook?.startsWith('http')
          ? currentUser.socialLinks.facebook
          : currentUser.socialLinks.facebook ? `https://${currentUser.socialLinks.facebook}` : undefined,
        twitter: currentUser.socialLinks.twitter?.startsWith('http')
          ? currentUser.socialLinks.twitter
          : currentUser.socialLinks.twitter ? `https://${currentUser.socialLinks.twitter}` : undefined,
        tiktok: currentUser.socialLinks.tiktok?.startsWith('http')
          ? currentUser.socialLinks.tiktok
          : currentUser.socialLinks.tiktok ? `https://${currentUser.socialLinks.tiktok}` : undefined,
        youtube: currentUser.socialLinks.youtube?.startsWith('http')
          ? currentUser.socialLinks.youtube
          : currentUser.socialLinks.youtube ? `https://${currentUser.socialLinks.youtube}` : undefined,
        linkedin: currentUser.socialLinks.linkedin?.startsWith('http')
          ? currentUser.socialLinks.linkedin
          : currentUser.socialLinks.linkedin ? `https://${currentUser.socialLinks.linkedin}` : undefined,
        website: currentUser.socialLinks.website?.startsWith('http')
          ? currentUser.socialLinks.website
          : currentUser.socialLinks.website ? `https://${currentUser.socialLinks.website}` : undefined,
      } : undefined;
      
      console.log('✅ Links normalizados:', normalizedSocialLinks);
      
      const result = signContent(
        fullContent,
        keyPair.privateKey,
        keyPair.publicKey,
        currentUser.nomePublico || currentUser.nomeCompleto,
        currentUser.id,
        filePreview || undefined,
        selectedPlatforms,
        normalizedSocialLinks // 🆕 Passa os links sociais normalizados
      );
      
      if (!result.success) {
        alert(result.error || 'Erro ao assinar conteúdo. Tente novamente.');
        return;
      }
      
      console.log('✅ Conteúdo assinado com sucesso!');
      console.log('🔗 Links sociais incluídos no certificado:', result.signedContent?.creatorSocialLinks);
      setSignedContent(result.signedContent!);
    } catch (error) {
      console.error('Erro ao assinar conteúdo:', error);
      alert('Erro ao assinar conteúdo. Tente novamente.');
    } finally {
      setIsSigning(false);
    }
  };
  
  const handleNewSignature = () => {
    setTitle('');
    setContent('');
    setContentType('text');
    setSelectedPlatforms([]);
    setUploadedFile(null);
    setFilePreview(null);
    setSignedContent(null);
  };
  
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
  
  if (!keyPair) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Chaves Não Encontradas</CardTitle>
            <CardDescription>
              Você precisa gerar suas chaves criptográficas antes de assinar conteúdo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Ir para Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
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
          <Button variant="outline" onClick={() => navigate('/verify')}>
            Verificar Conteúdo
          </Button>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Assinar Conteúdo</h1>
          <p className="text-muted-foreground">
            Adicione uma assinatura digital criptografada ao seu conteúdo
          </p>
        </div>
        
        {!signedContent ? (
          <Card>
            <CardHeader>
              <CardTitle>Novo Conteúdo</CardTitle>
              <CardDescription>
                Preencha as informações do conteúdo que deseja assinar digitalmente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Assinando como: <span className="font-medium">{currentUser?.nomePublico || currentUser?.nomeCompleto}</span>
                </AlertDescription>
              </Alert>
              
              {/* Título do Conteúdo */}
              <div className="space-y-2">
                <Label htmlFor="title">01 - Título do Conteúdo *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Minha nova campanha de produto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              
              {/* Tipo de Conteúdo */}
              <div className="space-y-3">
                <Label>02 - Tipo de Conteúdo *</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {contentTypes.map((type) => (
                    <Button
                      key={type.value}
                      variant={contentType === type.value ? 'default' : 'outline'}
                      className="flex items-center gap-2 justify-start"
                      onClick={() => setContentType(type.value)}
                    >
                      {type.icon}
                      <span className="text-sm">{type.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Upload de Arquivo */}
              <div className="space-y-3">
                <Label htmlFor="file-upload">03 - Upload do Arquivo (Opcional - será usado como thumbnail)</Label>
                <div className="space-y-3">
                  {!uploadedFile ? (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept={
                          contentType === 'image' ? 'image/*' :
                          contentType === 'video' ? 'video/*' :
                          contentType === 'music' ? 'audio/*' :
                          contentType === 'document' ? '.pdf,.doc,.docx,.txt' :
                          '*'
                        }
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Clique para fazer upload ou arraste o arquivo aqui
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contentType === 'image' && 'Formatos: JPG, PNG, GIF, WebP (será usado como thumbnail)'}
                          {contentType === 'video' && 'Formatos: MP4, MOV, AVI, WebM'}
                          {contentType === 'music' && 'Formatos: MP3, WAV, OGG, M4A'}
                          {contentType === 'document' && 'Formatos: PDF, DOC, DOCX, TXT'}
                          {contentType === 'text' && 'Qualquer tipo de arquivo'}
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-start gap-4">
                        {filePreview ? (
                          <img
                            src={filePreview}
                            alt="Preview"
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                            <FileType className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{uploadedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {filePreview && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Será usado como thumbnail no certificado
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveFile}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Redes Sociais */}
              <div className="space-y-3">
                <Label>04 - Plataformas onde o Conteúdo Será Publicado *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {socialPlatforms.map((platform) => (
                    <div
                      key={platform.value}
                      className={`border rounded-lg p-3 cursor-pointer transition-all ${
                        selectedPlatforms.includes(platform.value)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => togglePlatform(platform.value)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.value)}
                          onCheckedChange={() => togglePlatform(platform.value)}
                        />
                        <span className="text-2xl">{platform.logo}</span>
                        <span className="text-sm font-medium">{platform.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedPlatforms.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'plataforma selecionada' : 'plataformas selecionadas'}
                  </p>
                )}
              </div>
              
              {/* Conteúdo/Descrição */}
              <div className="space-y-2">
                <Label htmlFor="content">05 - Descrição ou Conteúdo Adicional</Label>
                <Textarea
                  id="content"
                  placeholder="Digite informações adicionais, descrição, legenda, ou o texto completo do conteúdo..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} caracteres
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">O que será incluído no certificado:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>✅ Thumbnail do conteúdo (se imagem foi enviada)</li>
                  <li>✅ Plataformas selecionadas com badges visuais</li>
                  <li>✅ Links clicáveis para seus perfis nas plataformas</li>
                  <li>✅ Chave pública do assinante para validação</li>
                  <li>✅ Hash SHA-256 do conteúdo completo</li>
                  <li>✅ Assinatura digital verificável</li>
                  <li>✅ Código de verificação único</li>
                  <li>✅ QR Code para compartilhamento</li>
                </ul>
              </div>
              
              <Button
                onClick={handleSign}
                disabled={isSigning || !title.trim() || selectedPlatforms.length === 0}
                className="w-full"
                size="lg"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Assinando...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Assinar Digitalmente
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Alert className="border-green-500 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Conteúdo assinado com sucesso! Seu conteúdo agora possui uma assinatura digital verificável com thumbnail, plataformas e links clicáveis.
              </AlertDescription>
            </Alert>
            
            <ContentCard content={signedContent} />
            
            <div className="flex gap-4">
              <Button onClick={handleNewSignature} variant="outline" className="flex-1">
                Assinar Novo Conteúdo
              </Button>
              <Button onClick={() => navigate('/dashboard')} className="flex-1">
                Voltar ao Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
