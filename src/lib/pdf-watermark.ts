/**
 * 📄 PDF WATERMARK MODULE
 * 
 * Adiciona watermark em documentos PDF baixados com informações do certificado.
 * Utiliza pdf-lib para manipulação client-side de PDFs.
 * 
 * @module pdf-watermark
 * @version 3.2.0
 * @updated 2026-06-18 - Adicionado QR code na barra e página final
 */

import { PDFDocument, rgb, StandardFonts, degrees, PageSizes } from 'pdf-lib';
import { SignedContent } from './supabase-crypto';
import QRCode from 'qrcode';
import { generateQRData } from './qrcode';
import { getKeyShortSuffix, getKeyVisualSeedSHA256, getKeyVisualSeed } from './keyVisual';

/**
 * Verifica se uma URL aponta para um PDF
 */
export function isPdfUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return urlLower.includes('.pdf') || urlLower.includes('application/pdf');
}

/**
 * Verifica se um MIME type é de PDF
 */
export function isPdfMimeType(mimeType?: string): boolean {
  if (!mimeType) return false;
  return mimeType === 'application/pdf' || mimeType.includes('pdf');
}

/**
 * Adiciona watermark a um PDF:
 * 1. Barra inferior compacta em TODAS as páginas originais (com QR code)
 * 2. Marca diagonal "VERIFICADO" discreta no centro
 * 3. Página extra de certificação completa ao final (com QR code)
 */
