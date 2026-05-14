/**
 * =====================================================
 * DOCUMENT VALIDATOR - VALIDAÇÃO DE DOCUMENTOS DE IDENTIDADE
 * =====================================================
 * 
 * Módulo especializado para validação de documentos de identidade:
 * 
 * DOCUMENTOS CIVIS:
 * - CNH (Carteira Nacional de Habilitação)
 * - RG (Registro Geral)
 * - Passaporte
 * 
 * DOCUMENTOS PROFISSIONAIS:
 * - OAB (Ordem dos Advogados do Brasil)
 * - CRM (Conselho Regional de Medicina)
 * - CREA (Conselho Regional de Engenharia)
 * - CRC (Conselho Regional de Contabilidade)
 * - CRO (Conselho Regional de Odontologia)
 * - CRF (Conselho Regional de Farmácia)
 * 
 * SEGURANÇA:
 * - Validação rigorosa de extensão (.jpg, .jpeg, .png, .pdf)
 * - Validação de MIME type
 * - Validação de Magic Numbers
 * - Limite de tamanho: 5MB
 * - Mensagens claras para o usuário
 * 
 * @author VeroID Security Team
 * @version 1.2.0
 * @date 2026-05-14
 */

import { validateFile, FileValidationResult } from './file-validator';

// =====================================================
// CONSTANTES
// =====================================================

/**
 * Extensões permitidas para documentos de identidade
 * ✅ PDF REATIVADO - Aceita documentos digitais (CNH-e, RG Digital)
 */
const ALLOWED_DOCUMENT_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

/**
 * MIME types permitidos para documentos de identidade
 * ✅ PDF REATIVADO - Aceita documentos digitais (CNH-e, RG Digital)
 */
const ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf'
];

/**
 * Tamanho máximo: 5MB (mais restritivo para documentos)
 */
const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;

// =====================================================
// TIPOS
// =====================================================

export interface DocumentValidationResult extends FileValidationResult {
  isDocument?: boolean;
  documentType?: 'image';
}

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Formata o tamanho do arquivo em formato legível
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Extrai a extensão do arquivo (em lowercase)
 */
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return '';
  return fileName.substring(lastDot).toLowerCase();
}

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================

/**
 * Valida um documento de identidade (Civil ou Profissional)
 * 
 * DOCUMENTOS ACEITOS:
 * - Civis: CNH, RG, Passaporte
 * - Profissionais: OAB, CRM, CREA, CRC, CRO, CRF
 * 
 * VALIDAÇÕES REALIZADAS:
 * 1. ✅ Verifica se arquivo existe
 * 2. ✅ Verifica tamanho máximo (5MB)
 * 3. ✅ Verifica se extensão é permitida (.jpg, .jpeg, .png, .pdf)
 * 4. ✅ Verifica se MIME type é permitido
 * 5. ✅ Valida Magic Numbers (assinatura de arquivo)
 * 6. ✅ Mensagens específicas para documentos de identidade
 * 
 * ✅ FORMATOS ACEITOS: Fotos (JPEG/PNG) e documentos digitais (PDF)
 * 
 * @param file - Objeto File do navegador
 * @returns Resultado da validação com detalhes
 * 
 * @example
 * ```typescript
 * const file = event.target.files[0];
 * const result = await validateDocument(file);
 * 
 * if (!result.valid) {
 *   alert(result.message);
 *   return;
 * }
 * 
 * // Documento válido, prosseguir com upload
 * ```
 */
