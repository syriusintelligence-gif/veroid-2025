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
      
      // Mensagem específica para câmera/foto em tempo real
      const errorMessage = 'Não foi possível validar o documento. Dicas para melhorar a captura:\n\n' +
        '📸 Posicionamento:\n' +
        '• Mantenha o documento paralelo à câmera\n' +
        '• Enquadre todo o documento na tela\n' +
        '• Evite cortar bordas ou cantos\n\n' +
        '💡 Iluminação:\n' +
        '• Use luz natural ou ambiente bem iluminado\n' +
        '• Evite sombras sobre o documento\n' +
        '• Não use flash direto (causa reflexos)\n\n' +
        '✨ Qualidade:\n' +
        '• Mantenha a câmera estável (sem tremor)\n' +
        '• Certifique-se que o texto está legível\n' +
        '• Limpe a lente da câmera';
      
      return {
        success: false,
        isValid: false,
        confidence: 0,
        error: errorMessage
      };
    }</to_replace>
</Editor.edit_file_by_replace>

<Editor.edit_file_by_replace>
<file_name>src/lib/document-validation.ts</file_name>
<to_replace>/**
 * Formata as mensagens de erro para o usuário
 */
export function formatValidationIssues(issues: string[]): string {
  if (!issues || issues.length === 0) {
    return 'Documento não validado';
  }
  
  return issues.join('. ');
}</to_replace>
<new_content>/**
 * Formata as mensagens de erro para o usuário
 */
export function formatValidationIssues(issues: string[]): string {
  if (!issues || issues.length === 0) {
    return 'Documento não validado. Por favor, tente novamente com melhor iluminação e posicionamento.';
  }
  
  // Adiciona dicas de captura ao final das mensagens de erro
  const baseIssues = issues.join('. ');
  const tips = '\n\n💡 Dicas para melhorar a captura:\n' +
    '• Use boa iluminação (luz natural ou ambiente bem iluminado)\n' +
    '• Posicione o documento paralelo à câmera\n' +
    '• Evite sombras e reflexos\n' +
    '• Mantenha a câmera estável';
  
  return baseIssues + tips;
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