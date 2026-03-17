// =====================================================
// AGE VERIFICATION - AWS Textract Integration
// Vero iD - Verificação de idade via documento
// =====================================================

import { supabase } from './supabase';

export interface AgeVerificationResult {
  success: boolean;
  isAdult: boolean;
  age?: number;
  birthDate?: string;
  error?: string;
  confidence?: number;
}

/**
 * Verifica a idade do usuário através do documento de identificação
 * usando AWS Textract para extrair a data de nascimento.
 * 
 * @param documentBase64 - Imagem do documento em base64
 * @param documentType - Tipo do documento (CNH, RG, PASSAPORTE)
 * @returns Resultado da verificação de idade
 */
export async function verifyAgeFromDocument(
  documentBase64: string,
  documentType?: 'CNH' | 'RG' | 'PASSAPORTE'
): Promise<AgeVerificationResult> {
  try {
    console.log('🔍 [AGE-VERIFICATION] Iniciando verificação de idade...');
    console.log('📄 [AGE-VERIFICATION] Tipo de documento:', documentType || 'não especificado');

    // Chama a Edge Function
    const { data, error } = await supabase.functions.invoke('verify-age-textract', {
      body: {
        documentBase64,
        documentType
      }
    });

    if (error) {
      console.error('❌ [AGE-VERIFICATION] Erro ao chamar Edge Function:', error);
      return {
        success: false,
        isAdult: false,
        error: 'Erro ao verificar documento. Tente novamente.'
      };
    }

    console.log('✅ [AGE-VERIFICATION] Resposta recebida:', {
      success: data.success,
      isAdult: data.isAdult,
      age: data.age,
      confidence: data.confidence
    });

    return data as AgeVerificationResult;
  } catch (err) {
    console.error('❌ [AGE-VERIFICATION] Erro inesperado:', err);
    return {
      success: false,
      isAdult: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido'
    };
  }
}

/**
 * Formata a data de nascimento para exibição
 */
export function formatBirthDate(isoDate: string): string {
  try {
    const date = new Date(isoDate);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return isoDate;
  }
}

/**
 * Calcula a idade a partir de uma data ISO
 */
export function calculateAgeFromISO(isoDate: string): number {
  const birthDate = new Date(isoDate);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}