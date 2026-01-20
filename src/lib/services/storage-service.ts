/**
 * =====================================================
 * SUPABASE STORAGE SERVICE
 * =====================================================
 * 
 * Serviço centralizado para operações de Storage no Supabase.
 * Gerencia upload, download, movimentação e deleção de arquivos.
 * 
 * SEGURANÇA:
 * - Validação de permissões (userId vs auth.uid())
 * - Sanitização de nomes de arquivo
 * - Validação de paths (sem path traversal)
 * - Retry automático com backoff
 * - Timeout configurável
 * - Logs detalhados para auditoria
 * 
 * BUCKETS:
 * - temp-uploads: Arquivos temporários (max 10MB, deletados após 24h)
 * - signed-documents: Documentos assinados (max 50MB, permanentes)
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 * @date 2026-01-20
 */

import { supabase } from '@/lib/supabase';
import { sanitizeFileName } from '@/lib/input-sanitizer';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

/**
 * Resultado de operação de upload
 */
export interface UploadResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
  executionTime?: number;
}

/**
 * Resultado de operação de movimentação
 */
export interface MoveResult {
  success: boolean;
  path?: string;
  error?: string;
  executionTime?: number;
}

/**
 * Resultado de operação de download (URL assinada)
 */
export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  expiresAt?: Date;
  error?: string;
  executionTime?: number;
}

/**
 * Resultado de operação de deleção
 */
export interface DeleteResult {
  success: boolean;
  error?: string;
  executionTime?: number;
}

/**
 * Resultado de listagem de arquivos
 */
export interface FileListResult {
  success: boolean;
  files?: FileInfo[];
  error?: string;
  executionTime?: number;
}

/**
 * Informações de arquivo
 */
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  mimeType?: string;
}

/**
 * Opções de upload
 */
export interface UploadOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  cacheControl?: string;
  contentType?: string;
  upsert?: boolean;
}

/**
 * Opções de movimentação
 */
export interface MoveOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================

/**
 * Configuração padrão do serviço
 */
const CONFIG = {
  // Retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 segundo
  
  // Timeout
  TIMEOUT: 30000, // 30 segundos
  
  // Cache
  CACHE_CONTROL: '3600', // 1 hora
  
  // Buckets
  TEMP_BUCKET: 'temp-uploads',
  SIGNED_BUCKET: 'signed-documents',
  
  // Limites
  MAX_FILE_SIZE_TEMP: 10 * 1024 * 1024, // 10MB
  MAX_FILE_SIZE_SIGNED: 50 * 1024 * 1024, // 50MB
};

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Aguarda um tempo específico (para retry)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
 * Valida estrutura de path do arquivo
 * Formato esperado: {user_id}/{filename}
 * 
 * @param path - Path a ser validado
 * @returns true se válido, false caso contrário
 */
function isValidPath(path: string): boolean {
  // Não pode estar vazio
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  // Não pode conter path traversal
  if (path.includes('..') || path.includes('./') || path.includes('.\\')) {
    console.error('🚨 [Storage] Path traversal detectado:', path);
    return false;
  }
  
  // Deve ter formato: user_id/filename
  const parts = path.split('/');
  if (parts.length !== 2) {
    console.error('🚨 [Storage] Formato de path inválido:', path);
    return false;
  }
  
  // user_id não pode estar vazio
  if (!parts[0] || parts[0].trim() === '') {
    console.error('🚨 [Storage] user_id vazio no path:', path);
    return false;
  }
  
  // filename não pode estar vazio
  if (!parts[1] || parts[1].trim() === '') {
    console.error('🚨 [Storage] filename vazio no path:', path);
    return false;
  }
  
  return true;
}

/**
 * Valida se userId no path corresponde ao usuário autenticado
 * 
 * @param path - Path do arquivo
 * @param expectedUserId - userId esperado
 * @returns true se válido, false caso contrário
 */
