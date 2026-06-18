/**
 * 📥 DOWNLOAD BUTTON COMPONENT
 * 
 * Componente para download de documentos assinados do Supabase Storage.
 * Gera URLs assinadas temporárias (válidas por 1 hora) para download seguro.
 * 
 * @module DownloadButton
 * @version 2.0.0
 * @phase FASE 4 - Implementar Download com opções
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, Image, Video, File, ExternalLink } from 'lucide-react';
import { getSignedDownloadUrl } from '@/lib/services/storage-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SignedContent } from '@/lib/supabase-crypto';
import { downloadImageWithWatermark, isImageMimeType } from '@/lib/watermark';

/**
 * Props do componente DownloadButton
 */
interface DownloadButtonProps {
  /** Path completo do arquivo no Storage (ex: "user_id/signed_timestamp_file.pdf") */
  filePath: string;
  
  /** Nome do arquivo para download (ex: "documento.pdf") */
  fileName: string;
  
  /** MIME type do arquivo (ex: "application/pdf") */
  mimeType?: string;
  
  /** Tamanho do arquivo em bytes (ex: 1234567) */
  fileSize?: number;
  
  /** Nome do bucket (padrão: "signed-documents") */
  bucket?: string;
  
  /** Variante do botão (padrão: "outline") */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  
  /** Tamanho do botão (padrão: "sm") */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /** Mostrar informações do arquivo (padrão: true) */
  showFileInfo?: boolean;
  
  /** Dados do certificado (opcional, para watermark em imagens) */
  certificateData?: SignedContent;
  
  /** Adicionar watermark em imagens (padrão: true) */
  addWatermark?: boolean;
}

/**
 * Formata tamanho de arquivo em formato legível
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Retorna ícone apropriado baseado no MIME type
 */
function getFileIcon(mimeType?: string) {
  if (!mimeType) return File;
  
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.includes('pdf')) return FileText;
  
  return File;
}

/**
 * Componente DownloadButton
 * 
 * Permite download seguro de documentos assinados do Supabase Storage.
 * Oferece opções de "Abrir" (nova aba) ou "Baixar" (salvar como).
 */
export function DownloadButton({
  filePath,
  fileName,
  mimeType,
  fileSize,
  bucket = 'signed-documents',
  variant = 'outline',
  size = 'sm',
  showFileInfo = true,
  certificateData,
  addWatermark = true,
}: DownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Abre o arquivo em nova aba
   */
  const handleOpen = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔓 [DownloadButton] Abrindo arquivo em nova aba:', {
        filePath,
        fileName,
        bucket,
      });

      const result = await getSignedDownloadUrl(filePath, 3600, bucket);

      if (!result.success || !result.signedUrl) {
        throw new Error(result.error || 'Erro ao gerar URL');
      }

      // Abrir em nova aba
      window.open(result.signedUrl, '_blank', 'noopener,noreferrer');
      console.log('✅ [DownloadButton] Arquivo aberto em nova aba');

    } catch (error) {
      console.error('❌ [DownloadButton] Erro ao abrir:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao abrir arquivo';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Faz download do arquivo (salvar como)
   */
  const handleDownload = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('📥 [DownloadButton] Iniciando download:', {
        filePath,
        fileName,
        bucket,
        mimeType,
        hasWatermark: addWatermark && isImageMimeType(mimeType) && !!certificateData,
      });

      const result = await getSignedDownloadUrl(filePath, 3600, bucket);

      if (!result.success || !result.signedUrl) {
        throw new Error(result.error || 'Erro ao gerar URL de download');
      }

      console.log('✅ [DownloadButton] URL assinada gerada');

      // Se for imagem e tiver certificateData, adiciona watermark
      if (addWatermark && isImageMimeType(mimeType) && certificateData) {
        console.log('🖼️ [DownloadButton] Adicionando watermark à imagem...');
        await downloadImageWithWatermark(result.signedUrl, certificateData, fileName);
        console.log('✅ [DownloadButton] Download com watermark concluído');
      } else {
        // Download direto
        const link = document.createElement('a');
        link.href = result.signedUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log('✅ [DownloadButton] Download direto iniciado');
      }

    } catch (error) {
      console.error('❌ [DownloadButton] Erro no download:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao baixar arquivo';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const FileIcon = getFileIcon(mimeType);

  return (
    <div className="space-y-3">
      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={handleOpen}
          disabled={isLoading}
          variant="outline"
          size={size}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir
            </>
          )}
        </Button>
        
        <Button
          onClick={handleDownload}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          size={size}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Baixando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Baixar Documento
            </>
          )}
        </Button>
      </div>

      {/* Informações do Arquivo */}
      {showFileInfo && (mimeType || fileSize) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileIcon className="h-4 w-4" />
          <span className="truncate max-w-[200px]">{fileName}</span>
          {fileSize && (
            <>
              <span>•</span>
              <span>{formatFileSize(fileSize)}</span>
            </>
          )}
        </div>
      )}

      {/* Mensagem de Erro */}
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>
            <strong>Erro:</strong> {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

/**
 * Versão compacta do botão (apenas ícone)
 */
export function DownloadButtonCompact({
  filePath,
  fileName,
  bucket = 'signed-documents',
}: Pick<DownloadButtonProps, 'filePath' | 'fileName' | 'bucket'>) {
  return (
    <DownloadButton
      filePath={filePath}
      fileName={fileName}
      bucket={bucket}
      variant="ghost"
      size="icon"
      showFileInfo={false}
    />
  );
}