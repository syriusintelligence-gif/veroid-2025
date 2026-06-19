/**
 * 🎠 CAROUSEL DOWNLOAD BUTTON COMPONENT
 * 
 * Componente para download de todas as imagens de um carrossel em formato ZIP.
 * Não afeta o código existente, apenas adiciona nova funcionalidade.
 * 
 * @module CarouselDownloadButton
 * @version 1.0.0
 * @created 2026-06-18
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CarouselMetadata } from '@/lib/types/carousel';
import { supabase } from '@/lib/supabase';
import JSZip from 'jszip';

/**
 * Props do componente CarouselDownloadButton
 */
interface CarouselDownloadButtonProps {
  /** Metadados do carrossel */
  carouselMetadata: CarouselMetadata;
  
  /** Código de verificação do certificado (para nome do arquivo) */
  verificationCode: string;
  
  /** Nome do criador (para nome do arquivo) */
  creatorName?: string;
  
  /** Variante do botão (padrão: "default") */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  
  /** Tamanho do botão (padrão: "default") */
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Componente CarouselDownloadButton
 * 
 * Baixa todas as imagens do carrossel e agrupa em um arquivo ZIP.
 */
export function CarouselDownloadButton({
  carouselMetadata,
  verificationCode,
  creatorName,
  variant = 'default',
  size = 'default',
}: CarouselDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  /**
   * Faz download de todas as imagens em formato ZIP
   */
  const handleDownloadZip = async () => {
    setIsLoading(true);
    setError(null);
    setProgress('');

    try {
      console.log('📦 [CarouselDownload] Iniciando download do carrossel:', {
        totalImages: carouselMetadata.total_images,
        verificationCode,
      });

      // Verificar se carousel_images existe
      if (!carouselMetadata.carousel_images || carouselMetadata.carousel_images.length === 0) {
        throw new Error('Nenhuma imagem encontrada no carrossel');
      }

      const zip = new JSZip();
      const bucket = carouselMetadata.storage_bucket || 'signed-documents';

      // Baixar cada imagem
      for (let i = 0; i < carouselMetadata.carousel_images.length; i++) {
        const image = carouselMetadata.carousel_images[i];
        setProgress(`Baixando imagem ${i + 1} de ${carouselMetadata.carousel_images.length}...`);

        console.log(`📥 [CarouselDownload] Baixando imagem ${i + 1}:`, image.path);

        // Gerar URL assinada para download
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(image.path, 3600);

        if (urlError || !signedUrlData?.signedUrl) {
          console.error(`❌ [CarouselDownload] Erro ao gerar URL da imagem ${i + 1}:`, urlError);
          throw new Error(`Erro ao gerar URL da imagem ${i + 1}: ${urlError?.message || 'Desconhecido'}`);
        }

        // Baixar imagem
        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          throw new Error(`Erro ao baixar imagem ${i + 1}: ${response.statusText}`);
        }

        const blob = await response.blob();

        // Adicionar ao ZIP com nome ordenado
        const extension = image.name.split('.').pop() || 'jpg';
        const fileName = `imagem_${String(image.order).padStart(2, '0')}.${extension}`;
        zip.file(fileName, blob);

        console.log(`✅ [CarouselDownload] Imagem ${i + 1} adicionada ao ZIP`);
      }

      setProgress('Gerando arquivo ZIP...');
      console.log('📦 [CarouselDownload] Gerando arquivo ZIP...');

      // Gerar o arquivo ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      // Nome do arquivo ZIP
      const sanitizedCreatorName = creatorName
        ? creatorName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
        : 'criador';
      const zipFileName = `VeroID_${verificationCode}_${sanitizedCreatorName}_Carrossel.zip`;

      // Download do ZIP
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = zipFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      console.log('✅ [CarouselDownload] Download do ZIP concluído:', zipFileName);
      setProgress('Download concluído!');

      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setProgress('');
      }, 3000);

    } catch (error) {
      console.error('❌ [CarouselDownload] Erro no download:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao baixar carrossel';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Botão de Download */}
      <Button
        onClick={handleDownloadZip}
        disabled={isLoading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        size={size}
        variant={variant}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {progress || 'Processando...'}
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Baixar Todas as Imagens (ZIP)
          </>
        )}
      </Button>

      {/* Informações do Carrossel */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ImageIcon className="h-4 w-4" />
        <span>
          {carouselMetadata.total_images} {carouselMetadata.total_images === 1 ? 'imagem' : 'imagens'} no carrossel
        </span>
      </div>

      {/* Mensagem de Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <strong>Erro:</strong> {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}