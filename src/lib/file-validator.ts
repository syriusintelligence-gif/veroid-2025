/**
 * =====================================================
 * FILE VALIDATOR - LISTA BRANCA DE EXTENSÕES
 * =====================================================
 * 
 * Módulo de validação de arquivos com lista branca (whitelist) de extensões permitidas.
 * Implementa validação rigorosa de tipo MIME e extensão de arquivo.
 * 
 * SEGURANÇA:
 * - Validação dupla: extensão + MIME type
 * - Limite de tamanho configurável
 * - Prevenção contra MIME type spoofing
 * - Mensagens de erro específicas para debugging
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 * @date 2024-01-14
 */

// =====================================================
// TIPOS E INTERFACES
// =====================================================

/**
 * Resultado da validação de arquivo
 */
export interface FileValidationResult {
  valid: boolean;
  message: string;
  details?: {
    fileName?: string;
    fileSize?: number;
    fileType?: string;
    extension?: string;
    category?: FileCategory;
  };
}

/**
 * Categorias de arquivo suportadas
 */
export type FileCategory = 'image' | 'video' | 'audio' | 'document' | 'text';

/**
 * Configuração de validação
 */
export interface FileValidationConfig {
  maxSizeBytes?: number;
  allowedCategories?: FileCategory[];
  strictMode?: boolean; // Se true, valida MIME type além da extensão
}

// =====================================================
// CONSTANTES - LISTA BRANCA DE EXTENSÕES
// =====================================================

/**
 * LISTA BRANCA: Extensões permitidas por categoria
 * 
 * IMPORTANTE: Apenas extensões listadas aqui são aceitas.
 * Qualquer outra extensão será REJEITADA.
 */
const ALLOWED_EXTENSIONS: Record<FileCategory, string[]> = {
  // Imagens: formatos comuns para web e design
  image: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.svg',
    '.bmp',
    '.ico'
  ],
  
  // Vídeos: formatos comuns para streaming e edição
  video: [
    '.mp4',
    '.mov',
    '.avi',
    '.webm',
    '.mkv',
    '.flv',
    '.wmv',
    '.m4v'
  ],
  
  // Áudio: formatos comuns para música e podcasts
  audio: [
    '.mp3',
    '.wav',
    '.ogg',
    '.m4a',
    '.aac',
    '.flac',
    '.wma',
    '.aiff'
  ],
  
  // Documentos: formatos de escritório e PDFs
  document: [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.odt',
    '.ods',
    '.odp'
  ],
  
  // Texto: formatos de texto puro
  text: [
    '.txt',
    '.md',
    '.csv',
    '.json',
    '.xml',
    '.rtf'
  ]
};

/**
 * LISTA BRANCA: MIME types permitidos por categoria
 * 
 * Usados para validação dupla (extensão + MIME type)
 */
const ALLOWED_MIME_TYPES: Record<FileCategory, string[]> = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ],
  
  video: [
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/webm',
    'video/x-matroska',
    'video/x-flv',
    'video/x-ms-wmv'
  ],
  
  audio: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/x-wav',
    'audio/ogg',
    'audio/mp4',
    'audio/aac',
    'audio/flac',
    'audio/x-ms-wma',
    'audio/aiff',
    'audio/x-aiff'
  ],
  
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation'
  ],
  
  text: [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/xml',
    'application/xml',
    'application/rtf',
    'text/rtf'
  ]
};

/**
 * LISTA NEGRA: Extensões PROIBIDAS (executáveis e scripts)
 * 
 * Estas extensões são SEMPRE rejeitadas, independente da categoria
 */
const FORBIDDEN_EXTENSIONS = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.pif',
  '.application',
  '.gadget',
  '.msi',
  '.msp',
  '.cpl',
  '.scf',
  '.lnk',
  '.inf',
  '.reg',
  '.sh',
  '.bash',
  '.ps1',
  '.vbs',
  '.vbe',
  '.js',
  '.jse',
  '.wsf',
  '.wsh',
  '.msc',
  '.jar',
  '.app',
  '.deb',
  '.rpm',
  '.dmg',
  '.pkg',
  '.run'
];

// =====================================================
// CONFIGURAÇÕES PADRÃO
// =====================================================

/**
 * Tamanho máximo padrão: 10MB
 */
const DEFAULT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Configuração padrão de validação
 */
const DEFAULT_CONFIG: FileValidationConfig = {
  maxSizeBytes: DEFAULT_MAX_SIZE_BYTES,
  allowedCategories: ['image', 'video', 'audio', 'document', 'text'],
  strictMode: true
};

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Extrai a extensão do arquivo (em lowercase)
 * 
 * @param fileName - Nome do arquivo
 * @returns Extensão com ponto (ex: '.jpg') ou string vazia
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
}

