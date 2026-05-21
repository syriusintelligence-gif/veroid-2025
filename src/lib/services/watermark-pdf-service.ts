/**
 * =====================================================
 * PDF WATERMARK SERVICE
 * =====================================================
 * 
 * Serviço para adicionar marca d'água em PDFs durante o download.
 * OPÇÃO 1: PDF → Imagens → Marca d'água → PDF
 * 
 * CARACTERÍSTICAS:
 * - Converte cada página do PDF em imagem (canvas)
 * - Aplica a mesma marca d'água usada em imagens (barra abaixo)
 * - Reconstrói o PDF com as páginas marcadas
 * - Funciona com PDFs de múltiplas páginas
 * - Usa Canvas API + pdf.js + jsPDF
 * - Processo totalmente no lado do cliente
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 * @date 2026-05-21
 */

import * as pdfjsLib from 'pdfjs-dist';
import { jsPDF } from 'jspdf';
import { addWatermarkToImage, type WatermarkInfo } from './watermark-service';

// Configura o worker do pdf.js
// Usa CDN para garantir compatibilidade em produção
if (typeof pdfjsLib.GlobalWorkerOptions !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

/**
 * Configurações do serviço de PDF
 */
const PDF_CONFIG = {
  // Resolução de renderização (DPI)
  scale: 2.0, // 2x para melhor qualidade
  
  // Qualidade da imagem no PDF final
  imageQuality: 0.92, // 92% de qualidade
  
  // Formato de imagem
  imageFormat: 'JPEG' as const,
};

/**
 * Converte uma página de PDF em canvas
 */
async function renderPDFPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  scale: number = PDF_CONFIG.scale
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  if (!context) {
    throw new Error('Não foi possível obter contexto 2D do canvas');
  }
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport,
  };
  
  await page.render(renderContext).promise;
  
  return canvas;
}

/**
 * Adiciona marca d'água em um PDF
 * 
 * @param pdfBlob - Blob do PDF original
 * @param watermarkInfo - Informações para marca d'água
 * @returns Promise<Blob> - Blob do PDF com marca d'água
 * 
 * @example
 * ```typescript
 * const watermarkedPDF = await addWatermarkToPDF(pdfBlob, {
 *   verificationCode: 'VER-ABC123',
 *   creatorName: 'João Silva',
 *   signatureDate: '2026-05-21T14:30:00Z',
 *   certificateUrl: 'https://veroid.com.br/certificate?code=VER-ABC123'
 * });
 * ```
 */
