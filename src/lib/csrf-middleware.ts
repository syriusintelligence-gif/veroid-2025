/**
 * 🔒 CSRF Middleware
 * Intercepta requisições e adiciona token CSRF automaticamente
 * 
 * Características:
 * - Intercepta fetch global
 * - Adiciona header X-CSRF-Token automaticamente
 * - Valida respostas
 * - Logs de auditoria
 * - Suporte a whitelist/blacklist de URLs
 * 
 * @version 1.0.0
 * @date 2026-01-05
 */

import { getCSRFToken, validateCSRFToken } from './csrf-protection';
import { logAuditEvent, AuditAction } from './audit-logger';

// 📊 Configuração do middleware
interface CSRFMiddlewareConfig {
  // URLs que devem ter CSRF (se vazio, aplica a todas)
  whitelist?: string[];
  
  // URLs que NÃO devem ter CSRF
  blacklist?: string[];
  
  // Métodos HTTP que requerem CSRF
  methods?: string[];
  
  // Se deve validar respostas
  validateResponses?: boolean;
  
  // Se deve logar requisições
  logRequests?: boolean;
}

// Configuração padrão
const DEFAULT_CONFIG: Required<CSRFMiddlewareConfig> = {
  whitelist: [],
  blacklist: [
    // APIs externas que não precisam de CSRF
    'https://api.ipify.org',
    'https://ipapi.co',
    'https://geolocation-db.com',
  ],
  methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  validateResponses: false,
  logRequests: true,
};

// Configuração atual
let currentConfig: Required<CSRFMiddlewareConfig> = { ...DEFAULT_CONFIG };

// Flag para controlar se o middleware está ativo
let isMiddlewareActive = false;

// Referência ao fetch original
let originalFetch: typeof fetch;

/**
 * Verifica se uma URL deve ter CSRF aplicado
 */
function shouldApplyCSRF(url: string, method: string): boolean {
  // Verifica método
  if (!currentConfig.methods.includes(method.toUpperCase())) {
    return false;
  }
  
  // Verifica blacklist
  const isBlacklisted = currentConfig.blacklist.some(pattern => {
    if (pattern.includes('*')) {
      // Suporta wildcards simples
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(url);
    }
    return url.includes(pattern);
  });
  
  if (isBlacklisted) {
    console.log('🚫 [CSRF Middleware] URL na blacklist, pulando:', url);
    return false;
  }
  
  // Se há whitelist, verifica se está nela
  if (currentConfig.whitelist.length > 0) {
    const isWhitelisted = currentConfig.whitelist.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(url);
      }
      return url.includes(pattern);
    });
    
    if (!isWhitelisted) {
      console.log('⚠️ [CSRF Middleware] URL não está na whitelist, pulando:', url);
      return false;
    }
  }
  
  return true;
}

/**
 * Intercepta fetch e adiciona token CSRF
 */
async function csrfFetchInterceptor(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = init?.method || 'GET';
  
  // Verifica se deve aplicar CSRF
  if (!shouldApplyCSRF(url, method)) {
    return originalFetch(input, init);
  }
  
  try {
    console.log('🔐 [CSRF Middleware] Aplicando CSRF a:', method, url);
    
    // Obtém token CSRF
    const token = await getCSRFToken();
    
    // Adiciona token aos headers
    const headers = new Headers(init?.headers);
    headers.set('X-CSRF-Token', token);
    
    // Cria nova configuração com headers atualizados
    const newInit: RequestInit = {
      ...init,
      headers,
    };
    
    // Log de auditoria (se habilitado)
    if (currentConfig.logRequests) {
      await logAuditEvent(AuditAction.SECURITY_EVENT, {
        success: true,
        event: 'csrf_token_added',
        method,
        url: url.substring(0, 100), // Limita tamanho da URL no log
      });
    }
    
    console.log('✅ [CSRF Middleware] Token CSRF adicionado ao header');
    
    // Faz a requisição
    const response = await originalFetch(input, newInit);
    
    // Valida resposta (se habilitado)
    if (currentConfig.validateResponses && !response.ok) {
      console.warn('⚠️ [CSRF Middleware] Resposta não-OK:', response.status, response.statusText);
      
      // Se for 403, pode ser CSRF inválido
      if (response.status === 403) {
        await logAuditEvent(AuditAction.SECURITY_EVENT, {
          success: false,
          event: 'csrf_validation_failed_403',
          method,
          url: url.substring(0, 100),
          status: response.status,
        });
      }
    }
    
    return response;
  } catch (error) {
    console.error('❌ [CSRF Middleware] Erro ao aplicar CSRF:', error);
    
    // Log de erro
    await logAuditEvent(AuditAction.SECURITY_EVENT, {
      success: false,
      event: 'csrf_middleware_error',
      error: error instanceof Error ? error.message : 'Unknown error',
      method,
      url: url.substring(0, 100),
    });
    
    // Tenta fazer a requisição sem CSRF como fallback
    console.warn('⚠️ [CSRF Middleware] Fazendo requisição sem CSRF (fallback)');
    return originalFetch(input, init);
  }
}

