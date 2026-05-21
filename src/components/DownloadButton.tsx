/**
 * 📥 DOWNLOAD BUTTON COMPONENT
 * 
 * Componente para download de documentos assinados do Supabase Storage.
 * Gera URLs assinadas temporárias (válidas por 1 hora) para download seguro.
 * 🆕 ATUALIZADO: Adiciona marca d'água com código do certificado em imagens.
 * 
 * @module DownloadButton
 * @version 1.1.0
 * @phase FASE 4 - Implementar Download
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, Image, Video, File } from 'lucide-react';
import { getSignedDownloadUrl } from '@/lib/services/storage-service';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { downloadWithWatermark, isImageFile, type WatermarkInfo } from '@/lib/services/watermark-service';

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
  
  /** 🆕 Informações para marca d'água (apenas para imagens) */
  watermarkInfo?: WatermarkInfo;
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
  watermarkInfo,
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 🆕 Manipula o download do arquivo COM MARCA D'ÁGUA (se for imagem)
   */
  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      console.log('📥 [DownloadButton] Iniciando download:', {
        filePath,
        fileName,
        bucket,
        hasWatermarkInfo: !!watermarkInfo,
        isImage: isImageFile(mimeType, fileName),
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

      // 2. Detectar tipo de arquivo e aplicar marca d'água se suportado
      const isPDF = mimeType?.includes('pdf') || fileName.toLowerCase().endsWith('.pdf');
      const isImage = isImageFile(mimeType, fileName);
      const supportsWatermark = (isPDF || isImage) && watermarkInfo;
      
      console.log('🔍 [DownloadButton] Análise de arquivo:', {
        isPDF,
        isImage,
        supportsWatermark,
        mimeType,
        fileName
      });
      
      if (supportsWatermark) {
        console.log('🎨 [DownloadButton] Aplicando marca d\'água...');
        
        // Download do arquivo
        const response = await fetch(result.signedUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        // Download com marca d'água (suporta imagens e PDFs)
        await downloadWithWatermark(blob, fileName, watermarkInfo, mimeType);
        
        console.log('✅ [DownloadButton] Download com marca d\'água concluído');
        
      } else {
        // 3. Download direto (sem marca d'água)
        console.log('📥 [DownloadButton] Download direto (arquivo não suporta marca d\'água ou sem watermarkInfo)');
        
        const link = document.createElement('a');
        link.href = result.signedUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ [DownloadButton] Download iniciado com sucesso');
      }

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
    <div className="space-y-3">
      {/* 🆕 Card de Arquivo Estilo Certificado Baixado */}
      {showFileInfo && (
        <div className="bg-white p-4 rounded-lg border-2 border-green-500 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">📎</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">
                {fileName}
              </div>
              {fileSize && (
                <div className="text-xs text-gray-600 mt-1">
                  {formatFileSize(fileSize)}
                </div>
              )}
            </div>
          </div>
          
          {/* Botão de Download Estilizado */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white py-3 px-6 rounded-lg font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Baixando...</span>
              </>
            ) : (
              <>
                <span className="text-xl">⬇️</span>
                <span>Baixar Arquivo Original</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Versão Compacta (sem showFileInfo) */}
      {!showFileInfo && (
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