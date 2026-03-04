import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
// INÍCIO: INTEGRAÇÃO VIRUSTOTAL - ETAPA 7 (SILENCIOSA)
// ========================================
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
// ========================================
// 🆕 FASE 2: INTEGRAÇÃO COM SUPABASE STORAGE
// ========================================
import { 
  moveToSignedDocuments,
  deleteFile
} from '@/lib/services/storage-service';
// 🆕 UPLOAD COM PROGRESSO
import { uploadToTempBucketWithProgress } from '@/lib/services/storage-service-with-progress';
// ========================================
// FIM: INTEGRAÇÃO COM SUPABASE STORAGE
// ========================================
// ========================================
// 🆕 FASE 3: AUDIT LOGGING
// ========================================
import { logAuditEvent, AuditAction } from '@/lib/audit-logger';
// ========================================
// FIM: AUDIT LOGGING
// ========================================
// ========================================
// 🆕 DOCUMENT PREVIEW GENERATOR
// ========================================
import { generateDocumentPreview, isDocumentFile } from '@/lib/document-preview-generator';
// ========================================
// FIM: DOCUMENT PREVIEW GENERATOR
// ========================================
// ========================================
// 🆕 MUSIC PREVIEW GENERATOR
// ========================================
import { generateMusicPreview, isMusicFile } from '@/lib/music-preview-generator';
// ========================================
// FIM: MUSIC PREVIEW GENERATOR
// ========================================
// ========================================
// 🆕 CONTADOR DE ASSINATURAS - PROBLEMA 4
// ========================================
import { useSignatureStatus, consumeSignature } from '@/hooks/useSubscription';
// ========================================
// FIM: CONTADOR DE ASSINATURAS
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
  // 🆕 FASE 2: ESTADOS PARA STORAGE
  // ========================================
  const [tempFilePath, setTempFilePath] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  // 🆕 PROGRESSO DO UPLOAD (0-100)
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  // ========================================
  // FIM: ESTADOS PARA STORAGE
  // ========================================
  
  // ========================================
  // 🆕 CONTADOR DE ASSINATURAS - PROBLEMA 4
  // ========================================
  const { status: signatureStatus, loading: statusLoading, refetch: refetchStatus } = useSignatureStatus();
  // ========================================
  // FIM: CONTADOR DE ASSINATURAS
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
   * 🔐 VIRUSTOTAL: Scan silencioso em background (sem UI)
   * 🆕 FASE 2: Upload para Supabase Storage após validação
   * 🆕 FASE 3: Logging de validação e scan
   * 🆕 DOCUMENT PREVIEW: Gera preview para documentos
   * 🆕 MUSIC PREVIEW: Gera preview para músicas
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    // Limpa estados anteriores
    setFileValidationError('');
    setUploadedFile(null);
    setFilePreview(null);
    setVideoThumbnail(null);
    setTempFilePath(null); // 🆕 Limpa path temporário
    
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
      
      // 🆕 FASE 3: Registrar log de validação falhou
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
      
      // Limpa o input de arquivo
      e.target.value = '';
      return;
    }
    
    console.log('✅ [FILE UPLOAD] Arquivo validado com sucesso:', validationResult.details);
    
    // Arquivo válido, prosseguir com upload
    setUploadedFile(file);
    
    // ========================================
    // 🆕 FASE 2: UPLOAD PARA SUPABASE STORAGE (COM PROGRESSO)
    // ========================================
    if (currentUser) {
      setIsUploadingFile(true);
      setUploadProgress(0); // 🆕 Reseta progresso
      try {
        console.log('📤 [STORAGE] Iniciando upload para temp-uploads...');
        
        // 🆕 Usa função com callback de progresso
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
        
        // Salva path temporário
        setTempFilePath(uploadResult.path!);
        
      } catch (error) {
        console.error('❌ [STORAGE] Erro no upload:', error);
        setFileValidationError(`Erro ao fazer upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        
        // Limpa estados em caso de erro
        setUploadedFile(null);
        setTempFilePath(null);
        setUploadProgress(0); // 🆕 Reseta progresso em caso de erro
        e.target.value = '';
        return;
      } finally {
        setIsUploadingFile(false);
      }
    }
    // ========================================
    // FIM: UPLOAD PARA SUPABASE STORAGE
    // ========================================
    
    // ========================================
    // INÍCIO: INTEGRAÇÃO VIRUSTOTAL - SILENCIOSA (SEM UI)
    // 🆕 FASE 3: Logging de scan
    // ========================================
    // Calcula hash do arquivo e inicia scan VirusTotal em background
    try {
      console.log('🔐 [VIRUSTOTAL] Calculando hash do arquivo...');
      const hash = await calculateFileHash(file);
      console.log('✅ [VIRUSTOTAL] Hash calculado:', hash);
      
      // Chama Edge Function para scan (silencioso, sem bloquear UI)
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
          
          // 🆕 FASE 3: Registrar log de scan bem-sucedido
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
          
          // 🆕 FASE 3: Registrar log de scan falhou
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
      
      // 🆕 FASE 3: Registrar log de erro no scan
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
    // ========================================
    // FIM: INTEGRAÇÃO VIRUSTOTAL - SILENCIOSA
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
    // 🆕 MÚSICA: Gera preview visual com título
    else if (isMusicFile(file.type)) {
      console.log('🎵 [MUSIC PREVIEW] Gerando preview para música...');
      try {
        const musicPreview = generateMusicPreview(
          file.name,
          file.size,
          file.type,
          title || undefined // Usa título do campo se disponível
        );
        setFilePreview(musicPreview);
        console.log('✅ [MUSIC PREVIEW] Preview gerado com sucesso');
      } catch (error) {
        console.error('❌ [MUSIC PREVIEW] Erro ao gerar preview:', error);
        setFilePreview(null);
      }
    }
    // 🆕 DOCUMENTO: Gera preview visual
    else if (isDocumentFile(file.type)) {
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
    setTempFilePath(null); // 🆕 Limpa path temporário
    setUploadProgress(0); // 🆕 Reseta progresso do upload
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
    
    // ========================================
    // 🆕 CONTADOR DE ASSINATURAS - VALIDAÇÃO ANTES DE ASSINAR
    // ========================================
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
    // ========================================
    // FIM: VALIDAÇÃO DE CONTADOR
    // ========================================
    
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
    
    // ========================================
    // 🆕 FASE 2: VARIÁVEL PARA TRACKING DE FILE PATH
    // ========================================
    let finalFilePath: string | null = null;
    // ========================================
    
    try {
      // ========================================
      // 🆕 FASE 2: MOVER ARQUIVO PARA BUCKET PERMANENTE
      // ========================================
      if (tempFilePath && uploadedFile) {
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
      // FIM: MOVER ARQUIVO
      // ========================================
      
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
      
      console.log('📝 Assinando conteúdo...');
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
      
      // ========================================
      // 🆕 FASE 2: PREPARAR METADADOS DE ARQUIVO
      // ========================================
      const fileMetadata = finalFilePath && uploadedFile ? {
        file_path: finalFilePath,
        file_name: uploadedFile.name,
        file_size: uploadedFile.size,
        mime_type: uploadedFile.type,
        storage_bucket: 'signed-documents'
      } : undefined;
      
      console.log('📦 [STORAGE] Metadados de arquivo:', fileMetadata);
      // ========================================
      // FIM: PREPARAR METADADOS
      // ========================================
      
      const result = await signContent(
        fullContent,
        keyPair.privateKey,
        keyPair.publicKey,
        currentUser.nomePublico || currentUser.nomeCompleto,
        currentUser.id,
        finalThumbnail || undefined,
        selectedPlatforms,
        fileMetadata // 🆕 Passa metadados de arquivo
      );
      
      if (!result.success) {
        // ========================================
        // 🆕 FASE 2: DELETAR ARQUIVO SE ASSINATURA FALHAR
        // ========================================
        if (finalFilePath) {
          console.log('🗑️ [STORAGE] Deletando arquivo devido a erro na assinatura...');
          await deleteFile('signed-documents', finalFilePath);
        }
        // ========================================
        
        alert(result.error || 'Erro ao assinar conteúdo. Tente novamente.');
        return;
      }
      
      console.log('✅ Assinatura realizada com sucesso!');
      
      // ========================================
      // 🆕 CONTADOR DE ASSINATURAS - CONSUMIR APÓS ASSINATURA BEM-SUCEDIDA
      // ========================================
      console.log('🔄 [SIGNATURE COUNTER] Consumindo assinatura...');
      const consumeResult = await consumeSignature(currentUser.id);
      
      if (!consumeResult.success) {
        console.error('❌ [SIGNATURE COUNTER] Erro ao consumir assinatura:', consumeResult.message);
        // Não bloqueia o fluxo, apenas loga o erro
        // O conteúdo já foi assinado com sucesso
      } else {
        console.log('✅ [SIGNATURE COUNTER] Assinatura consumida com sucesso!');
        console.log(`📊 [SIGNATURE COUNTER] Assinaturas restantes: ${consumeResult.signatures_remaining}`);
        
        // Atualiza o status local
        await refetchStatus();
      }
      // ========================================
      // FIM: CONSUMIR ASSINATURA
      // ========================================
      
      setSignedContent(result.signedContent!);
    } catch (error) {
      console.error('Erro ao assinar conteúdo:', error);
      
      // ========================================
      // 🆕 FASE 2: DELETAR ARQUIVO SE HOUVER ERRO
      // ========================================
      if (finalFilePath) {
        console.log('🗑️ [STORAGE] Deletando arquivo devido a erro...');
        try {
          await deleteFile('signed-documents', finalFilePath);
        } catch (deleteError) {
          console.error('❌ [STORAGE] Erro ao deletar arquivo:', deleteError);
        }
      }
      // ========================================
      
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
    setTempFilePath(null); // 🆕 Limpa path temporário
    setUploadProgress(0); // 🆕 Reseta progresso do upload
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
              
              {/* 🆕 CONTADOR DE ASSINATURAS - Alerta de status */}
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
              
              {/* 🆕 CONTADOR DE ASSINATURAS - Alerta de limite atingido */}
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
              
              {/* 🆕 CONTADOR DE ASSINATURAS - Alerta de sem assinatura */}
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
              
              {/* 🆕 FASE 2: Alerta de upload em progresso COM BARRA DE PROGRESSO */}
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
                  disabled={isBlocked || isProcessingVideo || isUploadingFile}
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
                        setTempFilePath(null);
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
                  ) : (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-start gap-4">
                        {/* Preview da thumbnail (imagem, vídeo, música ou documento) */}
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
                          
                          {/* 🆕 FASE 2: Status de upload */}
                          {tempFilePath && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Arquivo enviado para o servidor
                            </p>
                          )}
                          
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
                          
                          {/* 🆕 Status de música */}
                          {contentType === 'music' && filePreview && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Preview da música gerado
                            </p>
                          )}
                          
                          {/* 🆕 Status de documento */}
                          {(contentType === 'document' || contentType === 'text') && filePreview && (
                            <p className="text-xs text-green-600 mt-1">
                              ✓ Preview do documento gerado
                            </p>
                          )}
                          
                          {/* Status de outros arquivos */}
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
              </div>
              
              {/* Redes Sociais */}
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
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedPlatforms.includes(platform.value)}
                          onCheckedChange={() => !(isBlocked || isProcessingVideo || isUploadingFile) && togglePlatform(platform.value)}
                          disabled={isBlocked || isProcessingVideo || isUploadingFile}
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
              
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">O que será incluído no certificado:</p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>✅ Preview visual do conteúdo (imagem, vídeo, música ou documento)</li>
                  {contentType === 'video' && <li>✅ Thumbnail gerada automaticamente da primeira imagem do vídeo</li>}
                  {contentType === 'video' && <li>ℹ️ Vídeo completo NÃO será enviado (apenas thumbnail)</li>}
                  {contentType === 'music' && <li>✅ Preview visual da música com título e informações do arquivo</li>}
                  {(contentType === 'document' || contentType === 'text') && <li>✅ Preview visual do documento com ícone e informações</li>}
                  <li>✅ Arquivo original salvo no Storage (disponível para download)</li>
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
            
            <ContentCard content={signedContent} />
            
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