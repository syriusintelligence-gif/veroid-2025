import { SignedContent } from '@/lib/supabase-crypto';
import type { SocialLinks } from './supabase';

/**
 * 🆕 VERSÃO ULTRA-COMPACTA: Apenas dados essenciais para buscar no Supabase
 * Reduz URL de ~800 chars para ~150 chars
 */
function compactContentData(content: SignedContent): string {
  console.log('📊 [compactContentData] Gerando URL ultra-compacta...');
  
  // 🆕 APENAS ID E CÓDIGO DE VERIFICAÇÃO
  // Todos os outros dados serão buscados do Supabase
  const compact = {
    i: content.id,                    // ID do certificado (UUID)
    v: content.verificationCode,      // Código de verificação
    n: content.creatorName,           // Nome do criador (para fallback)
  };
  
  const jsonStr = JSON.stringify(compact);
  console.log(`✅ [compactContentData] JSON compactado: ${jsonStr.length} bytes`);
  console.log(`📊 [compactContentData] Conteúdo: ${jsonStr}`);
  
  const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
  // Torna URL-safe
  const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  
  console.log(`✅ [compactContentData] URL final: ${urlSafe.length} caracteres`);
  
  return urlSafe;
}

/**
 * Expande dados compactados de volta para o formato completo
 * 🆕 VERSÃO MÍNIMA: Apenas ID, código e nome
 */
function expandContentData(compact: {
  i: string;
  v: string;
  n: string;
}): SignedContent {
  console.log('📊 [expandContentData] Expandindo dados mínimos...');
  console.log('📊 [expandContentData] ID:', compact.i);
  console.log('📊 [expandContentData] Código:', compact.v);
  
  // 🆕 RETORNA APENAS DADOS MÍNIMOS
  // Certificate.tsx vai buscar dados completos do Supabase usando o ID
  return {
    id: compact.i,
    userId: '', // Será preenchido pelo Supabase
    content: '', // Será preenchido pelo Supabase
    contentHash: '', // Será preenchido pelo Supabase
    signature: '', // Será preenchido pelo Supabase
    publicKey: '', // Será preenchido pelo Supabase
    createdAt: new Date().toISOString(), // Será preenchido pelo Supabase
    creatorName: compact.n,
    verificationCode: compact.v,
    platforms: [], // Será preenchido pelo Supabase
    creatorSocialLinks: undefined, // Será preenchido pelo Supabase
    thumbnail: undefined, // Será preenchido pelo Supabase
    verificationCount: 0,
  };
}

/**
 * Decodifica o conteúdo da URL
 */
export function decodeContentFromUrl(encoded: string): SignedContent | null {
  try {
    console.log('🔍 [decodeContentFromUrl] Decodificando URL...');
    console.log('📊 [decodeContentFromUrl] Tamanho: ', encoded.length, 'caracteres');
    
    // Reverte URL-safe para Base64 padrão
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    // Adiciona padding se necessário
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const jsonStr = decodeURIComponent(escape(atob(base64)));
    console.log('📊 [decodeContentFromUrl] JSON decodificado:', jsonStr);
    
    const compact = JSON.parse(jsonStr) as {
      i: string;
      v: string;
      n: string;
    };
    
    console.log('✅ [decodeContentFromUrl] Dados expandidos com sucesso');
    return expandContentData(compact);
  } catch (error) {
    console.error('❌ [decodeContentFromUrl] Erro ao decodificar:', error);
    console.error('📊 [decodeContentFromUrl] URL recebida:', encoded);
    return null;
  }
}

/**
 * Gera dados para QR Code que apontam para visualização pública do certificado
 */
