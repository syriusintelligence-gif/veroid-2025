/**
 * 📸 CAROUSEL STORAGE SERVICE
 * 
 * Serviço para upload e gerenciamento de múltiplas imagens em formato carrossel.
 * Suporta upload de até 15 imagens simultaneamente com validação e compressão.
 * 
 * @module CarouselStorageService
 * @version 1.0.0
 * @date 2026-04-30
 */

import { supabase } from '@/lib/supabase';
import { sanitizeFileName } from '@/lib/input-sanitizer';
import { compressImage } from '@/lib/image-compression';
import { logAuditEvent, AuditAction } from '@/lib/audit-logger';
import type {
  CarouselImage,
  CarouselMetadata,
  CarouselUploadResult,
  CarouselUploadConfig,
} from '@/lib/types/carousel';
import { DEFAULT_CAROUSEL_CONFIG } from '@/lib/types/carousel';

/**
 * Valida se o arquivo é uma imagem permitida
 */
function isValidImageFile(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return allowedTypes.includes(file.type.toLowerCase());
}

/**
 * Formata tamanho de arquivo
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Aguarda um tempo específico
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Faz upload de múltiplas imagens para o bucket temporário
 * 
 * @param files - Array de arquivos de imagem
 * @param userId - ID do usuário
 * @param config - Configuração de upload
 * @returns Resultado do upload com metadados
 */
