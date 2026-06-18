/**
 * 🖼️ WATERMARK MODULE
 * 
 * Adiciona watermark em imagens baixadas com informações do certificado.
 * 
 * @module watermark
 * @version 1.0.0
 */

import { SignedContent } from './supabase-crypto';

/**
 * Verifica se uma URL aponta para uma imagem
 */
export function isImageUrl(url: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const urlLower = url.toLowerCase();
  return imageExtensions.some(ext => urlLower.includes(ext));
}

/**
 * Verifica se um MIME type é de imagem
 */
export function isImageMimeType(mimeType?: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

/**
 * Adiciona watermark a uma imagem
 */
export async function addWatermarkToImage(
  imageUrl: string,
  certificateData: SignedContent
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // Criar canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Não foi possível criar contexto do canvas');
        }
        
        // Definir tamanho do canvas
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Desenhar imagem original
        ctx.drawImage(img, 0, 0);
        
        // Configurar watermark
        const watermarkHeight = 100;
        const padding = 20;
        
        // Fundo semitransparente
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - watermarkHeight, canvas.width, watermarkHeight);
        
        // Texto branco
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        
        // Logo e título
        ctx.fillText('🛡️ Verificado by Vero iD', padding, canvas.height - watermarkHeight + 30);
        
        // Informações do certificado
        ctx.font = '14px Arial';
        const date = new Date(certificateData.createdAt).toLocaleString('pt-BR');
        ctx.fillText(`Data: ${date}`, padding, canvas.height - watermarkHeight + 55);
        ctx.fillText(`Código: ${certificateData.verificationCode}`, padding, canvas.height - watermarkHeight + 75);
        
        // Converter para blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Erro ao criar blob da imagem'));
          }
        }, 'image/png');
        
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Erro ao carregar imagem'));
    };
    
    img.src = imageUrl;
  });
}

/**
 * Baixa uma imagem com watermark
 */
export async function downloadImageWithWatermark(
  imageUrl: string,
  certificateData: SignedContent,
  fileName: string
): Promise<void> {
  try {
    console.log('🖼️ [Watermark] Adicionando watermark à imagem...');
    
    // Adicionar watermark
    const blob = await addWatermarkToImage(imageUrl, certificateData);
    
    // Criar URL temporária
    const url = URL.createObjectURL(blob);
    
    // Download
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar URL temporária
    URL.revokeObjectURL(url);
    
    console.log('✅ [Watermark] Download com watermark concluído');
  } catch (error) {
    console.error('❌ [Watermark] Erro ao adicionar watermark:', error);
    throw error;
  }
}