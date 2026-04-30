/**
 * 📸 CAROUSEL STORAGE SERVICE
 * 
 * Serviço para gerenciar upload de múltiplas imagens para carrossel.
 * Suporta upload sequencial, compressão e geração de metadados.
 * 
 * @module CarouselStorageService
 * @version 1.0.0
 * @date 2026-04-30
 */

import { compressImage } from '../image-compression';
import { uploadToTempBucketWithProgress, moveToSignedDocuments, deleteFile } from './storage-service';
import type { CarouselImage, CarouselMetadata, CarouselUploadResult, CarouselUploadConfig, DEFAULT_CAROUSEL_CONFIG } from '../types/carousel';

/**
 * Faz upload de múltiplas imagens para o carrossel
 * 
 * @param files - Array de arquivos de imagem
 * @param userId - ID do usuário
 * @param config - Configuração de upload
 * @param onProgress - Callback de progresso (0-100)
 * @returns Resultado do upload com metadados
 */
export async function uploadCarouselImages(
  files: File[],
  userId: string,
  config: CarouselUploadConfig = DEFAULT_CAROUSEL_CONFIG,
  onProgress?: (progress: number) => void
): Promise<CarouselUploadResult> {
  const startTime = Date.now();
  
  try {
    console.log('📸 [CAROUSEL] Iniciando upload de carrossel:', {
      totalImages: files.length,
      userId: userId.substring(0, 8) + '...',
    });

    // Validar número de imagens
    if (files.length > (config.maxImages || 15)) {
      return {
        success: false,
        error: `Máximo de ${config.maxImages} imagens permitidas`,
      };
    }

    const carouselImages: CarouselImage[] = [];
    const tempPaths: string[] = [];

    // Upload sequencial de cada imagem
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const progress = Math.floor(((i + 1) / files.length) * 100);
      
      console.log(`📤 [CAROUSEL] Fazendo upload da imagem ${i + 1}/${files.length}...`);
      
      // Callback de progresso
      if (onProgress) {
        onProgress(progress);
      }

      // Upload para temp bucket
      const uploadResult = await uploadToTempBucketWithProgress(
        file,
        userId,
        {
          onProgress: (fileProgress) => {
            // Progresso individual da imagem dentro do progresso total
            const totalProgress = Math.floor((i / files.length) * 100 + (fileProgress / files.length));
            if (onProgress) {
              onProgress(Math.min(totalProgress, 100));
            }
          }
        }
      );

      if (!uploadResult.success || !uploadResult.path) {
        // Limpar uploads anteriores em caso de erro
        console.error(`❌ [CAROUSEL] Erro no upload da imagem ${i + 1}`);
        await cleanupTempUploads(tempPaths);
        return {
          success: false,
          error: uploadResult.error || `Erro ao fazer upload da imagem ${i + 1}`,
        };
      }

      tempPaths.push(uploadResult.path);

      // Gerar thumbnail comprimido
      const reader = new FileReader();
      const thumbnailPromise = new Promise<string>((resolve, reject) => {
        reader.onloadend = async () => {
          try {
            const dataUrl = reader.result as string;
            const compressed = await compressImage(dataUrl, {
              maxWidth: config.thumbnailMaxWidth || 800,
              maxHeight: config.thumbnailMaxHeight || 600,
              quality: config.thumbnailQuality || 0.7,
              maxSizeKB: 100,
            });
            resolve(compressed);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const thumbnail = await thumbnailPromise;

      // Adicionar ao array de imagens
      carouselImages.push({
        path: uploadResult.path,
        name: file.name,
        size: file.size,
        mime_type: file.type,
        order: i + 1,
        thumbnail: thumbnail,
      });

      console.log(`✅ [CAROUSEL] Imagem ${i + 1}/${files.length} processada`);
    }

    // Criar metadados do carrossel
    const metadata: CarouselMetadata = {
      carousel_images: carouselImages,
      total_images: files.length,
      storage_bucket: 'temp-uploads',
      uploaded_at: new Date().toISOString(),
    };

    const executionTime = Date.now() - startTime;

    console.log('✅ [CAROUSEL] Upload de carrossel concluído:', {
      totalImages: files.length,
      executionTime: executionTime + 'ms',
    });

    return {
      success: true,
      metadata: metadata,
      executionTime: executionTime,
    };

  } catch (error) {
    console.error('❌ [CAROUSEL] Erro no upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Move imagens do carrossel de temp para bucket permanente
 * 
 * @param metadata - Metadados do carrossel
 * @param userId - ID do usuário
 * @returns Metadados atualizados com paths permanentes
 */
export async function moveCarouselToPermanent(
  metadata: CarouselMetadata,
  userId: string
): Promise<CarouselUploadResult> {
  const startTime = Date.now();

  try {
    console.log('🔄 [CAROUSEL] Movendo imagens para bucket permanente...');

    const updatedImages: CarouselImage[] = [];

    for (let i = 0; i < metadata.carousel_images.length; i++) {
      const image = metadata.carousel_images[i];
      
      // Validação de segurança: verifica se image existe e tem as propriedades necessárias
      if (!image || !image.path) {
        console.error(`❌ [CAROUSEL] Imagem ${i + 1} inválida ou sem path, pulando...`);
        continue;
      }
      
      console.log(`📦 [CAROUSEL] Movendo imagem ${i + 1}/${metadata.total_images}...`);

      const moveResult = await moveToSignedDocuments(image.path, userId);

      if (!moveResult.success || !moveResult.path) {
        console.error(`❌ [CAROUSEL] Erro ao mover imagem ${i + 1}`);
        // Limpar imagens já movidas
        for (const movedImage of updatedImages) {
          await deleteFile('signed-documents', movedImage.path);
        }
        return {
          success: false,
          error: moveResult.error || `Erro ao mover imagem ${i + 1}`,
        };
      }

      updatedImages.push({
        ...image,
        path: moveResult.path,
      });
    }

    // Atualizar metadados
    const updatedMetadata: CarouselMetadata = {
      ...metadata,
      carousel_images: updatedImages,
      storage_bucket: 'signed-documents',
    };

    const executionTime = Date.now() - startTime;

    console.log('✅ [CAROUSEL] Imagens movidas com sucesso:', {
      totalImages: updatedImages.length,
      executionTime: executionTime + 'ms',
    });

    return {
      success: true,
      metadata: updatedMetadata,
      executionTime: executionTime,
    };

  } catch (error) {
    console.error('❌ [CAROUSEL] Erro ao mover imagens:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Limpa uploads temporários em caso de erro
 * 
 * @param tempPaths - Array de paths temporários
 */
async function cleanupTempUploads(tempPaths: string[]): Promise<void> {
  console.log('🗑️ [CAROUSEL] Limpando uploads temporários...');
  
  for (const path of tempPaths) {
    try {
      await deleteFile('temp-uploads', path);
    } catch (error) {
      console.warn('⚠️ [CAROUSEL] Erro ao deletar arquivo temporário:', path);
    }
  }
}

/**
 * Deleta todas as imagens do carrossel
 * 
 * @param metadata - Metadados do carrossel
 */
export async function deleteCarousel(metadata: CarouselMetadata): Promise<void> {
  console.log('🗑️ [CAROUSEL] Deletando carrossel...');

  for (const image of metadata.carousel_images) {
    try {
      await deleteFile(metadata.storage_bucket, image.path);
    } catch (error) {
      console.warn('⚠️ [CAROUSEL] Erro ao deletar imagem:', image.path);
    }
  }

  console.log('✅ [CAROUSEL] Carrossel deletado');
}