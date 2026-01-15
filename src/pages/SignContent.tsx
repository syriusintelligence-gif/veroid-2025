import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, ArrowLeft, Loader2, FileText, Image as ImageIcon, Video, FileType, Music, Upload, X, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/supabase-auth';
import type { User as UserType } from '@/lib/supabase-auth';
import { getKeyPair } from '@/lib/supabase-crypto';
import { signContent } from '@/lib/services/supabase-crypto-enhanced';
import type { KeyPair, SignedContent } from '@/lib/supabase-crypto';
import ContentCard from '@/components/ContentCard';
import { compressImage, isImageDataUrl } from '@/lib/image-compression';
// 🆕 RATE LIMITING - Imports adicionados
import { useRateLimit } from '@/hooks/useRateLimit';
import { RateLimitAlert } from '@/components/RateLimitAlert';
// 🔒 SEGURANÇA: Validação de arquivos com lista branca
import { validateFile, getAcceptString, getExtensionDescription } from '@/lib/file-validator';
import type { FileCategory } from '@/lib/file-validator';
// 🎬 VIDEO PROCESSING - Apenas thumbnail (SEM compressão)
import { 
  generateThumbnail, 
  isVideoFile, 
  formatFileSize
} from '@/lib/video-processor';
// ========================================
// INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
// ========================================
import FileScanStatus from '@/components/FileScanStatus';
import { calculateFileHash } from '@/hooks/useFileScanStatus';
import { supabase } from '@/lib/supabase';
// ========================================
// FIM: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
// ========================================
// ========================================
// 🔒 SEGURANÇA: SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 2
// ========================================
import { sanitizeFileName } from '@/lib/input-sanitizer';
// ========================================
// FIM: SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 2
// ========================================

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
  
  // 🔒 SEGURANÇA: Estado para mensagens de erro de validação de arquivo
  const [fileValidationError, setFileValidationError] = useState<string>('');
  
  // 🎬 VIDEO PROCESSING: Estados simplificados (APENAS thumbnail)
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  
  // 🆕 RATE LIMITING - Hook inicializado
  // Limite: 10 assinaturas por hora, bloqueio de 2 horas se exceder
  const { 
    check: checkRateLimit, 
    isBlocked, 
    blockedUntil, 
    remaining, 
    message: rateLimitMessage 
  } = useRateLimit('SIGN_CONTENT');
  
  // ========================================
  // INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
  // ========================================
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [isScanningFile, setIsScanningFile] = useState(false);
  const [scanError, setScanError] = useState<string>('');
  // ========================================
  // FIM: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
  // ========================================
  
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
      
      // Carrega chaves do usuário do Supabase
      const userKeyPair = await getKeyPair(user.id);
      setKeyPair(userKeyPair);
      
      console.log('✅ Dados carregados:', {
        user: user.email,
        hasKeys: !!userKeyPair,
        publicKey: userKeyPair?.publicKey?.substring(0, 20) + '...',
        privateKey: userKeyPair?.privateKey?.substring(0, 20) + '...',
        hasSocialLinks: !!user.socialLinks,
      });
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  /**
   * 🔒 SEGURANÇA: Mapeia ContentType para FileCategory do validador
   */
  const getFileCategoryFromContentType = (type: ContentType): FileCategory[] => {
    switch (type) {
      case 'image':
        return ['image'];
      case 'video':
        return ['video'];
      case 'music':
        return ['audio'];
      case 'document':
        return ['document'];
      case 'text':
        return ['text', 'document']; // Texto aceita tanto .txt quanto documentos
      default:
        return ['image', 'video', 'audio', 'document', 'text']; // Fallback: aceita tudo
    }
  };
  
  /**
   * 🎬 VIDEO PROCESSING: Gera APENAS thumbnail (SEM compressão)
   * Rápido e eficiente - funciona para vídeos de qualquer tamanho
   */
  const generateVideoThumbnail = async (file: File): Promise<void> => {
    console.log('🎬 [VIDEO THUMBNAIL] Gerando thumbnail do vídeo');
    setIsProcessingVideo(true);
    
    try {
      // Gera thumbnail da primeira imagem do vídeo
      const thumbnail = await generateThumbnail(file, {
        maxWidth: 800,
        maxHeight: 600,
        quality: 0.8,
        format: 'image/jpeg'
      });
      
      setVideoThumbnail(thumbnail);
      console.log('✅ [VIDEO THUMBNAIL] Thumbnail gerada com sucesso');
      
    } catch (error) {
      console.error('❌ [VIDEO THUMBNAIL] Erro ao gerar thumbnail:', error);
      setFileValidationError(`Erro ao gerar thumbnail: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      // Limpa estados em caso de erro
      setVideoThumbnail(null);
      setUploadedFile(null);
    } finally {
      setIsProcessingVideo(false);
    }
  };
  
  /**
   * 🔒 SEGURANÇA: Handler de upload com validação rigorosa
   * 🆕 ETAPA 3: Função agora é ASSÍNCRONA e usa await validateFile()
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    // Limpa estados anteriores
    setFileValidationError('');
    setUploadedFile(null);
    setFilePreview(null);
    setVideoThumbnail(null);
    // ========================================
    // INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
    // ========================================
    setFileHash(null);
    setScanError('');
    setIsScanningFile(false);
    // ========================================
    // FIM: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
    // ========================================
    
    if (!file) {
      return;
    }
    
    // ========================================
    // 🔒 SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 2 (PONTO 1/4)
    // ========================================
    const sanitizedFileName = sanitizeFileName(file.name);
    
    console.log('📁 [FILE UPLOAD] Arquivo selecionado:', {
      originalName: file.name,
      sanitizedName: sanitizedFileName,
      size: file.size,
      type: file.type,
      contentType: contentType
    });
    // ========================================
    // FIM: SANITIZAÇÃO - PONTO 1/4
    // ========================================
    
    // =====================================================
    // 🔒 VALIDAÇÃO DE SEGURANÇA: Lista branca + Magic Numbers
    // =====================================================
    const allowedCategories = getFileCategoryFromContentType(contentType);
    
    // 🎬 VIDEO: Aumenta limite para 200MB (apenas para leitura de metadados e thumbnail)
    // Não fazemos upload do vídeo completo, apenas da thumbnail gerada
    const maxSize = contentType === 'video' ? 200 * 1024 * 1024 : 10 * 1024 * 1024;
    
    // 🆕 ETAPA 3: Adiciona await para validação assíncrona
    const validationResult = await validateFile(file, {
      maxSizeBytes: maxSize,
      allowedCategories: allowedCategories,
      strictMode: true, // Ativa validação de MIME type
      validateMagicNumbers: true // 🆕 Ativa validação de Magic Numbers
    });
    
    if (!validationResult.valid) {
      console.error('❌ [FILE UPLOAD] Validação falhou:', validationResult.message);
      setFileValidationError(validationResult.message);
      
      // Limpa o input de arquivo
      e.target.value = '';
      return;
    }
    
    console.log('✅ [FILE UPLOAD] Arquivo validado com sucesso:', validationResult.details);
    
    // Arquivo válido, prosseguir com upload
    setUploadedFile(file);
    
    // ========================================
    // INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
    // ========================================
    // Calcula hash do arquivo e inicia scan VirusTotal
    setIsScanningFile(true);
    setScanError('');
    
    try {
      console.log('🔐 [VIRUSTOTAL] Calculando hash do arquivo...');
      const hash = await calculateFileHash(file);
      setFileHash(hash);
      console.log('✅ [VIRUSTOTAL] Hash calculado:', hash);
      
      // Chama Edge Function para scan
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.warn('⚠️ [VIRUSTOTAL] Usuário não autenticado, pulando scan');
        setIsScanningFile(false);
        // Não bloqueia o upload, apenas não faz scan
        return;
      }
      
      console.log('🚀 [VIRUSTOTAL] Iniciando scan via Edge Function...');
      
      // ========================================
      // 🔒 SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 2 (PONTO 2/4)
      // ========================================
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-uploaded-file`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            file_name: sanitizedFileName, // 🔒 USANDO NOME SANITIZADO
            file_size: file.size,
            file_hash: hash,
          }),
        }
      );
      // ========================================
      // FIM: SANITIZAÇÃO - PONTO 2/4
      // ========================================
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [VIRUSTOTAL] Erro ao iniciar scan:', errorData);
        setScanError(errorData.error || 'Erro ao iniciar scan de segurança');
        // Não bloqueia o upload, apenas exibe erro
      } else {
        const resultData = await response.json();
        console.log('✅ [VIRUSTOTAL] Scan iniciado com sucesso:', resultData);
      }
    } catch (error) {
      console.error('❌ [VIRUSTOTAL] Erro ao processar scan:', error);
      setScanError('Erro ao processar scan de segurança');
      // Não bloqueia o upload, apenas exibe erro
    } finally {
      setIsScanningFile(false);
    }
    // ========================================
    // FIM: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
    // ========================================
    
    // =====================================================
    // 🎬 PROCESSAMENTO ESPECÍFICO POR TIPO DE ARQUIVO
    // =====================================================
    
    // VÍDEO: Gera APENAS thumbnail (SEM compressão)
    if (contentType === 'video' && isVideoFile(file)) {
      await generateVideoThumbnail(file);
    }
    // IMAGEM: Cria preview e comprime
    else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalDataUrl = reader.result as string;
        
        try {
          // 🆕 Comprime a imagem automaticamente
          console.log('🗜️ Comprimindo imagem...');
          const compressedDataUrl = await compressImage(originalDataUrl, {
            maxWidth: 800,
            maxHeight: 600,
            quality: 0.7,
            maxSizeKB: 100,
          });
          
          setFilePreview(compressedDataUrl);
        } catch (error) {
          console.error('❌ Erro ao comprimir imagem:', error);
          // Fallback: usa imagem original se compressão falhar
          setFilePreview(originalDataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
    // OUTROS: Sem preview
    else {
      setFilePreview(null);
    }
  };
  
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setFileValidationError('');
    setVideoThumbnail(null);
    // ========================================
    // INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
    // ========================================
    setFileHash(null);
    setScanError('');
    setIsScanningFile(false);
    // ========================================
    // FIM: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
    // ========================================
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
    
    if (!currentUser) {
      alert('Erro: usuário não identificado');
      return;
    }
    
    // 🆕 VALIDAÇÃO EXTRA: Verifica se as chaves existem e não estão vazias
    if (!keyPair || !keyPair.publicKey || !keyPair.privateKey) {
      console.error('❌ Chaves inválidas ou vazias:', {
        hasKeyPair: !!keyPair,
        hasPublicKey: !!keyPair?.publicKey,
        hasPrivateKey: !!keyPair?.privateKey,
      });
      
      alert('Erro: Chaves criptográficas não encontradas ou inválidas. Tente recarregar a página ou gerar novas chaves no Dashboard.');
      return;
    }
    
    // 🆕 VALIDAÇÃO EXTRA: Verifica se as chaves têm o formato correto
    if (!keyPair.publicKey.startsWith('VID-PUB-') || !keyPair.privateKey.startsWith('VID-PRIV-')) {
      console.error('❌ Formato de chaves inválido:', {
        publicKeyPrefix: keyPair.publicKey.substring(0, 10),
        privateKeyPrefix: keyPair.privateKey.substring(0, 10),
      });
      
      alert('Erro: Formato de chaves inválido. Por favor, gere novas chaves no Dashboard.');
      return;
    }
    
    console.log('✅ Validação de chaves passou:', {
      publicKey: keyPair.publicKey.substring(0, 20) + '...',
      privateKey: keyPair.privateKey.substring(0, 20) + '...',
    });
    
    // 🆕 RATE LIMITING - Verificação ANTES de assinar
    console.log('🔍 [RATE LIMIT] Verificando limite de assinaturas...');
    const rateLimitResult = await checkRateLimit();
    
    if (!rateLimitResult.allowed) {
      console.warn('🚫 [RATE LIMIT] Limite excedido:', rateLimitResult.message);
      alert(rateLimitResult.message || 'Você excedeu o limite de assinaturas. Aguarde antes de tentar novamente.');
      return;
    }
    
    console.log(`✅ [RATE LIMIT] Verificação passou. Tentativas restantes: ${rateLimitResult.remaining}`);
    
    setIsSigning(true);
    try {
      // ========================================
      // 🔒 SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 2 (PONTO 3/4)
      // ========================================
      // Sanitiza o nome do arquivo antes de incluir no conteúdo assinado
      const sanitizedFileName = uploadedFile ? sanitizeFileName(uploadedFile.name) : '';
      
      // Combine all information into the content to be signed
      const fullContent = `
Título: ${title}
Tipo: ${contentTypes.find(t => t.value === contentType)?.label}
Redes: ${selectedPlatforms.join(', ')}
${uploadedFile ? `Arquivo: ${sanitizedFileName}` : ''}

Conteúdo:
${content}
      `.trim();
      // ========================================
      // FIM: SANITIZAÇÃO - PONTO 3/4
      // ========================================
      
      console.log('📝 Assinando conteúdo no Supabase...');
      console.log('🔗 Links sociais do usuário:', currentUser.socialLinks);
      
      // 🎬 VIDEO: Usa thumbnail do vídeo se disponível
      let finalThumbnail = videoThumbnail || filePreview;
      
      // 🆕 Comprime thumbnail novamente antes de assinar (garantia extra)
      if (finalThumbnail && isImageDataUrl(finalThumbnail)) {
        try {
          finalThumbnail = await compressImage(finalThumbnail, {
            maxWidth: 800,
            maxHeight: 600,
            quality: 0.7,
            maxSizeKB: 100,
          });
          console.log('✅ Thumbnail final comprimida antes de assinar');
        } catch (error) {
          console.warn('⚠️ Erro ao comprimir thumbnail final, usando original:', error);
        }
      }
      
      const result = await signContent(
        fullContent,
        keyPair.privateKey,
        keyPair.publicKey,
        currentUser.nomePublico || currentUser.nomeCompleto,
        currentUser.id,
        finalThumbnail || undefined,
        selectedPlatforms
      );
      
      if (!result.success) {
        alert(result.error || 'Erro ao assinar conteúdo. Tente novamente.');
        return;
      }
      
      console.log('✅ Conteúdo assinado com sucesso no Supabase!');
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
    setFileValidationError('');
    setVideoThumbnail(null);
    // ========================================
    // INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
    // ========================================
    setFileHash(null);
    setScanError('');
    setIsScanningFile(false);
    // ========================================
    // FIM: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
    // ========================================
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
              
              {/* 🆕 RATE LIMITING - Alerta visual quando bloqueado */}
              {isBlocked && (
                <RateLimitAlert 
                  blockedUntil={blockedUntil}
                  message={rateLimitMessage}
                  remaining={remaining}
                />
              )}
              
              {/* 🆕 RATE LIMITING - Aviso de tentativas restantes */}
              {!isBlocked && remaining !== undefined && remaining <= 3 && remaining > 0 && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertDescription className="text-yellow-800">
                    ⚠️ Atenção: Você tem {remaining} {remaining === 1 ? 'assinatura restante' : 'assinaturas restantes'} nesta hora.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 🔒 SEGURANÇA: Alerta de erro de validação de arquivo */}
              {fileValidationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Arquivo não permitido:</strong> {fileValidationError}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* 🎬 VIDEO PROCESSING: Alerta de processamento */}
              {isProcessingVideo && (
                <Alert className="border-blue-500 bg-blue-50">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-800">
                    <strong>Gerando thumbnail do vídeo...</strong> Isso levará apenas alguns segundos.
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Título do Conteúdo */}
              <div className="space-y-2">
                <Label htmlFor="title">01 - Título do Conteúdo *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Minha nova campanha de produto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isBlocked || isProcessingVideo}
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
                      className={`flex items-center gap-2 justify-start relative transition-all duration-300 ${
                        contentType === type.value
                          ? 'border-2 border-blue-600 bg-blue-600 text-white shadow-lg scale-105'
                          : 'border-2 border-gray-200 hover:border-blue-400 hover:shadow-md'
                      }`}
                      onClick={() => {
                        setContentType(type.value);
                        // Limpa arquivo e erro ao mudar tipo
                        setUploadedFile(null);
                        setFilePreview(null);
                        setFileValidationError('');
                        setVideoThumbnail(null);
                        // ========================================
                        // INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
                        // ========================================
                        setFileHash(null);
                        setScanError('');
                        setIsScanningFile(false);
                        // ========================================
                        // FIM: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
                        // ========================================
                      }}
                      disabled={isBlocked || isProcessingVideo}
                    >
                      {type.icon}
                      <span className="text-sm">{type.label}</span>
                      {contentType === type.value && (
                        <Check className="h-4 w-4 absolute top-1 right-1" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Upload de Arquivo */}
              <div className="space-y-3">
                <Label htmlFor="file-upload">
                  03 - Upload do Arquivo (Opcional - será validado e processado automaticamente)
                  {contentType === 'video' && <span className="text-blue-600 font-medium"> - Apenas thumbnail será gerada (vídeo não será enviado)</span>}
                </Label>
                <div className="space-y-3">
                  {!uploadedFile ? (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isBlocked || isProcessingVideo}
                        accept={getAcceptString(getFileCategoryFromContentType(contentType))}
                      />
                      <label htmlFor="file-upload" className={isBlocked || isProcessingVideo ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}>
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground mb-2">
                          Clique para fazer upload ou arraste o arquivo aqui
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contentType === 'image' && `Formatos aceitos: ${getExtensionDescription('image')}`}
                          {contentType === 'video' && `Formatos aceitos: ${getExtensionDescription('video')}`}
                          {contentType === 'music' && `Formatos aceitos: ${getExtensionDescription('audio')}`}
                          {contentType === 'document' && `Formatos aceitos: ${getExtensionDescription('document')}`}
                          {contentType === 'text' && `Formatos aceitos: ${getExtensionDescription('text')}, ${getExtensionDescription('document')}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          🔒 Máximo: {contentType === 'video' ? '200MB' : '10MB'} | Validação de segurança ativa
                        </p>
                        {contentType === 'video' && (
                          <p className="text-xs text-blue-600 mt-2 font-medium">
                            🎬 Vídeos: Apenas thumbnail será gerada (rápido e eficiente)
                          </p>
                        )}
                      </label>
                    </div>
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-start gap-4">
                        {/* Preview da thumbnail (imagem ou vídeo) */}
                        {(filePreview || videoThumbnail) ? (
                          <img
                            src={videoThumbnail || filePreview || ''}
                            alt="Preview"
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                            <FileType className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          {/* ========================================
                              🔒 SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 2 (PONTO 4/4)
                              ======================================== */}
                          <p className="font-medium truncate">{sanitizeFileName(uploadedFile.name)}</p>
                          {/* ========================================
                              FIM: SANITIZAÇÃO - PONTO 4/4
                              ======================================== */}
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(uploadedFile.size)}
                          </p>
                          
                          {/* Status de processamento de vídeo */}
                          {contentType === 'video' && videoThumbnail && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-green-600">
                                ✓ Thumbnail gerada com sucesso
                              </p>
                              <p className="text-xs text-blue-600">
                                ℹ️ Vídeo não será enviado (apenas thumbnail)
                              </p>
                            </div>
                          )}
                          
                          {/* Status de imagem */}
                          {contentType === 'image' && filePreview && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Validado e comprimido para o certificado
                            </p>
                          )}
                          
                          {/* Status de outros arquivos */}
                          {contentType !== 'video' && contentType !== 'image' && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Arquivo validado com sucesso
                            </p>
                          )}
                          
                          {/* ========================================
                              INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
                              ======================================== */}
                          {/* Status do scan VirusTotal */}
                          {fileHash && (
                            <div className="mt-3 pt-3 border-t border-muted">
                              <FileScanStatus 
                                fileHash={fileHash}
                                showDetails={true}
                                showVirusTotalLink={true}
                                compact={false}
                              />
                            </div>
                          )}
                          
                          {isScanningFile && (
                            <div className="mt-3 pt-3 border-t border-muted">
                              <div className="flex items-center gap-2 text-sm text-blue-600">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Iniciando scan de segurança...</span>
                              </div>
                            </div>
                          )}
                          
                          {scanError && (
                            <div className="mt-3 pt-3 border-t border-muted">
                              <Alert variant="destructive" className="py-2">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription className="text-xs">
                                  {scanError}
                                </AlertDescription>
                              </Alert>
                            </div>
                          )}
                          {/* ========================================
                              FIM: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7
                              ======================================== */}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleRemoveFile}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={isBlocked || isProcessingVideo}
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
                      className={`border rounded-lg p-3 ${isBlocked || isProcessingVideo ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} transition-all ${
                        selectedPlatforms.includes(platform.value)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => !(isBlocked || isProcessingVideo) && togglePlatform(platform.value)}
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.value)}
                          onCheckedChange={() => !(isBlocked || isProcessingVideo) && togglePlatform(platform.value)}
                          disabled={isBlocked || isProcessingVideo}
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
                  disabled={isBlocked || isProcessingVideo}
                />
                <p className="text-xs text-muted-foreground">
                  {content.length} caracteres
                </p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">O que será incluído no certificado:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>✅ Thumbnail comprimida do conteúdo (salva no Supabase)</li>
                  {contentType === 'video' && <li>✅ Thumbnail gerada automaticamente da primeira imagem do vídeo</li>}
                  {contentType === 'video' && <li>ℹ️ Vídeo completo NÃO será enviado (apenas thumbnail)</li>}
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
                disabled={isSigning || isBlocked || isProcessingVideo || !title.trim() || selectedPlatforms.length === 0}
                className="w-full"
                size="lg"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Assinando...
                  </>
                ) : isProcessingVideo ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Gerando thumbnail...
                  </>
                ) : isBlocked ? (
                  'Bloqueado Temporariamente'
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
                Conteúdo assinado com sucesso no Supabase! Seu conteúdo agora possui uma assinatura digital verificável com thumbnail comprimida, plataformas e links clicáveis.
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