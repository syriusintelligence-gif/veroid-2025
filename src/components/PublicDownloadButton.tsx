/**
 * 📥 PUBLIC DOWNLOAD BUTTON COMPONENT
 * 
 * Componente para download PÚBLICO de documentos assinados (sem autenticação).
 * Usado por verificadores de certificados quando o criador permite download.
 * 
 * @module PublicDownloadButton
 * @version 1.0.0
 * @date 2026-04-27
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, Image, Video, File } from 'lucide-react';
import { getPublicSignedDownloadUrl } from '@/lib/services/storage-service-public';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Props do componente PublicDownloadButton
 */
interface PublicDownloadButtonProps {
  /** Path completo do arquivo no Storage */
  filePath: string;
  
  /** Nome do arquivo para download */
  fileName: string;
  
  /** MIME type do arquivo */
  mimeType?: string;
  
  /** Tamanho do arquivo em bytes */
  fileSize?: number;
  
  /** Nome do bucket (padrão: "signed-documents") */
  bucket?: string;
  
  /** Variante do botão (padrão: "default") */
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  
  /** Tamanho do botão (padrão: "default") */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  
  /** Mostrar informações do arquivo (padrão: true) */
  showFileInfo?: boolean;
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
 * Componente PublicDownloadButton
 * 
 * Permite download público (sem autenticação) de documentos quando permitido pelo criador.
 * 
 * @example
 * ```tsx
 * <PublicDownloadButton
 *   filePath="user-123/signed_1737360000_document.pdf"
 *   fileName="document.pdf"
 *   mimeType="application/pdf"
 *   fileSize={1234567}
 * />
 * ```
 */
export function PublicDownloadButton({
  filePath,
  fileName,
  mimeType,
  fileSize,
  bucket = 'signed-documents',
  variant = 'default',
  size = 'default',
  showFileInfo = true,
}: PublicDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Manipula o download do arquivo (público)
   */
  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      console.log('📥 [PublicDownloadButton] Iniciando download público:', {
        filePath,
        fileName,
        bucket,
      });

      // 1. Obter URL assinada pública (válida por 1 hora)
      const result = await getPublicSignedDownloadUrl(filePath, 3600, bucket);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao gerar URL de download');
      }

      if (!result.signedUrl) {
        throw new Error('URL de download não foi gerada');
      }

      console.log('✅ [PublicDownloadButton] URL assinada pública gerada:', {
        expiresAt: result.expiresAt?.toISOString(),
        executionTime: result.executionTime,
      });

      // 2. Download via browser
      const link = document.createElement('a');
      link.href = result.signedUrl;
      link.download = fileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ [PublicDownloadButton] Download público iniciado com sucesso');

    } catch (error) {
      console.error('❌ [PublicDownloadButton] Erro no download:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao baixar arquivo';
      setError(errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  const FileIcon = getFileIcon(mimeType);

  return (
    <div className="space-y-2">
      {/* Botão de Download */}
      <Button
        onClick={handleDownload}
        disabled={isDownloading}
        variant={variant}
        size={size}
        className="w-full"
      >
        {isDownloading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Baixando...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Baixar Arquivo Original
          </>
        )}
      </Button>

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
            <strong>Erro ao baixar:</strong> {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}