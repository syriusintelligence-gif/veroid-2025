/**
 * 📄 PDF WATERMARK MODULE
 * 
 * Adiciona watermark em documentos PDF baixados com informações do certificado.
 * Utiliza pdf-lib para manipulação client-side de PDFs.
 * 
 * @module pdf-watermark
 * @version 1.0.0
 */

import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { SignedContent } from './supabase-crypto';

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
 * Adiciona watermark a um PDF
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
    
    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Obter todas as páginas
    const pages = pdfDoc.getPages();
    
    console.log(`📄 [PDF Watermark] Adicionando watermark em ${pages.length} página(s)...`);
    
    // Adicionar watermark em cada página
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Configurações do watermark
      const watermarkHeight = 80;
      const padding = 15;
      const fontSize = 10;
      const fontSizeSmall = 8;
      
      // Fundo semitransparente no rodapé
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: watermarkHeight,
        color: rgb(0, 0, 0),
        opacity: 0.85,
      });
      
      // Título do watermark
      page.drawText('🛡️ Verificado by Vero iD', {
        x: padding,
        y: watermarkHeight - 20,
        size: fontSize + 2,
        font: font,
        color: rgb(1, 1, 1),
      });
      
      // Data de assinatura
      const date = new Date(certificateData.createdAt).toLocaleString('pt-BR');
      page.drawText(`Data: ${date}`, {
        x: padding,
        y: watermarkHeight - 38,
        size: fontSizeSmall,
        font: fontRegular,
        color: rgb(0.9, 0.9, 0.9),
      });
      
      // Código de verificação
      page.drawText(`Código: ${certificateData.verificationCode}`, {
        x: padding,
        y: watermarkHeight - 52,
        size: fontSizeSmall,
        font: fontRegular,
        color: rgb(0.9, 0.9, 0.9),
      });
      
      // Criador
      page.drawText(`Criador: ${certificateData.creatorName}`, {
        x: padding,
        y: watermarkHeight - 66,
        size: fontSizeSmall,
        font: fontRegular,
        color: rgb(0.9, 0.9, 0.9),
      });
      
      // Watermark diagonal (opcional - marca d'água no centro)
      const centerX = width / 2;
      const centerY = height / 2;
      
      page.drawText('VERIFICADO', {
        x: centerX - 100,
        y: centerY,
        size: 48,
        font: font,
        color: rgb(0.2, 0.6, 0.9),
        opacity: 0.1,
        rotate: degrees(-45),
      });
    }
    
    // Salvar PDF modificado
    const pdfBytes = await pdfDoc.save();
    
    console.log('✅ [PDF Watermark] Watermark adicionado com sucesso');
    
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