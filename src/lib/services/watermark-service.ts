/**
 * =====================================================
 * WATERMARK SERVICE
 * =====================================================
 * 
 * Serviço para adicionar marca d'água em imagens durante o download.
 * Adiciona informações do certificado (código, nome do criador, data) na imagem.
 * 
 * CARACTERÍSTICAS:
 * - Marca d'água semi-transparente no canto inferior direito
 * - Funciona apenas com imagens (JPG, PNG, WEBP)
 * - Usa Canvas API do navegador (sem dependências externas)
 * - Não modifica o arquivo original no servidor
 * - Processo totalmente no lado do cliente
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 * @date 2026-05-20
 */

/**
 * Configurações da marca d'água
 */
const WATERMARK_CONFIG = {
  // Posição
  position: 'bottom-right' as const,
  padding: 20,
  
  // Estilo do texto
  fontSize: 16,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'bold',
  textColor: 'rgba(255, 255, 255, 0.9)',
  
  // Fundo
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: 8,
  backgroundPadding: 12,
  
  // Sombra
  shadowBlur: 4,
  shadowColor: 'rgba(0, 0, 0, 0.5)',
  
  // Linha de separação
  lineHeight: 24,
  lineSpacing: 4,
};

/**
 * Informações da marca d'água
 */
export interface WatermarkInfo {
  /** Código do certificado (ex: "VER-ABC123") */
  verificationCode: string;
  
  /** Nome do criador do conteúdo */
  creatorName: string;
  
  /** Data do download (formato: "DD/MM/YYYY HH:mm") */
  downloadDate?: string;
  
  /** CPF parcialmente mascarado (opcional, ex: "***.456.789-**") */
  cpf?: string;
}

/**
 * Verifica se o arquivo é uma imagem suportada
 */
export function isImageFile(mimeType?: string, fileName?: string): boolean {
  if (mimeType) {
    return mimeType.startsWith('image/') && 
           (mimeType.includes('jpeg') || 
            mimeType.includes('jpg') || 
            mimeType.includes('png') || 
            mimeType.includes('webp'));
  }
  
  if (fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    return ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp';
  }
  
  return false;
}

/**
 * Formata a data para exibição na marca d'água
 */
function formatDownloadDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Desenha o fundo da marca d'água
 */
function drawWatermarkBackground(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  ctx.save();
  
  // Sombra
  ctx.shadowBlur = WATERMARK_CONFIG.shadowBlur;
  ctx.shadowColor = WATERMARK_CONFIG.shadowColor;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  
  // Fundo com cantos arredondados
  ctx.fillStyle = WATERMARK_CONFIG.backgroundColor;
  ctx.beginPath();
  ctx.roundRect(
    x,
    y,
    width,
    height,
    WATERMARK_CONFIG.borderRadius
  );
  ctx.fill();
  
  ctx.restore();
}

/**
 * Desenha o texto da marca d'água
 */
function drawWatermarkText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number
): void {
  ctx.save();
  
  // Configuração do texto
  ctx.font = `${WATERMARK_CONFIG.fontWeight} ${WATERMARK_CONFIG.fontSize}px ${WATERMARK_CONFIG.fontFamily}`;
  ctx.fillStyle = WATERMARK_CONFIG.textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  // Desenha cada linha
  lines.forEach((line, index) => {
    const lineY = y + (index * (WATERMARK_CONFIG.lineHeight + WATERMARK_CONFIG.lineSpacing));
    ctx.fillText(line, x, lineY);
  });
  
  ctx.restore();
}

/**
 * Adiciona marca d'água em uma imagem
 * 
 * @param imageBlob - Blob da imagem original
 * @param watermarkInfo - Informações para a marca d'água
 * @returns Promise<Blob> - Blob da imagem com marca d'água
 * 
 * @example
 * ```typescript
 * const watermarkedBlob = await addWatermarkToImage(imageBlob, {
 *   verificationCode: 'VER-ABC123',
 *   creatorName: 'João Silva',
 *   downloadDate: '20/05/2026 14:30'
 * });
 * ```
 */
