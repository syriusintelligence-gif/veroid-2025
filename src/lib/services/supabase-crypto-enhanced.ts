/**
 * 🔐 VERSÃO APRIMORADA DO SUPABASE-CRYPTO
 * 
 * Este módulo estende o supabase-crypto.ts original com suporte opcional
 * à Edge Function, mantendo 100% de compatibilidade com o código existente.
 * 
 * @module SupabaseCryptoEnhanced
 * @version 1.1.0
 * @phase FASE 3 - Integração Frontend (Storage Metadata)
 */

import { supabase } from '../supabase';
import type { Database, SocialLinks } from '../supabase';
import { generateHash, generateVerificationCode } from '../crypto';
import { signContentViaEdgeFunction } from './edge-function-service';
import { isFeatureEnabled, FeatureFlag } from './feature-flags';
import type { SignedContent } from '../supabase-crypto';

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

type SignedContentRow = Database['public']['Tables']['signed_contents']['Row'];
type SignedContentInsert = Database['public']['Tables']['signed_contents']['Insert'];

/**
 * 🆕 Interface para metadados de arquivo
 * 
 * Representa informações sobre o arquivo original anexado ao conteúdo assinado.
 * Todos os campos são obrigatórios quando um arquivo é anexado.
 */
export interface FileMetadata {
  /** Path completo do arquivo no Storage (ex: "user_id/signed_timestamp_file.pdf") */
  file_path: string;
  
  /** Nome original do arquivo (ex: "documento.pdf") */
  file_name: string;
  
  /** Tamanho do arquivo em bytes (ex: 1234567) */
  file_size: number;
  
  /** MIME type do arquivo (ex: "application/pdf") */
  mime_type: string;
  
  /** Nome do bucket onde o arquivo está armazenado (ex: "signed-documents") */
  storage_bucket: string;
}

/**
 * Interface para resultado de assinatura
 */
