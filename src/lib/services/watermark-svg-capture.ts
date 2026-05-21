/**
 * =====================================================
 * WATERMARK SVG CAPTURE SERVICE
 * =====================================================
 * 
 * Serviço para capturar o QR Code SVG renderizado na página do certificado
 * e usá-lo diretamente na marca d'água, garantindo identidade visual perfeita.
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 * @date 2026-05-21
 */

/**
 * Captura o QR Code SVG da página e converte para Data URL PNG
 * 
 * @param selector - Seletor CSS para encontrar o SVG (padrão: '.qr-code-container svg')
 * @param size - Tamanho desejado do QR Code em pixels (padrão: 240 para 3x de 80px)
 * @returns Promise<string> - Data URL do PNG ou string vazia em caso de erro
 */
export async function captureQRCodeFromPage(
  selector: string = '.qr-code-container svg',
  size: number = 240
): Promise<string> {
  try {
    console.log('📸 [SVGCapture] Iniciando captura do QR Code da página...');
    
    // 1. Encontra o elemento SVG na página
    const svgElement = document.querySelector(selector) as SVGElement;
    
    if (!svgElement) {
      console.warn('⚠️ [SVGCapture] SVG não encontrado com seletor:', selector);
      return '';
    }
    
    console.log('✅ [SVGCapture] SVG encontrado, processando...');
    
    // 2. Clona o SVG para não afetar o original
    const clonedSvg = svgElement.cloneNode(true) as SVGElement;
    
    // 3. Garante que o SVG tenha dimensões definidas
    clonedSvg.setAttribute('width', size.toString());
    clonedSvg.setAttribute('height', size.toString());
    
    // 4. Serializa o SVG para string
    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    
    console.log('📊 [SVGCapture] SVG serializado:', {
      length: svgString.length,
      targetSize: size
    });
    
    // 5. Cria um Blob do SVG
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    // 6. Converte SVG para PNG usando Canvas
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          // Cria canvas com o tamanho desejado
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Não foi possível obter contexto 2D do canvas');
          }
          
          // Desabilita anti-aliasing para QR Code mais nítido
          ctx.imageSmoothingEnabled = false;
          
          // Desenha o SVG no canvas
          ctx.drawImage(img, 0, 0, size, size);
          
          // Restaura anti-aliasing
          ctx.imageSmoothingEnabled = true;
          
          // Converte canvas para Data URL
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          
          // Limpa a URL temporária
          URL.revokeObjectURL(svgUrl);
          
          console.log('✅ [SVGCapture] QR Code capturado com sucesso:', {
            size,
            dataUrlLength: dataUrl.length
          });
          
          resolve(dataUrl);
        } catch (error) {
          URL.revokeObjectURL(svgUrl);
          console.error('❌ [SVGCapture] Erro ao converter SVG para PNG:', error);
          reject(error);
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        console.error('❌ [SVGCapture] Erro ao carregar SVG como imagem');
        reject(new Error('Falha ao carregar SVG'));
      };
      
      img.src = svgUrl;
    });
    
  } catch (error) {
    console.error('❌ [SVGCapture] Erro na captura do QR Code:', error);
    return '';
  }
}

/**
 * Verifica se há um QR Code disponível na página
 * 
 * @param selector - Seletor CSS para encontrar o SVG
 * @returns boolean - true se o QR Code existe, false caso contrário
 */
export function hasQRCodeOnPage(selector: string = '.qr-code-container svg'): boolean {
  const svgElement = document.querySelector(selector);
  return !!svgElement;
}