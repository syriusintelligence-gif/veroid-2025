import { SignedContent } from '@/lib/supabase-crypto';

/**
 * Compacta dados do certificado para reduzir tamanho da URL
 * IMPORTANTE: NÃO inclui thumbnail para evitar URLs muito longas
 */
function compactContentData(content: SignedContent): string {
  // Usa apenas os dados essenciais e trunca hashes longos
  // NÃO inclui thumbnail (th) pois tornaria a URL muito grande para QR Code
  const compact = {
    i: content.id,
    c: content.content.substring(0, 200), // Limita conteúdo a 200 chars
    h: content.contentHash.substring(0, 32), // Primeiros 32 chars do hash
    s: content.signature.substring(0, 32), // Primeiros 32 chars da assinatura
    p: content.publicKey.substring(0, 32), // Primeiros 32 chars da chave
    t: content.createdAt,
    n: content.creatorName,
    v: content.verificationCode,
    pl: content.platforms, // Plataformas (array de strings curtas)
  };
  
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
}): SignedContent {
  return {
    id: compact.i,
    userId: '', // Não disponível na URL compactada
    content: compact.c,
    contentHash: compact.h,
    signature: compact.s,
    publicKey: compact.p,
    createdAt: compact.t,
    creatorName: compact.n,
    verificationCode: compact.v,
    platforms: compact.pl,
    verificationCount: 0,
    // thumbnail não vem da URL, será buscado do localStorage se disponível
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
  // Compacta dados para reduzir tamanho (sem thumbnail)
  const encodedData = compactContentData(signedContent);
  
  // Cria URL pública que qualquer pessoa pode acessar
  // MUDANÇA: Usando /certificate ao invés de /c para evitar 404 no Vercel
  const baseUrl = window.location.origin;
  const certificateUrl = `${baseUrl}/certificate?d=${encodedData}`;
  
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
 * Gera certificado digital em formato HTML moderno
 */
export function generateCertificate(signedContent: SignedContent): string {
  const date = new Date(signedContent.createdAt);
  const formattedDate = date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  });
  const formattedTime = date.toLocaleTimeString('pt-BR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
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
      
      ${platformsHtml}
      
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