/**
 * Determina a categoria do arquivo baseado na extensão
 * 
 * @param extension - Extensão do arquivo (com ponto)
 * @returns Categoria do arquivo ou null se não encontrada
 */
function getCategoryByExtension(extension: string): FileCategory | null {
  for (const [category, extensions] of Object.entries(ALLOWED_EXTENSIONS)) {
    if (extensions.includes(extension)) {
      return category as FileCategory;
    }
  }
  return null;
}

/**
 * Determina a categoria do arquivo baseado no MIME type
 * 
 * @param mimeType - MIME type do arquivo
 * @returns Categoria do arquivo ou null se não encontrada
 */
function getCategoryByMimeType(mimeType: string): FileCategory | null {
  const normalizedMimeType = mimeType.toLowerCase().trim();
  
  for (const [category, mimeTypes] of Object.entries(ALLOWED_MIME_TYPES)) {
    if (mimeTypes.includes(normalizedMimeType)) {
      return category as FileCategory;
    }
  }
  return null;
}

/**
 * Formata o tamanho do arquivo em formato legível
 * 
 * @param bytes - Tamanho em bytes
 * @returns String formatada (ex: "2.5 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// =====================================================
// FUNÇÃO PRINCIPAL DE VALIDAÇÃO
// =====================================================

/**
 * Valida um arquivo contra a lista branca de extensões e MIME types
 * 
 * VALIDAÇÕES REALIZADAS:
 * 1. ✅ Verifica se arquivo existe
 * 2. ✅ Verifica tamanho máximo
 * 3. ✅ Verifica se extensão está na lista branca
 * 4. ✅ Verifica se extensão NÃO está na lista negra
 * 5. ✅ Verifica se MIME type corresponde à extensão (modo strict)
 * 6. ✅ Verifica se categoria é permitida
 * 
 * @param file - Objeto File do navegador
 * @param config - Configuração de validação (opcional)
 * @returns Resultado da validação com detalhes
 * 
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const result = validateFile(file);
 * 
 * if (!result.valid) {
 *   alert(result.message);
 *   return;
 * }
 * 
 * // Arquivo válido, prosseguir com upload
 * ```
 */