export async function validateDocument(file: File): Promise<DocumentValidationResult> {
  console.log('🔍 [DOCUMENT VALIDATOR] Iniciando validação de documento...');
  
  // =====================================================
  // VALIDAÇÃO 1: Arquivo existe
  // =====================================================
  if (!file) {
    return {
      valid: false,
      message: 'Nenhum arquivo foi selecionado.',
      isDocument: false
    };
  }
  
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;
  const extension = getFileExtension(fileName);
  
  console.log('📄 [DOCUMENT VALIDATOR] Arquivo recebido:', {
    fileName: fileName.substring(0, 50) + (fileName.length > 50 ? '...' : ''),
    fileSize: formatFileSize(fileSize),
    mimeType,
    extension
  });
  
  // =====================================================
  // VALIDAÇÃO 2: Tamanho máximo (5MB)
  // =====================================================
  if (fileSize > MAX_DOCUMENT_SIZE_BYTES) {
    const maxSizeFormatted = formatFileSize(MAX_DOCUMENT_SIZE_BYTES);
    const fileSizeFormatted = formatFileSize(fileSize);
    
    console.error('❌ [DOCUMENT VALIDATOR] Arquivo muito grande:', {
      fileSize: fileSizeFormatted,
      maxSize: maxSizeFormatted
    });
    
    return {
      valid: false,
      message: `Documento muito grande (${fileSizeFormatted}). Tamanho máximo permitido: ${maxSizeFormatted}. Por favor, comprima o arquivo ou tire uma foto com menor resolução.`,
      isDocument: false,
      details: {
        fileName,
        fileSize,
        fileType: mimeType,
        extension
      }
    };
  }
  
  // =====================================================
  // VALIDAÇÃO 3: PDF agora é aceito para documentos digitais
  // =====================================================
  // PDF reativado para suportar CNH-e e RG Digital
  // Validação de extensão/MIME type continua nas próximas etapas
  
  // =====================================================
  // VALIDAÇÃO 4: Extensão permitida
  // =====================================================
  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
    console.error('❌ [DOCUMENT VALIDATOR] Extensão não permitida:', extension);
    
    return {
      valid: false,
      message: `Formato de arquivo não aceito. Por favor, envie uma FOTO do seu documento (CNH, RG, Passaporte, OAB, CRM, CREA, CRC, CRO, CRF) nos formatos: JPG, PNG ou PDF.`,
      isDocument: false,
      details: {
        fileName,
        fileSize,
        fileType: mimeType,
        extension
      }
    };
  }
  
  // =====================================================
  // VALIDAÇÃO 5: MIME type permitido
  // =====================================================
  if (mimeType && !ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType.toLowerCase())) {
    console.error('❌ [DOCUMENT VALIDATOR] MIME type não permitido:', mimeType);
    
    return {
      valid: false,
      message: `Tipo de arquivo não reconhecido. Por favor, envie uma FOTO (JPG, PNG ou PDF) do seu documento de identidade civil (CNH, RG, Passaporte) ou profissional (OAB, CRM, CREA, CRC, CRO, CRF).`,
      isDocument: false,
      details: {
        fileName,
        fileSize,
        fileType: mimeType,
        extension
      }
    };
  }
  
  // =====================================================
  // VALIDAÇÃO 6: Validação completa com file-validator
  // (inclui validação de Magic Numbers)
  // ✅ PDF REATIVADO: Incluída categoria 'document' para aceitar PDFs
  // =====================================================
  const validationResult = await validateFile(file, {
    maxSizeBytes: MAX_DOCUMENT_SIZE_BYTES,
    allowedCategories: ['image', 'document'],
    strictMode: true,
    validateMagicNumbers: true
  });
  
  if (!validationResult.valid) {
    console.error('❌ [DOCUMENT VALIDATOR] Validação falhou:', validationResult.message);
    
    // Personaliza mensagem para contexto de documentos
    let customMessage = validationResult.message;
    
    if (validationResult.message.includes('suspeito') || validationResult.message.includes('falsificação')) {
      customMessage = 'Arquivo suspeito detectado. Por favor, tire uma foto direta do seu documento. Não envie capturas de tela ou arquivos editados.';
    }
    
    return {
      valid: false,
      message: customMessage,
      isDocument: false,
      details: validationResult.details
    };
  }
  
  // =====================================================
  // ✅ DOCUMENTO VÁLIDO
  // =====================================================
  console.log('✅ [DOCUMENT VALIDATOR] Documento validado com sucesso:', {
    fileName,
    documentType: 'image',
    size: formatFileSize(fileSize)
  });
  
  return {
    valid: true,
    message: 'Documento válido.',
    isDocument: true,
    documentType: 'image',
    details: {
      fileName,
      fileSize,
      fileType: mimeType,
      extension
    }
  };
}

// =====================================================
// FUNÇÕES AUXILIARES EXPORTADAS
// =====================================================

/**
 * Retorna string de extensões permitidas para atributo accept do input
 * ✅ PDF INCLUÍDO - aceita documentos digitais (CNH-e, RG Digital)
 */
export function getDocumentAcceptString(): string {
  return ALLOWED_DOCUMENT_EXTENSIONS.join(',') + ',image/jpeg,image/png,application/pdf';
}

/**
 * Retorna descrição legível das extensões permitidas
 */
export function getDocumentExtensionDescription(): string {
  return 'JPG, PNG, PDF';
}

/**
 * Retorna tamanho máximo permitido em MB
 */
export function getMaxDocumentSizeMB(): number {
  return MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024);
}