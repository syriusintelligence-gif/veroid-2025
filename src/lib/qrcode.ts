import { SignedContent } from '@/lib/supabase-crypto';
import type { SocialLinks } from './supabase';

/**
 * 🆕 Comprime thumbnail para incluir no QR Code (se for pequena o suficiente)
 * Retorna null se thumbnail for muito grande
 */
function compressThumbnail(thumbnail: string | undefined): string | null {
  if (!thumbnail) return null;
  
  // Se já for uma URL externa, não incluir (seria muito grande)
  if (thumbnail.startsWith('http://') || thumbnail.startsWith('https://')) {
    return null;
  }
  
  // Se for Data URL, verifica o tamanho
  if (thumbnail.startsWith('data:')) {
    // Calcula tamanho aproximado em bytes
    const base64Data = thumbnail.split(',')[1] || '';
    const sizeInBytes = base64Data.length * 0.75; // Base64 é ~33% maior que binário
    
    // Se for menor que 2KB, pode incluir
    if (sizeInBytes < 2048) {
      console.log(`✅ Thumbnail pequena (${Math.round(sizeInBytes)} bytes), incluindo no QR Code`);
      return thumbnail;
    } else {
      console.log(`⚠️ Thumbnail muito grande (${Math.round(sizeInBytes)} bytes), não incluindo no QR Code`);
      return null;
    }
  }
  
  return null;
}

/**
 * Compacta dados do certificado para reduzir tamanho da URL
 * 🆕 AGORA TENTA INCLUIR thumbnail se for pequena o suficiente
 */
