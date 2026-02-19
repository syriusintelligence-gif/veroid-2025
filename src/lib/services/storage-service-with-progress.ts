/**
 * =====================================================
 * SUPABASE STORAGE SERVICE - COM PROGRESSO DE UPLOAD
 * =====================================================
 * 
 * Extensão do storage-service com suporte a callback de progresso.
 * Usa XMLHttpRequest para ter controle granular do upload.
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 * @date 2026-02-19
 */

import { supabase } from '@/lib/supabase';
import { sanitizeFileName } from '@/lib/input-sanitizer';
import { logAuditEvent, AuditAction } from '@/lib/audit-logger';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

/**
 * Callback de progresso do upload
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Resultado de operação de upload com progresso
 */
export interface UploadWithProgressResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
  executionTime?: number;
}

/**
 * Opções de upload com progresso
 */
export interface UploadWithProgressOptions {
  onProgress?: UploadProgressCallback;
  cacheControl?: string;
  contentType?: string;
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const CONFIG = {
  TEMP_BUCKET: 'temp-uploads',
  MAX_FILE_SIZE_TEMP: 200 * 1024 * 1024, // 200MB
  CACHE_CONTROL: '3600',
};

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

/**
 * Formata tamanho de arquivo em formato legível
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

/**
 * Obtém sessão atual para autenticação
 */
async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('❌ [Storage] Erro ao obter sessão:', error);
    return null;
  }
  
  return session;
}

// =====================================================
// FUNÇÃO PRINCIPAL - UPLOAD COM PROGRESSO
// =====================================================

/**
 * Faz upload de arquivo para bucket temporário COM callback de progresso
 * 
 * @param file - Arquivo a ser enviado
 * @param userId - ID do usuário (para criar path)
 * @param options - Opções de upload incluindo callback de progresso
 * @returns Resultado do upload
 * 
 * @example
 * ```typescript
 * const result = await uploadToTempBucketWithProgress(
 *   file, 
 *   'user-123',
 *   {
 *     onProgress: (progress) => {
 *       console.log(`Upload: ${progress}%`);
 *       setUploadProgress(progress);
 *     }
 *   }
 * );
 * ```
 */
export async function uploadToTempBucketWithProgress(
  file: File,
  userId: string,
  options: UploadWithProgressOptions = {}
): Promise<UploadWithProgressResult> {
  const startTime = Date.now();
  
  console.log('📤 [Storage+Progress] Iniciando upload com progresso:', {
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
    console.error('🚨 [Storage+Progress] userId não corresponde ao usuário autenticado');
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
  
  // 4. Obter sessão para autenticação
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: 'Sessão não encontrada',
      executionTime: Date.now() - startTime
    };
  }
  
  // 5. Sanitizar nome do arquivo
  const sanitizedFileName = sanitizeFileName(file.name);
  console.log('🔒 [Storage+Progress] Nome do arquivo sanitizado:', {
    original: file.name,
    sanitized: sanitizedFileName
  });
  
  // 6. Criar path: {user_id}/{timestamp}_{filename}
  const timestamp = Date.now();
  const filePath = `${userId}/${timestamp}_${sanitizedFileName}`;
  
  // =====================================================
  // UPLOAD COM XMLHTTPREQUEST PARA PROGRESSO
  // =====================================================
  
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    
    // Construir URL do Supabase Storage
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${CONFIG.TEMP_BUCKET}/${filePath}`;
    
    // Configurar evento de progresso
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && options.onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        console.log(`📊 [Storage+Progress] Progresso: ${progress}%`);
        options.onProgress(progress);
      }
    });
    
    // Configurar evento de conclusão
    xhr.addEventListener('load', () => {
      const executionTime = Date.now() - startTime;
      
      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('✅ [Storage+Progress] Upload concluído com sucesso:', {
          path: filePath,
          executionTime: `${executionTime}ms`
        });
        
        // Registrar log de auditoria
        logAuditEvent(AuditAction.FILE_UPLOADED, {
          success: true,
          bucket: CONFIG.TEMP_BUCKET,
          filePath: filePath,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          executionTime,
          method: 'XMLHttpRequest'
        }, userId).catch(err => {
          console.warn('⚠️ [Storage+Progress] Erro ao registrar log (não crítico):', err);
        });
        
        // Garantir que progresso chegue a 100%
        if (options.onProgress) {
          options.onProgress(100);
        }
        
        resolve({
          success: true,
          path: filePath,
          executionTime
        });
      } else {
        console.error('❌ [Storage+Progress] Erro no upload:', {
          status: xhr.status,
          response: xhr.responseText
        });
        
        // Registrar log de falha
        logAuditEvent(AuditAction.FILE_UPLOADED, {
          success: false,
          bucket: CONFIG.TEMP_BUCKET,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          error: `HTTP ${xhr.status}: ${xhr.responseText}`,
          executionTime,
          method: 'XMLHttpRequest'
        }, userId).catch(err => {
          console.warn('⚠️ [Storage+Progress] Erro ao registrar log de falha (não crítico):', err);
        });
        
        resolve({
          success: false,
          error: `Erro no upload: HTTP ${xhr.status}`,
          executionTime
        });
      }
    });
    
    // Configurar evento de erro
    xhr.addEventListener('error', () => {
      const executionTime = Date.now() - startTime;
      console.error('❌ [Storage+Progress] Erro de rede no upload');
      
      resolve({
        success: false,
        error: 'Erro de rede durante o upload',
        executionTime
      });
    });
    
    // Configurar evento de abort
    xhr.addEventListener('abort', () => {
      const executionTime = Date.now() - startTime;
      console.warn('⚠️ [Storage+Progress] Upload cancelado');
      
      resolve({
        success: false,
        error: 'Upload cancelado',
        executionTime
      });
    });
    
    // Abrir conexão
    xhr.open('POST', uploadUrl);
    
    // Configurar headers
    xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
    xhr.setRequestHeader('x-upsert', 'false');
    xhr.setRequestHeader('Cache-Control', options.cacheControl ?? CONFIG.CACHE_CONTROL);
    
    // Enviar arquivo
    xhr.send(file);
  });
}