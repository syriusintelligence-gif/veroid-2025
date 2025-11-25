/**
 * Utilitário para comprimir imagens antes de salvar no localStorage
 * Reduz drasticamente o tamanho das thumbnails para evitar QuotaExceededError
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 800,
  maxHeight: 600,
  quality: 0.7,
  maxSizeKB: 100,
};

/**
 * Comprime uma imagem Data URL para reduzir seu tamanho
 * @param dataUrl - Data URL da imagem (data:image/...)
 * @param options - Opções de compressão
 * @returns Promise<string> - Data URL comprimida
 */
export async function compressImage(
  dataUrl: string,
  options: CompressionOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  console.log('🗜️ Iniciando compressão de imagem...');
  
  // Calcula tamanho original
  const originalSize = Math.round((dataUrl.length * 0.75) / 1024);
  console.log(`📊 Tamanho original: ${originalSize}KB`);
  
  // Se já for pequena o suficiente, retorna sem comprimir
  if (originalSize <= opts.maxSizeKB) {
    console.log(`✅ Imagem já está pequena (${originalSize}KB), sem necessidade de compressão`);
    return dataUrl;
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Calcula novas dimensões mantendo aspect ratio
        let { width, height } = img;
        
        if (width > opts.maxWidth || height > opts.maxHeight) {
          const ratio = Math.min(opts.maxWidth / width, opts.maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
          console.log(`📐 Redimensionando: ${img.width}x${img.height} → ${width}x${height}`);
        }
        
        // Cria canvas para redimensionar e comprimir
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Falha ao criar contexto do canvas'));
          return;
        }
        
        // Desenha imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Tenta comprimir com qualidade decrescente até atingir o tamanho desejado
        let quality = opts.quality;
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        let compressedSize = Math.round((compressedDataUrl.length * 0.75) / 1024);
        
        console.log(`🗜️ Primeira tentativa: ${compressedSize}KB com qualidade ${quality}`);
        
        // Se ainda estiver muito grande, reduz qualidade progressivamente
        while (compressedSize > opts.maxSizeKB && quality > 0.3) {
          quality -= 0.1;
          compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          compressedSize = Math.round((compressedDataUrl.length * 0.75) / 1024);
          console.log(`🗜️ Tentativa com qualidade ${quality.toFixed(1)}: ${compressedSize}KB`);
        }
        
        // Se ainda estiver muito grande, reduz dimensões
        if (compressedSize > opts.maxSizeKB) {
          const reductionFactor = Math.sqrt(opts.maxSizeKB / compressedSize);
          const newWidth = Math.round(width * reductionFactor);
          const newHeight = Math.round(height * reductionFactor);
          
          console.log(`📐 Redução adicional: ${width}x${height} → ${newWidth}x${newHeight}`);
          
          canvas.width = newWidth;
          canvas.height = newHeight;
          ctx.drawImage(img, 0, 0, newWidth, newHeight);
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          compressedSize = Math.round((compressedDataUrl.length * 0.75) / 1024);
        }
        
        const reduction = Math.round(((originalSize - compressedSize) / originalSize) * 100);
        console.log(`✅ Compressão concluída: ${originalSize}KB → ${compressedSize}KB (redução de ${reduction}%)`);
        
        resolve(compressedDataUrl);
      } catch (error) {
        console.error('❌ Erro ao comprimir imagem:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Falha ao carregar imagem'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * Verifica se uma string é uma Data URL de imagem
 */
export function isImageDataUrl(str: string): boolean {
  return str.startsWith('data:image/');
}

/**
 * Calcula o tamanho aproximado de uma Data URL em KB
 */
export function getDataUrlSizeKB(dataUrl: string): number {
  return Math.round((dataUrl.length * 0.75) / 1024);
}