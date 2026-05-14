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
import type { CarouselMetadata } from '../types/carousel';

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
 */
export interface FileMetadata {
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
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
 * 🔐 FUNÇÃO APRIMORADA: Assina conteúdo com suporte a carrossel
 */
export async function signContentEnhanced(
  content: string,
  privateKey: string,
  publicKey: string,
  creatorName: string,
  userId: string,
  thumbnail?: string,
  platforms?: string[],
  fileMetadata?: FileMetadata,
  creatorSocialLinks?: SocialLinks,
  allowFileDownload?: boolean,
  carouselMetadata?: CarouselMetadata
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
      hasFile: !!fileMetadata,
      hasSocialLinks: !!creatorSocialLinks,
      hasCarousel: !!carouselMetadata,
    });
  }

  // 🎠 Validar metadados de carrossel se fornecidos
  if (carouselMetadata) {
    console.log('🎠 [CAROUSEL] Metadados de carrossel recebidos:', {
      total_images: carouselMetadata.total_images,
      storage_bucket: carouselMetadata.storage_bucket,
      images_count: carouselMetadata.carousel_images?.length || 0,
    });

    if (!carouselMetadata.storage_bucket || carouselMetadata.storage_bucket.trim() === '') {
      console.error('❌ [CAROUSEL] storage_bucket está vazio');
      return {
        success: false,
        error: 'storage_bucket é obrigatório quando carouselMetadata é fornecido',
        method: 'client_side',
      };
    }

    if (!carouselMetadata.carousel_images || carouselMetadata.carousel_images.length === 0) {
      console.error('❌ [CAROUSEL] carousel_images está vazio');
      return {
        success: false,
        error: 'carousel_images não pode estar vazio quando carouselMetadata é fornecido',
        method: 'client_side',
      };
    }
  }

  // Validar metadados de arquivo se fornecidos
  if (fileMetadata) {
    console.log('📦 [STORAGE] Metadados de arquivo:', fileMetadata);
    
    if (!fileMetadata.file_path || fileMetadata.file_path.trim() === '') {
      return { success: false, error: 'file_path é obrigatório', method: 'client_side' };
    }
    if (!fileMetadata.file_name || fileMetadata.file_name.trim() === '') {
      return { success: false, error: 'file_name é obrigatório', method: 'client_side' };
    }
    if (fileMetadata.file_size <= 0) {
      return { success: false, error: 'file_size deve ser maior que zero', method: 'client_side' };
    }
  }

  // Edge Function (se ativada)
  if (useEdgeFunction) {
    try {
      console.log('🚀 [Enhanced] Usando Edge Function...');
      const edgeResult = await signContentViaEdgeFunction(content, creatorName, userId, thumbnail, platforms);
      
      if (edgeResult.success) {
        console.log('✅ [Enhanced] Edge Function concluída!');
        return { success: true, signedContent: edgeResult.signedContent, method: 'edge_function' };
      }
      
      if (!enableFallback) {
        return { success: false, error: edgeResult.error, method: 'edge_function' };
      }
      console.log('🔄 [Enhanced] Fallback para client-side...');
    } catch (error) {
      if (!enableFallback) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido', method: 'edge_function' };
      }
      console.log('🔄 [Enhanced] Fallback para client-side...');
    }
  }

  // Client-Side
  try {
    console.log('🔐 [Enhanced] Método client-side...');

    const contentHash = await generateHash(content);
    const signatureData = `${contentHash}:${privateKey}:${Date.now()}`;
    const signature = await generateHash(signatureData);
    const verificationCode = generateVerificationCode(signature, contentHash);

    const formattedPlatforms = platforms || null;
    const carouselMetadataForDb = carouselMetadata || null;
    
    if (carouselMetadataForDb) {
      console.log('🎠 [CAROUSEL] Preparando para salvar:', {
        total_images: carouselMetadataForDb.total_images,
        storage_bucket: carouselMetadataForDb.storage_bucket,
        carousel_images_count: carouselMetadataForDb.carousel_images?.length || 0,
      });
    }
    
    const signedContent: SignedContentInsert = {
      user_id: userId,
      content,
      content_hash: contentHash,
      signature,
      public_key: publicKey,
      creator_name: creatorName,
      verification_code: verificationCode,
      thumbnail: thumbnail || null,
      platforms: formattedPlatforms,
      verification_count: 0,
      file_path: fileMetadata?.file_path || null,
      file_name: fileMetadata?.file_name || null,
      file_size: fileMetadata?.file_size || null,
      mime_type: fileMetadata?.mime_type || null,
      storage_bucket: fileMetadata?.storage_bucket || null,
      creator_social_links: creatorSocialLinks || null,
      allow_file_download: fileMetadata ? (allowFileDownload ?? true) : false,
      carousel_metadata: carouselMetadataForDb,
    };

    console.log('💾 [Enhanced] Salvando no banco...');
    const { data, error } = await supabase
      .from('signed_contents')
      .insert(signedContent)
      .select()
      .single();

    if (error) {
      console.error('❌ [Enhanced] Erro ao salvar:', error);
      return { success: false, error: `Erro ao salvar: ${error.message}`, method: 'client_side' };
    }

    console.log('✅ [Enhanced] Salvo com sucesso!');
    console.log('🔍 [DEBUG] Dados salvos:', {
      id: data.id,
      hasCreatorSocialLinks: !!data.creator_social_links,
      hasCarouselMetadata: !!data.carousel_metadata,
    });
    
    if (carouselMetadataForDb) {
      if (!data.carousel_metadata) {
        console.error('❌ [CAROUSEL] CRITICAL: não foi salvo!');
        console.error('🔍 [CAROUSEL] Enviado:', carouselMetadataForDb);
        console.error('🔍 [CAROUSEL] Recebido:', data.carousel_metadata);
      } else {
        console.log('✅ [CAROUSEL] Salvo com sucesso!');
      }
    }

    const finalCreatorSocialLinks = creatorSocialLinks || (data.creator_social_links as SocialLinks | null);
    console.log('✅ [Enhanced] Assinatura concluída!');

    return {
      success: true,
      signedContent: dbSignedContentToAppSignedContent(data, finalCreatorSocialLinks || undefined),
      method: 'client_side',
    };

  } catch (error) {
    console.error('❌ [Enhanced] Erro crítico:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      method: 'client_side',
    };
  }
}

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
    creatorSocialLinks: creatorSocialLinks,
    filePath: dbContent.file_path || undefined,
    fileName: dbContent.file_name || undefined,
    fileSize: dbContent.file_size || undefined,
    mimeType: dbContent.mime_type || undefined,
    storageBucket: dbContent.storage_bucket || undefined,
    allowFileDownload: dbContent.allow_file_download ?? true,
  };
}

export { signContentEnhanced as signContent };