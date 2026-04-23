// =====================================================
// SELFIE VALIDATION - Gemini Vision AI Integration
// Vero iD - Validação de selfie com detecção de rosto humano
// =====================================================

import { supabase } from './supabase';

export interface SelfieValidationResult {
  success: boolean;
  isValid: boolean;
  hasHumanFace: boolean;
  confidence: number;
  issues?: string[];
  message?: string;
  error?: string;
}

/**
 * Valida se a selfie contém um rosto humano real
 * usando Gemini Vision AI para detectar rostos humanos.
 * 
 * @param selfieBase64 - Imagem da selfie em base64
 * @returns Resultado da validação
 */
export async function validateSelfie(
  selfieBase64: string
): Promise<SelfieValidationResult> {
  try {
    console.log('🔍 [SELFIE-VALIDATION] Iniciando validação de rosto humano...');

    // Chama a Edge Function
    const { data, error } = await supabase.functions.invoke('validate-selfie', {
      body: {
        selfieBase64
      }
    });

    if (error) {
      console.error('❌ [SELFIE-VALIDATION] Erro ao chamar Edge Function:', error);
      
      const errorMessage = 'Não foi possível validar a selfie. Dicas para melhorar a captura:\n\n' +
        '📸 Posicionamento:\n' +
        '• Centralize seu rosto na câmera\n' +
        '• Mantenha uma distância de 30-50cm\n' +
        '• Olhe diretamente para a câmera\n\n' +
        '💡 Iluminação:\n' +
        '• Use luz natural ou ambiente bem iluminado\n' +
        '• Evite contraluz (luz forte atrás de você)\n' +
        '• Ilumine seu rosto de frente\n\n' +
        '✨ Qualidade:\n' +
        '• Mantenha a câmera estável\n' +
        '• Certifique-se que seu rosto está visível\n' +
        '• Remova óculos escuros ou objetos que cubram o rosto';
      
      return {
        success: false,
        isValid: false,
        hasHumanFace: false,
        confidence: 0,
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
      hasHumanFace: false,
      confidence: 0,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
}

/**
 * Formata as mensagens de erro para o usuário
 */
export function formatSelfieValidationIssues(issues: string[]): string {
  if (!issues || issues.length === 0) {
    return 'Selfie não validada. Por favor, tire uma foto do seu rosto.';
  }
  
  const baseIssues = issues.join('. ');
  const tips = '\n\n💡 Dicas para uma boa selfie:\n' +
    '• Tire a foto em ambiente bem iluminado\n' +
    '• Posicione seu rosto no centro da câmera\n' +
    '• Remova óculos escuros, bonés ou máscaras\n' +
    '• Olhe diretamente para a câmera';
  
  return baseIssues + tips;
}