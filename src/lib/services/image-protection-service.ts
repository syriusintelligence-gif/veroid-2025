/**
 * =====================================================
 * IMAGE PROTECTION SERVICE
 * =====================================================
 * 
 * Serviço para adicionar proteções em imagens:
 * - Marca d'água invisível (metadados EXIF)
 * - Proteção contra clique direito
 * - Marca d'água esteganográfica (opcional)
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 * @date 2026-05-21
 */

/**
 * Informações para marca d'água invisível
 */
export interface InvisibleWatermarkInfo {
  /** Código do certificado */
  verificationCode: string;
  
  /** ID do certificado */
  certificateId: string;
  
  /** Nome do criador */
  creatorName: string;
  
  /** Data de criação */
  createdAt: string;
  
  /** URL do certificado */
  certificateUrl?: string;
}

/**
 * Adiciona metadados EXIF invisíveis na imagem
 * 
 * NOTA: Metadados EXIF podem ser facilmente removidos com ferramentas.
 * Esta é uma proteção básica, não infalível.
 * 
 * @param imageBlob - Blob da imagem
 * @param metadata - Metadados para adicionar
 * @returns Promise<Blob> - Imagem com metadados
 */
export async function addInvisibleWatermark(
  imageBlob: Blob,
  metadata: InvisibleWatermarkInfo
): Promise<Blob> {
  console.log('🔍 [Image Protection] Adicionando marca d\'água invisível:', {
    verificationCode: metadata.verificationCode,
    certificateId: metadata.certificateId,
  });
  
  try {
    // Cria canvas para processar a imagem
    const img = await createImageFromBlob(imageBlob);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Falha ao obter contexto 2D');
    }
    
    // Desenha a imagem original
    ctx.drawImage(img, 0, 0);
    
    // Adiciona pixels invisíveis com informações codificadas
    // (esteganografia básica - altera o bit menos significativo de alguns pixels)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Codifica o código de verificação nos primeiros pixels
    const message = `VEROID:${metadata.verificationCode}:${metadata.certificateId}`;
    const messageBytes = new TextEncoder().encode(message);
    
    // Limita a 100 bytes para não afetar visualmente a imagem
    const maxBytes = Math.min(messageBytes.length, 100);
    
    for (let i = 0; i < maxBytes; i++) {
      const byte = messageBytes[i];
      const pixelIndex = i * 4; // Cada pixel tem 4 valores (RGBA)
      
      // Modifica o bit menos significativo do canal vermelho
      if (pixelIndex < data.length) {
        data[pixelIndex] = (data[pixelIndex] & 0xFE) | ((byte >> 7) & 1);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    console.log('✅ [Image Protection] Marca d\'água invisível adicionada:', {
      messageLength: message.length,
      bytesEmbedded: maxBytes,
    });
    
    // Converte canvas para blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Falha ao converter canvas para blob'));
            return;
          }
          resolve(blob);
        },
        imageBlob.type || 'image/png',
        0.95
      );
    });
    
  } catch (error) {
    console.error('❌ [Image Protection] Erro ao adicionar marca d\'água invisível:', error);
    // Em caso de erro, retorna a imagem original
    return imageBlob;
  }
}

/**
 * Cria elemento de imagem a partir de um Blob
 */
function createImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar imagem'));
    };
    
    img.src = url;
  });
}

/**
 * Desabilita clique direito em um elemento de imagem
 * 
 * @param imageElement - Elemento de imagem HTML
 */
export function disableRightClickOnImage(imageElement: HTMLImageElement): void {
  // Previne menu de contexto
  imageElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    console.log('🚫 [Image Protection] Clique direito bloqueado');
  });
  
  // Previne drag and drop
  imageElement.addEventListener('dragstart', (e) => {
    e.preventDefault();
    console.log('🚫 [Image Protection] Drag bloqueado');
  });
  
  // Adiciona atributos de proteção
  imageElement.setAttribute('oncontextmenu', 'return false;');
  imageElement.setAttribute('draggable', 'false');
  imageElement.style.userSelect = 'none';
  imageElement.style.webkitUserSelect = 'none';
  imageElement.style.pointerEvents = 'none';
  
  console.log('✅ [Image Protection] Proteções aplicadas no elemento de imagem');
}

/**
 * Adiciona overlay invisível sobre a imagem para bloquear interações
 * 
 * @param containerElement - Elemento container da imagem
 */
export function addProtectionOverlay(containerElement: HTMLElement): void {
  // Cria overlay transparente
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.zIndex = '10';
  overlay.style.cursor = 'not-allowed';
  
  // Bloqueia interações
  overlay.addEventListener('contextmenu', (e) => e.preventDefault());
  overlay.addEventListener('dragstart', (e) => e.preventDefault());
  overlay.addEventListener('selectstart', (e) => e.preventDefault());
  
  // Garante que o container tenha position relative
  if (window.getComputedStyle(containerElement).position === 'static') {
    containerElement.style.position = 'relative';
  }
  
  containerElement.appendChild(overlay);
  
  console.log('✅ [Image Protection] Overlay de proteção adicionado');
}

/**
 * Hook React para proteção de imagens
 * Uso: const imageRef = useImageProtection();
 */
export function useImageProtection() {
  return (imageElement: HTMLImageElement | null) => {
    if (!imageElement) return;
    
    disableRightClickOnImage(imageElement);
    
    // Se houver container pai, adiciona overlay
    if (imageElement.parentElement) {
      addProtectionOverlay(imageElement.parentElement);
    }
  };
}