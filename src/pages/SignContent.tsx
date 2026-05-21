import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Shield, ArrowLeft, Loader2, FileText, Image as ImageIcon, Video, FileType, Music, Upload, X, Check, AlertCircle, Images } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@/lib/supabase-auth';
import type { User as UserType } from '@/lib/supabase-auth';
import { getKeyPair } from '@/lib/supabase-crypto';
import { signContent } from '@/lib/services/supabase-crypto-enhanced';
import type { KeyPair, SignedContent } from '@/lib/supabase-crypto';
import ContentCard from '@/components/ContentCard';
import { compressImage, isImageDataUrl } from '@/lib/image-compression';
import { CameraCapture } from '@/components/CameraCapture';
import { useRateLimit } from '@/hooks/useRateLimit';
import { RateLimitAlert } from '@/components/RateLimitAlert';
import { validateFile, getAcceptString, getExtensionDescription } from '@/lib/file-validator';
import type { FileCategory } from '@/lib/file-validator';
import { 
  generateThumbnail, 
  isVideoFile, 
  formatFileSize
} from '@/lib/video-processor';
import { calculateFileHash } from '@/hooks/useFileScanStatus';
import { supabase } from '@/lib/supabase';
import { sanitizeFileName } from '@/lib/input-sanitizer';
import { 
  moveToSignedDocuments,
  deleteFile
} from '@/lib/services/storage-service';
import { uploadToTempBucketWithProgress } from '@/lib/services/storage-service-with-progress';
import { logAuditEvent, AuditAction } from '@/lib/audit-logger';
import { generateDocumentPreview, isDocumentFile } from '@/lib/document-preview-generator';
import { generateMusicPreview, isMusicFile } from '@/lib/music-preview-generator';
import { useSignatureStatus, consumeSignature } from '@/hooks/useSubscription';
import { uploadCarouselImages, moveCarouselToSignedDocuments, deleteCarouselImages } from '@/lib/services/carousel-storage';
import type { CarouselMetadata } from '@/lib/types/carousel';

type ContentType = 'text' | 'image' | 'video' | 'document' | 'music' | 'carousel';
type SocialPlatform = 'Instagram' | 'YouTube' | 'Twitter' | 'TikTok' | 'Facebook' | 'LinkedIn' | 'WhatsApp' | 'Website' | 'Outros';

const contentTypes: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: 'image', label: 'Imagem', icon: <ImageIcon className="h-5 w-5" /> },
  { value: 'video', label: 'Vídeo', icon: <Video className="h-5 w-5" /> },
  { value: 'document', label: 'Documento', icon: <FileType className="h-5 w-5" /> },
  { value: 'music', label: 'Música', icon: <Music className="h-5 w-5" /> },
  { value: 'carousel', label: 'Carrossel', icon: <Images className="h-5 w-5" /> },
];

const socialPlatforms: { value: SocialPlatform; label: string; logo: string }[] = [
  { value: 'Instagram', label: 'Instagram', logo: '📷' },
  { value: 'YouTube', label: 'YouTube', logo: '▶️' },
  { value: 'Twitter', label: 'X/Twitter', logo: '🐦' },
  { value: 'TikTok', label: 'TikTok', logo: '🎵' },
  { value: 'Facebook', label: 'Facebook', logo: '👥' },
  { value: 'LinkedIn', label: 'LinkedIn', logo: '💼' },
  { value: 'WhatsApp', label: 'WhatsApp', logo: '💬' },
  { value: 'Website', label: 'Website', logo: '🌐' },
  { value: 'Outros', label: 'Outros', logo: '📱' },
];