export async function addWatermarkToImage(
  imageBlob: Blob,
  watermarkInfo: WatermarkInfo
): Promise<Blob> {
  console.log('🎨 [Watermark] Iniciando aplicação de marca d\'água:', {
    verificationCode: watermarkInfo.verificationCode,
    creatorName: watermarkInfo.creatorName,
    imageSizeKB: (imageBlob.size / 1024).toFixed(2)
  });
  
  return new Promise((resolve, reject) => {
    try {
      // 1. Criar URL temporária da imagem
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // 2. Carregar imagem
      const img = new Image();
      
      img.onload = () => {
        try {
          console.log('📐 [Watermark] Imagem carregada:', {
            width: img.width,
            height: img.height
          });
          
          // 3. Criar canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Não foi possível obter contexto 2D do canvas');
          }
          
          // 4. Desenhar imagem original
          ctx.drawImage(img, 0, 0);
          
          // 5. Preparar linhas de texto da marca d'água
          const lines: string[] = [
            `🔒 ${watermarkInfo.verificationCode}`,
            `👤 ${watermarkInfo.creatorName}`,
          ];
          
          // Adiciona data de download se fornecida
          if (watermarkInfo.downloadDate) {
            lines.push(`📅 ${watermarkInfo.downloadDate}`);
          } else {
            lines.push(`📅 ${formatDownloadDate()}`);
          }
          
          // Adiciona CPF se fornecido
          if (watermarkInfo.cpf) {
            lines.push(`🆔 ${watermarkInfo.cpf}`);
          }
          
          // 6. Calcular dimensões da marca d'água
          ctx.font = `${WATERMARK_CONFIG.fontWeight} ${WATERMARK_CONFIG.fontSize}px ${WATERMARK_CONFIG.fontFamily}`;
          
          const textWidths = lines.map(line => ctx.measureText(line).width);
          const maxWidth = Math.max(...textWidths);
          
          const watermarkWidth = maxWidth + (WATERMARK_CONFIG.backgroundPadding * 2);
          const watermarkHeight = 
            (lines.length * WATERMARK_CONFIG.lineHeight) + 
            ((lines.length - 1) * WATERMARK_CONFIG.lineSpacing) + 
            (WATERMARK_CONFIG.backgroundPadding * 2);
          
          // 7. Calcular posição da marca d'água (canto inferior direito)
          const watermarkX = canvas.width - watermarkWidth - WATERMARK_CONFIG.padding;
          const watermarkY = canvas.height - watermarkHeight - WATERMARK_CONFIG.padding;
          
          console.log('📍 [Watermark] Posição calculada:', {
            x: watermarkX,
            y: watermarkY,
            width: watermarkWidth,
            height: watermarkHeight
          });
          
          // 8. Desenhar fundo da marca d'água
          drawWatermarkBackground(ctx, watermarkX, watermarkY, watermarkWidth, watermarkHeight);
          
          // 9. Desenhar texto da marca d'água
          const textX = watermarkX + WATERMARK_CONFIG.backgroundPadding;
          const textY = watermarkY + WATERMARK_CONFIG.backgroundPadding;
          drawWatermarkText(ctx, lines, textX, textY);
          
          // 10. Converter canvas para blob
          canvas.toBlob(
            (blob) => {
              // Limpar URL temporária
              URL.revokeObjectURL(imageUrl);
              
              if (!blob) {
                reject(new Error('Falha ao converter canvas para blob'));
                return;
              }
              
              console.log('✅ [Watermark] Marca d\'água aplicada com sucesso:', {
                originalSizeKB: (imageBlob.size / 1024).toFixed(2),
                watermarkedSizeKB: (blob.size / 1024).toFixed(2)
              });
              
              resolve(blob);
            },
            imageBlob.type || 'image/png',
            0.95 // Qualidade 95%
          );
          
        } catch (error) {
          URL.revokeObjectURL(imageUrl);
          reject(error);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Falha ao carregar imagem'));
      };
      
      img.src = imageUrl;
      
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Baixa arquivo com marca d'água (se for imagem)
 * 
 * @param blob - Blob do arquivo original
 * @param fileName - Nome do arquivo
 * @param watermarkInfo - Informações para marca d'água (apenas para imagens)
 * @param mimeType - MIME type do arquivo
 * 
 * @example
 * ```typescript
 * await downloadWithWatermark(blob, 'image.jpg', {
 *   verificationCode: 'VER-ABC123',
 *   creatorName: 'João Silva'
 * }, 'image/jpeg');
 * ```
 */
export async function downloadWithWatermark(
  blob: Blob,
  fileName: string,
  watermarkInfo: WatermarkInfo,
  mimeType?: string
): Promise<void> {
  console.log('📥 [Watermark] Iniciando download:', {
    fileName,
    isImage: isImageFile(mimeType, fileName)
  });
  
  try {
    let finalBlob = blob;
    
    // Se for imagem, aplica marca d'água
    if (isImageFile(mimeType, fileName)) {
      console.log('🎨 [Watermark] Aplicando marca d\'água em imagem...');
      finalBlob = await addWatermarkToImage(blob, watermarkInfo);
    } else {
      console.log('ℹ️ [Watermark] Arquivo não é imagem, baixando sem marca d\'água');
    }
    
    // Download do arquivo
    const url = URL.createObjectURL(finalBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar URL após pequeno delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('✅ [Watermark] Download concluído com sucesso');
    
  } catch (error) {
    console.error('❌ [Watermark] Erro ao processar download:', error);
    throw error;
  }
}