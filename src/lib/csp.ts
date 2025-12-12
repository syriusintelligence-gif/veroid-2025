/**
 * Content Security Policy (CSP) Configuration
 * 
 * Este arquivo contém a configuração de segurança HTTP para a aplicação.
 * Os headers CSP protegem contra ataques XSS, clickjacking, e outros vetores de ataque.
 */

/**
 * Política de Segurança de Conteúdo (CSP)
 * 
 * Define quais recursos podem ser carregados e de onde.
 */
export const CSP_DIRECTIVES = {
  // Política padrão: apenas recursos do próprio domínio
  'default-src': ["'self'"],
  
  // Scripts: permite inline (React), eval (dev tools), e CDNs confiáveis
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Necessário para React e Vite HMR
    "'unsafe-eval'",   // Necessário para dev tools e algumas bibliotecas
    'https://cdn.jsdelivr.net', // CDN para bibliotecas
    'https://*.sentry.io',      // Sentry error tracking
    'https://*.supabase.co'     // Supabase SDK
  ],
  
  // Estilos: permite inline (Tailwind, styled-components) e Google Fonts
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Necessário para Tailwind CSS e styled-components
    'https://fonts.googleapis.com'
  ],
  
  // Fontes: permite do próprio domínio, Google Fonts, e data URIs
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'data:'
  ],
  
  // Imagens: permite de qualquer origem (para flexibilidade com user-generated content)
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:'
  ],
  
  // Mídia: permite do próprio domínio e blob URLs (para uploads)
  'media-src': [
    "'self'",
    'blob:'
  ],
  
  // Conexões: permite Supabase e Sentry
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'https://*.sentry.io',
    'wss://*.supabase.co' // WebSocket para Supabase Realtime
  ],
  
  // Frames: apenas do próprio domínio
  'frame-src': ["'self'"],
  
  // Objetos: bloqueado (Flash, Java applets, etc.)
  'object-src': ["'none'"],
  
  // Base URI: apenas do próprio domínio
  'base-uri': ["'self'"],
  
  // Form action: apenas para o próprio domínio
  'form-action': ["'self'"],
  
  // Frame ancestors: bloqueia embedding (anti-clickjacking)
  'frame-ancestors': ["'none'"],
  
  // Upgrade insecure requests: força HTTPS
  'upgrade-insecure-requests': []
};

/**
 * Converte as diretivas CSP em uma string para uso em headers HTTP
 */
export function buildCSPHeader(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, values]) => {
      if (values.length === 0) {
        return directive;
      }
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Headers de segurança adicionais
 */
export const SECURITY_HEADERS = {
  // Previne clickjacking
  'X-Frame-Options': 'DENY',
  
  // Previne MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Ativa proteção XSS do browser (legacy)
  'X-XSS-Protection': '1; mode=block',
  
  // Controla informações de referrer
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Controla permissões de APIs do browser
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // Força HTTPS (apenas em produção)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

/**
 * Adiciona meta tag CSP ao documento (para desenvolvimento)
 */
export function addCSPMetaTag(): void {
  if (typeof document === 'undefined') return;
  
  const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existingMeta) {
    existingMeta.remove();
  }
  
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = buildCSPHeader();
  document.head.appendChild(meta);
}

/**
 * Valida se uma URL é permitida pela política CSP
 */
export function isURLAllowed(url: string, directive: keyof typeof CSP_DIRECTIVES): boolean {
  const allowedSources = CSP_DIRECTIVES[directive] || [];
  
  try {
    const urlObj = new URL(url);
    
    // Verifica se é do próprio domínio
    if (allowedSources.includes("'self'") && urlObj.origin === window.location.origin) {
      return true;
    }
    
    // Verifica se corresponde a alguma origem permitida
    return allowedSources.some(source => {
      if (source.startsWith('https://')) {
        const sourcePattern = source.replace('*', '.*');
        const regex = new RegExp(`^${sourcePattern}`);
        return regex.test(url);
      }
      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Report de violações CSP (para debug)
 */
export function setupCSPReporting(): void {
  if (typeof document === 'undefined') return;
  
  // Em desenvolvimento, loga violações CSP no console
  if (import.meta.env.DEV) {
    document.addEventListener('securitypolicyviolation', (e) => {
      console.warn('🚨 CSP Violation:', {
        blockedURI: e.blockedURI,
        violatedDirective: e.violatedDirective,
        originalPolicy: e.originalPolicy,
        sourceFile: e.sourceFile,
        lineNumber: e.lineNumber,
      });
    });
  }
}