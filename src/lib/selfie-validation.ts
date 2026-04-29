// =====================================================
// SELFIE VALIDATION - USABILITY FIRST
// Vero iD - Sistema híbrido de validação de selfies
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
  mode?: string;
}

/**
 * Validação básica LOCAL de imagem
 * Garante que há uma imagem válida antes de enviar ao backend
 */
function validateImageLocally(selfieBase64: string): { isValid: boolean; reason: string } {
  // Verifica formato base64
  if (!selfieBase64 || typeof selfieBase64 !== 'string') {
    return { isValid: false, reason: 'Dados inválidos' };
  }

  // Verifica tamanho mínimo (5KB = ~6600 caracteres em base64)
  if (selfieBase64.length < 5000) {
    return { isValid: false, reason: 'Imagem muito pequena' };
  }

  // Verifica se tem prefixo data:image ou tamanho suficiente
  const hasValidPrefix = selfieBase64.startsWith('data:image/');
  const hasValidSize = selfieBase64.length > 10000; // ~7.5KB

  if (!hasValidPrefix && !hasValidSize) {
    return { isValid: false, reason: 'Formato de imagem inválido' };
  }

  return { isValid: true, reason: 'OK' };
}

/**
 * Valida selfie usando abordagem híbrida:
 * 1. Validação LOCAL básica (sempre)
 * 2. Validação BACKEND com IA (se disponível)
 * 
 * GARANTIA: NUNCA bloqueia o usuário por problemas técnicos
 * 
 * @param selfieBase64 - Imagem da selfie em base64
 * @returns Resultado da validação
 */
export async function validateSelfie(
  selfieBase64: string
): Promise<SelfieValidationResult> {
  console.log('🔍 [SELFIE-VALIDATION] Iniciando validação híbrida...');

  // ===================================================
  // FASE 1: VALIDAÇÃO LOCAL (BÁSICA)
  // ===================================================
  const localValidation = validateImageLocally(selfieBase64);
  
  if (!localValidation.isValid) {
    console.log('❌ [SELFIE-VALIDATION] Validação local falhou:', localValidation.reason);
    return {
      success: false,
      isValid: false,
      confidence: 0,
      hasHumanFace: false,
      error: 'Por favor, tire uma foto clara do seu rosto.',
      mode: 'local-validation-failed'
    };
  }

  console.log('✅ [SELFIE-VALIDATION] Validação local passou');

  // ===================================================
  // FASE 2: VALIDAÇÃO BACKEND (IA) - OPCIONAL
  // ===================================================
  try {
    console.log('🌐 [SELFIE-VALIDATION] Chamando backend para validação com IA...');
    
    const { data, error } = await supabase.functions.invoke('validate-selfie', {
      body: { selfieBase64 }
    });

    // Se backend responder com sucesso, usar resultado dele
    if (data && !error) {
      console.log('✅ [SELFIE-VALIDATION] Backend respondeu:', {
        isValid: data.isValid,
        confidence: data.confidence,
        mode: data.mode
      });

      return {
        success: true,
        isValid: data.isValid,
        confidence: data.confidence,
        hasHumanFace: data.hasHumanFace,
        issues: data.issues || [],
        message: data.message,
        mode: data.mode || 'backend-validation'
      };
    }

    // Se backend retornou erro, usar validação local (aceitar)
    console.warn('⚠️ [SELFIE-VALIDATION] Backend com erro, usando validação local (aceitar)');
    console.error('Backend error:', error);

    return {
      success: true,
      isValid: true,
      confidence: 0.75,
      hasHumanFace: true,
      issues: [],
      message: 'Selfie aceita (validação local)',
      mode: 'local-fallback'
    };

  } catch (err) {
    // Em caso de erro inesperado, aceitar baseado na validação local
    console.error('❌ [SELFIE-VALIDATION] Erro inesperado, usando validação local (aceitar):', err);
    
    return {
      success: true,
      isValid: true,
      confidence: 0.75,
      hasHumanFace: true,
      issues: [],
      message: 'Selfie aceita (validação local)',
      mode: 'exception-fallback'
    };
  }
}

/**
 * Formata as mensagens de erro para o usuário
 */
export function formatSelfieValidationIssues(issues: string[]): string {
  if (!issues || issues.length === 0) {
    return 'Por favor, tire uma nova foto com seu rosto visível e bem iluminado.';
  }
  
  const baseIssues = issues.join('. ');
  const tips = '\n\n💡 Dicas:\n' +
    '• Posicione seu rosto no centro\n' +
    '• Use boa iluminação\n' +
    '• Certifique-se que seu rosto está visível\n' +
    '• Olhe diretamente para a câmera';
  
  return baseIssues + tips;
}