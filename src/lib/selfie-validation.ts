// =====================================================
// SELFIE VALIDATION - Gemini Vision AI Integration
// Vero iD - Validação de selfies com detecção de rosto
// =====================================================

import { supabase } from './supabase';

export interface SelfieValidationResult {
  success: boolean;
  isValid: boolean;
  confidence: number;
  hasHumanFace: boolean;
  issues?: string[];
  message?: string;
  error?: string;
}

/**
 * Valida se a selfie contém um rosto humano real
 * usando Gemini Vision AI para detectar fraudes e verificar autenticidade.
 * 
 * Rejeita:
 * - Objetos inanimados
 * - Paredes ou fundos vazios
 * - Animais
 * - Fotos de documentos
 * - Screenshots ou fotos de outras fotos
 * 
 * @param selfieBase64 - Imagem da selfie em base64
 * @returns Resultado da validação
 */
export async function validateSelfie(
  selfieBase64: string
): Promise<SelfieValidationResult> {
  try {
    console.log('🔍 [SELFIE-VALIDATION] Iniciando validação com IA...');

    // Chama a Edge Function
    const { data, error } = await supabase.functions.invoke('validate-selfie', {
      body: {
        selfieBase64
      }
    });

    if (error) {
      console.error('❌ [SELFIE-VALIDATION] Erro ao chamar Edge Function:', error);
      
      // Em caso de erro de conexão/servidor, informar o usuário
      const errorMessage = 'Erro temporário na validação. Por favor, tente novamente.\n\n' +
        'Se o problema persistir, entre em contato com o suporte.';
      
      return {
        success: false,
        isValid: false,
        confidence: 0,
        hasHumanFace: false,
        error: errorMessage
      };
    }

    console.log('✅ [SELFIE-VALIDATION] Resposta recebida:', {
      success: data.success,
      isValid: data.isValid,
      hasHumanFace: data.hasHumanFace,
      confidence: data.confidence,
      issues: data.issues
    });

    return data as SelfieValidationResult;
  } catch (err) {
    console.error('❌ [SELFIE-VALIDATION] Erro inesperado:', err);
    
    return {
      success: false,
      isValid: false,
      confidence: 0,
      hasHumanFace: false,
      error: 'Erro temporário na validação. Por favor, tente novamente.'
    };
  }
}

/**
 * Formata as mensagens de erro para o usuário
 */
export function formatSelfieValidationIssues(issues: string[]): string {
  if (!issues || issues.length === 0) {
    return 'Selfie não validada. Por favor, tire uma nova foto com seu rosto visível e bem iluminado.';
  }
  
  const baseIssues = issues.join('. ');
  const tips = '\n\n💡 Dicas:\n' +
    '• Certifique-se que é você na foto (não aceita fotos de documentos)\n' +
    '• Use boa iluminação\n' +
    '• Posicione seu rosto no centro\n' +
    '• Olhe diretamente para a câmera';
  
  return baseIssues + tips;
}
