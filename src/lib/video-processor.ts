/**
 * 🎬 VIDEO PROCESSOR MODULE
 * 
 * Módulo profissional para processamento de vídeos no frontend
 * Funcionalidades:
 * - Geração de thumbnail da primeira imagem
 * - Compressão básica de vídeo
 * - Validação de segurança integrada
 * 
 * Tecnologias:
 * - Canvas API (thumbnail)
 * - MediaRecorder API (compressão)
 * - Video Element (preview)
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 */

// =====================================================
// TYPES & INTERFACES
// =====================================================

export interface ThumbnailOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 - 1.0
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CompressionOptions {
  videoBitrate?: number; // bits per second
  audioBitrate?: number; // bits per second
  maxDuration?: number; // seconds
  mimeType?: string;
}

export interface VideoProcessingResult {
  success: boolean;
  thumbnail?: string; // Base64 data URL
  compressedVideo?: File;
  originalSize: number;
  compressedSize?: number;
  compressionRatio?: number; // percentage
  error?: string;
}

export interface VideoMetadata {
  duration: number; // seconds
  width: number;
  height: number;
  size: number; // bytes
  type: string;
  name: string;
}

// =====================================================
// DEFAULT OPTIONS
// =====================================================

const DEFAULT_THUMBNAIL_OPTIONS: Required<ThumbnailOptions> = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.8,
  format: 'image/jpeg'
};

const DEFAULT_COMPRESSION_OPTIONS: Required<CompressionOptions> = {
  videoBitrate: 1000000, // 1 Mbps
  audioBitrate: 128000,  // 128 kbps
  maxDuration: 300,      // 5 minutes
  mimeType: 'video/webm;codecs=vp9'
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Carrega um vídeo e retorna o elemento video
 */
async function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    const url = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video);
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Erro ao carregar vídeo'));
    };
    
    video.src = url;
  });
}

/**
 * Extrai metadados do vídeo
 */
export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  const video = await loadVideo(file);
  
  return {
    duration: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
    size: file.size,
    type: file.type,
    name: file.name
  };
}

/**
 * Calcula dimensões mantendo aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;
  
  // Redimensiona se exceder largura máxima
  if (width > maxWidth) {
    height = (maxWidth / width) * height;
    width = maxWidth;
  }
  
  // Redimensiona se exceder altura máxima
  if (height > maxHeight) {
    width = (maxHeight / height) * width;
    height = maxHeight;
  }
  
  return {
    width: Math.round(width),
    height: Math.round(height)
  };
}

// =====================================================
// THUMBNAIL GENERATION
// =====================================================

/**
 * Gera thumbnail da primeira imagem do vídeo
 * 
 * @param videoFile - Arquivo de vídeo
 * @param options - Opções de geração
 * @returns Base64 data URL da thumbnail
 * 
 * @example
 * const thumbnail = await generateThumbnail(videoFile, {
 *   maxWidth: 800,
 *   maxHeight: 600,
 *   quality: 0.8
 * });
 */
