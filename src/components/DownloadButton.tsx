/**
 * 📥 DOWNLOAD BUTTON COMPONENT
 * 
 * Componente para download de documentos assinados do Supabase Storage.
 * Gera URLs assinadas temporárias (válidas por 1 hora) para download seguro.
 * 
 * @module DownloadButton
 * @version 1.0.0
 * @phase FASE 4 - Implementar Download
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, Image, Video, File } from 'lucide-react';
import { getSignedDownloadUrl } from '@/lib/services/storage-service';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
 * Gera URLs assinadas temporárias que expiram em 1 hora.
 * 
 * @example
 * ```tsx
 * <DownloadButton
 *   filePath="user-123/signed_1737360000_document.pdf"
 *   fileName="document.pdf"
 *   mimeType="application/pdf"
 *   fileSize={1234567}
 * />
 * ```
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
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Manipula o download do arquivo
   */
  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      console.log('📥 [DownloadButton] Iniciando download:', {
        filePath,
        fileName,
        bucket,
      });

      // 1. Obter URL assinada (válida por 1 hora)
      const result = await getSignedDownloadUrl(filePath, 3600, bucket);

      if (!result.success) {
        throw new Error(result.error || 'Erro ao gerar URL de download');
      }

      if (!result.signedUrl) {
        throw new Error('URL de download não foi gerada');
      }

      console.log('✅ [DownloadButton] URL assinada gerada:', {
        expiresAt: result.expiresAt?.toISOString(),
        executionTime: result.executionTime,
      });

      // 2. Download via browser
      const link = document.createElement('a');
      link.href = result.signedUrl;
      link.download = fileName;
      link.target = '_blank'; // Abre em nova aba se o navegador bloquear download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ [DownloadButton] Download iniciado com sucesso');

    } catch (error) {
      console.error('❌ [DownloadButton] Erro no download:', error);
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
        className="w-full sm:w-auto"
      >
        {isDownloading ? (
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