/**
 * 🔐 SERVIÇO DE INTEGRAÇÃO COM EDGE FUNCTION
 * 
 * Este módulo fornece integração segura com a Edge Function de assinatura
 * sem modificar o código existente. Pode ser ativado/desativado via feature flag.
 * 
 * @module EdgeFunctionService
 * @version 1.0.0
 * @phase FASE 3 - Integração Frontend
 */

import { supabase } from '../supabase';

/**
 * Configuração do serviço
 */
const CONFIG = {
  EDGE_FUNCTION_URL: 'https://muqjeukjyfhwtbynrxkm.supabase.co/functions/v1/sign-content',
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // ms
  TIMEOUT: 30000, // 30 segundos
};

/**
 * Interface para o resultado da assinatura via Edge Function
 */
export interface EdgeFunctionSignResult {
  success: boolean;
  signature?: string;
  contentHash?: string;
  error?: string;
  timestamp?: string;
  executionTime?: number;
}

/**
 * Interface para os dados de entrada da Edge Function
 */
export interface SignContentRequest {
  content: string;
  userId: string;
  keyPairId: string;
}

/**
 * 🔐 Assina conteúdo usando a Edge Function (servidor-side)
 * 
 * Esta função substitui a assinatura client-side por uma chamada segura
 * à Edge Function, onde a chave privada permanece criptografada no servidor.
 * 
 * @param content - Conteúdo a ser assinado
 * @param userId - ID do usuário
 * @param keyPairId - ID do par de chaves no banco
 * @returns Resultado da assinatura com hash e signature
 * 
 * @example
 * ```typescript
 * const result = await signContentViaEdgeFunction(
 *   'Meu conteúdo',
 *   'user-123',
 *   'keypair-456'
 * );
 * 
 * if (result.success) {
 *   console.log('Assinatura:', result.signature);
 *   console.log('Hash:', result.contentHash);
 * }
 * ```
 */
export async function signContentViaEdgeFunction(
  content: string,
  userId: string,
  keyPairId: string
): Promise<EdgeFunctionSignResult> {
  const startTime = Date.now();
  
  console.log('🔐 [EdgeFunction] Iniciando assinatura segura via Edge Function...');
  console.log('📊 [EdgeFunction] Dados:', {
    contentLength: content.length,
    userId: userId.substring(0, 8) + '...',
    keyPairId: keyPairId.substring(0, 8) + '...',
  });

  try {
    // Obtém o token de autenticação atual
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ [EdgeFunction] Sessão não encontrada');
      return {
        success: false,
        error: 'Sessão expirada. Por favor, faça login novamente.',
      };
    }

    console.log('✅ [EdgeFunction] Token de autenticação obtido');

    // Prepara o payload
    const payload: SignContentRequest = {
      content,
      userId,
      keyPairId,
    };

    console.log('📤 [EdgeFunction] Enviando requisição para:', CONFIG.EDGE_FUNCTION_URL);

    // Faz a chamada à Edge Function com retry logic
    const result = await callEdgeFunctionWithRetry(payload, session.access_token);

    const executionTime = Date.now() - startTime;
    console.log(`✅ [EdgeFunction] Assinatura concluída em ${executionTime}ms`);

    return {
      ...result,
      executionTime,
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ [EdgeFunction] Erro crítico:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao assinar conteúdo',
      executionTime,
    };
  }
}

/**
 * 🔄 Chama a Edge Function com lógica de retry
 * 
 * @param payload - Dados a serem enviados
 * @param accessToken - Token JWT para autenticação
 * @returns Resultado da assinatura
 */
async function callEdgeFunctionWithRetry(
  payload: SignContentRequest,
  accessToken: string
): Promise<EdgeFunctionSignResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 [EdgeFunction] Tentativa ${attempt}/${CONFIG.MAX_RETRIES}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT);

      const response = await fetch(CONFIG.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`📥 [EdgeFunction] Resposta recebida: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [EdgeFunction] Erro na resposta:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });

        throw new Error(`Edge Function retornou erro ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ [EdgeFunction] Resposta parseada com sucesso');

      // Valida a resposta
      if (!result.signature || !result.contentHash) {
        console.error('❌ [EdgeFunction] Resposta inválida:', result);
        throw new Error('Resposta da Edge Function está incompleta');
      }

      return {
        success: true,
        signature: result.signature,
        contentHash: result.contentHash,
        timestamp: result.timestamp,
      };

    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro desconhecido');
      
      console.warn(`⚠️ [EdgeFunction] Tentativa ${attempt} falhou:`, lastError.message);

      // Se não for a última tentativa, aguarda antes de tentar novamente
      if (attempt < CONFIG.MAX_RETRIES) {
        const delay = CONFIG.RETRY_DELAY * attempt; // Backoff exponencial
        console.log(`⏳ [EdgeFunction] Aguardando ${delay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Se chegou aqui, todas as tentativas falharam
  console.error(`❌ [EdgeFunction] Todas as ${CONFIG.MAX_RETRIES} tentativas falharam`);
  
  return {
    success: false,
    error: `Falha após ${CONFIG.MAX_RETRIES} tentativas: ${lastError?.message || 'Erro desconhecido'}`,
  };
}

/**
 * 🧪 Testa a conectividade com a Edge Function
 * 
 * Útil para diagnóstico e verificação de saúde do serviço.
 * 
 * @returns Status da Edge Function
 */
export async function testEdgeFunctionConnectivity(): Promise<{
  available: boolean;
  responseTime?: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    console.log('🧪 [EdgeFunction] Testando conectividade...');

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return {
        available: false,
        error: 'Sessão não encontrada',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos para teste

    const response = await fetch(CONFIG.EDGE_FUNCTION_URL, {
      method: 'OPTIONS', // Preflight request
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (response.ok || response.status === 405) { // 405 = Method Not Allowed é OK para OPTIONS
      console.log(`✅ [EdgeFunction] Conectividade OK (${responseTime}ms)`);
      return {
        available: true,
        responseTime,
      };
    }

    console.warn(`⚠️ [EdgeFunction] Status inesperado: ${response.status}`);
    return {
      available: false,
      responseTime,
      error: `Status HTTP ${response.status}`,
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('❌ [EdgeFunction] Erro ao testar conectividade:', error);
    
    return {
      available: false,
      responseTime,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * 📊 Obtém estatísticas de uso da Edge Function
 * 
 * @returns Estatísticas agregadas
 */
export function getEdgeFunctionStats(): {
  url: string;
  maxRetries: number;
  timeout: number;
} {
  return {
    url: CONFIG.EDGE_FUNCTION_URL,
    maxRetries: CONFIG.MAX_RETRIES,
    timeout: CONFIG.TIMEOUT,
  };
}