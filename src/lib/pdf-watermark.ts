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
    
    // Obter todas as páginas originais
    const pages = pdfDoc.getPages();
    
    console.log(`📄 [PDF Watermark] Adicionando watermark em ${pages.length} página(s) originais...`);
    
    // PARTE 1: Adicionar watermark compacta em todas as páginas originais
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Configurações otimizadas
      const watermarkHeight = 35; // Barra compacta
      const marginTop = 20; // Distância da última linha do documento
      const totalSpace = watermarkHeight + marginTop;
      const padding = 10;
      const fontSize = 8;
      const fontSizeSmall = 7;
      const qrSize = 28; // QR code pequeno na barra
      
      // Mover conteúdo para cima (com margem)
      page.translateContent(0, totalSpace);
      
      // Aumentar altura da página
      page.setSize(width, height + totalSpace);
      
      // Fundo branco no rodapé
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: watermarkHeight,
        color: rgb(1, 1, 1),
        opacity: 0.95,
      });
      
      // Borda superior da barra
      page.drawLine({
        start: { x: 0, y: watermarkHeight },
        end: { x: width, y: watermarkHeight },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7),
      });
      
      // QR code pequeno no canto esquerdo
      page.drawImage(qrCodeImage, {
        x: padding,
        y: 3.5,
        width: qrSize,
        height: qrSize,
      });
      
      // Título (ajustado para dar espaço ao QR code)
      page.drawText('Verificado by Vero iD', {
        x: padding + qrSize + 8,
        y: watermarkHeight - 12,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      // Informações com data e hora
      const dateTime = new Date(certificateData.createdAt);
      const dateStr = dateTime.toLocaleDateString('pt-BR');
      const timeStr = dateTime.toLocaleTimeString('pt-BR');
      const infoLine = `${dateStr} ${timeStr} | ${certificateData.verificationCode} | ${certificateData.creatorName}`;
      
      page.drawText(infoLine, {
        x: padding + qrSize + 8,
        y: watermarkHeight - 25,
        size: fontSizeSmall,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      // Selo "VERIFICADO" no canto direito
      page.drawText('VERIFICADO', {
        x: width - 100,
        y: watermarkHeight - 20,
        size: fontSize + 2,
        font: font,
        color: rgb(0.2, 0.6, 0.9),
      });
      
      // Marca d'água diagonal discreta no centro
      const centerX = width / 2;
      const centerY = (height + totalSpace) / 2;
      
      page.drawText('VERIFICADO', {
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
    
    currentY -= lineHeight * 2;
    
    // Subtítulo
    certPage.drawText('Verificado by Vero iD', {
      x: padding,
      y: currentY,
      size: 14,
      font: font,
      color: rgb(0, 0, 0),
    });
    
    currentY -= lineHeight * 2;
    
    // Descrição
    certPage.drawText('Este documento foi assinado digitalmente e verificado pelo sistema Vero iD.', {
      x: padding,
      y: currentY,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    currentY -= lineHeight * 2.5;
    
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
      
      currentY -= lineHeight * 0.8;
      
      // Value
      certPage.drawText(item.value, {
        x: padding + 10,
        y: currentY,
        size: 9,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      
      currentY -= lineHeight * 1.5;
    }
    
    // Links sociais do criador (se disponíveis)
    if (certificateData.creatorSocialLinks && Object.keys(certificateData.creatorSocialLinks).length > 0) {
      currentY -= lineHeight * 0.5;
      
      // Separador
      certPage.drawLine({
        start: { x: padding, y: currentY },
        end: { x: width - padding, y: currentY },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });
      
      currentY -= lineHeight * 1.5;
      
      certPage.drawText('Perfis Oficiais do Criador:', {
        x: padding,
        y: currentY,
        size: 10,
        font: font,
        color: rgb(0.2, 0.2, 0.2),
      });
      
      currentY -= lineHeight * 1.2;
      
      const socialLinks = certificateData.creatorSocialLinks;
      const linkTexts: string[] = [];
      
      if (socialLinks.instagram) linkTexts.push(`Instagram: ${socialLinks.instagram}`);
      if (socialLinks.facebook) linkTexts.push(`Facebook: ${socialLinks.facebook}`);
      if (socialLinks.linkedin) linkTexts.push(`LinkedIn: ${socialLinks.linkedin}`);
      if (socialLinks.twitter) linkTexts.push(`X/Twitter: ${socialLinks.twitter}`);
      if (socialLinks.youtube) linkTexts.push(`YouTube: ${socialLinks.youtube}`);
      if (socialLinks.tiktok) linkTexts.push(`TikTok: ${socialLinks.tiktok}`);
      if (socialLinks.website) linkTexts.push(`Website: ${socialLinks.website}`);
      
      for (const linkText of linkTexts) {
        certPage.drawText(linkText, {
          x: padding + 10,
          y: currentY,
          size: 8,
          font: fontRegular,
          color: rgb(0.2, 0.4, 0.7),
        });
        currentY -= lineHeight * 0.9;
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
    
    currentY -= lineHeight * 2;
    
    // Título do QR Code
    certPage.drawText('QR Code de Verificação', {
      x: padding,
      y: currentY,
      size: 12,
      font: font,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    currentY -= lineHeight * 1.5;
    
    // QR Code centralizado
    certPage.drawImage(qrCodeImage, {
      x: qrX,
      y: currentY - qrSizeLarge,
      width: qrSizeLarge,
      height: qrSizeLarge,
    });
    
    currentY -= qrSizeLarge + lineHeight;
    
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