export function validateFile(
  file: File,
  config: FileValidationConfig = {}
): FileValidationResult {
  // Mescla configuração fornecida com padrão
  const finalConfig: FileValidationConfig = {
    ...DEFAULT_CONFIG,
    ...config
  };
  
  // =====================================================
  // VALIDAÇÃO 1: Arquivo existe
  // =====================================================
  if (!file) {
    return {
      valid: false,
      message: 'Nenhum arquivo foi selecionado.'
    };
  }
  
  // Extrai informações do arquivo
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;
  const extension = getFileExtension(fileName);
  
  console.log('🔍 [FILE VALIDATOR] Validando arquivo:', {
    fileName,
    fileSize: formatFileSize(fileSize),
    mimeType,
    extension
  });
  
  // =====================================================
  // VALIDAÇÃO 2: Tamanho máximo
  // =====================================================
  if (fileSize > finalConfig.maxSizeBytes!) {
    const maxSizeFormatted = formatFileSize(finalConfig.maxSizeBytes!);
    const fileSizeFormatted = formatFileSize(fileSize);
    
    return {
      valid: false,
      message: `Arquivo muito grande. Tamanho: ${fileSizeFormatted}. Máximo permitido: ${maxSizeFormatted}.`,
      details: {
        fileName,
        fileSize,
        fileType: mimeType,
        extension
      }
    };
  }
  
  // =====================================================
  // VALIDAÇÃO 3: Extensão existe
  // =====================================================
  if (!extension) {
    return {
      valid: false,
      message: 'Arquivo sem extensão. Por favor, envie um arquivo com extensão válida.',
      details: {
        fileName,
        fileSize,
        fileType: mimeType
      }
    };
  }
  
  // =====================================================
  // VALIDAÇÃO 4: Extensão NÃO está na lista negra
  // =====================================================
  if (FORBIDDEN_EXTENSIONS.includes(extension)) {
    console.warn('🚫 [FILE VALIDATOR] Extensão proibida detectada:', extension);
    
    return {
      valid: false,
      message: `Tipo de arquivo não permitido. Arquivos executáveis e scripts são proibidos por motivos de segurança.`,
      details: {
        fileName,
        fileSize,
        fileType: mimeType,
        extension
      }
    };
  }
  
  // =====================================================
  // VALIDAÇÃO 5: Extensão está na lista branca
  // =====================================================
  const categoryByExtension = getCategoryByExtension(extension);
  
  if (!categoryByExtension) {
    // Lista de extensões permitidas para mensagem de erro
    const allAllowedExtensions = Object.values(ALLOWED_EXTENSIONS)
      .flat()
      .join(', ');
    
    return {
      valid: false,
      message: `Extensão "${extension}" não é permitida. Extensões aceitas: ${allAllowedExtensions}`,
      details: {
        fileName,
        fileSize,
        fileType: mimeType,
        extension
      }
    };
  }
  
  // =====================================================
  // VALIDAÇÃO 6: Categoria é permitida
  // =====================================================
  if (!finalConfig.allowedCategories!.includes(categoryByExtension)) {
    return {
      valid: false,
      message: `Categoria "${categoryByExtension}" não é permitida neste contexto.`,
      details: {
        fileName,
        fileSize,
        fileType: mimeType,
        extension,
        category: categoryByExtension
      }
    };
  }
  
  // =====================================================
  // VALIDAÇÃO 7: MIME type corresponde à extensão (modo strict)
  // =====================================================
  if (finalConfig.strictMode && mimeType) {
    const categoryByMimeType = getCategoryByMimeType(mimeType);
    
    // Se MIME type não está na lista branca
    if (!categoryByMimeType) {
      console.warn('⚠️ [FILE VALIDATOR] MIME type não reconhecido:', mimeType);
      
      return {
        valid: false,
        message: `Tipo de arquivo não reconhecido. MIME type "${mimeType}" não é permitido.`,
        details: {
          fileName,
          fileSize,
          fileType: mimeType,
          extension,
          category: categoryByExtension
        }
      };
    }
    
    // Se MIME type não corresponde à extensão (possível spoofing)
    if (categoryByMimeType !== categoryByExtension) {
      console.error('🚨 [FILE VALIDATOR] MIME type spoofing detectado!', {
        extension,
        categoryByExtension,
        mimeType,
        categoryByMimeType
      });
      
      return {
        valid: false,
        message: `Arquivo suspeito detectado. A extensão "${extension}" não corresponde ao tipo real do arquivo.`,
        details: {
          fileName,
          fileSize,
          fileType: mimeType,
          extension,
          category: categoryByExtension
        }
      };
    }
  }
  
  // =====================================================
  // ✅ ARQUIVO VÁLIDO
  // =====================================================
  console.log('✅ [FILE VALIDATOR] Arquivo validado com sucesso:', {
    fileName,
    category: categoryByExtension,
    size: formatFileSize(fileSize)
  });
  
  return {
    valid: true,
    message: 'Arquivo válido.',
    details: {
      fileName,
      fileSize,
      fileType: mimeType,
      extension,
      category: categoryByExtension
    }
  };
}

// =====================================================
// FUNÇÕES AUXILIARES EXPORTADAS
// =====================================================

/**
 * Retorna todas as extensões permitidas para uma categoria
 * 
 * @param category - Categoria do arquivo
 * @returns Array de extensões permitidas
 */
export function getAllowedExtensionsForCategory(category: FileCategory): string[] {
  return ALLOWED_EXTENSIONS[category] || [];
}

/**
 * Retorna todas as extensões permitidas (todas as categorias)
 * 
 * @returns Array de todas as extensões permitidas
 */
export function getAllAllowedExtensions(): string[] {
  return Object.values(ALLOWED_EXTENSIONS).flat();
}

/**
 * Retorna todos os MIME types permitidos para uma categoria
 * 
 * @param category - Categoria do arquivo
 * @returns Array de MIME types permitidos
 */
export function getAllowedMimeTypesForCategory(category: FileCategory): string[] {
  return ALLOWED_MIME_TYPES[category] || [];
}

/**
 * Retorna string de extensões permitidas formatada para atributo accept do input
 * 
 * @param categories - Categorias permitidas
 * @returns String formatada para atributo accept (ex: ".jpg,.png,.pdf")
 * 
 * @example
 * ```typescript
 * <input 
 *   type="file" 
 *   accept={getAcceptString(['image', 'document'])}
 * />
 * ```
 */
export function getAcceptString(categories: FileCategory[]): string {
  const extensions = categories
    .map(cat => getAllowedExtensionsForCategory(cat))
    .flat();
  
  return extensions.join(',');
}

/**
 * Retorna descrição legível das extensões permitidas para uma categoria
 * 
 * @param category - Categoria do arquivo
 * @returns String descritiva (ex: "JPG, PNG, GIF, WebP")
 */
export function getExtensionDescription(category: FileCategory): string {
  const extensions = getAllowedExtensionsForCategory(category);
  return extensions
    .map(ext => ext.substring(1).toUpperCase())
    .join(', ');
}