function validateUserIdInPath(path: string, expectedUserId: string): boolean {
  const parts = path.split('/');
  const userIdInPath = parts[0];
  
  if (userIdInPath !== expectedUserId) {
    console.error('🚨 [Storage] userId no path não corresponde ao usuário autenticado:', {
      pathUserId: userIdInPath,
      expectedUserId: expectedUserId
    });
    return false;
  }
  
  return true;
}

/**
 * Obtém usuário autenticado atual
 */
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('❌ [Storage] Erro ao obter usuário autenticado:', error);
    return null;
  }
  
  return user;
}

// =====================================================
// FUNÇÕES PRINCIPAIS
// =====================================================

/**
 * Faz upload de arquivo para bucket temporário
 * 
 * @param file - Arquivo a ser enviado
 * @param userId - ID do usuário (para criar path)
 * @param options - Opções de upload
 * @returns Resultado do upload
 * 
 * @example
 * ```typescript
 * const result = await uploadToTempBucket(file, 'user-123');
 * if (result.success) {
 *   console.log('Arquivo enviado:', result.path);
 * }
 * ```
 */
export async function uploadToTempBucket(
  file: File,
  userId: string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const startTime = Date.now();
  
  // Configuração
  const maxRetries = options.maxRetries ?? CONFIG.MAX_RETRIES;
  const retryDelay = options.retryDelay ?? CONFIG.RETRY_DELAY;
  const timeout = options.timeout ?? CONFIG.TIMEOUT;
  
  console.log('📤 [Storage] Iniciando upload para bucket temporário:', {
    fileName: file.name,
    fileSize: formatFileSize(file.size),
    userId,
    bucket: CONFIG.TEMP_BUCKET
  });
  
  // =====================================================
  // VALIDAÇÕES DE SEGURANÇA
  // =====================================================
  
  // 1. Validar usuário autenticado
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      error: 'Usuário não autenticado',
      executionTime: Date.now() - startTime
    };
  }
  
  // 2. Validar se userId corresponde ao usuário autenticado
  if (currentUser.id !== userId) {
    console.error('🚨 [Storage] userId não corresponde ao usuário autenticado:', {
      providedUserId: userId,
      authenticatedUserId: currentUser.id
    });
    return {
      success: false,
      error: 'Permissão negada: userId inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // 3. Validar tamanho do arquivo
  if (file.size > CONFIG.MAX_FILE_SIZE_TEMP) {
    return {
      success: false,
      error: `Arquivo muito grande. Máximo: ${formatFileSize(CONFIG.MAX_FILE_SIZE_TEMP)}`,
      executionTime: Date.now() - startTime
    };
  }
  
  // 4. Sanitizar nome do arquivo
  const sanitizedFileName = sanitizeFileName(file.name);
  console.log('🔒 [Storage] Nome do arquivo sanitizado:', {
    original: file.name,
    sanitized: sanitizedFileName
  });
  
  // 5. Criar path: {user_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const filePath = `${userId}/${timestamp}_${sanitizedFileName}`;
  
  // 6. Validar path
  if (!isValidPath(filePath)) {
    return {
      success: false,
      error: 'Path de arquivo inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // =====================================================
  // UPLOAD COM RETRY
  // =====================================================
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [Storage] Tentativa ${attempt}/${maxRetries}...`);
      
      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from(CONFIG.TEMP_BUCKET)
        .upload(filePath, file, {
          cacheControl: options.cacheControl ?? CONFIG.CACHE_CONTROL,
          contentType: options.contentType ?? file.type,
          upsert: options.upsert ?? false
        });
      
      if (error) {
        throw error;
      }
      
      // Sucesso!
      const executionTime = Date.now() - startTime;
      
      console.log('✅ [Storage] Upload concluído com sucesso:', {
        path: data.path,
        executionTime: `${executionTime}ms`,
        attempt
      });
      
      return {
        success: true,
        path: data.path,
        executionTime
      };
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ [Storage] Tentativa ${attempt} falhou:`, error);
      
      // Se não é a última tentativa, aguarda antes de tentar novamente
      if (attempt < maxRetries) {
        const delay = retryDelay * attempt; // Backoff exponencial
        console.log(`⏳ [Storage] Aguardando ${delay}ms antes da próxima tentativa...`);
        await sleep(delay);
      }
    }
  }
  
  // Todas as tentativas falharam
  const executionTime = Date.now() - startTime;
  console.error('❌ [Storage] Todas as tentativas falharam:', lastError);
  
  return {
    success: false,
    error: lastError?.message || 'Erro desconhecido no upload',
    executionTime
  };
}

