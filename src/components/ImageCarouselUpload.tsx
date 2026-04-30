/**
 * 📸 IMAGE CAROUSEL UPLOAD COMPONENT
 * 
 * Componente para upload de múltiplas imagens em formato carrossel.
 * Suporta drag & drop, preview, reordenação e validação.
 * 
 * @module ImageCarouselUpload
 * @version 1.0.1
 * @date 2026-04-30
 * 
 * CHANGELOG:
 * - 1.0.1: Fixed null reference error in file.name rendering
 */

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, MoveHorizontal } from 'lucide-react';
import type { CarouselImage } from '@/lib/types/carousel';

interface ImageCarouselUploadProps {
  /** Callback chamado quando imagens são selecionadas */
  onImagesSelected: (files: File[]) => void;
  
  /** Callback chamado quando imagens são removidas */
  onImagesCleared: () => void;
  
  /** Número máximo de imagens */
  maxImages?: number;
  
  /** Tamanho máximo por imagem (MB) */
  maxSizeMB?: number;
  
  /** Se está fazendo upload */
  isUploading?: boolean;
  
  /** Progresso do upload (0-100) */
  uploadProgress?: number;
  
  /** Mensagem de erro */
  error?: string;
  
  /** Desabilitar input */
  disabled?: boolean;
}