function compactContentData(content: SignedContent): string {
  // Tenta comprimir thumbnail
  const compressedThumbnail = compressThumbnail(content.thumbnail);
  
  const compact: Record<string, unknown> = {
    i: content.id,
    c: content.content.substring(0, 200), // Limita conteúdo a 200 chars
    h: content.contentHash.substring(0, 32), // Primeiros 32 chars do hash
    s: content.signature.substring(0, 32), // Primeiros 32 chars da assinatura
    p: content.publicKey.substring(0, 32), // Primeiros 32 chars da chave
    t: content.createdAt, // ✅ CORRIGIDO: usa createdAt em vez de timestamp
    n: content.creatorName,
    v: content.verificationCode,
    pl: content.platforms, // Plataformas (array de strings curtas)
    sl: content.creatorSocialLinks, // Links sociais do criador
  };
  
  // Adiciona thumbnail apenas se for pequena
  if (compressedThumbnail) {
    compact.th = compressedThumbnail;
  }
  
  const jsonStr = JSON.stringify(compact);
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  // Torna URL-safe
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Expande dados compactados de volta para o formato completo
 */
function expandContentData(compact: {
  i: string;
  c: string;
  h: string;
  s: string;
  p: string;
  t: string;
  n: string;
  v: string;
  pl?: string[];
  sl?: SocialLinks;
  th?: string; // 🆕 Thumbnail (opcional)
}): SignedContent {
  return {
    id: compact.i,
    userId: '', // Não disponível na URL compactada
    content: compact.c,
    contentHash: compact.h,
    signature: compact.s,
    publicKey: compact.p,
    createdAt: compact.t, // ✅ CORRIGIDO: usa createdAt
    creatorName: compact.n,
    verificationCode: compact.v,
    platforms: compact.pl,
    creatorSocialLinks: compact.sl,
    thumbnail: compact.th, // 🆕 Thumbnail (se disponível)
    verificationCount: 0,
  };
}

/**
 * Decodifica o conteúdo da URL
 */
export function decodeContentFromUrl(encoded: string): SignedContent | null {
  try {
    // Reverte URL-safe para Base64 padrão
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Adiciona padding se necessário
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const jsonStr = decodeURIComponent(escape(atob(base64)));
    const compact = JSON.parse(jsonStr) as {
      i: string;
      c: string;
      h: string;
      s: string;
      p: string;
      t: string;
      n: string;
      v: string;
      pl?: string[];
      sl?: SocialLinks;
      th?: string; // 🆕 Thumbnail (opcional)
    };
    
    return expandContentData(compact);
  } catch (error) {
    console.error('Erro ao decodificar conteúdo da URL:', error);
    return null;
  }
}

/**
 * Gera dados para QR Code que apontam para visualização pública do certificado
 */
export function generateQRData(signedContent: SignedContent): string {
  // Compacta dados (COM thumbnail se for pequena, COM links sociais)
  const encodedData = compactContentData(signedContent);
  
  // Cria URL pública que qualquer pessoa pode acessar
  const baseUrl = window.location.origin;
  const certificateUrl = `${baseUrl}/certificate?d=${encodedData}`;
  
  console.log(`📊 URL do QR Code gerada (${certificateUrl.length} caracteres)`);
  
  return certificateUrl;
}

/**
 * Decodifica dados do QR Code
 */
export function decodeQRData(qrUrl: string): { id?: string; code?: string; creator?: string } | null {
  try {
    const url = new URL(qrUrl);
    
    // Verifica se é URL de certificado compactada
    const dataParam = url.searchParams.get('d');
    if (dataParam) {
      const content = decodeContentFromUrl(dataParam);
      if (content) {
        return { id: content.id, creator: content.creatorName };
      }
    }
    
    // Verifica se é URL de certificado antiga (data)
    const oldDataParam = url.searchParams.get('data');
    if (oldDataParam) {
      const content = decodeContentFromUrl(oldDataParam);
      if (content) {
        return { id: content.id, creator: content.creatorName };
      }
    }
    
    // Verifica se é URL de verificação com código
    const code = url.searchParams.get('code');
    if (code) {
      return { code };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao decodificar QR Code:', error);
    return null;
  }
}

/**
 * 🆕 MODIFICADO: Gera HTML para TODOS os links sociais do criador
 */
function generateSocialLinksHtml(signedContent: SignedContent): string {
  // ✅ CORRIGIDO: Só verifica se existem links sociais
  if (!signedContent.creatorSocialLinks) {
    console.log('⚠️ Sem links sociais para exibir no HTML');
    return '';
  }

  const relevantLinks: Array<{ platform: string; url: string; icon: string; label: string }> = [];
  const socialLinks = signedContent.creatorSocialLinks;
  
  // Mapeamento de plataformas para ícones e labels
  const platformMap: Record<string, { icon: string; label: string }> = {
    'instagram': { icon: '📷', label: 'Instagram' },
    'facebook': { icon: '👥', label: 'Facebook' },
    'tiktok': { icon: '🎵', label: 'TikTok' },
    'twitter': { icon: '🐦', label: 'Twitter/X' },
    'youtube': { icon: '📺', label: 'YouTube' },
    'linkedin': { icon: '💼', label: 'LinkedIn' },
    'website': { icon: '🌐', label: 'Website' },
  };
  
  // ✅ CORRIGIDO: Itera sobre TODOS os links sociais disponíveis
  Object.entries(socialLinks).forEach(([platform, url]) => {
    if (url && typeof url === 'string' && url.trim() !== '') {
      const mapping = platformMap[platform.toLowerCase()];
      if (mapping) {
        relevantLinks.push({
          platform: platform.toLowerCase(),
          url: url,
          icon: mapping.icon,
          label: mapping.label,
        });
      }
    }
  });

  if (relevantLinks.length === 0) {
    console.log('⚠️ Nenhum link social encontrado');
    return '';
  }

  console.log(`✅ Gerando HTML para ${relevantLinks.length} links sociais`);

  return `
    <div class="info-section" style="background: linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #667eea;">
      <div class="info-label" style="color: #4b5563; margin-bottom: 12px;">Perfis do Criador nas Plataformas</div>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px; line-height: 1.6;">
        Visite os perfis oficiais de <strong>${signedContent.creatorName}</strong>:
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        ${relevantLinks.map(({ url, icon, label }) => `
          <a href="${url}" target="_blank" rel="noopener noreferrer" 
             style="display: inline-flex; align-items: center; gap: 8px; background: white; padding: 10px 16px; border-radius: 25px; border: 2px solid #667eea; text-decoration: none; color: #1f2937; font-weight: 500; font-size: 14px; transition: all 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"
             onmouseover="this.style.background='#667eea'; this.style.color='white'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(102, 126, 234, 0.3)';"
             onmouseout="this.style.background='white'; this.style.color='#1f2937'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)';">
            <span style="font-size: 20px;">${icon}</span>
            <span>${label}</span>
            <span style="font-size: 12px; opacity: 0.6;">🔗</span>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Gera certificado digital em formato HTML moderno
 */
export function generateCertificate(signedContent: SignedContent): string {
  // ✅ CORRIGIDO: usa createdAt em vez de timestamp
  const date = new Date(signedContent.createdAt);
  
  // Verifica se a data é válida
  if (isNaN(date.getTime())) {
    console.error('❌ Data inválida no certificado:', signedContent.createdAt);
    return '';
  }
  
  const formattedDate = date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  console.log(`📅 Data formatada: ${formattedDate} às ${formattedTime}`);
  
  // Gera HTML para thumbnail se existir
  const thumbnailHtml = signedContent.thumbnail ? `
    <div class="info-section">
      <div class="info-label">Preview do Conteúdo</div>
      <div class="info-value" style="padding: 0; overflow: hidden;">
        <img src="${signedContent.thumbnail}" alt="Thumbnail" style="width: 100%; max-height: 400px; object-fit: contain; display: block;">
      </div>
    </div>
  ` : '';
  
  // Gera HTML para plataformas se existirem
  const platformsHtml = signedContent.platforms && signedContent.platforms.length > 0 ? `
    <div class="info-section">
      <div class="info-label">Plataformas de Publicação</div>
      <div class="info-value">
        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
          ${signedContent.platforms.map(platform => {
            const icons: Record<string, string> = {
              Instagram: '📷',
              Facebook: '👥',
              Twitter: '🐦',
              LinkedIn: '💼',
              TikTok: '🎵',
              YouTube: '📺',
              WhatsApp: '💬',
              Telegram: '✈️',
              Website: '🌐',
              Outros: '📱',
            };
            return `<span style="display: inline-flex; align-items: center; gap: 6px; background: white; padding: 6px 12px; border-radius: 20px; border: 2px solid #e5e7eb; font-size: 14px; font-weight: 500;">
              <span style="font-size: 18px;">${icons[platform] || '📱'}</span>
              <span>${platform}</span>
            </span>`;
          }).join('')}
        </div>
      </div>
    </div>
  ` : '';
  
  // 🆕 Gera HTML para TODOS os links sociais
  const socialLinksHtml = generateSocialLinksHtml(signedContent);
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificado Digital - Vero iD</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    
    .certificate {
      background: white;
      max-width: 800px;
      width: 100%;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px;
      text-align: center;
      color: white;
      position: relative;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/></svg>');
      opacity: 0.3;
    }
    
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    
    .header h1 {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 10px;
      position: relative;
    }
    
    .header p {
      font-size: 16px;
      opacity: 0.9;
      position: relative;
    }
    
    .content {
      padding: 40px;
    }
    
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 12px 24px;
      border-radius: 50px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 30px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .info-section {
      margin-bottom: 30px;
    }
    
    .info-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .info-value {
      font-size: 16px;
      color: #1f2937;
      font-weight: 500;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }
    
    .verification-code {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      margin: 30px 0;
    }
    
    .verification-code-label {
      font-size: 14px;
      opacity: 0.9;
      margin-bottom: 10px;
    }
    
    .verification-code-value {
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
    }
    
    .hash-section {
      background: #f9fafb;
      padding: 20px;
      border-radius: 12px;
      margin-top: 20px;
    }
    
    .hash-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 10px;
    }
    
    .hash-value {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #4b5563;
      word-break: break-all;
      line-height: 1.6;
    }
    
    .footer {
      background: #f9fafb;
      padding: 30px 40px;
      border-top: 2px solid #e5e7eb;
    }
    
    .footer-text {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    
    .timestamp {
      text-align: center;
      color: #9ca3af;
      font-size: 12px;
      margin-top: 20px;
    }
    
    @media print {
      body {
        background: white;
      }
      .certificate {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="logo">🛡️</div>
      <h1>Certificado Digital</h1>
      <p>Sistema de Autenticação Vero iD</p>
    </div>
    
    <div class="content">
      <div class="badge">
        ✓ Conteúdo Autenticado
      </div>
      
      ${thumbnailHtml}
      
      <div class="info-section">
        <div class="info-label">Criador do Conteúdo</div>
        <div class="info-value">${signedContent.creatorName}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">Data e Hora da Assinatura</div>
        <div class="info-value">${formattedDate} às ${formattedTime}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">ID do Certificado</div>
        <div class="info-value">${signedContent.id}</div>
      </div>
      
      ${platformsHtml}
      
      ${socialLinksHtml}
      
      <div class="verification-code">
        <div class="verification-code-label">Código de Verificação</div>
        <div class="verification-code-value">${signedContent.verificationCode}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">🔑 Chave Pública do Assinante</div>
        <div class="info-value" style="font-family: 'Courier New', monospace; font-size: 12px; word-break: break-all;">
          ${signedContent.publicKey}
        </div>
      </div>
      
      <div class="hash-section">
        <div class="hash-label">Hash do Conteúdo (SHA-256)</div>
        <div class="hash-value">${signedContent.contentHash}</div>
      </div>
      
      <div class="hash-section">
        <div class="hash-label">Assinatura Digital</div>
        <div class="hash-value">${signedContent.signature}</div>
      </div>
    </div>
    
    <div class="footer">
      <p class="footer-text">
        Este certificado comprova que o conteúdo foi assinado digitalmente por <strong>${signedContent.creatorName}</strong> 
        e não foi alterado desde sua criação. O código de verificação pode ser usado para confirmar a autenticidade deste documento.
      </p>
      
      <p class="timestamp">
        Certificado visualizado em ${new Date().toLocaleString('pt-BR')} • © ${new Date().getFullYear()} Vero iD
      </p>
    </div>
  </div>
</body>
</html>`;
}