interface SignContentResult {
  success: boolean;
  signedContent?: SignedContent;
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
 * 4. **🆕 Suporte a Arquivos (FASE 3):**
 *    - Aceita metadados de arquivo opcional
 *    - Salva informações do arquivo no banco
 *    - Mantém compatibilidade retroativa (fileMetadata é opcional)
 * 
 * @param content - Conteúdo a ser assinado
 * @param privateKey - Chave privada (usada apenas no fallback)
 * @param publicKey - Chave pública
 * @param creatorName - Nome do criador
 * @param userId - ID do usuário
 * @param thumbnail - Thumbnail opcional
 * @param platforms - Plataformas sociais
 * @param fileMetadata - 🆕 Metadados do arquivo anexado (opcional)
 * @returns Resultado da assinatura
 */
export async function signContentEnhanced(
  content: string,
  privateKey: string,
  publicKey: string,
  creatorName: string,
  userId: string,
  thumbnail?: string,
  platforms?: string[],
  fileMetadata?: FileMetadata // 🆕 Novo parâmetro opcional
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
      hasFile: !!fileMetadata, // 🆕 Log de arquivo
    });
  }

  // 🆕 Validar metadados de arquivo se fornecidos
  if (fileMetadata) {
    console.log('📦 [STORAGE] Metadados de arquivo:', {
      file_path: fileMetadata.file_path,
      file_name: fileMetadata.file_name,
      file_size: fileMetadata.file_size,
      mime_type: fileMetadata.mime_type,
      storage_bucket: fileMetadata.storage_bucket,
    });

    // Validações básicas
    if (!fileMetadata.file_path || fileMetadata.file_path.trim() === '') {
      console.error('❌ [STORAGE] file_path está vazio');
      return {
        success: false,
        error: 'file_path é obrigatório quando fileMetadata é fornecido',
        method: 'client_side',
      };
    }

    if (!fileMetadata.file_name || fileMetadata.file_name.trim() === '') {
      console.error('❌ [STORAGE] file_name está vazio');
      return {
        success: false,
        error: 'file_name é obrigatório quando fileMetadata é fornecido',
        method: 'client_side',
      };
    }

    if (fileMetadata.file_size <= 0) {
      console.error('❌ [STORAGE] file_size inválido:', fileMetadata.file_size);
      return {
        success: false,
        error: 'file_size deve ser maior que zero',
        method: 'client_side',
      };
    }

    // Validar estrutura do path: deve ser "user_id/filename"
    const pathParts = fileMetadata.file_path.split('/');
    if (pathParts.length !== 2) {
      console.error('❌ [STORAGE] Estrutura de path inválida:', fileMetadata.file_path);
      return {
        success: false,
        error: 'file_path deve ter formato: user_id/filename',
        method: 'client_side',
      };
    }

    // Validar se user_id no path corresponde ao userId fornecido
    if (pathParts[0] !== userId) {
      console.error('❌ [STORAGE] user_id no path não corresponde:', {
        pathUserId: pathParts[0],
        expectedUserId: userId,
      });
      return {
        success: false,
        error: 'user_id no file_path não corresponde ao userId fornecido',
        method: 'client_side',
      };
    }
  }

  // 🔐 MÉTODO 1: Edge Function (se ativada)
  if (useEdgeFunction) {
    try {
      console.log('🚀 [Enhanced] Usando Edge Function para assinatura segura...');

      if (enableDebug) {
        console.log('✅ [Enhanced] Parâmetros preparados para Edge Function:', {
          contentLength: content.length,
          creatorName,
          userId: userId.substring(0, 8) + '...',
          hasThumbnail: !!thumbnail,
          platforms: platforms?.length || 0,
          hasFile: !!fileMetadata, // 🆕
        });
      }

      // Chama a Edge Function com todos os parâmetros necessários
      const edgeResult = await signContentViaEdgeFunction(
        content,
        creatorName,
        userId,
        thumbnail,
        platforms
      );

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

        if (enableDebug) {
          console.log('📊 [Enhanced] Resultado final:', {
            success: true,
            method: 'edge_function',
            contentId: edgeResult.signedContent?.id,
            executionTime: edgeResult.executionTime,
          });
        }

        return {
          success: true,
          signedContent: edgeResult.signedContent,
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

    // 🆕 Preparar objeto de inserção com metadados de arquivo
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
      // 🆕 FASE 3: Adicionar metadados de arquivo
      file_path: fileMetadata?.file_path || null,
      file_name: fileMetadata?.file_name || null,
      file_size: fileMetadata?.file_size || null,
      mime_type: fileMetadata?.mime_type || null,
      storage_bucket: fileMetadata?.storage_bucket || null,
    };

    console.log('💾 [Enhanced] Salvando conteúdo no banco...');
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

    console.log('✅ [Enhanced] Conteúdo salvo com sucesso!');
    console.log('🔍 [Enhanced] Buscando links sociais do criador...');

    // 🆕 CORREÇÃO CRÍTICA: Busca o conteúdo completo com links sociais
    const { data: fullContentData, error: fetchError } = await supabase
      .from('signed_contents')
      .select(`
        *,
        users!signed_contents_user_id_fkey(social_links)
      `)
      .eq('id', data.id)
      .single();

    if (fetchError || !fullContentData) {
      console.warn('⚠️ [Enhanced] Erro ao buscar links sociais, usando dados básicos');
      return {
        success: true,
        signedContent: dbSignedContentToAppSignedContent(data),
        method: 'client_side',
      };
    }

    // Extrai links sociais do criador
    let creatorSocialLinks: SocialLinks | undefined = undefined;
    if (fullContentData.users && typeof fullContentData.users === 'object' && 'social_links' in fullContentData.users) {
      creatorSocialLinks = fullContentData.users.social_links as SocialLinks;
      console.log('✅ [Enhanced] Links sociais encontrados:', creatorSocialLinks);
    } else {
      console.log('⚠️ [Enhanced] Nenhum link social encontrado');
    }

    console.log('✅ [Enhanced] Assinatura client-side concluída com sucesso!');

    return {
      success: true,
      signedContent: dbSignedContentToAppSignedContent(fullContentData, creatorSocialLinks),
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
 * 🆕 MODIFICADO: Converte formato do banco para formato da aplicação
 * Agora aceita creatorSocialLinks como parâmetro opcional
 */
function dbSignedContentToAppSignedContent(
  dbContent: SignedContentRow,
  creatorSocialLinks?: SocialLinks
): SignedContent {
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
    creatorSocialLinks: creatorSocialLinks, // 🆕 Adiciona links sociais
    // 🆕 FASE 3: Adicionar metadados de arquivo ao tipo retornado
    filePath: dbContent.file_path || undefined,
    fileName: dbContent.file_name || undefined,
    fileSize: dbContent.file_size || undefined,
    mimeType: dbContent.mime_type || undefined,
    storageBucket: dbContent.storage_bucket || undefined,
  };
}

// 🔄 EXPORT ALIAS: Mantém compatibilidade com código existente
// Permite importar como "signContent" em vez de "signContentEnhanced"
export { signContentEnhanced as signContent };