export default function SignContent() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<ContentType>('image');
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [signedContent, setSignedContent] = useState<SignedContent | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [allowFileDownload, setAllowFileDownload] = useState<boolean>(true);
  const [fileValidationError, setFileValidationError] = useState<string>('');
  const [isProcessingVideo, setIsProcessingVideo] = useState(false);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  
  const { 
    check: checkRateLimit, 
    isBlocked, 
    blockedUntil, 
    remaining, 
    message: rateLimitMessage 
  } = useRateLimit('SIGN_CONTENT');
  
  const [tempFilePath, setTempFilePath] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showCameraCapture, setShowCameraCapture] = useState(false);
  const { status: signatureStatus, loading: statusLoading, refetch: refetchStatus } = useSignatureStatus();
  
  // ========================================
  // 🎠 CAROUSEL STATES
  // ========================================
  const [carouselFiles, setCarouselFiles] = useState<File[]>([]);
  const [carouselPreviews, setCarouselPreviews] = useState<string[]>([]);
  const [carouselMetadata, setCarouselMetadata] = useState<CarouselMetadata | null>(null);
  const [isUploadingCarousel, setIsUploadingCarousel] = useState(false);
  const [carouselValidationError, setCarouselValidationError] = useState<string>('');
  
  // ========================================
  // 📱 CUSTOM PLATFORM STATE (for "Outros")
  // ========================================
  const [customPlatform, setCustomPlatform] = useState<string>('');
  
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
        return ['text', 'document'];
      case 'carousel':
        return ['image'];
      default:
        return ['image', 'video', 'audio', 'document', 'text'];
    }
  };
  
  const generateVideoThumbnail = async (file: File): Promise<void> => {
    const FILE_SIZE_MB = file.size / 1024 / 1024;
    const MAX_SIZE_FOR_THUMBNAIL = 100; // 100MB
    
    console.log('🎬 [VIDEO THUMBNAIL] Verificando tamanho do vídeo:', {
      fileName: file.name,
      fileSize: `${FILE_SIZE_MB.toFixed(2)} MB`,
      maxSizeForThumbnail: `${MAX_SIZE_FOR_THUMBNAIL} MB`
    });
    
    // ========================================
    // 🎯 LÓGICA DE VERIFICAÇÃO DE TAMANHO
    // Vídeos > 100MB: Pula geração de thumbnail
    // Vídeos ≤ 100MB: Gera thumbnail normalmente
    // ========================================
    if (FILE_SIZE_MB > MAX_SIZE_FOR_THUMBNAIL) {
      console.log(`⚠️ [VIDEO THUMBNAIL] Vídeo muito grande (${FILE_SIZE_MB.toFixed(2)} MB). Pulando geração de thumbnail.`);
      setVideoThumbnail(null);
      setFileValidationError('');
      // Informa ao usuário que thumbnail não será gerada para vídeos grandes
      alert(`✅ Vídeo carregado com sucesso!\n\nℹ️ Como o vídeo é grande (${FILE_SIZE_MB.toFixed(2)} MB), a thumbnail não será gerada para evitar problemas de performance.\n\nVocê pode continuar normalmente com a assinatura.`);
      return;
    }
    // ========================================
    // FIM: LÓGICA DE VERIFICAÇÃO DE TAMANHO
    // ========================================
    
    console.log('🎬 [VIDEO THUMBNAIL] Gerando thumbnail do vídeo');
    setIsProcessingVideo(true);
    try {
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
      setVideoThumbnail(null);
      setUploadedFile(null);
    } finally {
      setIsProcessingVideo(false);
    }
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileValidationError('');
    setUploadedFile(null);
    setFilePreview(null);
    setVideoThumbnail(null);
    setTempFilePath(null);
    if (!file) return;
    
    const sanitizedFileName = sanitizeFileName(file.name);
    console.log('📁 [FILE UPLOAD] Arquivo selecionado:', {
      originalName: file.name,
      sanitizedName: sanitizedFileName,
      size: file.size,
      type: file.type,
      contentType: contentType
    });
    
    const allowedCategories = getFileCategoryFromContentType(contentType);
    const maxSize = contentType === 'video' ? 200 * 1024 * 1024 : 10 * 1024 * 1024;
    const validationResult = await validateFile(file, {
      maxSizeBytes: maxSize,
      allowedCategories: allowedCategories,
      strictMode: true,
      validateMagicNumbers: true
    });
    
    if (!validationResult.valid) {
      console.error('❌ [FILE UPLOAD] Validação falhou:', validationResult.message);
      setFileValidationError(validationResult.message);
      if (currentUser) {
        logAuditEvent(AuditAction.FILE_VALIDATION_FAILED, {
          success: false,
          fileName: file.name,
          sanitizedFileName,
          fileSize: file.size,
          fileType: file.type,
          contentType,
          allowedCategories: allowedCategories.join(', '),
          validationError: validationResult.message,
          validationDetails: validationResult.details
        }, currentUser.id).catch(err => {
          console.warn('⚠️ [AUDIT] Erro ao registrar log de validação (não crítico):', err);
        });
      }
      e.target.value = '';
      return;
    }
    
    console.log('✅ [FILE UPLOAD] Arquivo validado com sucesso:', validationResult.details);
    setUploadedFile(file);
    
    if (currentUser) {
      setIsUploadingFile(true);
      setUploadProgress(0);
      try {
        console.log('📤 [STORAGE] Iniciando upload para temp-uploads...');
        const uploadResult = await uploadToTempBucketWithProgress(
          file, 
          currentUser.id,
          {
            onProgress: (progress) => {
              setUploadProgress(progress);
            }
          }
        );
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || 'Erro ao fazer upload');
        }
        console.log('✅ [STORAGE] Upload concluído:', {
          path: uploadResult.path,
          executionTime: uploadResult.executionTime + 'ms'
        });
        setTempFilePath(uploadResult.path!);
      } catch (error) {
        console.error('❌ [STORAGE] Erro no upload:', error);
        setFileValidationError(`Erro ao fazer upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        setUploadedFile(null);
        setTempFilePath(null);
        setUploadProgress(0);
        e.target.value = '';
        return;
      } finally {
        setIsUploadingFile(false);
      }
    }
    
    try {
      console.log('🔐 [VIRUSTOTAL] Calculando hash do arquivo...');
      const hash = await calculateFileHash(file);
      console.log('✅ [VIRUSTOTAL] Hash calculado:', hash);
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('🚀 [VIRUSTOTAL] Iniciando scan silencioso via Edge Function...');
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-uploaded-file`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              file_name: sanitizedFileName,
              file_size: file.size,
              file_hash: hash,
            }),
          }
        );
        if (response.ok) {
          const resultData = await response.json();
          console.log('✅ [VIRUSTOTAL] Scan silencioso concluído:', resultData);
          if (currentUser) {
            logAuditEvent(AuditAction.FILE_SCAN_COMPLETED, {
              success: true,
              fileName: sanitizedFileName,
              fileSize: file.size,
              fileHash: hash,
              scanResult: resultData,
              scanProvider: 'VirusTotal'
            }, currentUser.id).catch(err => {
              console.warn('⚠️ [AUDIT] Erro ao registrar log de scan (não crítico):', err);
            });
          }
        } else {
          console.warn('⚠️ [VIRUSTOTAL] Erro no scan silencioso (não bloqueia upload)');
          if (currentUser) {
            const errorText = await response.text().catch(() => 'Erro desconhecido');
            logAuditEvent(AuditAction.FILE_SCAN_FAILED, {
              success: false,
              fileName: sanitizedFileName,
              fileSize: file.size,
              fileHash: hash,
              error: `HTTP ${response.status}: ${errorText}`,
              scanProvider: 'VirusTotal'
            }, currentUser.id).catch(err => {
              console.warn('⚠️ [AUDIT] Erro ao registrar log de falha de scan (não crítico):', err);
            });
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ [VIRUSTOTAL] Erro ao processar scan silencioso (não bloqueia upload):', error);
      if (currentUser) {
        logAuditEvent(AuditAction.FILE_SCAN_FAILED, {
          success: false,
          fileName: sanitizedFileName,
          fileSize: file.size,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          scanProvider: 'VirusTotal'
        }, currentUser.id).catch(err => {
          console.warn('⚠️ [AUDIT] Erro ao registrar log de erro de scan (não crítico):', err);
        });
      }
    }
    
    if (contentType === 'video' && isVideoFile(file)) {
      await generateVideoThumbnail(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const originalDataUrl = reader.result as string;
        try {
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
          setFilePreview(originalDataUrl);
        }
      };
      reader.readAsDataURL(file);
    } else if (isMusicFile(file.type)) {
      console.log('🎵 [MUSIC PREVIEW] Gerando preview para música...');
      try {
        const musicPreview = generateMusicPreview(
          file.name,
          file.size,
          file.type,
          title || undefined
        );
        setFilePreview(musicPreview);
        console.log('✅ [MUSIC PREVIEW] Preview gerado com sucesso');
      } catch (error) {
        console.error('❌ [MUSIC PREVIEW] Erro ao gerar preview:', error);
        setFilePreview(null);
      }
    } else if (isDocumentFile(file.type)) {
      console.log('📄 [DOCUMENT PREVIEW] Gerando preview para documento...');
      try {
        const documentPreview = generateDocumentPreview(
          file.name,
          file.size,
          file.type
        );
        setFilePreview(documentPreview);
        console.log('✅ [DOCUMENT PREVIEW] Preview gerado com sucesso');
      } catch (error) {
        console.error('❌ [DOCUMENT PREVIEW] Erro ao gerar preview:', error);
        setFilePreview(null);
      }
    } else {
      setFilePreview(null);
    }
  };
  
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setFileValidationError('');
    setVideoThumbnail(null);
    setTempFilePath(null);
    setUploadProgress(0);
    setShowCameraCapture(false);
    setAllowFileDownload(true);
  };
  
  // ========================================
  // 🎠 CAROUSEL FUNCTIONS
  // ========================================
  
  /**
   * Lida com o upload de múltiplas imagens do carrossel
   * Agora suporta upload incremental - adiciona novas imagens às existentes
   */
  const handleCarouselUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    setCarouselValidationError('');
    
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const MAX_IMAGES = 20;
    const currentCount = carouselFiles.length;
    const newCount = fileArray.length;
    const totalCount = currentCount + newCount;
    
    console.log('📸 [CAROUSEL] Arquivos selecionados:', {
      currentCount,
      newCount,
      totalCount,
      maxAllowed: MAX_IMAGES
    });
    
    // Validar número total de imagens (existentes + novas)
    if (totalCount > MAX_IMAGES) {
      setCarouselValidationError(`Você já tem ${currentCount} imagens. Pode adicionar no máximo ${MAX_IMAGES - currentCount} mais. Você tentou adicionar ${newCount}.`);
      e.target.value = '';
      return;
    }
    
    // Validar cada arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/x-icon'];
    const maxSizePerImage = 10 * 1024 * 1024; // 10MB
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        setCarouselValidationError(`Imagem ${i + 1} (${file.name}) não é um formato válido. Formatos aceitos: JPG, JPEG, PNG, GIF, WEBP, SVG, BMP, ICO`);
        e.target.value = '';
        return;
      }
      
      if (file.size > maxSizePerImage) {
        setCarouselValidationError(`Imagem ${i + 1} (${file.name}) excede o tamanho máximo de ${formatFileSize(maxSizePerImage)}`);
        e.target.value = '';
        return;
      }
    }
    
    console.log('✅ [CAROUSEL] Todas as imagens passaram na validação');
    
    // Gerar previews das novas imagens
    const newPreviews: string[] = [];
    for (const file of fileArray) {
      try {
        const reader = new FileReader();
        const preview = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newPreviews.push(preview);
      } catch (error) {
        console.error('❌ [CAROUSEL] Erro ao gerar preview:', error);
        newPreviews.push('');
      }
    }
    
    // Mesclar com imagens existentes (adicionar ao final)
    const mergedFiles = [...carouselFiles, ...fileArray];
    const mergedPreviews = [...carouselPreviews, ...newPreviews];
    
    setCarouselFiles(mergedFiles);
    setCarouselPreviews(mergedPreviews);
    
    console.log('✅ [CAROUSEL] Previews gerados:', {
      newPreviews: newPreviews.length,
      totalPreviews: mergedPreviews.length
    });
    
    // Fazer upload automático das novas imagens (será mesclado com existentes no backend)
    if (currentUser) {
      await uploadCarouselToTemp(mergedFiles);
    }
    
    // Limpar input para permitir re-seleção dos mesmos arquivos
    e.target.value = '';
  };
  
  /**
   * Faz upload do carrossel para o bucket temporário
   */
  const uploadCarouselToTemp = async (files: File[]) => {
    if (!currentUser) return;
    
    setIsUploadingCarousel(true);
    setCarouselValidationError('');
    
    try {
      console.log('📤 [CAROUSEL] Iniciando upload para temp-uploads...');
      
      const result = await uploadCarouselImages(files, currentUser.id, {
        maxImages: 20,
        maxSizePerImage: 10 * 1024 * 1024,
        thumbnailMaxWidth: 800,
        thumbnailMaxHeight: 600,
        thumbnailQuality: 0.7,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload do carrossel');
      }
      
      console.log('✅ [CAROUSEL] Upload concluído:', {
        totalImages: result.metadata?.total_images,
        executionTime: result.executionTime + 'ms'
      });
      
      setCarouselMetadata(result.metadata!);
      
    } catch (error) {
      console.error('❌ [CAROUSEL] Erro no upload:', error);
      setCarouselValidationError(`Erro ao fazer upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setCarouselFiles([]);
      setCarouselPreviews([]);
      setCarouselMetadata(null);
    } finally {
      setIsUploadingCarousel(false);
    }
  };
  
  /**
   * Remove uma imagem específica do carrossel
   */
  const handleRemoveCarouselImage = (index: number) => {
    setCarouselFiles(prev => prev.filter((_, i) => i !== index));
    setCarouselPreviews(prev => prev.filter((_, i) => i !== index));
    
    // Se remover todas, limpar metadados
    if (carouselFiles.length === 1) {
      setCarouselMetadata(null);
      setCarouselValidationError('');
    }
  };
  
  /**
   * Remove todo o carrossel
   */
  const handleRemoveCarousel = () => {
    setCarouselFiles([]);
    setCarouselPreviews([]);
    setCarouselMetadata(null);
    setCarouselValidationError('');
    setIsUploadingCarousel(false);
  };
  
  const handleCameraCapture = async (imageDataUrl: string) => {
    try {
      console.log('📸 [CAMERA CAPTURE] Processando foto capturada...');
      setShowCameraCapture(false);
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const timestamp = new Date().getTime();
      const file = new File([blob], `documento_${timestamp}.jpg`, { type: 'image/jpeg' });
      console.log('✅ [CAMERA CAPTURE] Foto convertida em arquivo:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      const syntheticEvent = {
        target: {
          files: [file],
          value: ''
        }
      } as React.ChangeEvent<HTMLInputElement>;
      await handleFileUpload(syntheticEvent);
    } catch (error) {
      console.error('❌ [CAMERA CAPTURE] Erro ao processar foto:', error);
      setFileValidationError('Erro ao processar foto capturada. Tente novamente.');
    }
  };
  
  const togglePlatform = (platform: SocialPlatform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
    
    // Limpar campo customizado se desmarcar "Outros"
    if (platform === 'Outros' && selectedPlatforms.includes('Outros')) {
      setCustomPlatform('');
    }
  };
  
  const handleSign = async () => {
    // ========================================
    // 🔒 PROTEÇÃO CONTRA CLIQUES MÚLTIPLOS
    // Bloquear imediatamente no primeiro clique
    // ========================================
    if (isSigning) {
      console.warn('⚠️ [DOUBLE CLICK] Tentativa de clique múltiplo detectada e bloqueada');
      return;
    }
    
    setIsSigning(true);
    
    try {
      if (!title.trim()) {
        alert('Por favor, insira o título do conteúdo');
        return;
      }
      
      // Validar conteúdo: texto OU arquivo OU carrossel
      const hasContent = content.trim();
      const hasSingleFile = uploadedFile;
      const hasCarousel = carouselFiles.length > 0;
      
      if (!hasContent && !hasSingleFile && !hasCarousel) {
        alert('Por favor, insira o conteúdo ou faça upload de um arquivo/carrossel');
        return;
      }
      
      if (selectedPlatforms.length === 0) {
        alert('Por favor, selecione pelo menos uma rede social');
        return;
      }
      
      // Validar campo customizado se "Outros" foi selecionado
      if (selectedPlatforms.includes('Outros') && !customPlatform.trim()) {
        alert('Por favor, especifique o nome da plataforma no campo "Outros"');
        return;
      }
      if (!currentUser) {
        alert('Erro: usuário não identificado');
        return;
      }
      if (!keyPair || !keyPair.publicKey || !keyPair.privateKey) {
        console.error('❌ Chaves inválidas ou vazias:', {
          hasKeyPair: !!keyPair,
          hasPublicKey: !!keyPair?.publicKey,
          hasPrivateKey: !!keyPair?.privateKey,
        });
        alert('Erro: Chaves criptográficas não encontradas ou inválidas. Tente recarregar a página ou gerar novas chaves no Dashboard.');
        return;
      }
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
      
      console.log('🔍 [SIGNATURE COUNTER] Verificando disponibilidade de assinaturas...');
      if (!signatureStatus || statusLoading) {
        alert('Carregando status de assinaturas. Por favor, aguarde.');
        return;
      }
      if (!signatureStatus.has_active_subscription) {
        alert('Você não possui uma assinatura ativa. Por favor, assine um plano para continuar.');
        navigate('/pricing');
        return;
      }
      if (signatureStatus.total_available <= 0) {
        alert(`Você atingiu o limite de ${signatureStatus.signatures_limit} assinaturas do seu plano. Adquira pacotes avulsos ou faça upgrade para continuar.`);
        navigate('/pricing');
        return;
      }
      console.log('✅ [SIGNATURE COUNTER] Assinaturas disponíveis:', signatureStatus.total_available);
      
      console.log('🔍 [RATE LIMIT] Verificando limite de assinaturas...');
      const rateLimitResult = await checkRateLimit();
      if (!rateLimitResult.allowed) {
        console.warn('🚫 [RATE LIMIT] Limite excedido:', rateLimitResult.message);
        alert(rateLimitResult.message || 'Você excedeu o limite de assinaturas. Aguarde antes de tentar novamente.');
        return;
      }
      console.log(`✅ [RATE LIMIT] Verificação passou. Tentativas restantes: ${rateLimitResult.remaining}`);
    let finalFilePath: string | null = null;
    let finalCarouselMetadata: CarouselMetadata | undefined = undefined;
    
    try {
      // ========================================
      // 🎠 CARROSSEL: Mover para signed-documents
      // ========================================
      if (hasCarousel && carouselMetadata) {
        console.log('🎠 [CAROUSEL] Movendo carrossel para signed-documents...');
        const moveResult = await moveCarouselToSignedDocuments(carouselMetadata, currentUser.id);
        
        if (!moveResult.success) {
          throw new Error(moveResult.error || 'Erro ao mover carrossel para storage permanente');
        }
        
        console.log('✅ [CAROUSEL] Carrossel movido:', {
          totalImages: moveResult.metadata?.total_images,
          executionTime: moveResult.executionTime + 'ms'
        });
        
        finalCarouselMetadata = moveResult.metadata!;
      }
      
      // ========================================
      // 📄 ARQUIVO ÚNICO: Mover para signed-documents
      // ========================================
      if (tempFilePath && uploadedFile && !hasCarousel) {
        console.log('🔄 [STORAGE] Movendo arquivo para signed-documents...');
        const moveResult = await moveToSignedDocuments(tempFilePath, currentUser.id);
        if (!moveResult.success) {
          throw new Error(moveResult.error || 'Erro ao mover arquivo para storage permanente');
        }
        console.log('✅ [STORAGE] Arquivo movido:', {
          path: moveResult.path,
          executionTime: moveResult.executionTime + 'ms'
        });
        finalFilePath = moveResult.path!;
      }
      
      // ========================================
      // 📝 PREPARAR CONTEÚDO PARA ASSINATURA
      // ========================================
      const sanitizedFileName = uploadedFile ? sanitizeFileName(uploadedFile.name) : '';
      
      // Substituir "Outros" pelo valor customizado se aplicável
      const platformsToDisplay = selectedPlatforms.map(p => 
        p === 'Outros' && customPlatform.trim() 
          ? customPlatform.trim() 
          : p
      );
      
      const fullContent = `
Título: ${title}
Tipo: ${contentTypes.find(t => t.value === contentType)?.label}
Redes: ${platformsToDisplay.join(', ')}
${uploadedFile && !hasCarousel ? `Arquivo: ${sanitizedFileName}` : ''}
${hasCarousel ? `Carrossel: ${carouselFiles.length} imagens` : ''}

Conteúdo:
${content}
      `.trim();
      
      console.log('📝 Assinando conteúdo...');
      console.log('🔗 Links sociais do usuário:', currentUser.socialLinks);
      
      // ========================================
      // 🖼️ THUMBNAIL: Primeira imagem do carrossel OU preview único
      // ========================================
      let finalThumbnail: string | undefined;
      
      if (hasCarousel && carouselPreviews.length > 0) {
        // Usar primeira imagem do carrossel como thumbnail
        finalThumbnail = carouselPreviews[0];
        console.log('✅ [CAROUSEL] Usando primeira imagem como thumbnail principal');
      } else {
        // Usar preview único (imagem, vídeo, etc.)
        finalThumbnail = videoThumbnail || filePreview;
      }
      
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
      
      // ========================================
      // 📦 METADADOS: Arquivo único OU Carrossel
      // ========================================
      const fileMetadata = finalFilePath && uploadedFile && !hasCarousel ? {
        file_path: finalFilePath,
        file_name: uploadedFile.name,
        file_size: uploadedFile.size,
        mime_type: uploadedFile.type,
        storage_bucket: 'signed-documents'
      } : undefined;
      
      console.log('📦 [STORAGE] Metadados de arquivo:', fileMetadata);
      console.log('🎠 [CAROUSEL] Metadados de carrossel:', finalCarouselMetadata);
      
      const creatorSocialLinks = currentUser.socialLinks || undefined;
      console.log('🔗 [SOCIAL LINKS] Links que serão salvos no certificado:', creatorSocialLinks);
      
      // ========================================
      // 🔐 ASSINAR DIGITALMENTE
      // ========================================
      const result = await signContent(
        fullContent,
        keyPair.privateKey,
        keyPair.publicKey,
        currentUser.nomePublico || currentUser.nomeCompleto,
        currentUser.id,
        finalThumbnail || undefined,
        platformsToDisplay, // 🆕 Usar platformsToDisplay ao invés de selectedPlatforms
        fileMetadata,
        creatorSocialLinks,
        allowFileDownload,
        finalCarouselMetadata
      );
      
      if (!result.success) {
        // Rollback: deletar arquivo/carrossel em caso de erro
        if (finalFilePath) {
          console.log('🗑️ [STORAGE] Deletando arquivo devido a erro na assinatura...');
          await deleteFile('signed-documents', finalFilePath);
        }
        if (finalCarouselMetadata) {
          console.log('🗑️ [CAROUSEL] Deletando carrossel devido a erro na assinatura...');
          await deleteCarouselImages(finalCarouselMetadata, currentUser.id);
        }
        alert(result.error || 'Erro ao assinar conteúdo. Tente novamente.');
        return;
      }
      
      console.log('✅ Assinatura realizada com sucesso!');
      
      console.log('🔄 [SIGNATURE COUNTER] Consumindo assinatura...');
      const consumeResult = await consumeSignature(currentUser.id);
      if (!consumeResult.success) {
        console.error('❌ [SIGNATURE COUNTER] Erro ao consumir assinatura:', consumeResult.message);
      } else {
        console.log('✅ [SIGNATURE COUNTER] Assinatura consumida com sucesso!');
        console.log(`📊 [SIGNATURE COUNTER] Assinaturas restantes: ${consumeResult.signatures_remaining}`);
        await refetchStatus();
      }
      
      
      setSignedContent(result.signedContent!);
    } catch (error) {
      console.error('Erro ao assinar conteúdo:', error);
      
      // Rollback: limpar arquivos em caso de erro
      if (finalFilePath) {
        console.log('🗑️ [STORAGE] Deletando arquivo devido a erro...');
        try {
          await deleteFile('signed-documents', finalFilePath);
        } catch (deleteError) {
          console.error('❌ [STORAGE] Erro ao deletar arquivo:', deleteError);
        }
      }
      
      if (finalCarouselMetadata) {
        console.log('🗑️ [CAROUSEL] Deletando carrossel devido a erro...');
        try {
          await deleteCarouselImages(finalCarouselMetadata, currentUser.id);
        } catch (deleteError) {
          console.error('❌ [CAROUSEL] Erro ao deletar carrossel:', deleteError);
        }
      }
      
      alert('Erro ao assinar conteúdo. Tente novamente.');
    } finally {
      setIsSigning(false);
    }
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
    setTempFilePath(null);
    setUploadProgress(0);
    setAllowFileDownload(true);
    // Limpar estados do carrossel
    setCarouselFiles([]);
    setCarouselPreviews([]);
    setCarouselMetadata(null);
    setCarouselValidationError('');
    setIsUploadingCarousel(false);
    // Limpar campo customizado
    setCustomPlatform('');
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
              
              {signatureStatus && signatureStatus.has_active_subscription && (
                <Alert className="border-blue-500 bg-blue-50">
                  <AlertDescription className="text-blue-800">
                    📊 <strong>Assinaturas disponíveis:</strong> {signatureStatus.total_available} 
                    {signatureStatus.overage_available > 0 && (
                      <span className="ml-2">
                        ({signatureStatus.signatures_limit - signatureStatus.signatures_used} do plano + {signatureStatus.overage_available} avulsas)
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              {signatureStatus && signatureStatus.has_active_subscription && signatureStatus.total_available <= 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Limite atingido!</strong> Você usou todas as {signatureStatus.signatures_limit} assinaturas do seu plano. 
                    <Button 
                      variant="link" 
                      className="ml-2 p-0 h-auto text-red-600 underline"
                      onClick={() => navigate('/pricing')}
                    >
                      Adquira pacotes avulsos ou faça upgrade
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {signatureStatus && !signatureStatus.has_active_subscription && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Sem assinatura ativa!</strong> Você precisa assinar um plano para continuar. 
                    <Button 
                      variant="link" 
                      className="ml-2 p-0 h-auto text-red-600 underline"
                      onClick={() => navigate('/pricing')}
                    >
                      Ver planos disponíveis
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
              
              {isBlocked && (
                <RateLimitAlert 
                  blockedUntil={blockedUntil}
                  message={rateLimitMessage}
                  remaining={remaining}
                />
              )}
              
              {!isBlocked && remaining !== undefined && remaining <= 3 && remaining > 0 && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertDescription className="text-yellow-800">
                    ⚠️ Atenção: Você tem {remaining} {remaining === 1 ? 'assinatura restante' : 'assinaturas restantes'} nesta hora.
                  </AlertDescription>
                </Alert>
              )}
              
              {fileValidationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Arquivo não permitido:</strong> {fileValidationError}
                  </AlertDescription>
                </Alert>
              )}
              
              {isUploadingFile && (
                <Alert className="border-blue-500 bg-blue-50">
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
                      <AlertDescription className="text-blue-800">
                        <strong>Fazendo upload do arquivo...</strong> {uploadProgress}%
                      </AlertDescription>
                    </div>
                    <Progress value={uploadProgress} className="h-2 w-full" />
                    <p className="text-xs text-blue-600 mt-1">
                      {uploadProgress < 100 
                        ? 'Aguarde enquanto o arquivo é enviado para o servidor...' 
                        : 'Finalizando upload...'}
                    </p>
                  </div>
                </Alert>
              )}
              
              {isProcessingVideo && (
                <Alert className="border-blue-500 bg-blue-50">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <AlertDescription className="text-blue-800">
                    <strong>Gerando thumbnail do vídeo...</strong> Isso levará apenas alguns segundos.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="title">01 - Título do Conteúdo *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Minha nova campanha de produto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isBlocked || isProcessingVideo || isUploadingFile}
                />
              </div>
              
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
                        setUploadedFile(null);
                        setFilePreview(null);
                        setFileValidationError('');
                        setVideoThumbnail(null);
                        setTempFilePath(null);
                        // Limpar estados do carrossel ao mudar de tipo
                        setCarouselFiles([]);
                        setCarouselPreviews([]);
                        setCarouselMetadata(null);
                        setCarouselValidationError('');
                      }}
                      disabled={isBlocked || isProcessingVideo || isUploadingFile}
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
              
              <div className="space-y-3">
                <Label htmlFor="file-upload">
                  03 - Upload do Arquivo (Opcional - será validado e processado automaticamente)
                  {contentType === 'video' && <span className="text-blue-600 font-medium"> - Apenas thumbnail será gerada (vídeo não será enviado)</span>}
                  {contentType === 'carousel' && <span className="text-purple-600 font-medium"> - Selecione múltiplas imagens (máx. 20)</span>}
                </Label>
                
                {/* ========================================
                    🎠 CAROUSEL UPLOAD UI
                    ======================================== */}
                {contentType === 'carousel' ? (
                  <div className="space-y-4">
                    {carouselValidationError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Erro no carrossel:</strong> {carouselValidationError}
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {isUploadingCarousel && (
                      <Alert className="border-purple-500 bg-purple-50">
                        <Loader2 className="h-4 w-4 text-purple-600 animate-spin" />
                        <AlertDescription className="text-purple-800">
                          <strong>Fazendo upload das imagens...</strong> Aguarde enquanto processamos suas imagens.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {carouselFiles.length === 0 ? (
                      <div className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors bg-gradient-to-br from-purple-50 to-pink-50">
                        <input
                          id="carousel-upload"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleCarouselUpload}
                          disabled={isBlocked || isUploadingCarousel}
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,image/bmp,image/x-icon"
                        />
                        <label htmlFor="carousel-upload" className={isBlocked || isUploadingCarousel ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}>
                          <Images className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                          <p className="text-lg font-semibold text-purple-900 mb-2">
                            📸 Upload de Carrossel de Imagens
                          </p>
                          <p className="text-sm text-purple-700 mb-2">
                            Selecione múltiplas imagens (até 20) para criar um carrossel
                          </p>
                          <p className="text-xs text-purple-600">
                            Formatos aceitos: JPG, JPEG, PNG, GIF, WEBP, SVG, BMP, ICO
                          </p>
                          <p className="text-xs text-purple-600 mt-1">
                            🔒 Máximo: 10MB por imagem | A primeira imagem será a thumbnail principal
                          </p>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border-2 border-purple-300">
                          <div className="flex items-center gap-2">
                            <Images className="h-5 w-5 text-purple-700" />
                            <span className="font-semibold text-purple-900">
                              {carouselFiles.length} {carouselFiles.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}
                            </span>
                            {carouselMetadata && (
                              <span className="text-xs text-green-700 ml-2">
                                ✓ Upload concluído
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {carouselFiles.length < 20 && (
                              <div>
                                <input
                                  id="carousel-add-more"
                                  type="file"
                                  multiple
                                  className="hidden"
                                  onChange={handleCarouselUpload}
                                  disabled={isBlocked || isUploadingCarousel}
                                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,image/bmp,image/x-icon"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="border-purple-400 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                                  disabled={isBlocked || isUploadingCarousel}
                                  type="button"
                                  onClick={() => {
                                    const input = document.getElementById('carousel-add-more') as HTMLInputElement;
                                    if (input) input.click();
                                  }}
                                >
                                  <Upload className="h-4 w-4 mr-1" />
                                  Adicionar Mais ({20 - carouselFiles.length} restantes)
                                </Button>
                              </div>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveCarousel}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={isBlocked || isUploadingCarousel}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Remover Todas
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-2">
                          {carouselPreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-lg overflow-hidden border-2 border-purple-200 group-hover:border-purple-400 transition-all">
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="absolute top-1 left-1 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                {index + 1}
                              </div>
                              {index === 0 && (
                                <div className="absolute bottom-1 left-1 right-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold px-2 py-1 rounded text-center">
                                  🌟 Thumbnail Principal
                                </div>
                              )}
                              <button
                                onClick={() => handleRemoveCarouselImage(index)}
                                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                                disabled={isBlocked || isUploadingCarousel}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <Alert className="border-purple-500 bg-purple-50">
                          <AlertDescription className="text-purple-800 text-sm">
                            <strong>ℹ️ Informações do Carrossel:</strong>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>A <strong>primeira imagem</strong> será usada como thumbnail principal no certificado</li>
                              <li>Todas as imagens serão salvas no Storage e disponíveis para visualização</li>
                              <li>O carrossel completo será exibido no certificado digital</li>
                              <li>Você pode remover imagens individuais clicando no X ao passar o mouse</li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ========================================
                      ORIGINAL SINGLE FILE UPLOAD UI
                      ======================================== */
                  <div className="space-y-3">
                    {!uploadedFile && !showCameraCapture ? (
                      <>
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors">
                          <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isBlocked || isProcessingVideo || isUploadingFile}
                            accept={getAcceptString(getFileCategoryFromContentType(contentType))}
                          />
                          <label htmlFor="file-upload" className={isBlocked || isProcessingVideo || isUploadingFile ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}>
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
                      </>
                    ) : (
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <div className="flex items-start gap-4">
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
                            <p className="font-medium truncate">{sanitizeFileName(uploadedFile.name)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatFileSize(uploadedFile.size)}
                            </p>
                            {tempFilePath && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Arquivo enviado para o servidor
                              </p>
                            )}
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
                            {contentType === 'image' && filePreview && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Validado e comprimido para o certificado
                              </p>
                            )}
                            {contentType === 'music' && filePreview && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Preview da música gerado
                              </p>
                            )}
                            {(contentType === 'document' || contentType === 'text') && filePreview && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Preview do documento gerado
                              </p>
                            )}
                            {contentType !== 'video' && contentType !== 'image' && contentType !== 'document' && contentType !== 'text' && contentType !== 'music' && (
                              <p className="text-xs text-green-600 mt-1">
                                ✓ Arquivo validado com sucesso
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleRemoveFile}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={isBlocked || isProcessingVideo || isUploadingFile}
                          >
                            <X className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <Label>04 - Plataformas onde o Conteúdo Será Publicado *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {socialPlatforms.map((platform) => (
                    <div
                      key={platform.value}
                      className={`border rounded-lg p-3 ${isBlocked || isProcessingVideo || isUploadingFile ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} transition-all ${
                        selectedPlatforms.includes(platform.value)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-muted hover:border-muted-foreground/50'
                      }`}
                      onClick={() => !(isBlocked || isProcessingVideo || isUploadingFile) && togglePlatform(platform.value)}
                    >
                      <div className="flex items-center gap-2 pointer-events-none">
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.value)}
                          disabled={isBlocked || isProcessingVideo || isUploadingFile}
                        />
                        <span className="text-2xl">{platform.logo}</span>
                        <span className="text-sm font-medium">{platform.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Campo customizado para "Outros" */}
                {selectedPlatforms.includes('Outros') && (
                  <div className="space-y-2 bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border-2 border-amber-200">
                    <Label htmlFor="custom-platform" className="text-amber-900 font-semibold">
                      📱 Especifique a plataforma:
                    </Label>
                    <Input
                      id="custom-platform"
                      placeholder="Ex: Telegram, Discord, Medium, Blog pessoal, etc."
                      value={customPlatform}
                      onChange={(e) => setCustomPlatform(e.target.value)}
                      disabled={isBlocked || isProcessingVideo || isUploadingFile}
                      className="border-amber-300 focus:border-amber-500"
                      maxLength={50}
                    />
                    <p className="text-xs text-amber-700">
                      {customPlatform.trim() 
                        ? `✅ "${customPlatform}" será exibido no certificado` 
                        : '⚠️ Digite o nome da plataforma para aparecer no certificado'}
                    </p>
                  </div>
                )}
                
                {selectedPlatforms.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'plataforma selecionada' : 'plataformas selecionadas'}
                    {selectedPlatforms.includes('Outros') && customPlatform.trim() && (
                      <span className="ml-2 text-amber-700 font-medium">
                        • Outros: {customPlatform}
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              {uploadedFile && tempFilePath && (
                <div className="space-y-3 bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="allow-download"
                      checked={allowFileDownload}
                      onCheckedChange={(checked) => setAllowFileDownload(checked === true)}
                      disabled={isBlocked || isProcessingVideo || isUploadingFile}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor="allow-download" 
                        className="text-sm font-semibold text-green-900 cursor-pointer flex items-center gap-2"
                      >
                        <FileType className="h-4 w-4" />
                        Permitir que outras pessoas baixem o arquivo original?
                      </Label>
                      <p className="text-xs text-green-700 mt-1">
                        {allowFileDownload 
                          ? '✅ Verificadores poderão baixar o arquivo original anexado ao certificado'
                          : '🔒 Apenas você poderá baixar o arquivo original. Verificadores verão apenas o preview'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="content">05 - Descrição ou Conteúdo Adicional</Label>
                <Textarea
                  id="content"
                  placeholder="Digite informações adicionais, descrição, legenda, ou o texto completo do conteúdo..."
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, 1200))}
                  maxLength={1200}
                  rows={10}
                  className="resize-none"
                  disabled={isBlocked || isProcessingVideo || isUploadingFile}
                />
                <p className={`text-xs ${content.length >= 1100 ? (content.length >= 1200 ? 'text-red-500 font-medium' : 'text-yellow-600') : 'text-muted-foreground'}`}>
                  {content.length}/1200 caracteres
                  {content.length >= 1200 && ' (limite atingido)'}
                </p>
              </div>

              <Alert className="border-blue-500 bg-blue-50">
                <AlertDescription className="text-blue-800">
                  ℹ️ <strong>Importante:</strong> Todo o conteúdo assinado será automaticamente salvo no seu Dashboard após concluir a assinatura digital.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleSign}
                disabled={
                  isSigning || 
                  isBlocked || 
                  isProcessingVideo || 
                  isUploadingFile || 
                  !title.trim() || 
                  selectedPlatforms.length === 0 ||
                  (signatureStatus && !signatureStatus.has_active_subscription) ||
                  (signatureStatus && signatureStatus.total_available <= 0)
                }
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                size="lg"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Assinando...
                  </>
                ) : isUploadingFile ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Fazendo upload...
                  </>
                ) : isProcessingVideo ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Gerando thumbnail...
                  </>
                ) : isBlocked ? (
                  'Bloqueado Temporariamente'
                ) : (signatureStatus && !signatureStatus.has_active_subscription) ? (
                  'Sem Assinatura Ativa'
                ) : (signatureStatus && signatureStatus.total_available <= 0) ? (
                  'Limite de Assinaturas Atingido'
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
                Sua assinatura foi realizada com sucesso! Agora o seu conteúdo possui uma assinatura digital verificável, e já pode ser compartilhado.
              </AlertDescription>
            </Alert>
            
            <ContentCard content={signedContent} isCreator={true} />
            
            <div className="flex gap-4">
              <Button 
                onClick={handleNewSignature} 
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                Assinar Novo Conteúdo
              </Button>
              <Button 
                onClick={() => navigate('/dashboard')} 
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200"
              >
                Voltar ao Dashboard
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
