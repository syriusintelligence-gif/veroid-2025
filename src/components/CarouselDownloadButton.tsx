/**
 * 📦 CAROUSEL DOWNLOAD BUTTON COMPONENT
 * 
 * Componente para download de todas as imagens do carrossel em um arquivo ZIP.
 * 
 * @module CarouselDownloadButton
 * @version 1.0.0
 * @date 2026-04-30
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Package } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateCarouselZip, downloadZip } from '@/lib/utils/zip-generator';
import type { CarouselImage } from '@/lib/types/carousel';

interface CarouselDownloadButtonProps {
  /** Array de imagens do carrossel */
  images: CarouselImage[];
  
  /** Bucket onde as imagens estão armazenadas */
  bucket?: string;
  
  /** Nome do arquivo ZIP (sem extensão) */
  zipFileName?: string;
  
  /** Variante do botão */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  
  /** Tamanho do botão */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /** Mostrar informações do arquivo */
  showInfo?: boolean;
}

export default function CarouselDownloadButton({
  images,
  bucket = 'signed-documents',
  zipFileName = 'carousel-images',
  variant = 'default',
  size = 'default',
  showInfo = true,
}: CarouselDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Manipula o download do ZIP
   */
  const handleDownload = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      console.log('📦 [CarouselDownloadButton] Iniciando geração de ZIP...');

      // Gerar ZIP
      const result = await generateCarouselZip(images, bucket, zipFileName);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao gerar arquivo ZIP');
      }

      if (!result.blob) {
        throw new Error('Arquivo ZIP não foi gerado');
      }

      console.log('✅ [CarouselDownloadButton] ZIP gerado com sucesso');

      // Fazer download
      downloadZip(result.blob, zipFileName);

      console.log('✅ [CarouselDownloadButton] Download iniciado');

    } catch (error) {
      console.error('❌ [CarouselDownloadButton] Erro no download:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao baixar imagens';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showInfo && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border-2 border-green-300 shadow-md">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-900 mb-1">
                📦 Download Completo do Carrossel
              </h3>
              <p className="text-sm text-green-800 leading-relaxed">
                Baixe todas as <strong>{images.length}</strong> {images.length === 1 ? 'imagem' : 'imagens'} 
                {' '}do carrossel em um único arquivo ZIP compactado.
              </p>
            </div>
          </div>

          <Button
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Gerando ZIP...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Baixar Todas as Imagens ({images.length})
              </>
            )}
          </Button>

          <p className="text-xs text-green-700 mt-3 text-center">
            ✅ As imagens serão baixadas em ordem, com numeração sequencial
          </p>
        </div>
      )}

      {!showInfo && (
        <Button
          onClick={handleDownload}
          disabled={isGenerating}
          variant={variant}
          size={size}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando ZIP...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Baixar Todas ({images.length})
            </>
          )}
        </Button>
      )}

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>
            <strong>Erro ao baixar:</strong> {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}