export async function uploadCarouselImages(
  files: File[],
  userId: string,
  config: CarouselUploadConfig = DEFAULT_CAROUSEL_CONFIG
): Promise<CarouselUploadResult> {
  const startTime = Date.now();
  
  console.log('📸 [CarouselStorage] Iniciando upload de carrossel:', {
    filesCount: files.length,
    userId,
    maxImages: config.maxImages,
  });

  // =====================================================
  // VALIDAÇÕES
  // =====================================================
  
  // 1. Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      success: false,
      error: 'Usuário não autenticado',
      executionTime: Date.now() - startTime,
    };
  }

  // 2. Validar userId
  if (user.id !== userId) {
    console.error('❌ [CarouselStorage] userId não corresponde ao usuário autenticado');
    return {
      success: false,
      error: 'Permissão negada: userId inválido',
      executionTime: Date.now() - startTime,
    };
  }

  // 3. Validar número de imagens
  const maxImages = config.maxImages || DEFAULT_CAROUSEL_CONFIG.maxImages!;
  if (files.length === 0) {
    return {
      success: false,
      error: 'Nenhuma imagem selecionada',
      executionTime: Date.now() - startTime,
    };
  }

  if (files.length > maxImages) {
    return {
      success: false,
      error: `Máximo de ${maxImages} imagens permitidas. Você selecionou ${files.length}.`,
      executionTime: Date.now() - startTime,
    };
  }

  // 4. Validar tipo e tamanho de cada arquivo
  const maxSizePerImage = config.maxSizePerImage || DEFAULT_CAROUSEL_CONFIG.maxSizePerImage!;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (!isValidImageFile(file)) {
      return {
        success: false,
        error: `Arquivo ${i + 1} (${file.name}) não é uma imagem válida. Tipos permitidos: JPEG, PNG, WebP, GIF`,
        executionTime: Date.now() - startTime,
      };
    }

    if (file.size > maxSizePerImage) {
      return {
        success: false,
        error: `Imagem ${i + 1} (${file.name}) excede o tamanho máximo de ${formatFileSize(maxSizePerImage)}`,
        executionTime: Date.now() - startTime,
      };
    }
  }

  console.log('✅ [CarouselStorage] Validações passaram');

  // =====================================================
  // UPLOAD DE IMAGENS
  // =====================================================
  
  const carouselImages: CarouselImage[] = [];
  const timestamp = Date.now();
  const bucket = 'temp-uploads';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const order = i + 1;
    
    // 🔧 FIX: Verificação robusta de null/undefined
    if (!file) {
      console.error(`❌ [CarouselStorage] Arquivo ${order} é null ou undefined`);
      
      // Limpar imagens já enviadas
      for (const uploadedImage of carouselImages) {
        try {
          await supabase.storage.from(bucket).remove([uploadedImage.path]);
        } catch (cleanupError) {
          console.warn('⚠️ [CarouselStorage] Erro ao limpar imagem:', cleanupError);
        }
      }
      
      return {
        success: false,
        error: `Arquivo ${order} é inválido ou corrompido`,
        executionTime: Date.now() - startTime,
      };
    }
    
    // 🔧 FIX: Verificar propriedades essenciais do arquivo
    if (!file.name || !file.type || file.size === undefined) {
      console.error(`❌ [CarouselStorage] Arquivo ${order} não possui propriedades válidas:`, {
        hasName: !!file.name,
        hasType: !!file.type,
        hasSize: file.size !== undefined,
      });
      
      // Limpar imagens já enviadas
      for (const uploadedImage of carouselImages) {
        try {
          await supabase.storage.from(bucket).remove([uploadedImage.path]);
        } catch (cleanupError) {
          console.warn('⚠️ [CarouselStorage] Erro ao limpar imagem:', cleanupError);
        }
      }
      
      return {
        success: false,
        error: `Arquivo ${order} está corrompido ou incompleto`,
        executionTime: Date.now() - startTime,
      };
    }
    
    console.log(`📤 [CarouselStorage] Fazendo upload da imagem ${order}/${files.length}:`, file.name);

    try {
      // 1. Sanitizar nome do arquivo
      const sanitizedName = sanitizeFileName(file.name);
      
      // 2. Criar path: user_id/carousel_timestamp_order_filename
      const filePath = `${userId}/carousel_${timestamp}_${order}_${sanitizedName}`;

      // 3. Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        throw new Error(`Erro ao fazer upload da imagem ${order}: ${error.message}`);
      }

      console.log(`✅ [CarouselStorage] Imagem ${order} enviada:`, data.path);

      // 4. Gerar thumbnail comprimida
      const reader = new FileReader();
      const thumbnailPromise = new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const originalDataUrl = reader.result as string;
            const compressedDataUrl = await compressImage(originalDataUrl, {
              maxWidth: config.thumbnailMaxWidth || DEFAULT_CAROUSEL_CONFIG.thumbnailMaxWidth!,
              maxHeight: config.thumbnailMaxHeight || DEFAULT_CAROUSEL_CONFIG.thumbnailMaxHeight!,
              quality: config.thumbnailQuality || DEFAULT_CAROUSEL_CONFIG.thumbnailQuality!,
              maxSizeKB: 100,
            });
            resolve(compressedDataUrl);
          } catch (error) {
            console.warn(`⚠️ [CarouselStorage] Erro ao comprimir imagem ${order}, usando original`);
            resolve(reader.result as string);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const thumbnail = await thumbnailPromise;

      // 5. Adicionar metadados
      carouselImages.push({
        path: data.path,
        name: file.name,
        size: file.size,
        mime_type: file.type,
        order,
        thumbnail,
      });

    } catch (error) {
      console.error(`❌ [CarouselStorage] Erro ao processar imagem ${order}:`, error);
      
      // Limpar imagens já enviadas em caso de erro
      for (const uploadedImage of carouselImages) {
        try {
          await supabase.storage.from(bucket).remove([uploadedImage.path]);
        } catch (cleanupError) {
          console.warn('⚠️ [CarouselStorage] Erro ao limpar imagem:', cleanupError);
        }
      }

      return {
        success: false,
        error: `Erro ao processar imagem ${order} (${file.name}): ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        executionTime: Date.now() - startTime,
      };
    }
  }

  // =====================================================
  // CRIAR METADADOS
  // =====================================================
  
  const metadata: CarouselMetadata = {
    carousel_images: carouselImages,
    total_images: carouselImages.length,
    storage_bucket: bucket,
    uploaded_at: new Date().toISOString(),
  };

  const executionTime = Date.now() - startTime;

  console.log('✅ [CarouselStorage] Upload de carrossel concluído:', {
    totalImages: metadata.total_images,
    executionTime: `${executionTime}ms`,
  });

  // Log de auditoria
  logAuditEvent(AuditAction.FILE_UPLOADED, {
    success: true,
    bucket,
    type: 'carousel',
    totalImages: metadata.total_images,
    images: carouselImages.map(img => ({
      path: img.path,
      size: img.size,
      order: img.order,
    })),
    executionTime,
  }, userId).catch(err => {
    console.warn('⚠️ [CarouselStorage] Erro ao registrar log (não crítico):', err);
  });

  return {
    success: true,
    metadata,
    executionTime,
  };
}

/**
 * Move imagens do carrossel do bucket temporário para permanente
 * 
 * @param carouselMetadata - Metadados do carrossel
 * @param userId - ID do usuário
 * @returns Metadados atualizados com novos paths
 */
export async function moveCarouselToSignedDocuments(
  carouselMetadata: CarouselMetadata,
  userId: string
): Promise<CarouselUploadResult> {
  const startTime = Date.now();
  
  console.log('🔄 [CarouselStorage] Movendo carrossel para bucket permanente:', {
    totalImages: carouselMetadata.total_images,
    userId,
  });

  // Validar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return {
      success: false,
      error: 'Permissão negada',
      executionTime: Date.now() - startTime,
    };
  }

  const movedImages: CarouselImage[] = [];
  const timestamp = Date.now();
  const sourceBucket = 'temp-uploads';
  const destBucket = 'signed-documents';

  for (const image of carouselMetadata.carousel_images) {
    try {
      console.log(`🔄 [CarouselStorage] Movendo imagem ${image.order}/${carouselMetadata.total_images}`);

      // 1. Download da imagem temporária
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(sourceBucket)
        .download(image.path);

      if (downloadError || !downloadData) {
        throw new Error(`Erro ao baixar imagem: ${downloadError?.message || 'Dados não encontrados'}`);
      }

      // 2. Criar novo path: user_id/signed_carousel_timestamp_order_filename
      const parts = image.path.split('/');
      const originalFileName = parts[1];
      const newPath = `${userId}/signed_carousel_${timestamp}_${image.order}_${originalFileName.split('_').slice(3).join('_')}`;

      // 3. Upload para bucket permanente
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(destBucket)
        .upload(newPath, downloadData, {
          cacheControl: '3600',
          contentType: image.mime_type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
      }

      console.log(`✅ [CarouselStorage] Imagem ${image.order} movida:`, uploadData.path);

      // 4. Deletar imagem temporária
      await supabase.storage.from(sourceBucket).remove([image.path]);

      // 5. Atualizar metadados
      movedImages.push({
        ...image,
        path: uploadData.path,
      });

    } catch (error) {
      console.error(`❌ [CarouselStorage] Erro ao mover imagem ${image.order}:`, error);
      
      // Limpar imagens já movidas
      for (const movedImage of movedImages) {
        try {
          await supabase.storage.from(destBucket).remove([movedImage.path]);
        } catch (cleanupError) {
          console.warn('⚠️ [CarouselStorage] Erro ao limpar:', cleanupError);
        }
      }

      return {
        success: false,
        error: `Erro ao mover imagem ${image.order}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        executionTime: Date.now() - startTime,
      };
    }
  }

  const updatedMetadata: CarouselMetadata = {
    ...carouselMetadata,
    carousel_images: movedImages,
    storage_bucket: destBucket,
  };

  const executionTime = Date.now() - startTime;

  console.log('✅ [CarouselStorage] Carrossel movido com sucesso:', {
    executionTime: `${executionTime}ms`,
  });

  logAuditEvent(AuditAction.FILE_MOVED, {
    success: true,
    type: 'carousel',
    fromBucket: sourceBucket,
    toBucket: destBucket,
    totalImages: movedImages.length,
    executionTime,
  }, userId).catch(err => {
    console.warn('⚠️ [CarouselStorage] Erro ao registrar log (não crítico):', err);
  });

  return {
    success: true,
    metadata: updatedMetadata,
    executionTime,
  };
}

