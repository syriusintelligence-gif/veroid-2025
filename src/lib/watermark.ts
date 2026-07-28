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

        // 🔍 [QR FIX v3 2026-07-23] Opção I + Opção J (SOMENTE watermark.ts, PDF intocado):
        // - Opção I: renderizar o QR DIRETAMENTE em um canvas offscreen via QRCode.toCanvas(),
        //   eliminando o intermediário PNG/Image que estava causando a proporção
        //   retangular (200 × 104 medido em 13_07.PNG). QRCode.toCanvas produz um canvas
        //   nativo com módulos pixel-perfect, sem passo de decodificação de dataURL.
        // - Opção J: usar Math.floor nas dimensões do canvas final e Math.round nas posições
        //   do QR, para blindar contra dimensões fracionárias que causariam renderização
        //   desalinhada/deformada.
        // - Preservados: watermarkHeight=130, qrSize=110, padding=15, layout, textos,
        //   selo, cores, imageSmoothingEnabled=false apenas em torno do QR, errorCorrection 'H'.
        
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
        // 🔍 [QR FIX v4 2026-07-27] Combo A1 + C1 aplicado para melhorar sobrevivência à recompressão
        // do Instagram/LinkedIn (feed comprime para ~1080 px + JPEG q~85, e o QR de 110 px caía
        // para ~50-80 px reais no output). Ajustes:
        //   • watermarkHeight 130 → 170 px (barra ~30% maior, ainda proporcional em fotos/carrossel)
        //   • qrSize 110 → 150 px (densidade estimada sobe de ~3.3 → ~4.5 px/módulo, cruza limite ISO)
        //   • margin do QR 2 → 4 módulos (quiet zone padrão ISO/IEC 18004 — mais tolerante a artefatos JPEG)
        // Layout preservado 1:1: QR à esquerda + textos ao lado + selo à direita, mesmo padding=15,
        // mesmas fontes e cores, mesmos textos e URL, mesma linha superior cinza, mesmo fundo branco.
        // PDF (`pdf-watermark.ts`) intocado — este fix aplica-se APENAS a imagens.
        const watermarkHeight = 170;
        const padding = 15;
        const qrSize = 150;
        
        // 🔍 [QR FIX v3 — Opção J] Dimensões inteiras garantidas (Math.floor) para evitar
        // canvas com largura/altura fracionárias que gerariam interpolação/deformação.
        const imgW = Math.floor(img.width);
        const imgH = Math.floor(img.height);
        canvas.width = imgW;
        canvas.height = imgH + watermarkHeight;
        
        // Desenhar imagem original no topo
        ctx.drawImage(img, 0, 0, imgW, imgH);
        
        // Fundo branco da barra
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, imgH, canvas.width, watermarkHeight);
        
        // Linha superior da barra
        ctx.strokeStyle = '#b0b0b0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, imgH);
        ctx.lineTo(canvas.width, imgH);
        ctx.stroke();
        
        // 🔍 [QR FIX v3 — Opção I] Renderizar o QR diretamente em um canvas offscreen.
        // QRCode.toCanvas desenha os módulos pixel-perfect, sem decodificar dataURL/Image,
        // e permite escolhermos o tamanho exato de saída em pixels via `width`.
        // 🔍 [QR FIX v5 2026-07-28 — Opção J3/J2] errorCorrectionLevel alterado de 'H' → 'Q'.
        // Motivo: análise em zoom máximo confirmou que os módulos são pixel-perfect (preto puro,
        // sem anti-aliasing), então o problema de leitura em monitores comuns 24" NÃO é qualidade
        // de renderização, e sim DENSIDADE FÍSICA de módulos. Nível 'H' (recuperação ~30%) forçava
        // versão de QR com ~37 módulos por lado; caindo para 'Q' (~25%) reduz o número de módulos
        // para ~29-33 por lado, tornando cada módulo ~15-20% maior no mesmo espaço físico de 150 px.
        // Nível 'Q' ainda é seguro para redes sociais/impressos (recuperação de ~25%). O payload
        // já é ultra-compacto (apenas i/v/n em base64url, ~150 chars), portanto NÃO é necessário
        // encurtar URL adicionalmente. Margin 4 (quiet zone ISO) e resto do fluxo preservados 1:1.
        const qrCanvas = document.createElement('canvas');
        await QRCode.toCanvas(qrCanvas, qrData, {
          width: qrSize,
          margin: 4, // [QR FIX v4 - C1] Quiet zone padrao ISO/IEC 18004 (2 -> 4 modulos)
          errorCorrectionLevel: 'Q', // [QR FIX v5 2026-07-28] H → Q: menos módulos, cada módulo maior → melhor leitura à distância
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        
        // Desenhar QR code no canto esquerdo, verticalmente centralizado na barra de 130 px.
        // Suavização desligada apenas em torno do QR (preserva bordas retas dos módulos).
        const prevSmoothing = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = false;
        const qrX = Math.round(padding);
        const qrY = Math.round(imgH + (watermarkHeight - qrSize) / 2);
        // Fonte quadrada explícita (qrCanvas.width x qrCanvas.height) → destino quadrado explícito.
        ctx.drawImage(
          qrCanvas,
          0, 0, qrCanvas.width, qrCanvas.height,
          qrX, qrY, qrSize, qrSize
        );
        ctx.imageSmoothingEnabled = prevSmoothing;
        
        // 🔍 [QR FIX v2 2026-07-23] Textos e selo reposicionados/reescalados proporcionalmente
        // à nova barra (130 px). Tudo alinhado à direita do QR, mesmo layout do original.
        const textLeft = padding + qrSize + 20;
        
        // Título
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillText('Verificado by Vero iD', textLeft, imgH + 40);
        
        // Informações
        const dateTime = new Date(certificateData.createdAt);
        const dateStr = dateTime.toLocaleDateString('pt-BR');
        const timeStr = dateTime.toLocaleTimeString('pt-BR');
        const infoLine = `${dateStr} ${timeStr} | ${certificateData.verificationCode} | ${certificateData.creatorName}`;
        
        ctx.fillStyle = '#333333';
        ctx.font = '18px Arial, sans-serif';
        ctx.fillText(infoLine, textLeft, imgH + 72);
        
        // URL
        ctx.fillStyle = '#666666';
        ctx.font = '16px Arial, sans-serif';
        ctx.fillText('www.veroid.com.br', textLeft, imgH + 100);
        
        // Selo "VERIFICADO" no canto direito, verticalmente alinhado com a linha central da barra
        ctx.fillStyle = '#3399ff';
        ctx.font = 'bold 24px Arial, sans-serif';
        const verifiedText = 'VERIFICADO';
        const textWidth = ctx.measureText(verifiedText).width;
        ctx.fillText(verifiedText, canvas.width - textWidth - padding, imgH + 72);
        
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