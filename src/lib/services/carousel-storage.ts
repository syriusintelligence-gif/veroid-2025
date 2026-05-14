/**
 * 🎠 CAROUSEL STORAGE SERVICE
 * Serviço para gerenciamento de upload e storage de carrosséis de imagens
 * RESTAURADO: Usa estrutura carousel_images (array de objetos) ao invés de arrays separados
 */

import { supabase } from '@/lib/supabase';
import { compressImage } from '@/lib/image-compression';
import type { 
  CarouselMetadata, 
  CarouselImage,
  CarouselUploadConfig,
  CarouselUploadResult
} from '@/lib/types/carousel';
import { DEFAULT_CAROUSEL_CONFIG } from '@/lib/types/carousel';

/**
 * Faz upload de múltiplas imagens para o bucket temporário
 * @param files - Array de arquivos de imagem
 * @param userId - ID do usuário
 * @param config - Configuração de upload
 * @returns Resultado da operação com metadados
 */
export async function uploadCarouselImages(
  files: File[],
  userId: string,
  config: CarouselUploadConfig = DEFAULT_CAROUSEL_CONFIG
): Promise<CarouselUploadResult> {
  const startTime = Date.now();
  
  try {
    console.log('📤 [CAROUSEL STORAGE] Iniciando upload de carrossel', {
      totalFiles: files.length,
      userId: userId.substring(0, 8) + '...',
      maxImages: config.maxImages || DEFAULT_CAROUSEL_CONFIG.maxImages
    });
    
    const maxImages = config.maxImages || DEFAULT_CAROUSEL_CONFIG.maxImages;
    const maxSizePerImage = config.maxSizePerImage || DEFAULT_CAROUSEL_CONFIG.maxSizePerImage;
    
    // Validação: número de imagens
    if (files.length > maxImages) {
      return {
        success: false,
        error: `Número máximo de imagens excedido. Máximo: ${maxImages}, Enviado: ${files.length}`,
        executionTime: Date.now() - startTime
      };
    }
    
    // Validação: tamanho de cada imagem
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSizePerImage) {
        return {
          success: false,
          error: `Imagem ${i + 1} (${files[i].name}) excede o tamanho máximo permitido`,
          executionTime: Date.now() - startTime
        };
      }
    }
    
    const carouselImages: CarouselImage[] = [];
    const timestamp = Date.now();
    
    // Upload de cada imagem
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const order = i + 1;
      const randomStr = Math.random().toString(36).substring(2, 8);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `carousel_${timestamp}_${order}_${randomStr}_${sanitizedName}`;
      const filePath = `${userId}/temp/${fileName}`;
      
      console.log(`📤 [CAROUSEL STORAGE] Uploading image ${order}/${files.length}:`, fileName);
      
      // Upload para Supabase Storage (sem compressão no upload, apenas thumbnail)
      const { data, error } = await supabase.storage
        .from('temp-uploads')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false
        });
      
      if (error) {
        console.error(`❌ [CAROUSEL STORAGE] Erro no upload da imagem ${order}:`, error);
        
        // Limpar uploads já realizados em caso de erro
        if (carouselImages.length > 0) {
          console.log('🗑️ [CAROUSEL STORAGE] Limpando uploads parciais...');
          await Promise.all(
            carouselImages.map(img => 
              supabase.storage.from('temp-uploads').remove([img.path])
            )
          );
        }
        
        return {
          success: false,
          error: `Erro ao fazer upload da imagem ${order}: ${error.message}`,
          executionTime: Date.now() - startTime
        };
      }
      
      // Gerar thumbnail comprimida
      let thumbnail = '';
      try {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        thumbnail = await compressImage(dataUrl, {
          maxWidth: config.thumbnailMaxWidth || DEFAULT_CAROUSEL_CONFIG.thumbnailMaxWidth,
          maxHeight: config.thumbnailMaxHeight || DEFAULT_CAROUSEL_CONFIG.thumbnailMaxHeight,
          quality: config.thumbnailQuality || DEFAULT_CAROUSEL_CONFIG.thumbnailQuality,
          maxSizeKB: 100
        });
        
        console.log(`✅ [CAROUSEL STORAGE] Thumbnail ${order} gerada`);
      } catch (error) {
        console.warn(`⚠️ [CAROUSEL STORAGE] Erro ao gerar thumbnail ${order}, usando placeholder:`, error);
        thumbnail = dataUrl; // fallback para imagem original
      }
      
      // Adicionar à lista de imagens do carrossel
      carouselImages.push({
        path: data.path,
        name: file.name,
        size: file.size,
        mime_type: file.type,
        order,
        thumbnail
      });
    }
    
    // Criar metadados no formato correto (com carousel_images)
    const metadata: CarouselMetadata = {
      carousel_images: carouselImages,
      total_images: files.length,
      storage_bucket: 'temp-uploads',
      uploaded_at: new Date().toISOString()
    };
    
    const executionTime = Date.now() - startTime;
    
    console.log('✅ [CAROUSEL STORAGE] Upload concluído:', {
      totalImages: metadata.total_images,
      executionTime: executionTime + 'ms'
    });
    
    return {
      success: true,
      metadata,
      executionTime
    };
    
  } catch (error) {
    console.error('❌ [CAROUSEL STORAGE] Erro geral no upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao fazer upload do carrossel',
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Move carrossel do bucket temporário para o bucket permanente
 * @param metadata - Metadados do carrossel no bucket temporário
 * @param userId - ID do usuário
 * @returns Resultado da operação com novos metadados
 */
export async function moveCarouselToSignedDocuments(
  metadata: CarouselMetadata,
  userId: string
): Promise<CarouselUploadResult> {
  const startTime = Date.now();
  
  try {
    console.log('🔄 [CAROUSEL STORAGE] Movendo carrossel para signed-documents', {
      totalImages: metadata.total_images,
      userId: userId.substring(0, 8) + '...'
    });
    
    const movedImages: CarouselImage[] = [];
    const timestamp = Date.now();
    
    // Mover cada imagem
    for (const image of metadata.carousel_images) {
      console.log(`🔄 [CAROUSEL STORAGE] Movendo imagem ${image.order}/${metadata.total_images}`);
      
      // Baixar do temp-uploads
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from('temp-uploads')
        .download(image.path);
      
      if (downloadError) {
        console.error(`❌ [CAROUSEL STORAGE] Erro ao baixar imagem ${image.order}:`, downloadError);
        throw new Error(`Erro ao baixar imagem ${image.order}: ${downloadError.message}`);
      }
      
      // Criar novo path
      const randomStr = Math.random().toString(36).substring(2, 8);
      const sanitizedName = image.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const newFileName = `signed_carousel_${timestamp}_${image.order}_${randomStr}_${sanitizedName}`;
      const newPath = `${userId}/${newFileName}`;
      
      // Upload para signed-documents
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signed-documents')
        .upload(newPath, downloadData, {
          contentType: image.mime_type,
          upsert: false
        });
      
      if (uploadError) {
        console.error(`❌ [CAROUSEL STORAGE] Erro ao fazer upload da imagem ${image.order}:`, uploadError);
        
        // Limpar uploads já realizados
        if (movedImages.length > 0) {
          console.log('🗑️ [CAROUSEL STORAGE] Limpando uploads parciais em signed-documents...');
          await Promise.all(
            movedImages.map(img => 
              supabase.storage.from('signed-documents').remove([img.path])
            )
          );
        }
        
        throw new Error(`Erro ao fazer upload da imagem ${image.order}: ${uploadError.message}`);
      }
      
      // Adicionar à lista de imagens movidas
      movedImages.push({
        ...image,
        path: uploadData.path
      });
      
      // Deletar do temp-uploads
      const { error: deleteError } = await supabase.storage
        .from('temp-uploads')
        .remove([image.path]);
      
      if (deleteError) {
        console.warn(`⚠️ [CAROUSEL STORAGE] Erro ao deletar imagem ${image.order} de temp-uploads (não crítico):`, deleteError);
      }
      
      console.log(`✅ [CAROUSEL STORAGE] Imagem ${image.order} movida:`, uploadData.path);
    }
    
    // Atualizar metadados
    const newMetadata: CarouselMetadata = {
      carousel_images: movedImages,
      total_images: movedImages.length,
      storage_bucket: 'signed-documents',
      uploaded_at: metadata.uploaded_at
    };
    
    const executionTime = Date.now() - startTime;
    
    console.log('✅ [CAROUSEL STORAGE] Carrossel movido com sucesso:', {
      totalImages: newMetadata.total_images,
      executionTime: executionTime + 'ms'
    });
    
    return {
      success: true,
      metadata: newMetadata,
      executionTime
    };
    
  } catch (error) {
    console.error('❌ [CAROUSEL STORAGE] Erro ao mover carrossel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao mover carrossel',
      executionTime: Date.now() - startTime
    };
  }
}

/**
 * Deleta todas as imagens de um carrossel
 * @param metadata - Metadados do carrossel
 * @param userId - ID do usuário (não usado, mantido por compatibilidade)
 * @returns Resultado da operação
 */
export async function deleteCarouselImages(
  metadata: CarouselMetadata,
  userId: string
): Promise<CarouselUploadResult> {
  const startTime = Date.now();
  
  try {
    console.log('🗑️ [CAROUSEL STORAGE] Deletando carrossel', {
      totalImages: metadata.total_images,
      bucket: metadata.storage_bucket
    });
    
    const paths = metadata.carousel_images.map(img => img.path);
    
    const { error } = await supabase.storage
      .from(metadata.storage_bucket)
      .remove(paths);
    
    if (error) {
      console.error('❌ [CAROUSEL STORAGE] Erro ao deletar carrossel:', error);
      return {
        success: false,
        error: `Erro ao deletar carrossel: ${error.message}`,
        executionTime: Date.now() - startTime
      };
    }
    
    const executionTime = Date.now() - startTime;
    
    console.log('✅ [CAROUSEL STORAGE] Carrossel deletado com sucesso:', {
      totalImagesDeleted: metadata.total_images,
      executionTime: executionTime + 'ms'
    });
    
    return {
      success: true,
      executionTime
    };
    
  } catch (error) {
    console.error('❌ [CAROUSEL STORAGE] Erro ao deletar carrossel:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao deletar carrossel',
      executionTime: Date.now() - startTime
    };
  }
}