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
 * - Validação de Magic Numbers (assinatura de arquivo)
 * - Limite de tamanho configurável
 * - Prevenção contra MIME type spoofing
 * - Mensagens de erro específicas para debugging
 * - 🆕 Sanitização de nomes de arquivos (ETAPA 4)
 * 
 * @author VeroID Security Team
 * @version 2.2.0
 * @date 2024-01-15
 * @updated 2026-01-15 - Relaxed .txt validation (user feedback)
 * @updated 2026-01-15 - Added filename sanitization (ETAPA 4)
 */

// ========================================
// 🔒 SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 4
// ========================================
import { sanitizeFileName } from './input-sanitizer';
// ========================================
// FIM: SANITIZAÇÃO - IMPORT
// ========================================

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
  validateMagicNumbers?: boolean; // 🆕 Se true, valida Magic Numbers (padrão: true)
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
  // NOTA: .MOV removido devido a incompatibilidades com Supabase Storage (limite de 50MB/requisição)
  video: [
    '.mp4',
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
// 🆕 MAGIC NUMBERS - ASSINATURAS DE ARQUIVO
// =====================================================

/**
 * MAGIC NUMBERS: Assinaturas de arquivo (primeiros bytes)
 * 
 * Cada tipo de arquivo tem uma "impressão digital" única nos primeiros bytes.
 * Usado para detectar arquivos renomeados maliciosamente.
 * 
 * Formato: extensão → array de possíveis assinaturas (em decimal)
 * 
 * Referências:
 * - https://en.wikipedia.org/wiki/List_of_file_signatures
 * - https://www.garykessler.net/library/file_sigs.html
 * - https://filesignatures.net/
 * 
 * @example
 * JPEG tem 3 variações comuns:
 * - FF D8 FF E0 (JFIF)
 * - FF D8 FF E1 (EXIF)
 * - FF D8 FF EE
 */
const MAGIC_NUMBERS: Record<string, number[][]> = {
  // =====================================================
  // IMAGENS
  // =====================================================
  
  // JPEG - Joint Photographic Experts Group
  '.jpg': [
    [0xFF, 0xD8, 0xFF, 0xE0], // FF D8 FF E0 - JFIF format
    [0xFF, 0xD8, 0xFF, 0xE1], // FF D8 FF E1 - EXIF format
    [0xFF, 0xD8, 0xFF, 0xE2], // FF D8 FF E2 - Canon
    [0xFF, 0xD8, 0xFF, 0xE3], // FF D8 FF E3
    [0xFF, 0xD8, 0xFF, 0xE8], // FF D8 FF E8
    [0xFF, 0xD8, 0xFF, 0xEE], // FF D8 FF EE - Adobe
    [0xFF, 0xD8, 0xFF, 0xDB], // FF D8 FF DB - Samsung
  ],
  '.jpeg': [
    [0xFF, 0xD8, 0xFF, 0xE0],
    [0xFF, 0xD8, 0xFF, 0xE1],
    [0xFF, 0xD8, 0xFF, 0xE2],
    [0xFF, 0xD8, 0xFF, 0xE3],
    [0xFF, 0xD8, 0xFF, 0xE8],
    [0xFF, 0xD8, 0xFF, 0xEE],
    [0xFF, 0xD8, 0xFF, 0xDB],
  ],
  
  // PNG - Portable Network Graphics
  '.png': [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // 89 50 4E 47 0D 0A 1A 0A
  ],
  
  // GIF - Graphics Interchange Format
  '.gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // 47 49 46 38 37 61 - GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // 47 49 46 38 39 61 - GIF89a
  ],
  
  // BMP - Bitmap Image File
  '.bmp': [
    [0x42, 0x4D], // 42 4D - BM
  ],
  
  // WebP - Web Picture format
  '.webp': [
    [0x52, 0x49, 0x46, 0x46], // 52 49 46 46 - RIFF (primeiros 4 bytes)
  ],
  
  // ICO - Icon file
  '.ico': [
    [0x00, 0x00, 0x01, 0x00], // 00 00 01 00
  ],
  
  // =====================================================
  // DOCUMENTOS
  // =====================================================
  
  // PDF - Portable Document Format
  '.pdf': [
    [0x25, 0x50, 0x44, 0x46], // 25 50 44 46 - %PDF
  ],
  
  // DOCX, XLSX, PPTX - Microsoft Office (ZIP-based)
  '.docx': [
    [0x50, 0x4B, 0x03, 0x04], // 50 4B 03 04 - PK (ZIP)
    [0x50, 0x4B, 0x05, 0x06], // 50 4B 05 06 - PK (empty ZIP)
    [0x50, 0x4B, 0x07, 0x08], // 50 4B 07 08 - PK (spanned ZIP)
  ],
  '.xlsx': [
    [0x50, 0x4B, 0x03, 0x04],
    [0x50, 0x4B, 0x05, 0x06],
    [0x50, 0x4B, 0x07, 0x08],
  ],
  '.pptx': [
    [0x50, 0x4B, 0x03, 0x04],
    [0x50, 0x4B, 0x05, 0x06],
    [0x50, 0x4B, 0x07, 0x08],
  ],
  
  // DOC - Microsoft Word 97-2003
  '.doc': [
    [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // D0 CF 11 E0 - OLE2
  ],
  
  // XLS - Microsoft Excel 97-2003
  '.xls': [
    [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // D0 CF 11 E0 - OLE2
  ],
  
  // PPT - Microsoft PowerPoint 97-2003
  '.ppt': [
    [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1], // D0 CF 11 E0 - OLE2
  ],
  
  // ODT, ODS, ODP - OpenDocument (ZIP-based)
  '.odt': [
    [0x50, 0x4B, 0x03, 0x04],
    [0x50, 0x4B, 0x05, 0x06],
    [0x50, 0x4B, 0x07, 0x08],
  ],
  '.ods': [
    [0x50, 0x4B, 0x03, 0x04],
    [0x50, 0x4B, 0x05, 0x06],
    [0x50, 0x4B, 0x07, 0x08],
  ],
  '.odp': [
    [0x50, 0x4B, 0x03, 0x04],
    [0x50, 0x4B, 0x05, 0x06],
    [0x50, 0x4B, 0x07, 0x08],
  ],
  
  // RTF - Rich Text Format
  '.rtf': [
    [0x7B, 0x5C, 0x72, 0x74, 0x66], // 7B 5C 72 74 66 - {\rtf
  ],
  
  // =====================================================
  // VÍDEOS
  // =====================================================
  
  // MP4 - MPEG-4 Part 14
  '.mp4': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70], // ftyp
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], // ftyp
  ],
  
  // M4V - MPEG-4 Video
  '.m4v': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  ],
  
  // MOV - QuickTime Movie (REMOVIDO - incompatível com Supabase Storage)
  // '.mov': [
  //   [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70], // ftyp
  //   [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
  //   [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70],
  //   [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  // ],
  
  // AVI - Audio Video Interleave
  '.avi': [
    [0x52, 0x49, 0x46, 0x46], // 52 49 46 46 - RIFF
  ],
  
  // WebM - Web Media
  '.webm': [
    [0x1A, 0x45, 0xDF, 0xA3], // 1A 45 DF A3
  ],
  
  // MKV - Matroska Video
  '.mkv': [
    [0x1A, 0x45, 0xDF, 0xA3], // 1A 45 DF A3
  ],
  
  // FLV - Flash Video
  '.flv': [
    [0x46, 0x4C, 0x56, 0x01], // 46 4C 56 01 - FLV
  ],
  
  // WMV - Windows Media Video
  '.wmv': [
    [0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11], // ASF
  ],
  
  // =====================================================
  // ÁUDIO
  // =====================================================
  
  // MP3 - MPEG Audio Layer 3
  '.mp3': [
    [0xFF, 0xFB], // FF FB - MPEG-1 Layer 3
    [0xFF, 0xF3], // FF F3 - MPEG-1 Layer 3
    [0xFF, 0xF2], // FF F2 - MPEG-2 Layer 3
    [0x49, 0x44, 0x33], // 49 44 33 - ID3v2
  ],
  
  // WAV - Waveform Audio File
  '.wav': [
    [0x52, 0x49, 0x46, 0x46], // 52 49 46 46 - RIFF
  ],
  
  // OGG - Ogg Vorbis
  '.ogg': [
    [0x4F, 0x67, 0x67, 0x53], // 4F 67 67 53 - OggS
  ],
  
  // M4A - MPEG-4 Audio
  '.m4a': [
    [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70],
    [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
  ],
  
  // FLAC - Free Lossless Audio Codec
  '.flac': [
    [0x66, 0x4C, 0x61, 0x43], // 66 4C 61 43 - fLaC
  ],
  
  // AAC - Advanced Audio Coding
  '.aac': [
    [0xFF, 0xF1], // FF F1
    [0xFF, 0xF9], // FF F9
  ],
  
  // WMA - Windows Media Audio
  '.wma': [
    [0x30, 0x26, 0xB2, 0x75, 0x8E, 0x66, 0xCF, 0x11], // ASF
  ],
  
  // AIFF - Audio Interchange File Format
  '.aiff': [
    [0x46, 0x4F, 0x52, 0x4D], // 46 4F 52 4D - FORM
  ],
  
  // =====================================================
  // TEXTO - DESABILITADO (Opção C)
  // =====================================================
  
  // TXT - Plain Text (SEM validação de Magic Numbers)
  // Arquivos .txt não têm assinatura única e podem ter diversos encodings
  // '.txt': [] - REMOVIDO
  
  // JSON - JavaScript Object Notation
  '.json': [
    // JSON não tem Magic Number único, começa com { ou [
    // Validação será feita por MIME type
  ],
  
  // XML - Extensible Markup Language
  '.xml': [
    [0x3C, 0x3F, 0x78, 0x6D, 0x6C], // 3C 3F 78 6D 6C - <?xml
  ],
  
  // CSV - Comma-Separated Values
  '.csv': [
    // CSV não tem Magic Number único
    // Validação será feita por MIME type
  ],
  
  // MD - Markdown
  '.md': [
    // Markdown não tem Magic Number único
    // Validação será feita por MIME type
  ],
  
  // =====================================================
  // EXECUTÁVEIS (para detecção de ataques)
  // =====================================================
  
  // EXE - Windows Executable
  '.exe': [
    [0x4D, 0x5A], // 4D 5A - MZ
  ],
  
  // BAT - Windows Batch File
  '.bat': [
    [0x40, 0x65, 0x63, 0x68, 0x6F], // @echo
  ],
};

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
  strictMode: true,
  validateMagicNumbers: true // 🆕 Ativa validação de Magic Numbers por padrão
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

