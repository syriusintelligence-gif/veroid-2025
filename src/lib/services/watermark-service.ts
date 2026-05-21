/**
 * =====================================================
 * WATERMARK SERVICE
 * =====================================================
 * 
 * Serviço para adicionar marca d'água em imagens durante o download.
 * Adiciona informações do certificado em UMA LINHA na parte inferior + QR Code.
 * 
 * CARACTERÍSTICAS:
 * - Marca d'água em linha única na parte inferior
 * - QR Code pequeno no canto inferior esquerdo
 * - Funciona apenas com imagens (JPG, PNG, WEBP)
 * - Usa Canvas API do navegador
 * - Não modifica o arquivo original no servidor
 * - Processo totalmente no lado do cliente
 * 
 * @author VeroID Security Team
 * @version 2.0.0
 * @date 2026-05-21
 */

import QRCode from 'qrcode';

/**
 * Configurações da marca d'água
 */
const WATERMARK_CONFIG = {
  // Posição
  position: 'bottom' as const,
  padding: 15,
  
  // QR Code
  qrCodeSize: 80, // Tamanho maior do QR Code para melhor leitura
  qrCodePadding: 12, // Espaçamento entre QR Code e texto
  qrCodeMinImageWidth: 400, // Largura mínima da imagem para mostrar QR Code
  
  // Estilo do texto
  fontSize: 14,
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'bold',
  textColor: 'rgba(255, 255, 255, 0.95)',
  
  // Fundo
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  borderRadius: 0, // Sem bordas arredondadas para melhor layout horizontal
  backgroundPadding: 12,
  
  // Sombra
  shadowBlur: 4,
  shadowColor: 'rgba(0, 0, 0, 0.5)',
};

/**
 * Informações da marca d'água
 */
export interface WatermarkInfo {
  /** Código do certificado (ex: "VER-ABC123") */
  verificationCode: string;
  
  /** Nome do criador do conteúdo */
  creatorName: string;
  
  /** Data e hora da ASSINATURA do certificado (ISO string) */
  signatureDate: string;
  
  /** URL do certificado para QR Code */
  certificateUrl?: string;
  
  /** 🆕 ID do certificado (para gerar URL compacta) */
  certificateId?: string;
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
 * Formata a data para exibição na marca d'água (data da ASSINATURA)
 */
function formatSignatureDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Gera QR Code como Data URL com QUALIDADE OTIMIZADA
 * SOLUÇÃO FINAL: Ajusta nível de correção baseado no tamanho da URL
 */
async function generateQRCodeDataUrl(certificateUrl: string, size: number): Promise<string> {
  try {
    // Gera QR Code com resolução 3x maior para melhor qualidade
    const highResSize = size * 3;
    
    // 🎯 AJUSTE INTELIGENTE: Nível de correção baseado no tamanho da URL
    // URLs curtas (<150 chars): 'H' (30% correção) - melhor para ambientes difíceis
    // URLs médias (150-500 chars): 'M' (15% correção) - bom equilíbrio
    // URLs longas (>500 chars): 'L' (7% correção) - necessário para QR Code não ficar muito denso
    let errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H' = 'M';
    
    if (certificateUrl.length < 150) {
      errorCorrectionLevel = 'H'; // URL curta - usa correção máxima
    } else if (certificateUrl.length < 500) {
      errorCorrectionLevel = 'M'; // URL média - usa correção média
    } else {
      errorCorrectionLevel = 'L'; // URL longa - usa correção baixa
    }
    
    const qrDataUrl = await QRCode.toDataURL(certificateUrl, {
      width: highResSize,
      margin: 3, // Margem generosa para melhor leitura
      errorCorrectionLevel,
      type: 'image/png',
      quality: 1.0, // Qualidade máxima
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    console.log('✅ [Watermark] QR Code gerado com qualidade otimizada:', {
      requestedSize: size,
      generatedSize: highResSize,
      errorCorrection: errorCorrectionLevel,
      urlLength: certificateUrl.length,
      margin: 3
    });
    
    return qrDataUrl;
  } catch (error) {
    console.error('❌ [Watermark] Erro ao gerar QR Code:', error);
    return '';
  }
}

/**
 * Desenha o fundo da marca d'água (barra horizontal completa)
 */
function drawWatermarkBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  barHeight: number
): void {
  ctx.save();
  
  // Desenha barra horizontal na parte inferior
  const y = height - barHeight;
  
  ctx.fillStyle = WATERMARK_CONFIG.backgroundColor;
  ctx.fillRect(0, y, width, barHeight);
  
  ctx.restore();
}

/**
 * Desenha o QR Code na marca d'água com fundo branco maior
 */
async function drawQRCode(
  ctx: CanvasRenderingContext2D,
  qrDataUrl: string,
  x: number,
  y: number,
  size: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const qrImg = new Image();
    
    qrImg.onload = () => {
      ctx.save();
      
      // Padding maior ao redor do QR Code para melhor leitura
      const padding = 4;
      const bgSize = size + (padding * 2);
      
      // Desenha fundo branco maior para o QR Code
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(x - padding, y - padding, bgSize, bgSize);
      
      // Desabilita anti-aliasing para QR Code mais nítido
      ctx.imageSmoothingEnabled = false;
      
      // Desenha o QR Code em alta resolução (downscaling de 3x)
      ctx.drawImage(qrImg, x, y, size, size);
      
      // Restaura anti-aliasing
      ctx.imageSmoothingEnabled = true;
      
      ctx.restore();
      
      console.log('✅ [Watermark] QR Code desenhado com padding:', padding);
      
      resolve();
    };
    
    qrImg.onerror = () => {
      console.error('❌ [Watermark] Erro ao carregar imagem do QR Code');
      reject(new Error('Falha ao carregar QR Code'));
    };
    
    qrImg.src = qrDataUrl;
  });
}