/**
 * Deleta todas as imagens de um carrossel
 * 
 * @param carouselMetadata - Metadados do carrossel
 * @param userId - ID do usuário
 * @returns Resultado da operação
 */
export async function deleteCarouselImages(
  carouselMetadata: CarouselMetadata,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('🗑️ [CarouselStorage] Deletando carrossel:', {
    totalImages: carouselMetadata.total_images,
    bucket: carouselMetadata.storage_bucket,
  });

  // Validar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return {
      success: false,
      error: 'Permissão negada',
    };
  }

  const paths = carouselMetadata.carousel_images.map(img => img.path);

  try {
    const { error } = await supabase.storage
      .from(carouselMetadata.storage_bucket)
      .remove(paths);

    if (error) {
      throw error;
    }

    console.log('✅ [CarouselStorage] Carrossel deletado com sucesso');

    logAuditEvent(AuditAction.FILE_DELETED, {
      success: true,
      type: 'carousel',
      bucket: carouselMetadata.storage_bucket,
      totalImages: paths.length,
    }, userId).catch(err => {
      console.warn('⚠️ [CarouselStorage] Erro ao registrar log (não crítico):', err);
    });

    return { success: true };

  } catch (error) {
    console.error('❌ [CarouselStorage] Erro ao deletar carrossel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}