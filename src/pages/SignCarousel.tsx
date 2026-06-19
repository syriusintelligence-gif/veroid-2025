import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, ArrowLeft, Loader2, Upload, X, Check, AlertCircle, Images } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/supabase-auth';
import type { User as UserType } from '@/lib/supabase-auth';
import { getKeyPair } from '@/lib/supabase-crypto';
import { signContent } from '@/lib/services/supabase-crypto-enhanced';
import type { KeyPair, SignedContent } from '@/lib/supabase-crypto';
import ContentCard from '@/components/ContentCard';
import { validateFile, getAcceptString } from '@/lib/file-validator';
import { sanitizeFileName } from '@/lib/input-sanitizer';
import { uploadCarouselImages, moveCarouselToSignedDocuments } from '@/lib/services/carousel-storage';
import type { CarouselMetadata } from '@/lib/types/carousel';
import { logAuditEvent, AuditAction } from '@/lib/audit-logger';

type SocialPlatform = 'Instagram' | 'YouTube' | 'Twitter' | 'TikTok' | 'Facebook' | 'LinkedIn' | 'Website' | 'Outros';

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

const MAX_IMAGES = 10;
const MAX_SIZE_PER_IMAGE = 10 * 1024 * 1024; // 10MB por imagem

export default function SignCarousel() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isSigning, setIsSigning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [signedContent, setSignedContent] = useState<SignedContent | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string>('');
  const [tempCarouselMetadata, setTempCarouselMetadata] = useState<CarouselMetadata | null>(null);

  useEffect(() => {
    loadUserData();
  }, [navigate]);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      
      const user = await getCurrentUser();
      if (!user) {
        navigate('/login');
        return;
      }
      
      setCurrentUser(user);
      
      const userKeyPair = await getKeyPair(user.id);
      setKeyPair(userKeyPair);
      
      console.log('✅ Dados carregados:', {
        user: user.email,
        hasKeys: !!userKeyPair,
      });
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    setFileValidationError('');
    
    if (!files.length) {
      return;
    }

    console.log('📁 [CAROUSEL UPLOAD] Arquivos selecionados:', files.length);

    // Validação: número de imagens
    if (uploadedFiles.length + files.length > MAX_IMAGES) {
      setFileValidationError(`Você pode adicionar no máximo ${MAX_IMAGES} imagens. Atualmente você tem ${uploadedFiles.length} e tentou adicionar ${files.length}.`);
      e.target.value = '';
      return;
    }

    // Validação de cada arquivo
    for (const file of files) {
      const validationResult = await validateFile(file, {
        maxSizeBytes: MAX_SIZE_PER_IMAGE,
        allowedCategories: ['image'],
        strictMode: true,
        validateMagicNumbers: true
      });

      if (!validationResult.valid) {
        console.error('❌ [CAROUSEL UPLOAD] Validação falhou:', validationResult.message);
        setFileValidationError(validationResult.message);
        
        if (currentUser) {
          logAuditEvent(AuditAction.FILE_VALIDATION_FAILED, {
            success: false,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            validationError: validationResult.message,
          }, currentUser.id).catch(err => {
            console.warn('⚠️ [AUDIT] Erro ao registrar log (não crítico):', err);
          });
        }
        
        e.target.value = '';
        return;
      }
    }

    console.log('✅ [CAROUSEL UPLOAD] Todos os arquivos validados');

    // Adicionar arquivos à lista
    setUploadedFiles(prev => [...prev, ...files]);

    // Gerar previews
    const newPreviews: string[] = [];
    for (const file of files) {
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newPreviews.push(dataUrl);
      } catch (error) {
        console.error('❌ Erro ao gerar preview:', error);
        newPreviews.push('');
      }
    }

    setFilePreviews(prev => [...prev, ...newPreviews]);

    // Upload para Supabase Storage
    if (currentUser) {
      setIsUploadingFiles(true);
      try {
        console.log('📤 [CAROUSEL STORAGE] Iniciando upload para temp-uploads...');
        
        const allFiles = [...uploadedFiles, ...files];
        const uploadResult = await uploadCarouselImages(allFiles, currentUser.id);
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Erro ao fazer upload');
        }
        
        console.log('✅ [CAROUSEL STORAGE] Upload concluído:', {
          totalImages: uploadResult.metadata?.total_images,
          executionTime: uploadResult.executionTime + 'ms'
        });
        
        setTempCarouselMetadata(uploadResult.metadata!);
        
      } catch (error) {
        console.error('❌ [CAROUSEL STORAGE] Erro no upload:', error);
        setFileValidationError(`Erro ao fazer upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        
        // Reverter adição de arquivos
        setUploadedFiles(prev => prev.slice(0, -files.length));
        setFilePreviews(prev => prev.slice(0, -files.length));
        e.target.value = '';
        return;
      } finally {
        setIsUploadingFiles(false);
      }
    }

    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
    setTempCarouselMetadata(null); // Limpa metadata temporário
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

    if (uploadedFiles.length === 0) {
      alert('Por favor, faça upload de pelo menos uma imagem');
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert('Por favor, selecione pelo menos uma rede social');
      return;
    }

    if (!currentUser) {
      alert('Erro: usuário não identificado');
      return;
    }

    if (!keyPair || !keyPair.publicKey || !keyPair.privateKey) {
      alert('Erro: Chaves criptográficas não encontradas ou inválidas.');
      return;
    }

    setIsSigning(true);

    let finalCarouselMetadata: CarouselMetadata | null = null;

    try {
      // Mover carrossel para bucket permanente
      if (tempCarouselMetadata) {
        console.log('🔄 [CAROUSEL STORAGE] Movendo carrossel para signed-documents...');
        
        const moveResult = await moveCarouselToSignedDocuments(tempCarouselMetadata, currentUser.id);
        
        if (!moveResult.success) {
          throw new Error(moveResult.error || 'Erro ao mover carrossel para storage permanente');
        }
        
        console.log('✅ [CAROUSEL STORAGE] Carrossel movido:', {
          totalImages: moveResult.metadata?.total_images,
          executionTime: moveResult.executionTime + 'ms'
        });
        
        finalCarouselMetadata = moveResult.metadata!;
      }

      const fullContent = `
Título: ${title}
Tipo: Carrossel de Imagens
Redes: ${selectedPlatforms.join(', ')}
Total de Imagens: ${uploadedFiles.length}

Conteúdo:
${content}
      `.trim();

      console.log('📝 Assinando carrossel no Supabase...');
      console.log('🎠 Metadados do carrossel:', finalCarouselMetadata);

      // Usar primeira imagem como thumbnail
      const firstThumbnail = filePreviews[0] || undefined;

      const result = await signContent(
        fullContent,
        keyPair.privateKey,
        keyPair.publicKey,
        currentUser.nomePublico || currentUser.nomeCompleto,
        currentUser.id,
        firstThumbnail,
        selectedPlatforms,
        undefined, // fileMetadata (não usado para carrossel)
        finalCarouselMetadata // 🆕 PARÂMETRO CARROSSEL ADICIONADO
      );

      if (!result.success) {
        alert(result.error || 'Erro ao assinar conteúdo. Tente novamente.');
        return;
      }

      console.log('✅ Carrossel assinado com sucesso no Supabase!');
      setSignedContent(result.signedContent!);
    } catch (error) {
      console.error('Erro ao assinar carrossel:', error);
      alert('Erro ao assinar conteúdo. Tente novamente.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleNewSignature = () => {
    setTitle('');
    setContent('');
    setSelectedPlatforms([]);
    setUploadedFiles([]);
    setFilePreviews([]);
    setSignedContent(null);
    setFileValidationError('');
    setTempCarouselMetadata(null);
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
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Images className="h-10 w-10 text-purple-600" />
            Assinar Carrossel de Imagens
          </h1>
          <p className="text-muted-foreground">
            Crie um certificado digital com múltiplas imagens (até {MAX_IMAGES} imagens)
          </p>
        </div>

        {!signedContent ? (
          <Card>
            <CardHeader>
              <CardTitle>Novo Carrossel</CardTitle>
              <CardDescription>
                Faça upload de múltiplas imagens para criar um certificado de carrossel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Assinando como: <span className="font-medium">{currentUser?.nomePublico || currentUser?.nomeCompleto}</span>
                </AlertDescription>
              </Alert>

              {fileValidationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Erro:</strong> {fileValidationError}
                  </AlertDescription>
                </Alert>
              )}

              {isUploadingFiles && (
                <Alert className="border-blue-500 bg-blue-50">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-800">
                    <strong>Fazendo upload das imagens...</strong> Aguarde enquanto as imagens são enviadas para o servidor.
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">01 - Título do Carrossel *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Galeria de fotos do evento"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isUploadingFiles}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="file-upload">
                  02 - Upload de Imagens * (máximo {MAX_IMAGES} imagens, 10MB cada)
                </Label>
                <div className="space-y-3">
                  {uploadedFiles.length < MAX_IMAGES && (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploadingFiles}
                        accept={getAcceptString(['image'])}
                        multiple
                      />
                      <label htmlFor="file-upload" className={isUploadingFiles ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}>
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Clique para adicionar imagens ou arraste aqui
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {uploadedFiles.length} / {MAX_IMAGES} imagens adicionadas
                        </p>
                      </label>
                    </div>
                  )}

                  {uploadedFiles.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={filePreviews[index]}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                          />
                          <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                            {index + 1}
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleRemoveFile(index)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                            disabled={isUploadingFiles}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <p className="text-xs text-center mt-1 truncate">{sanitizeFileName(file.name)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label>03 - Plataformas onde o Conteúdo Será Publicado *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {socialPlatforms.map((platform) => (
                    <div
                      key={platform.value}
                      className={`border rounded-lg p-3 ${isUploadingFiles ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} transition-all ${
                        selectedPlatforms.includes(platform.value)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => !isUploadingFiles && togglePlatform(platform.value)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.value)}
                          onCheckedChange={() => !isUploadingFiles && togglePlatform(platform.value)}
                          disabled={isUploadingFiles}
                        />
                        <span className="text-2xl">{platform.logo}</span>
                        <span className="text-sm font-medium">{platform.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">04 - Descrição ou Conteúdo Adicional</Label>
                <Textarea
                  id="content"
                  placeholder="Digite informações adicionais sobre o carrossel..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="resize-none"
                  disabled={isUploadingFiles}
                />
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">O que será incluído no certificado:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>✅ Carrossel interativo com todas as imagens</li>
                  <li>✅ Botão de download do carrossel em ZIP</li>
                  <li>✅ Primeira imagem como thumbnail principal</li>
                  <li>✅ Plataformas selecionadas com badges visuais</li>
                  <li>✅ Links clicáveis para seus perfis</li>
                  <li>✅ Código de verificação único</li>
                  <li>✅ QR Code para compartilhamento</li>
                </ul>
              </div>

              <Button
                onClick={handleSign}
                disabled={isSigning || isUploadingFiles || !title.trim() || uploadedFiles.length === 0 || selectedPlatforms.length === 0}
                className="w-full"
                size="lg"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Assinando Carrossel...
                  </>
                ) : isUploadingFiles ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Fazendo upload...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Assinar Carrossel Digitalmente
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
                Carrossel assinado com sucesso! Seu certificado possui {uploadedFiles.length} imagens verificáveis.
              </AlertDescription>
            </Alert>

            <ContentCard content={signedContent} />

            <div className="flex gap-4">
              <Button onClick={handleNewSignature} variant="outline" className="flex-1">
                Assinar Novo Carrossel
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