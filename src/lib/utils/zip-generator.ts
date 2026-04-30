/**
 * 📦 ZIP GENERATOR UTILITY
 * 
 * Utilitário para gerar arquivos ZIP com múltiplas imagens.
 * Usado para download de carrossel completo de imagens.
 * 
 * @module ZipGenerator
 * @version 1.0.0
 * @date 2026-04-30
 */

import JSZip from 'jszip';
import type { CarouselImage } from '@/lib/types/carousel';
import { supabase } from '@/lib/supabase';

/**
 * Resultado da geração de ZIP
 */
export interface ZipGenerationResult {
  success: boolean;
  blob?: Blob;
  error?: string;
  executionTime?: number;
}

/**
 * Baixa uma imagem do Supabase Storage
 */
async function downloadImage(path: string, bucket: string): Promise<Blob | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      console.error('❌ [ZipGenerator] Erro ao baixar imagem:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ [ZipGenerator] Erro ao baixar imagem:', error);
    return null;
  }
}

/**
 * Converte data URL (base64) para Blob
 */
function dataURLtoBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mimeType = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const base64Data = parts[1];
  const byteString = atob(base64Data);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([arrayBuffer], { type: mimeType });
}

/**
 * Gera um arquivo ZIP contendo todas as imagens do carrossel
 * 
 * @param images - Array de imagens do carrossel
 * @param bucket - Bucket onde as imagens estão armazenadas
 * @param zipFileName - Nome do arquivo ZIP (sem extensão)
 * @returns Resultado com Blob do ZIP
 * 
 * @example
 * ```typescript
 * const result = await generateCarouselZip(images, 'signed-documents', 'minhas-fotos');
 * if (result.success && result.blob) {
 *   // Fazer download do ZIP
 *   const url = URL.createObjectURL(result.blob);
 *   const a = document.createElement('a');
 *   a.href = url;
 *   a.download = 'minhas-fotos.zip';
 *   a.click();
 * }
 * ```
 */
export async function generateCarouselZip(
  images: CarouselImage[],
  bucket: string,
  zipFileName: string = 'carousel-images'
): Promise<ZipGenerationResult> {
  const startTime = Date.now();
  
  console.log('📦 [ZipGenerator] Iniciando geração de ZIP:', {
    totalImages: images.length,
    bucket,
    zipFileName,
  });

  if (images.length === 0) {
    return {
      success: false,
      error: 'Nenhuma imagem para adicionar ao ZIP',
      executionTime: Date.now() - startTime,
    };
  }

  try {
    const zip = new JSZip();
    let successCount = 0;
    let failCount = 0;

    // Adicionar cada imagem ao ZIP
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`📥 [ZipGenerator] Processando imagem ${i + 1}/${images.length}:`, image.name);

      try {
        let imageBlob: Blob | null = null;

        // Se tem thumbnail em base64, usa ele
        if (image.thumbnail && image.thumbnail.startsWith('data:')) {
          imageBlob = dataURLtoBlob(image.thumbnail);
          console.log(`✅ [ZipGenerator] Usando thumbnail da imagem ${i + 1}`);
        } 
        // Caso contrário, baixa do storage
        else {
          imageBlob = await downloadImage(image.path, bucket);
          console.log(`✅ [ZipGenerator] Imagem ${i + 1} baixada do storage`);
        }

        if (imageBlob) {
          // Adiciona ao ZIP com nome: 001_nome-original.jpg
          const paddedOrder = String(image.order).padStart(3, '0');
          const fileName = `${paddedOrder}_${image.name}`;
          zip.file(fileName, imageBlob);
          successCount++;
        } else {
          console.warn(`⚠️ [ZipGenerator] Falha ao obter blob da imagem ${i + 1}`);
          failCount++;
        }

      } catch (error) {
        console.error(`❌ [ZipGenerator] Erro ao processar imagem ${i + 1}:`, error);
        failCount++;
      }
    }

    console.log('📊 [ZipGenerator] Resumo do processamento:', {
      total: images.length,
      success: successCount,
      failed: failCount,
    });

    if (successCount === 0) {
      return {
        success: false,
        error: 'Nenhuma imagem pôde ser adicionada ao ZIP',
        executionTime: Date.now() - startTime,
      };
    }

    // Gerar o arquivo ZIP
    console.log('🗜️ [ZipGenerator] Gerando arquivo ZIP...');
    const zipBlob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6, // Compressão média (0-9)
      },
    });

    const executionTime = Date.now() - startTime;

    console.log('✅ [ZipGenerator] ZIP gerado com sucesso:', {
      size: `${(zipBlob.size / 1024 / 1024).toFixed(2)}MB`,
      executionTime: `${executionTime}ms`,
      imagesIncluded: successCount,
      imagesFailed: failCount,
    });

    return {
      success: true,
      blob: zipBlob,
      executionTime,
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ [ZipGenerator] Erro ao gerar ZIP:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar ZIP',
      executionTime,
    };
  }
}

/**
 * Faz download de um arquivo ZIP
 * 
 * @param blob - Blob do arquivo ZIP
 * @param fileName - Nome do arquivo (sem extensão)
 */
export function downloadZip(blob: Blob, fileName: string = 'carousel-images'): void {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('✅ [ZipGenerator] Download do ZIP iniciado:', `${fileName}.zip`);
  } catch (error) {
    console.error('❌ [ZipGenerator] Erro ao iniciar download:', error);
  }
}