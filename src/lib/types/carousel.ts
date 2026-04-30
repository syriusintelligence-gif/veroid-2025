/**
 * 📸 CAROUSEL TYPES
 * 
 * Tipos e interfaces para suporte a múltiplas imagens em formato carrossel.
 * Usado para postagens com 10-15 imagens que devem ser assinadas juntas.
 * 
 * @module CarouselTypes
 * @version 1.0.0
 * @date 2026-04-30
 */

/**
 * Informações de uma imagem individual no carrossel
 */
export interface CarouselImage {
  /** Path completo da imagem no Storage */
  path: string;
  
  /** Nome original do arquivo */
  name: string;
  
  /** Tamanho do arquivo em bytes */
  size: number;
  
  /** MIME type da imagem */
  mime_type: string;
  
  /** Ordem da imagem no carrossel (1-based) */
  order: number;
  
  /** Preview em base64 (opcional, para exibição antes do upload) */
  preview?: string;
  
  /** Thumbnail comprimida em base64 (opcional, para certificado) */
  thumbnail?: string;
}

/**
 * Metadados completos do carrossel de imagens
 */
export interface CarouselMetadata {
  /** Array de imagens do carrossel */
  carousel_images: CarouselImage[];
  
  /** Número total de imagens */
  total_images: number;
  
  /** Bucket onde as imagens estão armazenadas */
  storage_bucket: string;
  
  /** Timestamp de upload do carrossel */
  uploaded_at: string;
}

/**
 * Resultado de upload de carrossel
 */
export interface CarouselUploadResult {
  success: boolean;
  metadata?: CarouselMetadata;
  error?: string;
  executionTime?: number;
}

/**
 * Configuração de upload de carrossel
 */
export interface CarouselUploadConfig {
  /** Número máximo de imagens permitidas */
  maxImages?: number;
  
  /** Tamanho máximo por imagem (bytes) */
  maxSizePerImage?: number;
  
  /** Largura máxima para thumbnails */
  thumbnailMaxWidth?: number;
  
  /** Altura máxima para thumbnails */
  thumbnailMaxHeight?: number;
  
  /** Qualidade de compressão dos thumbnails (0-1) */
  thumbnailQuality?: number;
}

/**
 * Configuração padrão para upload de carrossel
 */
export const DEFAULT_CAROUSEL_CONFIG: CarouselUploadConfig = {
  maxImages: 15,
  maxSizePerImage: 10 * 1024 * 1024, // 10MB por imagem
  thumbnailMaxWidth: 800,
  thumbnailMaxHeight: 600,
  thumbnailQuality: 0.7,
};