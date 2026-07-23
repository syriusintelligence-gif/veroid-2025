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
 * Adiciona watermark a uma imagem com barra abaixo (similar ao PDF)
 */
export async function addWatermarkToImage(
  imageUrl: string,
  certificateData: SignedContent
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = async () => {
      try {
        // Gerar QR code
        const QRCode = (await import('qrcode')).default;
        const { generateQRData } = await import('./qrcode');
        const qrData = generateQRData(certificateData);
        // 🔍 [QR FIX v2 2026-07-23] Opção A + Opção C:
        // - width 1024 (era 512): matriz em alta resolução → módulos ainda mais nítidos após downscale
        // - margin 2: quiet zone dentro do mínimo ISO/IEC 18004 (preservada)
        // - errorCorrectionLevel 'H' (era 'M'): recuperação de erro alta (~30%) → tolera compressão do Instagram/Facebook
        // - dark '#000000': preto puro (já estava, mantido) — contraste máximo p/ leitura em qualquer dispositivo
        const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
          width: 1024,
          margin: 2,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        
        // Criar canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Não foi possível criar contexto do canvas');
        }
        
        // Configurar dimensões da barra
        // 🔍 [QR FIX v2 2026-07-23] Opção A: barra aumentada de 80 → 130 px e QR de 60 → 110 px.
        //   • Densidade estimada: ~3.3 px/módulo (era ~1.8) → à prova de compressão do Instagram/Facebook
        //   • Barra proporcionalmente maior mantém o mesmo layout (QR à esquerda + textos ao lado + selo à direita)
        //   • Padding preservado em 15 px para não deslocar bordas
        const watermarkHeight = 130;
        const padding = 15;
        const qrSize = 110;
        
        // Definir tamanho do canvas (imagem + barra)
        canvas.width = img.width;
        canvas.height = img.height + watermarkHeight;
        
        // Desenhar imagem original no topo
        ctx.drawImage(img, 0, 0);
        
        // Fundo branco da barra
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, img.height, canvas.width, watermarkHeight);
        
        // Linha superior da barra
        ctx.strokeStyle = '#b0b0b0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, img.height);
        ctx.lineTo(canvas.width, img.height);
        ctx.stroke();
        
        // Carregar QR code
        const qrImg = new Image();
        qrImg.onload = () => {
          // 🔍 [QR FIX v2 2026-07-23] Desliga suavização apenas para o QR,
          // para preservar bordas retas dos módulos ao reduzir 1024 → 110 px.
          // Restaurado logo depois para não afetar o desenho da imagem/fontes.
          const prevSmoothing = ctx.imageSmoothingEnabled;
          ctx.imageSmoothingEnabled = false;
          // Desenhar QR code no canto esquerdo, verticalmente centralizado na nova barra de 130 px
          const qrY = img.height + Math.round((watermarkHeight - qrSize) / 2);
          ctx.drawImage(qrImg, padding, qrY, qrSize, qrSize);
          ctx.imageSmoothingEnabled = prevSmoothing;
          
          // 🔍 [QR FIX v2 2026-07-23] Textos e selo reposicionados/reescalados proporcionalmente
          // à nova barra (130 px). Tudo alinhado à direita do QR, mesmo layout do original.
          const textLeft = padding + qrSize + 20;
          
          // Título
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 22px Arial, sans-serif';
          ctx.fillText('Verificado by Vero iD', textLeft, img.height + 40);
          
          // Informações
          const dateTime = new Date(certificateData.createdAt);
          const dateStr = dateTime.toLocaleDateString('pt-BR');
          const timeStr = dateTime.toLocaleTimeString('pt-BR');
          const infoLine = `${dateStr} ${timeStr} | ${certificateData.verificationCode} | ${certificateData.creatorName}`;
          
          ctx.fillStyle = '#333333';
          ctx.font = '18px Arial, sans-serif';
          ctx.fillText(infoLine, textLeft, img.height + 72);
          
          // URL
          ctx.fillStyle = '#666666';
          ctx.font = '16px Arial, sans-serif';
          ctx.fillText('www.veroid.com.br', textLeft, img.height + 100);
          
          // Selo "VERIFICADO" no canto direito, verticalmente alinhado com a linha central da barra
          ctx.fillStyle = '#3399ff';
          ctx.font = 'bold 24px Arial, sans-serif';
          const verifiedText = 'VERIFICADO';
          const textWidth = ctx.measureText(verifiedText).width;
          ctx.fillText(verifiedText, canvas.width - textWidth - padding, img.height + 72);
          
          // Converter para blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Erro ao criar blob da imagem'));
            }
          }, 'image/png');
        };
        
        qrImg.onerror = () => {
          reject(new Error('Erro ao carregar QR code'));
        };
        
        qrImg.src = qrCodeDataUrl;
        
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