export function generateQRData(signedContent: SignedContent): string {
  // Compacta dados (APENAS ID, CÓDIGO E NOME)
  const encodedData = compactContentData(signedContent);
  
  // Cria URL pública que qualquer pessoa pode acessar
  const baseUrl = window.location.origin;
  const certificateUrl = `${baseUrl}/certificate?d=${encodedData}`;
  
  console.log(`✅ [generateQRData] URL do QR Code gerada (${certificateUrl.length} caracteres)`);
  console.log(`📊 [generateQRData] URL completa: ${certificateUrl}`);
  
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
 * 🆕 CORRIGIDO: Extrai o texto/descrição do conteúdo assinado
 * O conteúdo é salvo no formato:
 * Título: xxx
 * Tipo: xxx
 * Redes: xxx
 * Arquivo: xxx (opcional)
 * 
 * Conteúdo:
 * [texto do usuário]
 */
function extractContentDescription(fullContent: string): { title: string; description: string } {
  console.log('📝 [extractContentDescription] Extraindo descrição do conteúdo...');
  console.log('📝 [extractContentDescription] Conteúdo completo recebido:', fullContent.substring(0, 200) + '...');
  
  // Procura pelo marcador "Conteúdo:" e extrai o texto após ele
  const contentMarker = 'Conteúdo:';
  const contentIndex = fullContent.indexOf(contentMarker);
  
  let description = '';
  let title = '';
  
  // Extrai o título - busca por "Título:" no início
  const titleMatch = fullContent.match(/Título:\s*(.+?)(?:\n|$)/);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
    console.log('📝 [extractContentDescription] Título encontrado:', title);
  } else {
    console.log('⚠️ [extractContentDescription] Título NÃO encontrado no conteúdo');
  }
  
  // Extrai a descrição (texto após "Conteúdo:")
  if (contentIndex !== -1) {
    description = fullContent.substring(contentIndex + contentMarker.length).trim();
    console.log('📝 [extractContentDescription] Descrição encontrada:', description.substring(0, 100) + (description.length > 100 ? '...' : ''));
  } else {
    // Se não encontrar "Conteúdo:", usa o conteúdo completo como descrição
    description = fullContent;
    console.log('⚠️ [extractContentDescription] Marcador "Conteúdo:" NÃO encontrado, usando conteúdo completo');
  }
  
  console.log('📝 [extractContentDescription] Resultado final:', { title, descriptionLength: description.length });
  
  return { title, description };
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

  // 🆕 Função auxiliar para garantir protocolo na URL
  const ensureProtocol = (url: string): string => {
    if (!url) return '';
    const trimmedUrl = url.trim();
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    return `https://${trimmedUrl}`;
  };

  return `
    <div class="info-section" style="background: linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #667eea;">
      <div class="info-label" style="color: #4b5563; margin-bottom: 12px;">🔗 Perfis Oficiais do Criador</div>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px; line-height: 1.6;">
        Visite os perfis oficiais de <strong>${signedContent.creatorName}</strong>:
      </p>
      <div style="display: flex; flex-wrap: wrap; gap: 10px;">
        ${relevantLinks.map(({ url, icon, label }) => `
          <a href="${ensureProtocol(url)}" target="_blank" rel="noopener noreferrer" 
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
 * 🆕 Gera QR Code SVG inline para o HTML do certificado
 */
function generateQRCodeSVG(qrData: string): string {
  // Usa a biblioteca qrcode para gerar o SVG
  // Como estamos no backend, vamos gerar um placeholder
  // O QR Code real será gerado pelo navegador usando a biblioteca qrcode.react
  
  const encodedUrl = encodeURIComponent(qrData);
  
  return `
    <div class="info-section" style="text-align: center; padding: 30px; background: white; border-radius: 12px; border: 2px dashed #e5e7eb;">
      <div class="info-label" style="margin-bottom: 15px;">QR Code para Verificação</div>
      <div style="display: inline-block; padding: 20px; background: white; border-radius: 12px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodedUrl}" 
             alt="QR Code" 
             style="width: 250px; height: 250px; display: block;" />
      </div>
      <p style="font-size: 12px; color: #6b7280; margin-top: 15px;">
        Escaneie este QR Code para verificar a autenticidade do certificado
      </p>
      <p style="font-size: 10px; color: #9ca3af; margin-top: 5px; word-break: break-all;">
        ${qrData.substring(0, 60)}...
      </p>
    </div>
  `;
}

/**
 * 🆕 CORRIGIDO: Gera certificado digital em formato HTML moderno
 * Agora inclui:
 * - Thumbnail/Preview do conteúdo
 * - Título e Descrição do conteúdo
 * - Links sociais do criador
 */
export function generateCertificate(signedContent: SignedContent): string {
  console.log('🎫 [generateCertificate] Iniciando geração do certificado...');
  console.log('📊 [generateCertificate] Dados recebidos:', {
    id: signedContent.id,
    creatorName: signedContent.creatorName,
    contentLength: signedContent.content?.length || 0,
    hasContent: !!signedContent.content,
    hasThumbnail: !!signedContent.thumbnail,
    hasSocialLinks: !!signedContent.creatorSocialLinks,
  });
  
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
  
  // 🆕 CORREÇÃO: Extrai título e descrição do conteúdo
  let title = '';
  let description = '';
  
  if (signedContent.content && signedContent.content.trim() !== '') {
    const extracted = extractContentDescription(signedContent.content);
    title = extracted.title;
    description = extracted.description;
    console.log('📝 [generateCertificate] Título extraído:', title);
    console.log('📝 [generateCertificate] Descrição extraída (primeiros 100 chars):', description.substring(0, 100));
  } else {
    console.log('⚠️ [generateCertificate] Conteúdo vazio ou não disponível');
  }
  
  // 🆕 CORREÇÃO: Gera HTML para thumbnail se existir
  const thumbnailHtml = signedContent.thumbnail ? `
    <div class="info-section">
      <div class="info-label">📸 Preview do Conteúdo</div>
      <div class="info-value" style="padding: 0; overflow: hidden; background: #f8fafc;">
        <img src="${signedContent.thumbnail}" 
             alt="Preview do conteúdo" 
             style="width: 100%; max-height: 400px; object-fit: contain; display: block;"
             onerror="this.parentElement.innerHTML='<div style=\\'padding: 40px; text-align: center; color: #9ca3af;\\'>⚠️ Imagem não disponível</div>';">
      </div>
    </div>
  ` : '';
  
  // 🆕 CORREÇÃO: Gera HTML para título se existir
  const titleHtml = title ? `
    <div class="info-section">
      <div class="info-label">📌 Título do Conteúdo</div>
      <div class="info-value" style="font-size: 18px; font-weight: 600; color: #1e40af;">
        ${title}
      </div>
    </div>
  ` : '';
  
  // 🆕 CORREÇÃO: Gera HTML para descrição se existir
  const descriptionHtml = description && description.trim() !== '' ? `
    <div class="info-section">
      <div class="info-label">📝 Descrição / Conteúdo</div>
      <div class="info-value" style="white-space: pre-wrap; line-height: 1.6; max-height: 300px; overflow-y: auto;">
        ${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    </div>
  ` : '';
  
  // Gera HTML para plataformas se existirem
  const platformsHtml = signedContent.platforms && signedContent.platforms.length > 0 ? `
    <div class="info-section">
      <div class="info-label">📱 Plataformas de Publicação</div>
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
  
  // 🆕 Gera QR Code para o certificado
  const qrData = generateQRData(signedContent);
  const qrCodeHtml = generateQRCodeSVG(qrData);
  
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificado Digital - ${title || signedContent.creatorName} - Vero iD</title>
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
    
    .security-warning {
      background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 50%, #fecaca 100%);
      border: 2px solid #fb923c;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 30px;
      box-shadow: 0 4px 12px rgba(251, 146, 60, 0.2);
    }
    
    .security-warning-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .security-warning-icon {
      width: 40px;
      height: 40px;
      background: #f97316;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }
    
    .security-warning-title {
      font-size: 16px;
      font-weight: 700;
      color: #7c2d12;
      margin-bottom: 8px;
    }
    
    .security-warning-text {
      font-size: 14px;
      color: #9a3412;
      line-height: 1.6;
    }
    
    .security-checklist {
      background: rgba(255, 255, 255, 0.7);
      border: 1px solid #fdba74;
      border-radius: 8px;
      padding: 16px;
      margin-top: 16px;
    }
    
    .security-checklist-title {
      font-size: 14px;
      font-weight: 700;
      color: #7c2d12;
      margin-bottom: 12px;
    }
    
    .security-checklist ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    
    .security-checklist li {
      font-size: 13px;
      color: #9a3412;
      margin-bottom: 8px;
      padding-left: 20px;
      position: relative;
    }
    
    .security-checklist li::before {
      content: '☐';
      position: absolute;
      left: 0;
      top: 0;
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
      
      <!-- 🔒 SOLUÇÃO 3: AVISO INTELIGENTE DE SEGURANÇA -->
      <div class="security-warning">
        <div class="security-warning-header">
          <div class="security-warning-icon">⚠️</div>
          <div style="flex: 1;">
            <div class="security-warning-title">ATENÇÃO: Verificação de Autenticidade</div>
            <div class="security-warning-text">
              Este certificado autentica o <strong>CONTEÚDO COMPLETO</strong> original. 
              Se você está vendo um <strong style="color: #991b1b;">RECORTE ou FRAGMENTO</strong>, 
              ele NÃO está coberto por esta certificação.
            </div>
          </div>
        </div>
        
        <div class="security-checklist">
          <div class="security-checklist-title">✅ COMO VERIFICAR A AUTENTICIDADE:</div>
          <ul>
            <li>A imagem de preview abaixo corresponde ao conteúdo que você viu?</li>
            <li>O conteúdo completo está íntegro (não foi editado ou recortado)?</li>
            <li>Os links das redes sociais levam ao post/perfil original do criador?</li>
            <li><strong>Visite os perfis oficiais do criador abaixo para comparar com a fonte original!</strong></li>
          </ul>
        </div>
      </div>
      
      ${thumbnailHtml}
      
      ${titleHtml}
      
      <div class="info-section">
        <div class="info-label">👤 Criador do Conteúdo</div>
        <div class="info-value">${signedContent.creatorName}</div>
      </div>
      
      ${socialLinksHtml}
      
      ${descriptionHtml}
      
      <div class="info-section">
        <div class="info-label">📅 Data e Hora da Assinatura</div>
        <div class="info-value">${formattedDate} às ${formattedTime}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">🆔 ID do Certificado</div>
        <div class="info-value" style="font-family: 'Courier New', monospace; font-size: 12px;">${signedContent.id}</div>
      </div>
      
      ${platformsHtml}
      
      ${qrCodeHtml}
      
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