export async function addWatermarkToPDF(
  pdfBlob: Blob,
  watermarkInfo: WatermarkInfo
): Promise<Blob> {
  console.log('📄 [PDF Watermark] Iniciando processo de marca d\'água em PDF:', {
    verificationCode: watermarkInfo.verificationCode,
    pdfSizeKB: (pdfBlob.size / 1024).toFixed(2),
  });
  
  try {
    // 1. Carregar o PDF com pdf.js
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    const numPages = pdfDocument.numPages;
    console.log(`📊 [PDF Watermark] PDF carregado: ${numPages} páginas`);
    
    // 2. Processar cada página
    const watermarkedPages: { canvas: HTMLCanvasElement; width: number; height: number }[] = [];
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      console.log(`🔄 [PDF Watermark] Processando página ${pageNum}/${numPages}...`);
      
      // 2.1. Carregar página
      const page = await pdfDocument.getPage(pageNum);
      
      // 2.2. Renderizar página em canvas
      const pageCanvas = await renderPDFPageToCanvas(page, PDF_CONFIG.scale);
      
      // 2.3. Converter canvas para blob
      const pageBlob = await new Promise<Blob>((resolve, reject) => {
        pageCanvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error(`Falha ao converter página ${pageNum} para blob`));
              return;
            }
            resolve(blob);
          },
          'image/png',
          1.0
        );
      });
      
      // 2.4. Aplicar marca d'água na imagem
      const watermarkedBlob = await addWatermarkToImage(pageBlob, watermarkInfo);
      
      // 2.5. Converter blob com marca d'água de volta para canvas
      const watermarkedCanvas = await new Promise<HTMLCanvasElement>((resolve, reject) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Falha ao obter contexto 2D'));
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(img.src);
          resolve(canvas);
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject(new Error(`Falha ao carregar imagem da página ${pageNum}`));
        };
        
        img.src = URL.createObjectURL(watermarkedBlob);
      });
      
      // 2.6. Armazenar canvas com marca d'água
      watermarkedPages.push({
        canvas: watermarkedCanvas,
        width: watermarkedCanvas.width,
        height: watermarkedCanvas.height,
      });
      
      console.log(`✅ [PDF Watermark] Página ${pageNum} processada`);
    }
    
    console.log('📝 [PDF Watermark] Todas as páginas processadas, gerando PDF final...');
    
    // 3. Criar novo PDF com jsPDF
    // Usa a primeira página para determinar orientação e tamanho
    const firstPage = watermarkedPages[0];
    const isLandscape = firstPage.width > firstPage.height;
    
    // Calcula tamanho em mm (assumindo 96 DPI)
    const mmWidth = (firstPage.width / PDF_CONFIG.scale) * 0.264583; // px to mm
    const mmHeight = (firstPage.height / PDF_CONFIG.scale) * 0.264583;
    
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [mmWidth, mmHeight],
      compress: true,
    });
    
    // 4. Adicionar cada página ao PDF
    for (let i = 0; i < watermarkedPages.length; i++) {
      const { canvas, width, height } = watermarkedPages[i];
      
      // Se não for a primeira página, adiciona nova página
      if (i > 0) {
        const pageIsLandscape = width > height;
        const pageMmWidth = (width / PDF_CONFIG.scale) * 0.264583;
        const pageMmHeight = (height / PDF_CONFIG.scale) * 0.264583;
        
        pdf.addPage([pageMmWidth, pageMmHeight], pageIsLandscape ? 'landscape' : 'portrait');
      }
      
      // Adiciona imagem da página
      const imgData = canvas.toDataURL(`image/${PDF_CONFIG.imageFormat.toLowerCase()}`, PDF_CONFIG.imageQuality);
      const pageMmWidth = (width / PDF_CONFIG.scale) * 0.264583;
      const pageMmHeight = (height / PDF_CONFIG.scale) * 0.264583;
      
      pdf.addImage(imgData, PDF_CONFIG.imageFormat, 0, 0, pageMmWidth, pageMmHeight);
      
      console.log(`✅ [PDF Watermark] Página ${i + 1} adicionada ao PDF final`);
    }
    
    // 5. Gerar blob do PDF final
    const pdfOutput = pdf.output('blob');
    
    console.log('✅ [PDF Watermark] PDF com marca d\'água gerado com sucesso:', {
      originalSizeKB: (pdfBlob.size / 1024).toFixed(2),
      watermarkedSizeKB: (pdfOutput.size / 1024).toFixed(2),
      pages: numPages,
    });
    
    return pdfOutput;
    
  } catch (error) {
    console.error('❌ [PDF Watermark] Erro ao adicionar marca d\'água no PDF:', error);
    throw error;
  }
}

/**
 * Verifica se o arquivo é um PDF
 */
export function isPDFFile(mimeType?: string, fileName?: string): boolean {
  if (mimeType) {
    return mimeType === 'application/pdf' || mimeType.includes('pdf');
  }
  
  if (fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    return ext === 'pdf';
  }
  
  return false;
}

/**
 * Baixa PDF com marca d'água
 * 
 * @param blob - Blob do PDF original
 * @param fileName - Nome do arquivo
 * @param watermarkInfo - Informações para marca d'água
 * 
 * @example
 * ```typescript
 * await downloadPDFWithWatermark(blob, 'document.pdf', {
 *   verificationCode: 'VER-ABC123',
 *   creatorName: 'João Silva',
 *   signatureDate: '2026-05-21T14:30:00Z',
 *   certificateUrl: 'https://veroid.com.br/certificate?code=VER-ABC123'
 * });
 * ```
 */
export async function downloadPDFWithWatermark(
  blob: Blob,
  fileName: string,
  watermarkInfo: WatermarkInfo
): Promise<void> {
  console.log('📥 [PDF Watermark] Iniciando download de PDF com marca d\'água:', {
    fileName,
  });
  
  try {
    // Aplica marca d'água
    const watermarkedBlob = await addWatermarkToPDF(blob, watermarkInfo);
    
    // Download do arquivo
    const url = URL.createObjectURL(watermarkedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar URL após pequeno delay
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    console.log('✅ [PDF Watermark] Download de PDF com marca d\'água concluído');
    
  } catch (error) {
    console.error('❌ [PDF Watermark] Erro ao processar download de PDF:', error);
    throw error;
  }
}