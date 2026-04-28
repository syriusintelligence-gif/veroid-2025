/**
 * 📄 CERTIFICATE GENERATOR SERVICE
 * 
 * Serviço para geração de certificados HTML standalone com arquivos embutidos.
 * Resolve o problema de CORS quando certificados são abertos localmente (file://).
 * 
 * @module CertificateGeneratorService
 * @version 1.0.0
 * @date 2026-04-28
 */

import { SignedContent } from '@/lib/supabase-crypto';
import { generateCertificate } from '@/lib/qrcode';
import { supabase } from '@/lib/supabase';

/**
 * Baixa arquivo do Supabase Storage e converte para base64
 */
async function downloadFileAsBase64(
  filePath: string,
  bucket: string = 'signed-documents'
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    console.log('📥 [CertificateGenerator] Baixando arquivo:', { filePath, bucket });

    // Download do arquivo
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error('❌ [CertificateGenerator] Erro ao baixar arquivo:', error);
      return null;
    }

    if (!data) {
      console.error('❌ [CertificateGenerator] Arquivo não encontrado');
      return null;
    }

    // Converte Blob para base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:...;base64," se existir
        const base64Data = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(data);
    });

    const mimeType = data.type || 'application/octet-stream';

    console.log('✅ [CertificateGenerator] Arquivo convertido para base64:', {
      mimeType,
      size: base64.length,
    });

    return { base64, mimeType };
  } catch (error) {
    console.error('❌ [CertificateGenerator] Erro ao processar arquivo:', error);
    return null;
  }
}

/**
 * Gera seção HTML para download de arquivo embutido como base64
 */
function generateEmbeddedFileDownloadHtml(
  fileName: string,
  fileBase64: string,
  mimeType: string,
  fileSize?: number
): string {
  // Formata tamanho do arquivo
  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const fileSizeText = fileSize ? formatFileSize(fileSize) : '';

  return `
    <div class="info-section" style="background: linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #10b981;">
      <div class="info-label" style="color: #065f46; margin-bottom: 12px;">📄 Documento Original Anexado</div>
      <p style="font-size: 14px; color: #047857; margin-bottom: 16px; line-height: 1.6;">
        Este certificado contém o arquivo original anexado. Clique no botão abaixo para baixar:
      </p>
      
      <div style="background: white; padding: 16px; border-radius: 8px; border: 2px solid #10b981; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          <span style="font-size: 32px;">📎</span>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #1f2937; font-size: 14px; margin-bottom: 4px;">${fileName}</div>
            ${fileSizeText ? `<div style="font-size: 12px; color: #6b7280;">${fileSizeText}</div>` : ''}
          </div>
        </div>
        
        <a 
          href="data:${mimeType};base64,${fileBase64}" 
          download="${fileName}"
          style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3); width: 100%; justify-content: center;"
          onmouseover="this.style.background='linear-gradient(135deg, #059669 0%, #047857 100%)'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(16, 185, 129, 0.4)';"
          onmouseout="this.style.background='linear-gradient(135deg, #10b981 0%, #059669 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(16, 185, 129, 0.3)';"
        >
          <span style="font-size: 20px;">⬇️</span>
          <span>Baixar Arquivo Original</span>
        </a>
      </div>
      
      <p style="font-size: 12px; color: #059669; text-align: center;">
        ✅ O arquivo está embutido neste certificado e pode ser baixado mesmo sem conexão com a internet
      </p>
    </div>
  `;
}

/**
 * Gera certificado HTML com arquivo original embutido como base64
 * 
 * Esta função resolve o problema de CORS quando o certificado é aberto localmente (file://).
 * Em vez de tentar baixar o arquivo do Supabase via HTTP (que seria bloqueado), 
 * o arquivo já está incorporado no HTML como data URL base64.
 * 
 * @param content - Dados do conteúdo assinado
 * @returns HTML do certificado com arquivo embutido
 */
export async function generateCertificateWithEmbeddedFile(
  content: SignedContent
): Promise<string> {
  console.log('🎫 [CertificateGenerator] Gerando certificado com arquivo embutido...');
  console.log('📊 [CertificateGenerator] Dados:', {
    id: content.id,
    hasFile: !!content.filePath,
    fileName: content.fileName,
    bucket: content.storageBucket,
  });

  // 1. Gera certificado HTML base (sem arquivo)
  let certificateHtml = generateCertificate(content);

  // 2. Se há arquivo anexado, baixa e incorpora no HTML
  if (content.filePath && content.fileName) {
    console.log('📥 [CertificateGenerator] Baixando arquivo para incorporar...');

    const fileData = await downloadFileAsBase64(
      content.filePath,
      content.storageBucket || 'signed-documents'
    );

    if (fileData) {
      console.log('✅ [CertificateGenerator] Arquivo baixado e convertido para base64');

      // Gera HTML da seção de download com arquivo embutido
      const embeddedFileHtml = generateEmbeddedFileDownloadHtml(
        content.fileName,
        fileData.base64,
        content.mimeType || fileData.mimeType,
        content.fileSize
      );

      // Insere a seção de download ANTES do QR Code
      // Procura pela div do QR Code e insere antes dela
      const qrCodeMarker = '<div class="info-section" style="text-align: center; padding: 30px; background: white; border-radius: 12px; border: 2px dashed #e5e7eb;">';
      
      if (certificateHtml.includes(qrCodeMarker)) {
        certificateHtml = certificateHtml.replace(
          qrCodeMarker,
          embeddedFileHtml + '\n      ' + qrCodeMarker
        );
        console.log('✅ [CertificateGenerator] Seção de download embutido inserida no HTML');
      } else {
        console.warn('⚠️ [CertificateGenerator] Marcador de QR Code não encontrado, inserindo antes do verification code');
        // Fallback: insere antes do código de verificação
        const verificationCodeMarker = '<div class="verification-code">';
        if (certificateHtml.includes(verificationCodeMarker)) {
          certificateHtml = certificateHtml.replace(
            verificationCodeMarker,
            embeddedFileHtml + '\n      ' + verificationCodeMarker
          );
        }
      }
    } else {
      console.warn('⚠️ [CertificateGenerator] Não foi possível baixar arquivo para incorporar');
    }
  } else {
    console.log('ℹ️ [CertificateGenerator] Sem arquivo anexado, gerando certificado padrão');
  }

  console.log('✅ [CertificateGenerator] Certificado gerado com sucesso');
  return certificateHtml;
}