/**
 * 🆕 Converte array de bytes para string hexadecimal
 * 
 * @param bytes - Array de bytes
 * @returns String hexadecimal (ex: "FF D8 FF E0")
 */
function bytesToHex(bytes: number[]): string {
  return bytes
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

/**
 * 🆕 Lê os primeiros bytes de um arquivo
 * 
 * @param file - Arquivo a ser lido
 * @param numBytes - Número de bytes a ler (padrão: 16)
 * @returns Array de bytes lidos
 */
async function readFileBytes(file: File, numBytes: number = 16): Promise<number[]> {
  try {
    const slice = file.slice(0, numBytes);
    const arrayBuffer = await slice.arrayBuffer();
    const bytes = Array.from(new Uint8Array(arrayBuffer));
    
    // ========================================
    // 🔒 SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 4 (PONTO 1/1)
    // ========================================
    const sanitizedFileName = sanitizeFileName(file.name);
    
    console.log('📖 [MAGIC NUMBER] Bytes lidos:', {
      originalFileName: file.name.substring(0, 30) + (file.name.length > 30 ? '...' : ''),
      sanitizedFileName: sanitizedFileName.substring(0, 30) + (sanitizedFileName.length > 30 ? '...' : ''),
      bytesRead: bytes.length,
      bytesHex: bytesToHex(bytes)
    });
    // ========================================
    // FIM: SANITIZAÇÃO - PONTO 1/1
    // ========================================
    
    return bytes;
  } catch (error) {
    console.error('❌ [MAGIC NUMBER] Erro ao ler bytes:', error);
    throw new Error('Falha ao ler bytes do arquivo');
  }
}

/**
 * 🆕 Verifica se os bytes lidos correspondem ao Magic Number esperado
 * 
 * @param bytes - Bytes lidos do arquivo
 * @param extension - Extensão do arquivo
 * @returns true se Magic Number é válido, false caso contrário
 */
function checkMagicNumber(bytes: number[], extension: string): boolean {
  const expectedMagicNumbers = MAGIC_NUMBERS[extension.toLowerCase()];
  
  // Se não há Magic Number definido para esta extensão, considera válido
  if (!expectedMagicNumbers || expectedMagicNumbers.length === 0) {
    console.log(`ℹ️ [MAGIC NUMBER] Sem validação definida para extensão: ${extension}`);
    return true;
  }
  
  // Verifica se alguma das variações de Magic Number corresponde
  const isValid = expectedMagicNumbers.some(magic => {
    // Verifica se todos os bytes do Magic Number correspondem
    return magic.every((expectedByte, index) => {
      return index < bytes.length && bytes[index] === expectedByte;
    });
  });
  
  if (isValid) {
    console.log('✅ [MAGIC NUMBER] Validação passou:', {
      extension,
      bytesHex: bytesToHex(bytes.slice(0, 8))
    });
  } else {
    console.warn('🚨 [MAGIC NUMBER] Validação falhou:', {
      extension,
      expectedOptions: expectedMagicNumbers.map(m => bytesToHex(m)),
      actualBytes: bytesToHex(bytes.slice(0, 8))
    });
  }
  
  return isValid;
}

// =====================================================
// FUNÇÃO PRINCIPAL DE VALIDAÇÃO
// =====================================================

/**
 * Valida um arquivo contra a lista branca de extensões, MIME types e Magic Numbers
 * 
 * VALIDAÇÕES REALIZADAS:
 * 1. ✅ Verifica se arquivo existe
 * 2. ✅ Verifica tamanho máximo
 * 3. ✅ Verifica se extensão está na lista branca
 * 4. ✅ Verifica se extensão NÃO está na lista negra
 * 5. ✅ Verifica se MIME type corresponde à extensão (modo strict)
 * 6. ✅ Verifica se categoria é permitida
 * 7. 🆕 Verifica Magic Numbers (assinatura de arquivo) - EXCETO .txt
 * 8. 🆕 Sanitiza nome do arquivo para logs e mensagens (ETAPA 4)
 * 
 * @param file - Objeto File do navegador
 * @param config - Configuração de validação (opcional)
 * @returns Resultado da validação com detalhes
 * 
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const result = await validateFile(file);
 * 
 * if (!result.valid) {
 *   alert(result.message);
 *   return;
 * }
 * 
 * // Arquivo válido, prosseguir com upload
 * ```
 */
export async function validateFile(
  file: File,
  config: FileValidationConfig = {}
): Promise<FileValidationResult> {
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
  
  // ========================================
  // 🔒 SANITIZAÇÃO DE NOMES DE ARQUIVOS - ETAPA 4
  // Sanitiza o nome do arquivo ANTES de usar em logs/mensagens
  // ========================================
  const originalFileName = file.name;
  const sanitizedFileName = sanitizeFileName(originalFileName);
  const fileSize = file.size;
  const mimeType = file.type;
  const extension = getFileExtension(sanitizedFileName);
  
  console.log('🔍 [FILE VALIDATOR] Validando arquivo:', {
    originalFileName: originalFileName.substring(0, 50) + (originalFileName.length > 50 ? '...' : ''),
    sanitizedFileName,
    fileSize: formatFileSize(fileSize),
    mimeType,
    extension
  });
  // ========================================
  // FIM: SANITIZAÇÃO - APLICADA
  // ========================================
  
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
        fileName: sanitizedFileName,
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
        fileName: sanitizedFileName,
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
        fileName: sanitizedFileName,
        fileSize,
        fileType: mimeType,
        extension
      }
    };
  }
  
  // =====================================================
  // VALIDAÇÃO 5: Extensão está na lista branca
  // =====================================================
  
  // 🚫 VALIDAÇÃO ESPECIAL PARA .MOV
  if (extension === '.mov') {
    return {
      valid: false,
      message: `Arquivos .MOV não são suportados devido a limitações técnicas do sistema de armazenamento. Para melhor compatibilidade, por favor converta seu arquivo .MOV para .MP4. Você pode usar conversores online gratuitos como CloudConvert (https://cloudconvert.com) ou Convertio (https://convertio.co). O formato MP4 oferece melhor compressão, maior compatibilidade e streaming mais eficiente.`,
      details: {
        fileName: sanitizedFileName,
        fileSize,
        fileType: mimeType,
        extension
      }
    };
  }
  
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
        fileName: sanitizedFileName,
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
        fileName: sanitizedFileName,
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
          fileName: sanitizedFileName,
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
          fileName: sanitizedFileName,
          fileSize,
          fileType: mimeType,
          extension,
          category: categoryByExtension
        }
      };
    }
  }
  
  // =====================================================
  // 🆕 VALIDAÇÃO 8: Magic Numbers (assinatura de arquivo)
  // EXCETO .txt (Opção C - Orientar usuário)
  // =====================================================
  if (finalConfig.strictMode && finalConfig.validateMagicNumbers && extension !== '.txt') {
    try {
      console.log('🔍 [MAGIC NUMBER] Iniciando validação de assinatura...');
      
      // Lê primeiros 16 bytes do arquivo
      const bytes = await readFileBytes(file, 16);
      
      // Verifica se Magic Number corresponde à extensão
      const isValidMagicNumber = checkMagicNumber(bytes, extension);
      
      if (!isValidMagicNumber) {
        console.error('🚨 [MAGIC NUMBER] Arquivo suspeito detectado!', {
          sanitizedFileName,
          extension,
          actualBytes: bytesToHex(bytes.slice(0, 8))
        });
        
        return {
          valid: false,
          message: `Arquivo suspeito detectado. O conteúdo real do arquivo não corresponde à extensão "${extension}". Possível tentativa de falsificação.`,
          details: {
            fileName: sanitizedFileName,
            fileSize,
            fileType: mimeType,
            extension,
            category: categoryByExtension
          }
        };
      }
      
      console.log('✅ [MAGIC NUMBER] Assinatura de arquivo validada com sucesso');
      
    } catch (error) {
      // 🔒 FALLBACK GRACIOSO: Se validação de Magic Numbers falhar, continua
      console.warn('⚠️ [MAGIC NUMBER] Erro na validação, usando fallback:', error);
      // Não retorna erro - continua com validações anteriores
    }
  }
  
  // =====================================================
  // 🆕 ORIENTAÇÃO ESPECIAL PARA ARQUIVOS .TXT
  // =====================================================
  if (extension === '.txt') {
    console.log('ℹ️ [FILE VALIDATOR] Arquivo .txt detectado - validação de Magic Numbers desabilitada');
    console.log('💡 [DICA] Para criar arquivos .txt puros, use Notepad (Windows) ou TextEdit (Mac) ao invés do Microsoft Word');
  }
  
  // =====================================================
  // ✅ ARQUIVO VÁLIDO
  // =====================================================
  console.log('✅ [FILE VALIDATOR] Arquivo validado com sucesso:', {
    sanitizedFileName,
    category: categoryByExtension,
    size: formatFileSize(fileSize),
    magicNumberValidated: finalConfig.validateMagicNumbers && extension !== '.txt'
  });
  
  return {
    valid: true,
    message: 'Arquivo válido.',
    details: {
      fileName: sanitizedFileName,
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