export async function addWatermarkToPdf(
  pdfUrl: string,
  certificateData: SignedContent
): Promise<Blob> {
  try {
    console.log('📄 [PDF Watermark] Carregando PDF...');
    
    // Baixar o PDF
    const response = await fetch(pdfUrl);
    const existingPdfBytes = await response.arrayBuffer();
    
    // Carregar o PDF
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    
    // Embed fonts
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Gerar QR code como imagem PNG
    console.log('📄 [PDF Watermark] Gerando QR code...');
    const qrData = generateQRData(certificateData);
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    
    // Converter data URL para bytes
    const qrCodeBytes = Uint8Array.from(
      atob(qrCodeDataUrl.split(',')[1]),
      c => c.charCodeAt(0)
    );
    
    // Embed QR code image
    const qrCodeImage = await pdfDoc.embedPng(qrCodeBytes);
    
    // 🆕 Computar hash visual (SHA-256) e últimos 20 caracteres da chave pública
    // Mesma lógica usada na página WEB do certificado (Certificate.tsx)
    let keyVisualHash = '';
    let keyShortSuffix = '';
    if (certificateData.publicKey) {
      try {
        keyVisualHash = await getKeyVisualSeedSHA256(certificateData.publicKey);
      } catch {
        keyVisualHash = getKeyVisualSeed(certificateData.publicKey);
      }
      keyShortSuffix = getKeyShortSuffix(certificateData.publicKey, 20);
    }
    
    // Obter todas as páginas originais
    const originalPages = pdfDoc.getPages();
    const originalCount = originalPages.length;
    
    console.log(`📄 [PDF Watermark] Adicionando watermark em ${originalCount} página(s) originais (Opção P: embedPage + redesenhar)...`);
    
    // PARTE 1: Adicionar watermark compacta em todas as páginas originais
    // Estratégia OPÇÃO P: embedPage + redesenhar em página nova
    // - Cada página original é embutida como XObject (PDFEmbeddedPage), preservando
    //   fidelidade vetorial total (texto, fontes, imagens, bordas decorativas).
    // - Páginas originais são removidas e substituídas por páginas novas do MESMO tamanho.
    // - Na página nova, o XObject é desenhado em escala uniforme com posicionamento
    //   determinístico: começa em Y = reservedSpace (70 px) e ocupa o topo.
    // - A barra fixa de 28 px é desenhada no rodapé (Y = 0 a 28), com 42 px de respiro
    //   entre a barra e o conteúdo original. ZERO sobreposição garantida.
    
    // Capturar tamanhos das páginas originais ANTES de embutir/remover
    const originalSizes = originalPages.map(p => p.getSize());
    
    // Embutir TODAS as páginas originais em batch (mais eficiente)
    const embeddedPages = await pdfDoc.embedPages(originalPages);
    
    // Remover páginas originais em ordem reversa (para não invalidar índices)
    for (let i = originalCount - 1; i >= 0; i--) {
      pdfDoc.removePage(i);
    }
    
    // Configurações FIXAS da barra (idênticas ao design aprovado)
    const watermarkHeight = 28; // Barra compacta (FIXA — design aprovado)
    const respiro = 42;         // Respiro entre conteúdo comprimido e barra
    const reservedSpace = watermarkHeight + respiro; // 70 px reservados no rodapé
    const padding = 10;
    const fontSize = 8;
    const fontSizeSmall = 7;
    const qrSize = 26;
    
    // Pré-computar dateTime/infoLine (não mudam entre páginas)
    const dateTime = new Date(certificateData.createdAt);
    const dateStr = dateTime.toLocaleDateString('pt-BR');
    const timeStr = dateTime.toLocaleTimeString('pt-BR');
    const infoLine = `${dateStr} ${timeStr} | ${certificateData.verificationCode} | ${certificateData.creatorName}`;
    
    // Para cada página original, criar uma nova página A4 (mesmo tamanho) e redesenhar
    for (let i = 0; i < originalCount; i++) {
      const { width, height } = originalSizes[i];
      const embeddedPage = embeddedPages[i];
      
      // Inserir nova página na posição i com o MESMO tamanho da original
      const newPage = pdfDoc.insertPage(i, [width, height]);
      
      // Escala uniforme calculada para que o conteúdo original caiba acima da
      // área reservada (70 px no rodapé). Em A4 (842 px): scale = 772/842 ≈ 0.9169 (~91.7%).
      // Compressão proporcional (X e Y iguais) — sem distorção.
      const scale = (height - reservedSpace) / height;
      
      // Desenhar a página original embutida ocupando o TOPO da nova página.
      // Posição Y = reservedSpace (70 px) faz com que a base do conteúdo
      // escalado fique EXATAMENTE em Y = 70, deixando os 70 px do rodapé livres.
      newPage.drawPage(embeddedPage, {
        x: 0,
        y: reservedSpace,
        xScale: scale,
        yScale: scale,
      });
      
      // ============================================================
      // BARRA DE WATERMARK NO RODAPÉ (Y = 0 a Y = 28) — FIXA 28 px
      // ============================================================
      
      // Fundo branco SÓLIDO no rodapé (cobre qualquer coisa que possa vazar)
      newPage.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: watermarkHeight,
        color: rgb(1, 1, 1),
        opacity: 1.0,
      });
      
      // Borda superior da barra
      newPage.drawLine({
        start: { x: 0, y: watermarkHeight },
        end: { x: width, y: watermarkHeight },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });
      
      // QR code pequeno no canto esquerdo (centralizado verticalmente)
      newPage.drawImage(qrCodeImage, {
        x: padding,
        y: (watermarkHeight - qrSize) / 2,
        width: qrSize,
        height: qrSize,
      });
      
      // Título (ajustado para dar espaço ao QR code)
      newPage.drawText('Verificado by Vero iD', {
        x: padding + qrSize + 8,
        y: watermarkHeight - 11,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Informações com data e hora
      newPage.drawText(infoLine, {
        x: padding + qrSize + 8,
        y: watermarkHeight - 22,
        size: fontSizeSmall,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      // Selo "VERIFICADO" no canto direito (centralizado verticalmente)
      newPage.drawText('VERIFICADO', {
        x: width - 100,
        y: (watermarkHeight - (fontSize + 2)) / 2 + 1,
        size: fontSize + 2,
        font: font,
        color: rgb(0.2, 0.6, 0.9),
      });
      
      // ============================================================
      // MARCA DIAGONAL "VERIFICADO" no centro (sobre o conteúdo)
      // ============================================================
      // Desenhada APÓS o drawPage para ficar visível sobre o conteúdo embutido.
      const centerX = width / 2;
      const centerY = height / 2;
      
      newPage.drawText('VERIFICADO', {
        x: centerX - 100,
        y: centerY,
        size: 60,
        font: font,
        color: rgb(0.2, 0.6, 0.9),
        opacity: 0.05,
        rotate: degrees(-45),
      });
    }
    
    console.log('📄 [PDF Watermark] Adicionando página de certificação completa ao final...');
    
    // PARTE 2: Adicionar página extra de certificação ao final
    const certPage = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = certPage.getSize();
    
    const padding = 40;
    const lineHeight = 20;
    let currentY = height - padding - 40;
    
    // Fundo branco
    certPage.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      color: rgb(1, 1, 1),
    });
    
    // Título principal
    certPage.drawText('CERTIFICADO DE AUTENTICIDADE', {
      x: padding,
      y: currentY,
      size: 18,
      font: font,
      color: rgb(0.1, 0.3, 0.7),
    });
    
    currentY -= lineHeight * 1.4;
    
    // Subtítulo
    certPage.drawText('Verificado by Vero iD', {
      x: padding,
      y: currentY,
      size: 14,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    currentY -= lineHeight * 1.3;
    
    // Descrição
    certPage.drawText('Este documento foi assinado digitalmente e verificado pelo sistema Vero iD.', {
      x: padding,
      y: currentY,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    currentY -= lineHeight * 1.5;
    
    // Separador
    certPage.drawLine({
      start: { x: padding, y: currentY },
      end: { x: width - padding, y: currentY },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    
    currentY -= lineHeight * 1.5;
    
    // Informações do certificado
    const infoItems = [
      { label: 'Data de Assinatura:', value: new Date(certificateData.createdAt).toLocaleString('pt-BR') },
      { label: 'Código de Verificação:', value: certificateData.verificationCode },
      { label: 'Criador do Conteúdo:', value: certificateData.creatorName },
      { label: 'ID do Certificado:', value: certificateData.id },
    ];
    
    for (const item of infoItems) {
      // Label
      certPage.drawText(item.label, {
        x: padding,
        y: currentY,
        size: 10,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      currentY -= lineHeight * 0.7;
      
      // Value
      certPage.drawText(item.value, {
        x: padding + 10,
        y: currentY,
        size: 9,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      currentY -= lineHeight * 1.0;
    }
    
    // IDENTIDADE VISUAL DA CHAVE (mesma exibicao da pagina WEB do certificado)
    if (keyVisualHash || keyShortSuffix) {
      currentY -= lineHeight * 0.2;
      certPage.drawLine({
        start: { x: padding, y: currentY },
        end: { x: width - padding, y: currentY },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
      
      currentY -= lineHeight * 1.0;
      
      certPage.drawText('Identidade Visual da Chave Publica:', {
        x: padding,
        y: currentY,
        size: 10,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      currentY -= lineHeight * 1.0;
      
      const identiconSize = 50;
      const identiconX = padding + 10;
      const identiconY = currentY - identiconSize;
      
      if (keyVisualHash) {
        certPage.drawRectangle({
          x: identiconX,
          y: identiconY,
          width: identiconSize,
          height: identiconSize,
          color: rgb(0.95, 0.96, 0.97),
        });
        
        const safeHash = keyVisualHash.toLowerCase();
        const hexPair = (idx: number): number => {
          const p = safeHash.substring(idx, idx + 2);
          const n = parseInt(p, 16);
          return Number.isFinite(n) ? n : 0;
        };
        const hue = Math.floor((hexPair(0) / 255) * 360);
        const saturation = (55 + Math.floor((hexPair(2) / 255) * 30)) / 100;
        const lightness = (40 + Math.floor((hexPair(4) / 255) * 20)) / 100;
        
        const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
          const c = (1 - Math.abs(2 * l - 1)) * s;
          const hh = h / 60;
          const x = c * (1 - Math.abs((hh % 2) - 1));
          let r1 = 0, g1 = 0, b1 = 0;
          if (hh >= 0 && hh < 1) { r1 = c; g1 = x; b1 = 0; }
          else if (hh < 2) { r1 = x; g1 = c; b1 = 0; }
          else if (hh < 3) { r1 = 0; g1 = c; b1 = x; }
          else if (hh < 4) { r1 = 0; g1 = x; b1 = c; }
          else if (hh < 5) { r1 = x; g1 = 0; b1 = c; }
          else { r1 = c; g1 = 0; b1 = x; }
          const m = l - c / 2;
          return [r1 + m, g1 + m, b1 + m];
        };
        const [pr, pg, pb] = hslToRgb(hue, saturation, lightness);
        
        const cells = 5;
        const cellSize = identiconSize / cells;
        const uniqueCols = 3;
        for (let r = 0; r < cells; r++) {
          const row: boolean[] = [false, false, false, false, false];
          for (let c = 0; c < uniqueCols; c++) {
            const idx = r * uniqueCols + c;
            const charHex = safeHash.charAt(idx % safeHash.length);
            const value = parseInt(charHex, 16);
            const filled = Number.isFinite(value) && value % 2 === 0;
            row[c] = filled;
            if (c === 0) row[4] = filled;
            if (c === 1) row[3] = filled;
          }
          for (let c = 0; c < cells; c++) {
            if (row[c]) {
              certPage.drawRectangle({
                x: identiconX + c * cellSize,
                y: identiconY + (cells - 1 - r) * cellSize,
                width: cellSize,
                height: cellSize,
                color: rgb(pr, pg, pb),
              });
            }
          }
        }
      }
      
      const textX = identiconX + identiconSize + 15;
      let textY = identiconY + identiconSize - 12;
      
      if (keyVisualHash) {
        certPage.drawText('ID Visual da Chave:', {
          x: textX,
          y: textY,
          size: 8,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        textY -= lineHeight * 0.7;
        
        certPage.drawText(keyVisualHash, {
          x: textX,
          y: textY,
          size: 11,
          font: font,
          color: rgb(0.25, 0.32, 0.71),
        });
        textY -= lineHeight * 1.1;
      }
      
      if (keyShortSuffix) {
        certPage.drawText('Ultimos 20 caracteres da chave publica:', {
          x: textX,
          y: textY,
          size: 8,
          font: font,
          color: rgb(0.3, 0.3, 0.3),
        });
        textY -= lineHeight * 0.7;
        
        certPage.drawText('...' + keyShortSuffix, {
          x: textX,
          y: textY,
          size: 11,
          font: font,
          color: rgb(0.55, 0.22, 0.65),
        });
      }
      
      currentY = identiconY - lineHeight * 0.6;
    }
    
    // Links sociais do criador (se disponíveis) — layout em 2 colunas
    if (certificateData.creatorSocialLinks && Object.keys(certificateData.creatorSocialLinks).length > 0) {
      currentY -= lineHeight * 0.3;
      
      // Separador
      certPage.drawLine({
        start: { x: padding, y: currentY },
        end: { x: width - padding, y: currentY },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
      
      currentY -= lineHeight * 1.0;
      
      certPage.drawText('Perfis Oficiais do Criador:', {
        x: padding,
        y: currentY,
        size: 10,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      currentY -= lineHeight * 0.9;
      
      const socialLinks = certificateData.creatorSocialLinks;
      const linkTexts: string[] = [];
      
      if (socialLinks.instagram) linkTexts.push(`Instagram: ${socialLinks.instagram}`);
      if (socialLinks.facebook) linkTexts.push(`Facebook: ${socialLinks.facebook}`);
      if (socialLinks.linkedin) linkTexts.push(`LinkedIn: ${socialLinks.linkedin}`);
      if (socialLinks.twitter) linkTexts.push(`X/Twitter: ${socialLinks.twitter}`);
      if (socialLinks.youtube) linkTexts.push(`YouTube: ${socialLinks.youtube}`);
      if (socialLinks.tiktok) linkTexts.push(`TikTok: ${socialLinks.tiktok}`);
      if (socialLinks.website) linkTexts.push(`Website: ${socialLinks.website}`);
      
      // Renderiza em 2 colunas: pares de links lado a lado
      const col1X = padding + 10;
      const col2X = padding + (width - padding * 2) / 2 + 5;
      for (let i = 0; i < linkTexts.length; i += 2) {
        certPage.drawText(linkTexts[i], {
          x: col1X,
          y: currentY,
          size: 8,
          font: fontRegular,
          color: rgb(0.2, 0.4, 0.7),
        });
        if (i + 1 < linkTexts.length) {
          certPage.drawText(linkTexts[i + 1], {
            x: col2X,
            y: currentY,
            size: 8,
            font: fontRegular,
            color: rgb(0.2, 0.4, 0.7),
          });
        }
        currentY -= lineHeight * 0.85;
      }
    }
    
    // Watermark diagonal no centro
    const centerX = width / 2;
    const centerY = height / 2;
    
    certPage.drawText('VERIFICADO', {
      x: centerX - 100,
      y: centerY,
      size: 60,
      font: font,
      color: rgb(0.2, 0.6, 0.9),
      opacity: 0.08,
      rotate: degrees(-45),
    });
    
    // QR Code na página de certificação (reduzido 70%)
    const qrSizeLarge = 45; // 150 * 0.3 = 45
    const qrX = padding; // Alinhado à esquerda com o título
    
    currentY -= lineHeight * 0.8;
    
    // Título do QR Code
    certPage.drawText('QR Code de Verificação', {
      x: padding,
      y: currentY,
      size: 12,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    currentY -= lineHeight * 1.0;
    
    // QR Code centralizado
    certPage.drawImage(qrCodeImage, {
      x: qrX,
      y: currentY - qrSizeLarge,
      width: qrSizeLarge,
      height: qrSizeLarge,
    });
    
    currentY -= qrSizeLarge + lineHeight * 0.5;
    
    // Instrução abaixo do QR Code
    const instructionText = 'Escaneie este QR Code para verificar a autenticidade do certificado';
    certPage.drawText(instructionText, {
      x: padding,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // Rodapé
    const footerY = padding - 10;
    certPage.drawText('www.veroid.com.br', {
      x: padding,
      y: footerY,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    certPage.drawText(`Certificado gerado em ${new Date().toLocaleString('pt-BR')}`, {
      x: width - 200,
      y: footerY,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    // Salvar PDF modificado
    const pdfBytes = await pdfDoc.save();
    
    console.log('✅ [PDF Watermark] Watermark aplicada com sucesso');
    
    // Retornar como Blob
    return new Blob([pdfBytes], { type: 'application/pdf' });
    
  } catch (error) {
    console.error('❌ [PDF Watermark] Erro ao adicionar watermark:', error);
    throw error;
  }
}

/**
 * Baixa um PDF com watermark
 */
export async function downloadPdfWithWatermark(
  pdfUrl: string,
  certificateData: SignedContent,
  fileName: string
): Promise<void> {
  try {
    console.log('📄 [PDF Watermark] Adicionando watermark ao PDF...');
    
    // Adicionar watermark
    const blob = await addWatermarkToPdf(pdfUrl, certificateData);
    
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
    
    console.log('✅ [PDF Watermark] Download com watermark concluído');
  } catch (error) {
    console.error('❌ [PDF Watermark] Erro ao adicionar watermark:', error);
    throw error;
  }
}