/**
 * Inicializa o middleware CSRF
 * Deve ser chamado uma vez ao carregar a aplicação
 */
export function initializeCSRFMiddleware(config?: CSRFMiddlewareConfig): void {
  if (isMiddlewareActive) {
    console.warn('⚠️ [CSRF Middleware] Middleware já está ativo');
    return;
  }
  
  console.log('🚀 [CSRF Middleware] Inicializando middleware...');
  
  // Atualiza configuração
  if (config) {
    currentConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };
  }
  
  console.log('⚙️ [CSRF Middleware] Configuração:', currentConfig);
  
  // Salva referência ao fetch original
  originalFetch = window.fetch;
  
  // Substitui fetch global
  window.fetch = csrfFetchInterceptor as typeof fetch;
  
  isMiddlewareActive = true;
  
  console.log('✅ [CSRF Middleware] Middleware ativo!');
  
  // Log de auditoria
  logAuditEvent(AuditAction.SECURITY_EVENT, {
    success: true,
    event: 'csrf_middleware_initialized',
    config: {
      whitelistCount: currentConfig.whitelist.length,
      blacklistCount: currentConfig.blacklist.length,
      methods: currentConfig.methods,
    },
  });
}

/**
 * Desativa o middleware CSRF
 * Útil para testes ou situações específicas
 */
export function disableCSRFMiddleware(): void {
  if (!isMiddlewareActive) {
    console.warn('⚠️ [CSRF Middleware] Middleware já está inativo');
    return;
  }
  
  console.log('🛑 [CSRF Middleware] Desativando middleware...');
  
  // Restaura fetch original
  if (originalFetch) {
    window.fetch = originalFetch;
  }
  
  isMiddlewareActive = false;
  
  console.log('✅ [CSRF Middleware] Middleware desativado');
  
  // Log de auditoria
  logAuditEvent(AuditAction.SECURITY_EVENT, {
    success: true,
    event: 'csrf_middleware_disabled',
  });
}

/**
 * Verifica se o middleware está ativo
 */
export function isCSRFMiddlewareActive(): boolean {
  return isMiddlewareActive;
}

/**
 * Atualiza configuração do middleware
 */
export function updateCSRFMiddlewareConfig(config: Partial<CSRFMiddlewareConfig>): void {
  console.log('⚙️ [CSRF Middleware] Atualizando configuração...');
  
  currentConfig = {
    ...currentConfig,
    ...config,
  };
  
  console.log('✅ [CSRF Middleware] Configuração atualizada:', currentConfig);
}

/**
 * Obtém configuração atual do middleware
 */
export function getCSRFMiddlewareConfig(): Required<CSRFMiddlewareConfig> {
  return { ...currentConfig };
}

/**
 * Adiciona URL à whitelist
 */
export function addToWhitelist(url: string): void {
  if (!currentConfig.whitelist.includes(url)) {
    currentConfig.whitelist.push(url);
    console.log('✅ [CSRF Middleware] URL adicionada à whitelist:', url);
  }
}

/**
 * Remove URL da whitelist
 */
export function removeFromWhitelist(url: string): void {
  const index = currentConfig.whitelist.indexOf(url);
  if (index > -1) {
    currentConfig.whitelist.splice(index, 1);
    console.log('✅ [CSRF Middleware] URL removida da whitelist:', url);
  }
}

/**
 * Adiciona URL à blacklist
 */
export function addToBlacklist(url: string): void {
  if (!currentConfig.blacklist.includes(url)) {
    currentConfig.blacklist.push(url);
    console.log('✅ [CSRF Middleware] URL adicionada à blacklist:', url);
  }
}

/**
 * Remove URL da blacklist
 */
export function removeFromBlacklist(url: string): void {
  const index = currentConfig.blacklist.indexOf(url);
  if (index > -1) {
    currentConfig.blacklist.splice(index, 1);
    console.log('✅ [CSRF Middleware] URL removida da blacklist:', url);
  }
}

/**
 * Wrapper para fetch com CSRF manual
 * Útil quando você quer controle total sobre quando aplicar CSRF
 */
export async function fetchWithCSRF(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const token = await getCSRFToken();
  
  const headers = new Headers(init?.headers);
  headers.set('X-CSRF-Token', token);
  
  const newInit: RequestInit = {
    ...init,
    headers,
  };
  
  return fetch(input, newInit);
}

/**
 * Cria headers com token CSRF
 * Útil para bibliotecas HTTP como axios
 */
export async function createCSRFHeaders(
  additionalHeaders?: Record<string, string>
): Promise<Record<string, string>> {
  const token = await getCSRFToken();
  
  return {
    'X-CSRF-Token': token,
    ...additionalHeaders,
  };
}

/**
 * Valida token CSRF de uma requisição
 * Útil para validação manual no backend
 */
export async function validateRequestCSRF(request: Request): Promise<boolean> {
  const token = request.headers.get('X-CSRF-Token');
  
  if (!token) {
    console.error('❌ [CSRF Middleware] Token CSRF não encontrado no header');
    return false;
  }
  
  return await validateCSRFToken(token);
}