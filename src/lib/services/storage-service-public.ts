/**
 * =====================================================
 * SUPABASE STORAGE SERVICE - PUBLIC DOWNLOADS
 * =====================================================
 * 
 * Serviço para downloads públicos de arquivos quando permitido pelo criador.
 * Não requer autenticação - usado por verificadores de certificados.
 * 
 * @author VeroID Security Team
 * @version 1.0.0
 * @date 2026-04-27
 */

import { supabase } from '@/lib/supabase';

/**
 * Resultado de operação de download público
 */
export interface PublicDownloadResult {
  success: boolean;
  signedUrl?: string;
  expiresAt?: Date;
  error?: string;
  executionTime?: number;
}

/**
 * Gera URL assinada temporária para download público de arquivo
 * (NÃO REQUER AUTENTICAÇÃO - para verificadores)
 * 
 * @param filePath - Path do arquivo no Storage
 * @param expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
 * @param bucket - Bucket onde o arquivo está (padrão: signed-documents)
 * @returns Resultado com URL assinada
 * 
 * @example
 * ```typescript
 * const result = await getPublicSignedDownloadUrl('user-123/signed_file.pdf', 3600);
 * if (result.success) {
 *   window.open(result.signedUrl);
 * }
 * ```
 */
export async function getPublicSignedDownloadUrl(
  filePath: string,
  expiresIn: number = 3600,
  bucket: string = 'signed-documents'
): Promise<PublicDownloadResult> {
  const startTime = Date.now();
  
  console.log('🔗 [Public Storage] Gerando URL assinada para download público:', {
    filePath,
    expiresIn: `${expiresIn}s`,
    bucket
  });
  
  // =====================================================
  // VALIDAÇÕES BÁSICAS (SEM AUTENTICAÇÃO)
  // =====================================================
  
  // 1. Validar path básico
  if (!filePath || typeof filePath !== 'string' || filePath.trim() === '') {
    return {
      success: false,
      error: 'Path de arquivo inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // 2. Validar que não contém path traversal
  if (filePath.includes('..') || filePath.includes('./') || filePath.includes('.\\')) {
    console.error('🚨 [Public Storage] Path traversal detectado:', filePath);
    return {
      success: false,
      error: 'Path de arquivo inválido',
      executionTime: Date.now() - startTime
    };
  }
  
  // =====================================================
  // GERAR URL ASSINADA PÚBLICA
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
    
    console.log('✅ [Public Storage] URL assinada pública gerada com sucesso:', {
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
    console.error('❌ [Public Storage] Erro ao gerar URL assinada pública:', error);
    
    return {
      success: false,
      error: (error as Error).message || 'Erro desconhecido ao gerar URL',
      executionTime
    };
  }
}