/**
 * Desenha o texto da marca d'água em uma linha
 */
function drawWatermarkText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number
): void {
  ctx.save();
  
  // Configuração do texto
  ctx.font = `${WATERMARK_CONFIG.fontWeight} ${WATERMARK_CONFIG.fontSize}px ${WATERMARK_CONFIG.fontFamily}`;
  ctx.fillStyle = WATERMARK_CONFIG.textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  // Sombra para melhor legibilidade
  ctx.shadowBlur = 2;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  
  // Desenha o texto
  ctx.fillText(text, x, y);
  
  ctx.restore();
}

/**
 * Adiciona marca d'água em uma imagem
 * Layout: QR Code à esquerda + texto em linha única
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
 *   signatureDate: '2026-05-21T14:30:00Z',
 *   certificateUrl: 'https://veroid.com.br/certificate?code=VER-ABC123'
 * });
 * ```
 */
export async function addWatermarkToImage(
  imageBlob: Blob,
  watermarkInfo: WatermarkInfo
): Promise<Blob> {
  console.log('🎨 [Watermark] Iniciando aplicação de marca d\'água v2.0:', {
    verificationCode: watermarkInfo.verificationCode,
    imageSizeKB: (imageBlob.size / 1024).toFixed(2),
    hasCertificateUrl: !!watermarkInfo.certificateUrl
  });
  
  return new Promise((resolve, reject) => {
    try {
      // 1. Criar URL temporária da imagem
      const imageUrl = URL.createObjectURL(imageBlob);
      
      // 2. Carregar imagem
      const img = new Image();
      
      img.onload = () => {
        // Função assíncrona interna para processar a marca d'água
        const processWatermark = async () => {
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
            
            // 5. Calcular tamanho do QR Code baseado na largura da imagem
            let qrSize = WATERMARK_CONFIG.qrCodeSize;
            
            // Se a imagem for menor que o mínimo, não mostra QR Code
            const showQRCode = img.width >= WATERMARK_CONFIG.qrCodeMinImageWidth && watermarkInfo.certificateUrl;
            
            // Ajusta QR Code para imagens grandes (tamanhos maiores para melhor leitura)
            if (img.width > 1000) {
              qrSize = 100;
            } else if (img.width > 1500) {
              qrSize = 120;
            }
            
            console.log('📊 [Watermark] Configuração:', {
              showQRCode,
              qrSize,
              imageWidth: img.width
            });
            
            // 6. Preparar texto da marca d'água (UMA LINHA)
            const formattedDate = formatSignatureDate(watermarkInfo.signatureDate);
            const watermarkText = `certificado por www.veroid.com.br | ${watermarkInfo.verificationCode} | ${formattedDate}`;
            
            // 7. Calcular dimensões da barra de marca d'água
            ctx.font = `${WATERMARK_CONFIG.fontWeight} ${WATERMARK_CONFIG.fontSize}px ${WATERMARK_CONFIG.fontFamily}`;
            const textMetrics = ctx.measureText(watermarkText);
            const textWidth = textMetrics.width;
            
            // Altura da barra (com padding)
            const barHeight = Math.max(
              showQRCode ? qrSize + (WATERMARK_CONFIG.backgroundPadding * 2) : 0,
              WATERMARK_CONFIG.fontSize + (WATERMARK_CONFIG.backgroundPadding * 2)
            );
            
            console.log('📏 [Watermark] Dimensões:', {
              textWidth,
              barHeight,
              canvasWidth: canvas.width
            });
            
            // 8. Desenhar fundo da marca d'água (barra horizontal completa)
            drawWatermarkBackground(ctx, canvas.width, canvas.height, barHeight);
            
            // 9. Desenhar QR Code (se aplicável)
            let qrXOffset = WATERMARK_CONFIG.backgroundPadding;
            
            // 🎯 SOLUÇÃO DEFINITIVA: Captura o QR Code SVG já renderizado na página
            // Garante identidade visual perfeita e elimina problemas de densidade
            if (showQRCode) {
              try {
                // Importa função de captura do SVG
                const { captureQRCodeFromPage, hasQRCodeOnPage } = await import('@/lib/services/watermark-svg-capture');
                
                // Verifica se há QR Code na página
                if (hasQRCodeOnPage()) {
                  console.log('📸 [Watermark] Capturando QR Code da página...');
                  
                  // Captura o QR Code em alta resolução (3x o tamanho final)
                  const qrDataUrl = await captureQRCodeFromPage('.qr-code-container svg', qrSize * 3);
                  
                  if (qrDataUrl) {
                    const qrX = WATERMARK_CONFIG.backgroundPadding;
                    const qrY = canvas.height - barHeight + WATERMARK_CONFIG.backgroundPadding;
                    
                    await drawQRCode(ctx, qrDataUrl, qrX, qrY, qrSize);
                    
                    qrXOffset = qrX + qrSize + WATERMARK_CONFIG.qrCodePadding;
                    console.log('✅ [Watermark] QR Code da página capturado e desenhado com sucesso');
                  } else {
                    console.warn('⚠️ [Watermark] Falha na captura, continuando sem QR Code');
                  }
                } else {
                  console.warn('⚠️ [Watermark] QR Code não encontrado na página');
                }
              } catch (error) {
                console.warn('⚠️ [Watermark] Erro ao capturar QR Code, continuando sem ele:', error);
              }
            }
            
            // 10. Desenhar texto ao lado do QR Code (ou no início se não houver QR)
            const textX = qrXOffset;
            const textY = canvas.height - (barHeight / 2);
            
            drawWatermarkText(ctx, watermarkText, textX, textY);
            
            console.log('✅ [Watermark] Texto desenhado em linha única');
            
            // 11. Converter canvas para blob
            canvas.toBlob(
              (blob) => {
                // Limpar URL temporária
                URL.revokeObjectURL(imageUrl);
                
                if (!blob) {
                  reject(new Error('Falha ao converter canvas para blob'));
                  return;
                }
                
                console.log('✅ [Watermark] Marca d\'água v2.0 aplicada com sucesso:', {
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
        
        // Executa a função assíncrona
        processWatermark().catch(reject);
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
 *   creatorName: 'João Silva',
 *   signatureDate: '2026-05-21T14:30:00Z',
 *   certificateUrl: 'https://veroid.com.br/certificate?code=VER-ABC123'
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