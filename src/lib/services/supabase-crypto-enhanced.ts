/**
 * 🔐 VERSÃO APRIMORADA DO SUPABASE-CRYPTO
 * 
 * Este módulo estende o supabase-crypto.ts original com suporte opcional
 * à Edge Function, mantendo 100% de compatibilidade com o código existente.
 * 
 * @module SupabaseCryptoEnhanced
 * @version 1.0.0
 * @phase FASE 3 - Integração Frontend
 */

import { supabase } from '../supabase';
import type { Database, SocialLinks } from '../supabase';
import { generateHash, generateVerificationCode } from '../crypto';
import { signContentViaEdgeFunction } from './edge-function-service';
import { isFeatureEnabled, FeatureFlag } from './feature-flags';

// Re-exporta tipos originais para compatibilidade
export type {
  KeyPair,
  SignedContent,
} from '../supabase-crypto';

// Re-exporta funções que não precisam de modificação
export {
  generateKeyPair,
  saveKeyPair,
  getKeyPair,
  getSignedContentsByUserId,
  getAllSignedContents,
  getSignedContentById,
  getSignedContentByVerificationCode,
  incrementVerificationCount,
  verifySignature,
} from '../supabase-crypto';

type KeyPairRow = Database['public']['Tables']['key_pairs']['Row'];
type SignedContentRow = Database['public']['Tables']['signed_contents']['Row'];
type SignedContentInsert = Database['public']['Tables']['signed_contents']['Insert'];

/**
 * Interface para resultado de assinatura
 */
interface SignContentResult {
  success: boolean;
  signedContent?: any;
  error?: string;
  method?: 'edge_function' | 'client_side';
}

/**
 * 🔐 FUNÇÃO APRIMORADA: Assina conteúdo com suporte opcional à Edge Function
 * 
 * Esta função substitui a original `signContent()` com as seguintes melhorias:
 * 
 * 1. **Edge Function (quando ativada):**
 *    - Chama a Edge Function para assinatura server-side
 *    - Chave privada permanece criptografada no servidor
 *    - Maior segurança e conformidade
 * 
 * 2. **Fallback Automático:**
 *    - Se Edge Function falhar e fallback estiver ativo
 *    - Usa o método client-side original
 *    - Garante disponibilidade do serviço
 * 
 * 3. **Compatibilidade Total:**
 *    - Mesma assinatura da função original
 *    - Retorna o mesmo formato de dados
 *    - Zero breaking changes
 * 
 * @param content - Conteúdo a ser assinado
 * @param privateKey - Chave privada (usada apenas no fallback)
 * @param publicKey - Chave pública
 * @param creatorName - Nome do criador
 * @param userId - ID do usuário
 * @param thumbnail - Thumbnail opcional
 * @param platforms - Plataformas sociais
 * @returns Resultado da assinatura
 */
