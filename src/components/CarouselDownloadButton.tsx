/**
 * 🎠 CAROUSEL DOWNLOAD BUTTON COMPONENT
 * 
 * Componente para download de todas as imagens de um carrossel em formato ZIP.
 * Não afeta o código existente, apenas adiciona nova funcionalidade.
 * 
 * @module CarouselDownloadButton
 * @version 1.1.0
 * @updated 2026-06-25 - Adicionada marca d'água em todas as imagens do ZIP
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Image as ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CarouselMetadata } from '@/lib/types/carousel';
import type { SignedContent } from '@/lib/supabase-crypto';
import { supabase } from '@/lib/supabase';
import { addWatermarkToImage } from '@/lib/watermark';
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
  
  /** 
   * Dados completos do certificado (usado para gerar marca d'água).
   * Opcional para retrocompatibilidade — se ausente, faz download sem watermark.
   */
  certificateData?: SignedContent;
  
  /** Variante do botão (padrão: "default") */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  
  /** Tamanho do botão (padrão: "default") */
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Componente CarouselDownloadButton
 * 
 * Baixa todas as imagens do carrossel e agrupa em um arquivo ZIP.
 * Quando `certificateData` é fornecido, aplica marca d'água em cada imagem
 * (mesma watermark do download de imagem única).
 */
export function CarouselDownloadButton({
  carouselMetadata,
  verificationCode,
  creatorName,
  certificateData,
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
        hasCertificateData: !!certificateData,
      });

      // Verificar se carousel_images existe
      if (!carouselMetadata.carousel_images || carouselMetadata.carousel_images.length === 0) {
        throw new Error('Nenhuma imagem encontrada no carrossel');
      }

      const zip = new JSZip();
      const bucket = carouselMetadata.storage_bucket || 'signed-documents';
      const totalImages = carouselMetadata.carousel_images.length;

      // Contador de marcas d'água aplicadas com sucesso (para log)
      let watermarkSuccessCount = 0;
      let watermarkFallbackCount = 0;

      // Baixar cada imagem
      for (let i = 0; i < totalImages; i++) {
        const image = carouselMetadata.carousel_images[i];
        const imageIndex = i + 1;

        setProgress(`Baixando imagem ${imageIndex} de ${totalImages}...`);
        console.log(`📥 [CarouselDownload] Baixando imagem ${imageIndex}:`, image.path);

        // Gerar URL assinada para download
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(image.path, 3600);

        if (urlError || !signedUrlData?.signedUrl) {
          console.error(`❌ [CarouselDownload] Erro ao gerar URL da imagem ${imageIndex}:`, urlError);
          throw new Error(`Erro ao gerar URL da imagem ${imageIndex}: ${urlError?.message || 'Desconhecido'}`);
        }

        // Baixar imagem original
        const response = await fetch(signedUrlData.signedUrl);
        if (!response.ok) {
          throw new Error(`Erro ao baixar imagem ${imageIndex}: ${response.statusText}`);
        }

        const originalBlob = await response.blob();

        // Nome do arquivo no ZIP (preserva ordem e extensão)
        const extension = image.name.split('.').pop() || 'jpg';
        const fileName = `imagem_${String(image.order).padStart(2, '0')}.${extension}`;

        // Aplicar marca d'água se certificateData estiver disponível
        let finalBlob: Blob = originalBlob;

        if (certificateData) {
          setProgress(`Aplicando marca d'água ${imageIndex} de ${totalImages}...`);
          try {
            const watermarkedBlob = await addWatermarkToImage(
              signedUrlData.signedUrl,
              certificateData
            );
            finalBlob = watermarkedBlob;
            watermarkSuccessCount++;
            console.log(`✅ [CarouselDownload] Marca d'água aplicada na imagem ${imageIndex}`);
          } catch (watermarkError) {
            // FALLBACK: se watermark falhar, usa imagem original (não trava o ZIP)
            console.warn(
              `⚠️ [CarouselDownload] Falha ao aplicar marca d'água na imagem ${imageIndex}, usando original:`,
              watermarkError
            );
            watermarkFallbackCount++;
            finalBlob = originalBlob;
          }
        }

        zip.file(fileName, finalBlob);
        console.log(`✅ [CarouselDownload] Imagem ${imageIndex} adicionada ao ZIP`);
      }

      // Log resumo do processamento de watermark
      if (certificateData) {
        console.log('📊 [CarouselDownload] Resumo de marcas d\'água:', {
          total: totalImages,
          comWatermark: watermarkSuccessCount,
          semWatermark: watermarkFallbackCount,
        });
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