export default function ImageCarouselUpload({
  onImagesSelected,
  onImagesCleared,
  maxImages = 15,
  maxSizeMB = 10,
  isUploading = false,
  uploadProgress = 0,
  error = '',
  disabled = false,
}: ImageCarouselUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Valida arquivos selecionados
   */
  const validateFiles = useCallback((files: FileList | File[]): { valid: boolean; error?: string } => {
    const filesArray = Array.from(files);
    
    // Validar número de imagens
    if (filesArray.length > maxImages) {
      return {
        valid: false,
        error: `Máximo de ${maxImages} imagens permitidas. Você selecionou ${filesArray.length}.`,
      };
    }

    // Validar tipo e tamanho
    const maxBytes = maxSizeMB * 1024 * 1024;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      
      if (!allowedTypes.includes(file.type.toLowerCase())) {
        return {
          valid: false,
          error: `Arquivo ${i + 1} (${file.name}) não é uma imagem válida. Tipos permitidos: JPEG, PNG, WebP, GIF`,
        };
      }

      if (file.size > maxBytes) {
        return {
          valid: false,
          error: `Imagem ${i + 1} (${file.name}) excede o tamanho máximo de ${maxSizeMB}MB`,
        };
      }
    }

    return { valid: true };
  }, [maxImages, maxSizeMB]);

  /**
   * Gera previews das imagens
   */
  const generatePreviews = useCallback(async (files: File[]) => {
    const previewPromises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    });

    const newPreviews = await Promise.all(previewPromises);
    setPreviews(newPreviews);
  }, []);

  /**
   * Manipula seleção de arquivos
   */
  const handleFileSelect = useCallback(async (files: FileList | File[]) => {
    setLocalError('');
    
    const validation = validateFiles(files);
    if (!validation.valid) {
      setLocalError(validation.error || 'Erro ao validar arquivos');
      return;
    }

    const filesArray = Array.from(files);
    
    // 🔧 FIX: Filter out null/undefined files before processing
    const validFiles = filesArray.filter(file => {
      const isValid = file && file.name && file.type && file.size !== undefined;
      if (!isValid) {
        console.warn('[ImageCarouselUpload] Filtered out invalid file:', file);
      }
      return isValid;
    });
    
    if (validFiles.length === 0) {
      setLocalError('Nenhum arquivo válido foi selecionado');
      return;
    }
    
    if (validFiles.length < filesArray.length) {
      setLocalError(`${filesArray.length - validFiles.length} arquivo(s) inválido(s) foram removidos`);
    }
    
    // Generate previews FIRST, then set state atomically
    const previewPromises = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    });

    const newPreviews = await Promise.all(previewPromises);
    
    // 🔧 FIX: Set both states atomically to prevent race conditions
    setSelectedFiles(validFiles);
    setPreviews(newPreviews);
    onImagesSelected(validFiles);
  }, [validateFiles, onImagesSelected]);

  /**
   * Manipula mudança de input
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

  /**
   * Manipula drag over
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  }, [disabled, isUploading]);

  /**
   * Manipula drag leave
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  /**
   * Manipula drop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled || isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files);
    }
  }, [disabled, isUploading, handleFileSelect]);

  /**
   * Remove uma imagem específica
   */
  const handleRemoveImage = useCallback((index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    setSelectedFiles(newFiles);
    setPreviews(newPreviews);

    if (newFiles.length === 0) {
      onImagesCleared();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      onImagesSelected(newFiles);
    }
  }, [selectedFiles, previews, onImagesSelected, onImagesCleared]);

  /**
   * Limpa todas as imagens
   */
  const handleClearAll = useCallback(() => {
    setSelectedFiles([]);
    setPreviews([]);
    setLocalError('');
    onImagesCleared();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onImagesCleared]);

  const displayError = error || localError;

  return (
    <div className="space-y-4">
      {/* Área de Upload */}
      {selectedFiles.length === 0 ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : disabled || isUploading
              ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            onChange={handleInputChange}
            disabled={disabled || isUploading}
          />
          
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Upload className="h-8 w-8 text-blue-600" />
            </div>
            
            <div>
              <p className="text-base font-semibold text-gray-900 mb-1">
                Clique para selecionar ou arraste múltiplas imagens
              </p>
              <p className="text-sm text-gray-600">
                Até {maxImages} imagens • Máximo {maxSizeMB}MB cada
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: JPEG, PNG, WebP, GIF
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
              <ImageIcon className="h-4 w-4" />
              <span>Ideal para carrossel do Instagram (10-15 imagens)</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header com contador e botão limpar */}
          <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'imagem selecionada' : 'imagens selecionadas'}
                </p>
                <p className="text-xs text-blue-700">
                  Todas as imagens serão incluídas no certificado
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              disabled={disabled || isUploading}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar Todas
            </Button>
          </div>

          {/* Grid de Previews */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {selectedFiles.map((file, index) => {
              // 🔧 CRITICAL FIX: Use selectedFiles instead of previews for iteration
              // This ensures we only iterate over files that exist
              const preview = previews[index];
              
              // 🔧 FIX: Comprehensive validation before rendering
              if (!file || !preview) {
                console.warn(`[ImageCarouselUpload] Skipping render for index ${index}: file or preview is null`);
                return null;
              }
              
              // 🔧 FIX: Validate file properties
              if (!file.name || !file.type || file.size === undefined) {
                console.warn(`[ImageCarouselUpload] Skipping render for index ${index}: file properties are invalid`, {
                  hasName: !!file.name,
                  hasType: !!file.type,
                  hasSize: file.size !== undefined
                });
                return null;
              }
              
              // Use safe key generation
              const fileKey = `${file.name}-${file.size}-${index}`;
              
              return (
                <div key={fileKey} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-100">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Número da ordem */}
                  <div className="absolute top-2 left-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                    {index + 1}
                  </div>

                  {/* Botão remover */}
                  <button
                    onClick={() => handleRemoveImage(index)}
                    disabled={disabled || isUploading}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remover imagem"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  {/* Nome do arquivo - 🔧 FIX: Added null check */}
                  {file?.name && (
                    <p className="text-xs text-gray-600 mt-1 truncate" title={file.name}>
                      {file.name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Info sobre reordenação */}
          <div className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
            <MoveHorizontal className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              As imagens aparecerão no certificado na ordem mostrada acima. 
              Para alterar a ordem, remova e selecione novamente na sequência desejada.
            </p>
          </div>
        </div>
      )}

      {/* Erro */}
      {displayError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Erro:</strong> {displayError}
          </AlertDescription>
        </Alert>
      )}

      {/* Progresso do Upload */}
      {isUploading && (
        <Alert className="border-blue-500 bg-blue-50">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
              <AlertDescription className="text-blue-800">
                <strong>Fazendo upload das imagens...</strong> {uploadProgress}%
              </AlertDescription>
            </div>
            <Progress value={uploadProgress} className="h-2 w-full" />
            <p className="text-xs text-blue-600 mt-1">
              {uploadProgress < 100 
                ? 'Aguarde enquanto as imagens são enviadas para o servidor...' 
                : 'Finalizando upload...'}
            </p>
          </div>
        </Alert>
      )}
    </div>
  );
}