export async function signContentEnhanced(
  content: string,
  privateKey: string,
  publicKey: string,
  creatorName: string,
  userId: string,
  thumbnail?: string,
  platforms?: string[]
): Promise<SignContentResult> {
  const useEdgeFunction = isFeatureEnabled(FeatureFlag.USE_EDGE_FUNCTION_SIGNING);
  const enableFallback = isFeatureEnabled(FeatureFlag.ENABLE_FALLBACK);
  const enableDebug = isFeatureEnabled(FeatureFlag.ENABLE_DEBUG_LOGS);

  if (enableDebug) {
    console.log('🔐 [Enhanced] Iniciando assinatura aprimorada...');
    console.log('📊 [Enhanced] Configuração:', {
      useEdgeFunction,
      enableFallback,
      contentLength: content.length,
      hasThumbnail: !!thumbnail,
      platforms: platforms?.join(', '),
    });
  }

  // 🔐 MÉTODO 1: Edge Function (se ativada)
  if (useEdgeFunction) {
    try {
      console.log('🚀 [Enhanced] Usando Edge Function para assinatura segura...');

      // Busca o ID do par de chaves
      const { data: keyPairData, error: keyPairError } = await supabase
        .from('key_pairs')
        .select('id')
        .eq('user_id', userId)
        .eq('public_key', publicKey)
        .single();

      if (keyPairError || !keyPairData) {
        console.error('❌ [Enhanced] Erro ao buscar par de chaves:', keyPairError);
        throw new Error('Par de chaves não encontrado');
      }

      const keyPairId = keyPairData.id;

      if (enableDebug) {
        console.log('✅ [Enhanced] Par de chaves encontrado:', keyPairId.substring(0, 8) + '...');
      }

      // Chama a Edge Function
      const edgeResult = await signContentViaEdgeFunction(content, userId, keyPairId);

      if (!edgeResult.success) {
        console.error('❌ [Enhanced] Edge Function falhou:', edgeResult.error);
        
        if (!enableFallback) {
          return {
            success: false,
            error: `Edge Function falhou: ${edgeResult.error}`,
            method: 'edge_function',
          };
        }

        console.log('🔄 [Enhanced] Fallback ativo, tentando método client-side...');
        // Continua para o fallback abaixo
      } else {
        // Edge Function teve sucesso!
        console.log('✅ [Enhanced] Assinatura via Edge Function concluída com sucesso!');

        // Gera código de verificação
        const verificationCode = generateVerificationCode(
          edgeResult.signature!,
          edgeResult.contentHash!
        );

        // Salva no banco de dados
        const signedContent: SignedContentInsert = {
          user_id: userId,
          content,
          content_hash: edgeResult.contentHash!,
          signature: edgeResult.signature!,
          public_key: publicKey,
          creator_name: creatorName,
          verification_code: verificationCode,
          thumbnail: thumbnail || null,
          platforms: platforms || null,
          verification_count: 0,
        };

        const { data, error } = await supabase
          .from('signed_contents')
          .insert(signedContent)
          .select()
          .single();

        if (error) {
          console.error('❌ [Enhanced] Erro ao salvar no banco:', error);
          return {
            success: false,
            error: `Erro ao salvar: ${error.message}`,
            method: 'edge_function',
          };
        }

        console.log('✅ [Enhanced] Conteúdo salvo com sucesso! ID:', data.id);

        return {
          success: true,
          signedContent: dbSignedContentToAppSignedContent(data),
          method: 'edge_function',
        };
      }
    } catch (error) {
      console.error('❌ [Enhanced] Erro ao usar Edge Function:', error);

      if (!enableFallback) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          method: 'edge_function',
        };
      }

      console.log('🔄 [Enhanced] Fallback ativo, usando método client-side...');
      // Continua para o fallback abaixo
    }
  }

  // 🔄 MÉTODO 2: Client-Side (fallback ou padrão)
  try {
    console.log('🔐 [Enhanced] Usando método client-side tradicional...');

    // Gera hash do conteúdo
    const contentHash = await generateHash(content);

    // Gera assinatura
    const signatureData = `${contentHash}:${privateKey}:${Date.now()}`;
    const signature = await generateHash(signatureData);

    // Gera código de verificação
    const verificationCode = generateVerificationCode(signature, contentHash);

    // Salva no banco
    const signedContent: SignedContentInsert = {
      user_id: userId,
      content,
      content_hash: contentHash,
      signature,
      public_key: publicKey,
      creator_name: creatorName,
      verification_code: verificationCode,
      thumbnail: thumbnail || null,
      platforms: platforms || null,
      verification_count: 0,
    };

    const { data, error } = await supabase
      .from('signed_contents')
      .insert(signedContent)
      .select()
      .single();

    if (error) {
      console.error('❌ [Enhanced] Erro ao salvar (client-side):', error);
      return {
        success: false,
        error: `Erro ao salvar: ${error.message}`,
        method: 'client_side',
      };
    }

    console.log('✅ [Enhanced] Assinatura client-side concluída com sucesso!');

    return {
      success: true,
      signedContent: dbSignedContentToAppSignedContent(data),
      method: 'client_side',
    };

  } catch (error) {
    console.error('❌ [Enhanced] Erro crítico no fallback:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      method: 'client_side',
    };
  }
}

/**
 * Converte formato do banco para formato da aplicação
 */
function dbSignedContentToAppSignedContent(dbContent: SignedContentRow): any {
  return {
    id: dbContent.id,
    userId: dbContent.user_id,
    content: dbContent.content,
    contentHash: dbContent.content_hash,
    signature: dbContent.signature,
    publicKey: dbContent.public_key,
    createdAt: dbContent.created_at,
    creatorName: dbContent.creator_name,
    verificationCode: dbContent.verification_code,
    thumbnail: dbContent.thumbnail || undefined,
    platforms: dbContent.platforms || undefined,
    verificationCount: dbContent.verification_count,
  };
}

// 🔄 EXPORT ALIAS: Mantém compatibilidade com código existente
// Permite importar como "signContent" em vez de "signContentEnhanced"
export { signContentEnhanced as signContent };