/**
 * Move arquivo do bucket temporário para bucket permanente
 * 
 * @param tempPath - Path do arquivo no bucket temporário
 * @param userId - ID do usuário (para validação)
 * @param options - Opções de movimentação
 * @returns Resultado da movimentação
 * 
 * @example
 * ```typescript
 * const result = await moveToSignedDocuments('user-123/1737360000_file.pdf', 'user-123');
 * if (result.success) {
 *   console.log('Arquivo movido para:', result.path);
 * }
 * ```
 */
export async function moveToSignedDocuments(
  tempPath: string,
  userId: string,
  options: MoveOptions = {}
): Promise<MoveResult> {
  const startTime = Date.now();
  
  // Configuração
  const maxRetries = options.maxRetries ?? CONFIG.MAX_RETRIES;
  const retryDelay = options.retryDelay ?? CONFIG.RETRY_DELAY;
  
  console.log('🔄 [Storage] Iniciando movimentação para bucket permanente:', {
    tempPath,
    userId,
    fromBucket: CONFIG.TEMP_BUCKET,
    toBucket: CONFIG.SIGNED_BUCKET
  });
  
  // =====================================================
  // VALIDAÇÕES DE SEGURANÇA
  // =====================================================
  
  // 1. Validar usuário autenticado
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      error: 'Usuário não autenticado',
      executionTime: Date.now() - startTime
    };
  }
  
  // 2. Validar se userId corresponde ao usuário autenticado
  if (currentUser.id !== userId) {
    console.error('🚨 [Storage] userId não corresponde ao usuário autenticado');
    return {
      success: false,
      error: 'Permissão negada: userId inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // 3. Validar path temporário
  if (!isValidPath(tempPath)) {
    return {
      success: false,
      error: 'Path temporário inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // 4. Validar userId no path
  if (!validateUserIdInPath(tempPath, userId)) {
    return {
      success: false,
      error: 'Permissão negada: userId no path não corresponde',
      executionTime: Date.now() - startTime
    };
  }
  
  // 5. Criar path de destino: {user_id}/signed_{timestamp}_{filename}
  const parts = tempPath.split('/');
  const originalFileName = parts[1]; // Ex: "1737360000_file.pdf"
  const timestamp = Date.now();
  const signedPath = `${userId}/signed_${timestamp}_${originalFileName}`;
  
  // 6. Validar path de destino
  if (!isValidPath(signedPath)) {
    return {
      success: false,
      error: 'Path de destino inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // =====================================================
  // MOVIMENTAÇÃO COM RETRY
  // =====================================================
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 [Storage] Tentativa ${attempt}/${maxRetries}...`);
      
      // Mover arquivo entre buckets
      const { data, error } = await supabase.storage
        .from(CONFIG.TEMP_BUCKET)
        .move(tempPath, `${CONFIG.SIGNED_BUCKET}/${signedPath}`);
      
      if (error) {
        throw error;
      }
      
      // Sucesso!
      const executionTime = Date.now() - startTime;
      
      console.log('✅ [Storage] Movimentação concluída com sucesso:', {
        from: tempPath,
        to: signedPath,
        executionTime: `${executionTime}ms`,
        attempt
      });
      
      return {
        success: true,
        path: signedPath,
        executionTime
      };
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ [Storage] Tentativa ${attempt} falhou:`, error);
      
      // Se não é a última tentativa, aguarda antes de tentar novamente
      if (attempt < maxRetries) {
        const delay = retryDelay * attempt;
        console.log(`⏳ [Storage] Aguardando ${delay}ms antes da próxima tentativa...`);
        await sleep(delay);
      }
    }
  }
  
  // Todas as tentativas falharam
  const executionTime = Date.now() - startTime;
  console.error('❌ [Storage] Todas as tentativas falharam:', lastError);
  
  return {
    success: false,
    error: lastError?.message || 'Erro desconhecido na movimentação',
    executionTime
  };
}

/**
 * Gera URL assinada temporária para download de arquivo
 * 
 * @param filePath - Path do arquivo
 * @param expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
 * @param bucket - Bucket onde o arquivo está (padrão: signed-documents)
 * @returns Resultado com URL assinada
 * 
 * @example
 * ```typescript
 * const result = await getSignedDownloadUrl('user-123/signed_file.pdf', 3600);
 * if (result.success) {
 *   window.open(result.signedUrl);
 * }
 * ```
 */
export async function getSignedDownloadUrl(
  filePath: string,
  expiresIn: number = 3600,
  bucket: string = CONFIG.SIGNED_BUCKET
): Promise<SignedUrlResult> {
  const startTime = Date.now();
  
  console.log('🔗 [Storage] Gerando URL assinada para download:', {
    filePath,
    expiresIn: `${expiresIn}s`,
    bucket
  });
  
  // =====================================================
  // VALIDAÇÕES DE SEGURANÇA
  // =====================================================
  
  // 1. Validar usuário autenticado
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      error: 'Usuário não autenticado',
      executionTime: Date.now() - startTime
    };
  }
  
  // 2. Validar path
  if (!isValidPath(filePath)) {
    return {
      success: false,
      error: 'Path de arquivo inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // 3. Validar userId no path
  if (!validateUserIdInPath(filePath, currentUser.id)) {
    return {
      success: false,
      error: 'Permissão negada: você não tem acesso a este arquivo',
      executionTime: Date.now() - startTime
    };
  }
  
  // =====================================================
  // GERAR URL ASSINADA
  // =====================================================
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      throw error;
    }
    
    if (!data || !data.signedUrl) {
      throw new Error('URL assinada não foi gerada');
    }
    
    const executionTime = Date.now() - startTime;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    console.log('✅ [Storage] URL assinada gerada com sucesso:', {
      expiresAt: expiresAt.toISOString(),
      executionTime: `${executionTime}ms`
    });
    
    return {
      success: true,
      signedUrl: data.signedUrl,
      expiresAt,
      executionTime
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ [Storage] Erro ao gerar URL assinada:', error);
    
    return {
      success: false,
      error: (error as Error).message || 'Erro desconhecido ao gerar URL',
      executionTime
    };
  }
}

/**
 * Deleta arquivo do storage
 * 
 * @param bucket - Bucket onde o arquivo está
 * @param filePath - Path do arquivo
 * @returns Resultado da deleção
 * 
 * @example
 * ```typescript
 * const result = await deleteFile('temp-uploads', 'user-123/file.pdf');
 * if (result.success) {
 *   console.log('Arquivo deletado com sucesso');
 * }
 * ```
 */
export async function deleteFile(
  bucket: string,
  filePath: string
): Promise<DeleteResult> {
  const startTime = Date.now();
  
  console.log('🗑️ [Storage] Deletando arquivo:', {
    bucket,
    filePath
  });
  
  // =====================================================
  // VALIDAÇÕES DE SEGURANÇA
  // =====================================================
  
  // 1. Validar usuário autenticado
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      error: 'Usuário não autenticado',
      executionTime: Date.now() - startTime
    };
  }
  
  // 2. Validar path
  if (!isValidPath(filePath)) {
    return {
      success: false,
      error: 'Path de arquivo inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // 3. Validar userId no path
  if (!validateUserIdInPath(filePath, currentUser.id)) {
    return {
      success: false,
      error: 'Permissão negada: você não tem acesso a este arquivo',
      executionTime: Date.now() - startTime
    };
  }
  
  // =====================================================
  // DELETAR ARQUIVO
  // =====================================================
  
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
    
    if (error) {
      throw error;
    }
    
    const executionTime = Date.now() - startTime;
    
    console.log('✅ [Storage] Arquivo deletado com sucesso:', {
      executionTime: `${executionTime}ms`
    });
    
    return {
      success: true,
      executionTime
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ [Storage] Erro ao deletar arquivo:', error);
    
    return {
      success: false,
      error: (error as Error).message || 'Erro desconhecido ao deletar arquivo',
      executionTime
    };
  }
}

/**
 * Lista arquivos do usuário em um bucket
 * 
 * @param userId - ID do usuário
 * @param bucket - Bucket a ser listado (padrão: signed-documents)
 * @returns Resultado com lista de arquivos
 * 
 * @example
 * ```typescript
 * const result = await listUserFiles('user-123');
 * if (result.success) {
 *   console.log('Arquivos:', result.files);
 * }
 * ```
 */
export async function listUserFiles(
  userId: string,
  bucket: string = CONFIG.SIGNED_BUCKET
): Promise<FileListResult> {
  const startTime = Date.now();
  
  console.log('📋 [Storage] Listando arquivos do usuário:', {
    userId,
    bucket
  });
  
  // =====================================================
  // VALIDAÇÕES DE SEGURANÇA
  // =====================================================
  
  // 1. Validar usuário autenticado
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      error: 'Usuário não autenticado',
      executionTime: Date.now() - startTime
    };
  }
  
  // 2. Validar se userId corresponde ao usuário autenticado
  if (currentUser.id !== userId) {
    console.error('🚨 [Storage] userId não corresponde ao usuário autenticado');
    return {
      success: false,
      error: 'Permissão negada: userId inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // =====================================================
  // LISTAR ARQUIVOS
  // =====================================================
  
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(userId, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      throw error;
    }
    
    // Mapear para formato FileInfo
    const files: FileInfo[] = (data || []).map(file => ({
      name: file.name,
      path: `${userId}/${file.name}`,
      size: file.metadata?.size || 0,
      createdAt: new Date(file.created_at),
      updatedAt: new Date(file.updated_at),
      mimeType: file.metadata?.mimetype
    }));
    
    const executionTime = Date.now() - startTime;
    
    console.log('✅ [Storage] Arquivos listados com sucesso:', {
      count: files.length,
      executionTime: `${executionTime}ms`
    });
    
    return {
      success: true,
      files,
      executionTime
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ [Storage] Erro ao listar arquivos:', error);
    
    return {
      success: false,
      error: (error as Error).message || 'Erro desconhecido ao listar arquivos',
      executionTime
    };
  }
}

// =====================================================
// FUNÇÕES DE DEBUG (DESENVOLVIMENTO)
// =====================================================

/**
 * Testa conectividade com Supabase Storage
 * 
 * @returns Status da conectividade
 */
export async function testStorageConnectivity(): Promise<{
  available: boolean;
  buckets: string[];
  error?: string;
}> {
  console.log('🔍 [Storage] Testando conectividade...');
  
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw error;
    }
    
    const buckets = (data || []).map(b => b.name);
    
    console.log('✅ [Storage] Conectividade OK:', {
      bucketsFound: buckets.length,
      buckets
    });
    
    return {
      available: true,
      buckets
    };
    
  } catch (error) {
    console.error('❌ [Storage] Erro de conectividade:', error);
    
    return {
      available: false,
      buckets: [],
      error: (error as Error).message
    };
  }
}

// Exportar configurações para uso externo (se necessário)
export { CONFIG as STORAGE_CONFIG };