export async function generateThumbnail(
  videoFile: File,
  options: ThumbnailOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };
  
  console.log('🎬 [VIDEO PROCESSOR] Gerando thumbnail do vídeo:', {
    fileName: videoFile.name,
    fileSize: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`,
    options: opts
  });
  
  try {
    // Carrega o vídeo
    const video = await loadVideo(videoFile);
    
    // Aguarda o vídeo estar pronto para captura
    await new Promise<void>((resolve) => {
      video.currentTime = 0.1; // Captura em 0.1s (evita frame preto)
      video.onseeked = () => resolve();
    });
    
    // Calcula dimensões mantendo aspect ratio
    const { width, height } = calculateDimensions(
      video.videoWidth,
      video.videoHeight,
      opts.maxWidth,
      opts.maxHeight
    );
    
    console.log('📐 [VIDEO PROCESSOR] Dimensões da thumbnail:', {
      original: `${video.videoWidth}x${video.videoHeight}`,
      thumbnail: `${width}x${height}`
    });
    
    // Cria canvas e desenha o frame
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Erro ao criar contexto do canvas');
    }
    
    // Desenha o frame do vídeo no canvas
    ctx.drawImage(video, 0, 0, width, height);
    
    // Converte para base64
    const thumbnail = canvas.toDataURL(opts.format, opts.quality);
    
    const thumbnailSize = (thumbnail.length * 3) / 4 / 1024; // KB
    console.log('✅ [VIDEO PROCESSOR] Thumbnail gerada com sucesso:', {
      size: `${thumbnailSize.toFixed(2)} KB`,
      format: opts.format,
      quality: opts.quality
    });
    
    return thumbnail;
  } catch (error) {
    console.error('❌ [VIDEO PROCESSOR] Erro ao gerar thumbnail:', error);
    throw new Error(`Erro ao gerar thumbnail: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// =====================================================
// VIDEO COMPRESSION
// =====================================================

/**
 * Comprime vídeo usando MediaRecorder API
 * 
 * @param videoFile - Arquivo de vídeo original
 * @param options - Opções de compressão
 * @returns Arquivo de vídeo comprimido
 * 
 * @example
 * const compressed = await compressVideo(videoFile, {
 *   videoBitrate: 1000000, // 1 Mbps
 *   audioBitrate: 128000   // 128 kbps
 * });
 */
export async function compressVideo(
  videoFile: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
  
  console.log('🗜️ [VIDEO PROCESSOR] Iniciando compressão de vídeo:', {
    fileName: videoFile.name,
    originalSize: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`,
    options: opts
  });
  
  try {
    // Verifica suporte do navegador
    if (!MediaRecorder.isTypeSupported(opts.mimeType)) {
      console.warn('⚠️ [VIDEO PROCESSOR] MIME type não suportado, usando fallback');
      opts.mimeType = 'video/webm'; // Fallback
    }
    
    // Carrega o vídeo
    const video = await loadVideo(videoFile);
    
    // Cria canvas para captura
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Erro ao criar contexto do canvas');
    }
    
    // Captura stream do canvas
    const stream = canvas.captureStream(30); // 30 fps
    
    // Adiciona áudio se disponível
    const videoUrl = URL.createObjectURL(videoFile);
    const videoElement = document.createElement('video');
    videoElement.src = videoUrl;
    videoElement.muted = false;
    
    await new Promise<void>((resolve) => {
      videoElement.onloadedmetadata = () => resolve();
    });
    
    // Configura MediaRecorder
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: opts.mimeType,
      videoBitsPerSecond: opts.videoBitrate,
      audioBitsPerSecond: opts.audioBitrate
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    
    // Inicia gravação
    mediaRecorder.start();
    video.play();
    
    // Renderiza frames
    const renderFrame = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(renderFrame);
      }
    };
    renderFrame();
    
    // Aguarda finalização
    await new Promise<void>((resolve) => {
      video.onended = () => {
        mediaRecorder.stop();
        URL.revokeObjectURL(videoUrl);
        resolve();
      };
    });
    
    // Aguarda chunks finais
    await new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => resolve();
    });
    
    // Cria arquivo comprimido
    const compressedBlob = new Blob(chunks, { type: opts.mimeType });
    const compressedFile = new File(
      [compressedBlob],
      videoFile.name.replace(/\.[^.]+$/, '_compressed.webm'),
      { type: opts.mimeType }
    );
    
    const compressionRatio = ((1 - compressedFile.size / videoFile.size) * 100).toFixed(2);
    
    console.log('✅ [VIDEO PROCESSOR] Vídeo comprimido com sucesso:', {
      originalSize: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`,
      compressedSize: `${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`,
      compressionRatio: `${compressionRatio}%`
    });
    
    return compressedFile;
  } catch (error) {
    console.error('❌ [VIDEO PROCESSOR] Erro ao comprimir vídeo:', error);
    throw new Error(`Erro ao comprimir vídeo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

// =====================================================
// MAIN PROCESSING FUNCTION
// =====================================================

/**
 * Processa vídeo completo: gera thumbnail e comprime
 * 
 * @param videoFile - Arquivo de vídeo
 * @param thumbnailOptions - Opções de thumbnail
 * @param compressionOptions - Opções de compressão
 * @returns Resultado do processamento
 * 
 * @example
 * const result = await processVideo(videoFile);
 * if (result.success) {
 *   console.log('Thumbnail:', result.thumbnail);
 *   console.log('Vídeo comprimido:', result.compressedVideo);
 * }
 */
export async function processVideo(
  videoFile: File,
  thumbnailOptions: ThumbnailOptions = {},
  compressionOptions: CompressionOptions = {}
): Promise<VideoProcessingResult> {
  console.log('🎬 [VIDEO PROCESSOR] Iniciando processamento completo do vídeo');
  
  const startTime = Date.now();
  
  try {
    // Gera thumbnail
    console.log('📸 [VIDEO PROCESSOR] Etapa 1/2: Gerando thumbnail...');
    const thumbnail = await generateThumbnail(videoFile, thumbnailOptions);
    
    // Comprime vídeo
    console.log('🗜️ [VIDEO PROCESSOR] Etapa 2/2: Comprimindo vídeo...');
    const compressedVideo = await compressVideo(videoFile, compressionOptions);
    
    const compressionRatio = ((1 - compressedVideo.size / videoFile.size) * 100);
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ [VIDEO PROCESSOR] Processamento concluído com sucesso:', {
      originalSize: `${(videoFile.size / 1024 / 1024).toFixed(2)} MB`,
      compressedSize: `${(compressedVideo.size / 1024 / 1024).toFixed(2)} MB`,
      compressionRatio: `${compressionRatio.toFixed(2)}%`,
      processingTime: `${processingTime}s`
    });
    
    return {
      success: true,
      thumbnail,
      compressedVideo,
      originalSize: videoFile.size,
      compressedSize: compressedVideo.size,
      compressionRatio
    };
  } catch (error) {
    console.error('❌ [VIDEO PROCESSOR] Erro no processamento:', error);
    
    return {
      success: false,
      originalSize: videoFile.size,
      error: error instanceof Error ? error.message : 'Erro desconhecido no processamento'
    };
  }
}

// =====================================================
// VALIDATION HELPERS
// =====================================================

/**
 * Valida se o arquivo é um vídeo suportado
 */
export function isVideoFile(file: File): boolean {
  const videoMimeTypes = [
    'video/mp4',
    'video/quicktime', // MOV
    'video/x-msvideo', // AVI
    'video/webm',
    'video/x-matroska', // MKV
    'video/x-flv',
    'video/x-ms-wmv',
    'video/x-m4v'
  ];
  
  return videoMimeTypes.includes(file.type);
}

/**
 * Valida tamanho do vídeo
 */
export function validateVideoSize(file: File, maxSizeBytes: number = 50 * 1024 * 1024): boolean {
  return file.size <= maxSizeBytes;
}

/**
 * Formata tamanho de arquivo para exibição
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}