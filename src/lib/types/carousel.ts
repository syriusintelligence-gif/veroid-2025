/**
 * 🎠 CAROUSEL TYPES
 * Tipos para gerenciamento de carrossel de imagens
 */

/**
 * Informações de uma imagem individual do carrossel
 */
export interface CarouselImage {
  /** Path da imagem no storage */
  path: string;
  
  /** Nome original do arquivo */
  name: string;
  
  /** Tamanho do arquivo em bytes */
  size: number;
  
  /** Tipo MIME do arquivo */
  mime_type: string;
  
  /** Ordem da imagem no carrossel (1, 2, 3...) */
  order: number;
  
  /** Thumbnail comprimida em base64 */
  thumbnail: string;
}

/**
 * Metadados do carrossel armazenados no banco de dados
 */
export interface CarouselMetadata {
  /** Array de imagens do carrossel */
  carousel_images: CarouselImage[];
  
  /** Número total de imagens no carrossel */
  total_images: number;
  
  /** Bucket do Supabase onde estão armazenadas */
  storage_bucket: string;
  
  /** Timestamp de criação */
  uploaded_at: string;
}

/**
 * Configuração para upload de carrossel
 */
export interface CarouselUploadConfig {
  /** Número máximo de imagens (padrão: 15) */
  maxImages?: number;
  
  /** Tamanho máximo por imagem em bytes (padrão: 10MB) */
  maxSizePerImage?: number;
  
  /** Largura máxima da thumbnail (padrão: 800px) */
  thumbnailMaxWidth?: number;
  
  /** Altura máxima da thumbnail (padrão: 600px) */
  thumbnailMaxHeight?: number;
  
  /** Qualidade da thumbnail (padrão: 0.7) */
  thumbnailQuality?: number;
}

/**
 * Configuração padrão para upload de carrossel
 */
export const DEFAULT_CAROUSEL_CONFIG: Required<CarouselUploadConfig> = {
  maxImages: 15,
  maxSizePerImage: 10 * 1024 * 1024, // 10MB
  thumbnailMaxWidth: 800,
  thumbnailMaxHeight: 600,
  thumbnailQuality: 0.7,
};

/**
 * Resultado de operações de upload de carrossel
 */
export interface CarouselUploadResult {
  success: boolean;
  error?: string;
  metadata?: CarouselMetadata;
  executionTime?: number;
}