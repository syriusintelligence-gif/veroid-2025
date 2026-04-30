/**
 * 📸 IMAGE CAROUSEL VIEWER COMPONENT
 * 
 * Componente para visualização de múltiplas imagens em formato carrossel.
 * Usado no certificado para exibir todas as imagens com navegação.
 * 
 * @module ImageCarouselViewer
 * @version 1.0.0
 * @date 2026-04-30
 */

import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CarouselImage } from '@/lib/types/carousel';

interface ImageCarouselViewerProps {
  /** Array de imagens do carrossel */
  images: CarouselImage[];
  
  /** Classe CSS adicional */
  className?: string;
  
  /** Mostrar contador de imagens */
  showCounter?: boolean;
  
  /** Permitir fullscreen ao clicar */
  allowFullscreen?: boolean;
}

export default function ImageCarouselViewer({
  images,
  className = '',
  showCounter = true,
  allowFullscreen = true,
}: ImageCarouselViewerProps) {
  // 🔧 CRITICAL FIX: Filtrar nulls/undefined do array de imagens
  const validImages = images.filter((img): img is CarouselImage => {
    if (!img) {
      console.warn('[ImageCarouselViewer] Filtered out null/undefined image');
      return false;
    }
    if (!img.name || !img.path) {
      console.warn('[ImageCarouselViewer] Filtered out image with missing name/path:', img);
      return false;
    }
    return true;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState<Set<number>>(new Set());

  /**
   * Navega para a próxima imagem
   */
  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  }, [validImages.length]);

  /**
   * Navega para a imagem anterior
   */
  const handlePrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  }, [validImages.length]);

  /**
   * Vai para uma imagem específica
   */
  const handleGoTo = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  /**
   * Manipula erro de carregamento de imagem
   */
  const handleImageError = useCallback((index: number) => {
    setImageError((prev) => new Set(prev).add(index));
  }, []);

  /**
   * Abre imagem em fullscreen
   */
  const handleOpenFullscreen = useCallback(() => {
    if (allowFullscreen) {
      setIsFullscreen(true);
    }
  }, [allowFullscreen]);

  /**
   * Fecha fullscreen
   */
  const handleCloseFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  // 🔧 CRITICAL FIX: Retorna null se não houver imagens válidas
  if (validImages.length === 0) {
    console.warn('[ImageCarouselViewer] No valid images to display');
    return null;
  }

  // 🔧 CRITICAL FIX: Valida currentIndex e currentImage antes de usar
  const safeCurrentIndex = Math.min(currentIndex, validImages.length - 1);
  const currentImage = validImages[safeCurrentIndex];
  
  // 🔧 CRITICAL FIX: Se currentImage ainda for null/undefined, retorna null
  if (!currentImage) {
    console.error('[ImageCarouselViewer] currentImage is null at index', safeCurrentIndex);
    return null;
  }

  const hasError = imageError.has(safeCurrentIndex);

  return (
    <>
      {/* Visualizador Normal */}
      <div className={`relative ${className}`}>
        {/* Imagem Principal */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden border-2 border-blue-300 shadow-lg aspect-[4/3]">
          {!hasError ? (
            <img
              src={currentImage.thumbnail || currentImage.path}
              alt={`Imagem ${safeCurrentIndex + 1} de ${validImages.length}`}
              className={`w-full h-full object-contain ${allowFullscreen ? 'cursor-zoom-in' : ''}`}
              onClick={handleOpenFullscreen}
              onError={() => handleImageError(safeCurrentIndex)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <ImageIcon className="h-16 w-16 mb-2" />
              <p className="text-sm">Erro ao carregar imagem</p>
            </div>
          )}

          {/* Contador de Imagens */}
          {showCounter && (
            <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {safeCurrentIndex + 1} / {validImages.length}
            </div>
          )}

          {/* Controles de Navegação */}
          {validImages.length > 1 && (
            <>
              {/* Botão Anterior */}
              <button
                onClick={handlePrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              {/* Botão Próxima */}
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all shadow-lg"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails para Navegação Rápida */}
        {validImages.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {validImages.map((image, index) => {
              // 🔧 CRITICAL FIX: Validar cada imagem antes de renderizar
              if (!image || !image.name || !image.path) {
                console.warn('[ImageCarouselViewer] Skipping invalid thumbnail at index', index);
                return null;
              }
              
              return (
                <button
                  key={index}
                  onClick={() => handleGoTo(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === safeCurrentIndex
                      ? 'border-blue-600 ring-2 ring-blue-300 scale-110'
                      : 'border-gray-300 hover:border-blue-400 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Ir para imagem ${index + 1}`}
                >
                  <img
                    src={image.thumbnail || image.path}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => handleImageError(index)}
                  />
                  {/* Número da imagem */}
                  <div className="absolute bottom-1 right-1 w-5 h-5 bg-black/70 text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Info da Imagem Atual */}
        <div className="mt-2 text-center">
          {/* 🔧 CRITICAL FIX: Validar currentImage.name antes de usar */}
          {currentImage?.name && (
            <p className="text-xs text-gray-600 truncate" title={currentImage.name}>
              📎 {currentImage.name}
            </p>
          )}
        </div>
      </div>

      {/* Modal Fullscreen */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          {/* Botão Fechar */}
          <button
            onClick={handleCloseFullscreen}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
            aria-label="Fechar fullscreen"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Contador */}
          <div className="absolute top-4 left-4 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-semibold">
            {safeCurrentIndex + 1} / {validImages.length}
          </div>

          {/* Imagem em Fullscreen */}
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <img
              src={currentImage.thumbnail || currentImage.path}
              alt={`Imagem ${safeCurrentIndex + 1} de ${validImages.length}`}
              className="max-w-full max-h-full object-contain"
              onError={() => handleImageError(safeCurrentIndex)}
            />

            {/* Controles de Navegação em Fullscreen */}
            {validImages.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>

                <button
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails em Fullscreen */}
          {validImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
              {validImages.map((image, index) => {
                // 🔧 CRITICAL FIX: Validar cada imagem antes de renderizar thumbnail
                if (!image || !image.path) {
                  return null;
                }
                
                return (
                  <button
                    key={index}
                    onClick={() => handleGoTo(index)}
                    className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                      index === safeCurrentIndex
                        ? 'border-white ring-2 ring-white/50'
                        : 'border-white/30 hover:border-white/60 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image.thumbnail || image.path}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}