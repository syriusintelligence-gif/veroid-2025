/**
 * 🔒 PROTECTED IMAGE COMPONENT
 * 
 * Componente de imagem com proteções contra cópia:
 * - Desabilita clique direito
 * - Desabilita drag and drop
 * - Adiciona overlay de proteção
 * - Previne seleção
 * 
 * @module ProtectedImage
 * @version 1.0.0
 * @date 2026-05-21
 */

import { useEffect, useRef } from 'react';
import { disableRightClickOnImage, addProtectionOverlay } from '@/lib/services/image-protection-service';

interface ProtectedImageProps {
  /** URL da imagem */
  src: string;
  
  /** Texto alternativo */
  alt: string;
  
  /** Classes CSS adicionais */
  className?: string;
  
  /** Estilo inline */
  style?: React.CSSProperties;
  
  /** Mostrar mensagem ao tentar copiar (padrão: true) */
  showCopyWarning?: boolean;
}

/**
 * Componente de imagem protegida contra cópia
 * 
 * @example
 * ```tsx
 * <ProtectedImage
 *   src="/path/to/image.jpg"
 *   alt="Imagem protegida"
 *   className="w-full h-auto"
 * />
 * ```
 */
export function ProtectedImage({
  src,
  alt,
  className = '',
  style = {},
  showCopyWarning = true,
}: ProtectedImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!imageRef.current || !containerRef.current) return;

    // Aplica proteções na imagem
    disableRightClickOnImage(imageRef.current);
    
    // Adiciona overlay de proteção
    addProtectionOverlay(containerRef.current);
    
    // Handler para mostrar aviso ao tentar copiar
    if (showCopyWarning) {
      const handleCopyAttempt = () => {
        console.log('🚫 [ProtectedImage] Tentativa de cópia detectada');
        // Você pode adicionar um toast/notificação aqui se desejar
      };
      
      containerRef.current.addEventListener('copy', handleCopyAttempt);
      containerRef.current.addEventListener('cut', handleCopyAttempt);
      
      return () => {
        containerRef.current?.removeEventListener('copy', handleCopyAttempt);
        containerRef.current?.removeEventListener('cut', handleCopyAttempt);
      };
    }
  }, [showCopyWarning]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        position: 'relative', 
        display: 'inline-block',
        ...style 
      }}
      className={className}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        style={{
          maxWidth: '100%',
          height: 'auto',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'none',
        }}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  );
}

/**
 * Hook para aplicar proteções em qualquer elemento de imagem
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { imageRef, containerRef } = useProtectedImage();
 *   
 *   return (
 *     <div ref={containerRef}>
 *       <img ref={imageRef} src="/image.jpg" alt="Protected" />
 *     </div>
 *   );
 * }
 * ```
 */
export function useProtectedImage() {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (imageRef.current && containerRef.current) {
      disableRightClickOnImage(imageRef.current);
      addProtectionOverlay(containerRef.current);
    }
  }, []);

  return { imageRef, containerRef };
}