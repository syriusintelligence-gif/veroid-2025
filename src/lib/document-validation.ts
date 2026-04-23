// =====================================================
// DOCUMENT VALIDATION - Gemini Vision AI Integration
// Vero iD - Validação de documentos de identificação
// =====================================================

import { supabase } from './supabase';

export interface DocumentValidationResult {
  success: boolean;
  isValid: boolean;
  documentType?: 'CNH' | 'RG' | 'PASSAPORTE';
  confidence: number;
  issues?: string[];
  message?: string;
  error?: string;
}

/**
 * Valida se o documento enviado é um documento de identificação válido
 * usando Gemini Vision AI para detectar fraudes e verificar autenticidade.
 * 
 * @param documentBase64 - Imagem do documento em base64
 * @param expectedType - Tipo esperado do documento (opcional)
 * @returns Resultado da validação
 */
export async function validateDocument(
  documentBase64: string,
  expectedType?: 'CNH' | 'RG' | 'PASSAPORTE'
): Promise<DocumentValidationResult> {
  try {
    console.log('🔍 [DOCUMENT-VALIDATION] Iniciando validação com IA...');
    console.log('📄 [DOCUMENT-VALIDATION] Tipo esperado:', expectedType || 'qualquer');

    // Chama a Edge Function
    const { data, error } = await supabase.functions.invoke('validate-document', {
      body: {
        documentBase64,
        documentType: expectedType
      }
    });

    if (error) {
      console.error('❌ [DOCUMENT-VALIDATION] Erro ao chamar Edge Function:', error);
      return {
        success: false,
        isValid: false,
        confidence: 0,
        error: 'Erro ao validar documento. Tente novamente.'
      };
    }

    console.log('✅ [DOCUMENT-VALIDATION] Resposta recebida:', {
      success: data.success,
      isValid: data.isValid,
      documentType: data.documentType,
      confidence: data.confidence,
      issues: data.issues
    });

    return data as DocumentValidationResult;
  } catch (err) {
    console.error('❌ [DOCUMENT-VALIDATION] Erro inesperado:', err);
    return {
      success: false,
      isValid: false,
      confidence: 0,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
}

/**
 * Formata as mensagens de erro para o usuário
 */
export function formatValidationIssues(issues: string[]): string {
  if (!issues || issues.length === 0) {
    return 'Documento não validado';
  }
  
  return issues.join('. ');
}