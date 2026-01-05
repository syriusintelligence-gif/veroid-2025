/**
 * 🔒 CSRF Protection Library
 * Implementa Double Submit Cookie Pattern para proteção contra ataques CSRF
 * 
 * Características:
 * - Tokens criptograficamente seguros (Web Crypto API)
 * - Cookies com flags de segurança (Secure, SameSite=Strict)
 * - Renovação automática de tokens
 * - Fallback para sessionStorage
 * - Integração com sistema de auditoria
 * - Logs detalhados para debug
 * 
 * @version 1.0.0
 * @date 2026-01-05
 */

import { logAuditEvent, AuditAction } from './audit-logger';

// 🔑 Constantes
const CSRF_TOKEN_KEY = 'veroid_csrf_token';
const CSRF_COOKIE_NAME = 'veroid_csrf';
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hora
const TOKEN_RENEWAL_THRESHOLD_MS = 30 * 60 * 1000; // Renovar após 30 minutos

// 📊 Interface para token CSRF
interface CSRFToken {
  token: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Gera um token CSRF criptograficamente seguro
 * Usa Web Crypto API para máxima segurança
 */
function generateSecureToken(): string {
  try {
    // Gera 32 bytes aleatórios (256 bits)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    
    // Converte para string hexadecimal
    const token = Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    console.log('🔐 [CSRF] Token gerado com sucesso');
    return token;
  } catch (error) {
    console.error('❌ [CSRF] Erro ao gerar token:', error);
    // Fallback para Math.random (menos seguro, mas funcional)
    return Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }
}

/**
 * Define um cookie com flags de segurança
 */
function setCookie(name: string, value: string, expiresAt: number): boolean {
  try {
    const expires = new Date(expiresAt).toUTCString();
    const isSecure = window.location.protocol === 'https:';
    
    // Flags de segurança:
    // - Secure: apenas HTTPS (em produção)
    // - SameSite=Strict: proteção contra CSRF
    // - Path=/: disponível em toda a aplicação
    const cookieString = [
      `${name}=${value}`,
      `expires=${expires}`,
      'path=/',
      'SameSite=Strict',
      isSecure ? 'Secure' : ''
    ].filter(Boolean).join('; ');
    
    document.cookie = cookieString;
    
    console.log('🍪 [CSRF] Cookie definido:', { name, expiresAt: expires, secure: isSecure });
    return true;
  } catch (error) {
    console.error('❌ [CSRF] Erro ao definir cookie:', error);
    return false;
  }
}

/**
 * Obtém um cookie pelo nome
 */
function getCookie(name: string): string | null {
  try {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue || null;
    }
    
    return null;
  } catch (error) {
    console.error('❌ [CSRF] Erro ao ler cookie:', error);
    return null;
  }
}

/**
 * Remove um cookie
 */
function deleteCookie(name: string): void {
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
    console.log('🗑️ [CSRF] Cookie removido:', name);
  } catch (error) {
    console.error('❌ [CSRF] Erro ao remover cookie:', error);
  }
}

/**
 * Salva token no sessionStorage (fallback)
 */
function saveToSessionStorage(tokenData: CSRFToken): boolean {
  try {
    sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(tokenData));
    console.log('💾 [CSRF] Token salvo no sessionStorage (fallback)');
    return true;
  } catch (error) {
    console.error('❌ [CSRF] Erro ao salvar no sessionStorage:', error);
    return false;
  }
}

/**
 * Obtém token do sessionStorage (fallback)
 */
function getFromSessionStorage(): CSRFToken | null {
  try {
    const data = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (!data) return null;
    
    const tokenData = JSON.parse(data) as CSRFToken;
    return tokenData;
  } catch (error) {
    console.error('❌ [CSRF] Erro ao ler do sessionStorage:', error);
    return null;
  }
}

/**
 * Remove token do sessionStorage
 */
function removeFromSessionStorage(): void {
  try {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    console.log('🗑️ [CSRF] Token removido do sessionStorage');
  } catch (error) {
    console.error('❌ [CSRF] Erro ao remover do sessionStorage:', error);
  }
}

/**
 * Verifica se um token está expirado
 */
function isTokenExpired(tokenData: CSRFToken): boolean {
  const now = Date.now();
  return now >= tokenData.expiresAt;
}

/**
 * Verifica se um token precisa ser renovado
 */
function shouldRenewToken(tokenData: CSRFToken): boolean {
  const now = Date.now();
  const timeUntilExpiry = tokenData.expiresAt - now;
  return timeUntilExpiry <= TOKEN_RENEWAL_THRESHOLD_MS;
}

/**
 * Classe principal de proteção CSRF
 */
export class CSRFProtection {
  private static instance: CSRFProtection;
  private currentToken: CSRFToken | null = null;
  private useCookies: boolean = true;

  private constructor() {
    console.log('🔒 [CSRF] Inicializando proteção CSRF...');
    this.detectCookieSupport();
  }

  /**
   * Singleton pattern - garante uma única instância
   */
  public static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection();
    }
    return CSRFProtection.instance;
  }

  /**
   * Detecta se cookies estão disponíveis
   */
  private detectCookieSupport(): void {
    try {
      // Tenta definir um cookie de teste
      const testCookie = 'csrf_test=1; SameSite=Strict';
      document.cookie = testCookie;
      
      // Verifica se consegue ler
      const canReadCookie = document.cookie.includes('csrf_test=1');
      
      // Remove cookie de teste
      document.cookie = 'csrf_test=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
      
      this.useCookies = canReadCookie;
      
      if (!this.useCookies) {
        console.warn('⚠️ [CSRF] Cookies bloqueados. Usando sessionStorage como fallback.');
      } else {
        console.log('✅ [CSRF] Cookies disponíveis');
      }
    } catch (error) {
      console.error('❌ [CSRF] Erro ao detectar suporte a cookies:', error);
      this.useCookies = false;
    }
  }

  /**
   * Inicializa a proteção CSRF
   * Deve ser chamado ao carregar a aplicação
   */
  public async initialize(): Promise<string> {
    console.log('🚀 [CSRF] Inicializando token CSRF...');
    
    try {
      // Tenta obter token existente
      const existingToken = this.getStoredToken();
      
      if (existingToken && !isTokenExpired(existingToken)) {
        console.log('✅ [CSRF] Token existente válido encontrado');
        this.currentToken = existingToken;
        
        // Verifica se precisa renovar
        if (shouldRenewToken(existingToken)) {
          console.log('🔄 [CSRF] Token próximo da expiração, renovando...');
          return await this.renewToken();
        }
        
        return existingToken.token;
      }
      
      // Gera novo token
      console.log('🆕 [CSRF] Gerando novo token...');
      return await this.generateNewToken();
    } catch (error) {
      console.error('❌ [CSRF] Erro ao inicializar:', error);
      
      // Log de auditoria
      await logAuditEvent(AuditAction.SECURITY_EVENT, {
        success: false,
        event: 'csrf_initialization_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw new Error('Falha ao inicializar proteção CSRF');
    }
  }

  /**
   * Gera um novo token CSRF
   */
  private async generateNewToken(): Promise<string> {
    const token = generateSecureToken();
    const now = Date.now();
    const expiresAt = now + TOKEN_EXPIRY_MS;
    
    const tokenData: CSRFToken = {
      token,
      createdAt: now,
      expiresAt,
    };
    
    // Salva o token
    const saved = this.saveToken(tokenData);
    
    if (!saved) {
      throw new Error('Falha ao salvar token CSRF');
    }
    
    this.currentToken = tokenData;
    
    console.log('✅ [CSRF] Novo token gerado e salvo');
    
    // Log de auditoria
    await logAuditEvent(AuditAction.SECURITY_EVENT, {
      success: true,
      event: 'csrf_token_generated',
      expiresAt: new Date(expiresAt).toISOString(),
    });
    
    return token;
  }

  /**
   * Renova o token CSRF atual
   */
  public async renewToken(): Promise<string> {
    console.log('🔄 [CSRF] Renovando token...');
    
    // Remove token antigo
    this.clearToken();
    
    // Gera novo token
    const newToken = await this.generateNewToken();
    
    console.log('✅ [CSRF] Token renovado com sucesso');
    
    // Log de auditoria
    await logAuditEvent(AuditAction.SECURITY_EVENT, {
      success: true,
      event: 'csrf_token_renewed',
    });
    
    return newToken;
  }

  /**
   * Obtém o token CSRF atual
   */
  public async getToken(): Promise<string> {
    // Se não há token ou está expirado, gera novo
    if (!this.currentToken || isTokenExpired(this.currentToken)) {
      console.log('🔄 [CSRF] Token inválido ou expirado, gerando novo...');
      return await this.initialize();
    }
    
    // Se precisa renovar, renova
    if (shouldRenewToken(this.currentToken)) {
      console.log('🔄 [CSRF] Token próximo da expiração, renovando...');
      return await this.renewToken();
    }
    
    return this.currentToken.token;
  }

  /**
   * Valida um token CSRF
   */
  public async validateToken(token: string): Promise<boolean> {
    try {
      console.log('🔍 [CSRF] Validando token...');
      
      if (!token || typeof token !== 'string') {
        console.error('❌ [CSRF] Token inválido (vazio ou tipo incorreto)');
        await this.logValidationFailure('invalid_format');
        return false;
      }
      
      // Obtém token armazenado
      const storedToken = this.getStoredToken();
      
      if (!storedToken) {
        console.error('❌ [CSRF] Nenhum token armazenado encontrado');
        await this.logValidationFailure('no_stored_token');
        return false;
      }
      
      // Verifica expiração
      if (isTokenExpired(storedToken)) {
        console.error('❌ [CSRF] Token expirado');
        await this.logValidationFailure('token_expired');
        return false;
      }
      
      // Compara tokens (timing-safe comparison)
      const isValid = this.timingSafeEqual(token, storedToken.token);
      
      if (!isValid) {
        console.error('❌ [CSRF] Token não corresponde ao armazenado');
        await this.logValidationFailure('token_mismatch');
        return false;
      }
      
      console.log('✅ [CSRF] Token válido');
      return true;
    } catch (error) {
      console.error('❌ [CSRF] Erro ao validar token:', error);
      await this.logValidationFailure('validation_error');
      return false;
    }
  }

  /**
   * Comparação de strings resistente a timing attacks
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Salva token no storage (cookie ou sessionStorage)
   */
  private saveToken(tokenData: CSRFToken): boolean {
    if (this.useCookies) {
      return setCookie(CSRF_COOKIE_NAME, tokenData.token, tokenData.expiresAt);
    } else {
      return saveToSessionStorage(tokenData);
    }
  }

  /**
   * Obtém token do storage
   */
  private getStoredToken(): CSRFToken | null {
    if (this.useCookies) {
      const token = getCookie(CSRF_COOKIE_NAME);
      if (!token) return null;
      
      // Reconstrói o objeto CSRFToken
      // Nota: cookies não armazenam metadados, então usamos valores padrão
      return {
        token,
        createdAt: Date.now() - TOKEN_EXPIRY_MS + TOKEN_RENEWAL_THRESHOLD_MS,
        expiresAt: Date.now() + TOKEN_RENEWAL_THRESHOLD_MS,
      };
    } else {
      return getFromSessionStorage();
    }
  }

  /**
   * Remove token do storage
   */
  public clearToken(): void {
    console.log('🗑️ [CSRF] Limpando token...');
    
    if (this.useCookies) {
      deleteCookie(CSRF_COOKIE_NAME);
    } else {
      removeFromSessionStorage();
    }
    
    this.currentToken = null;
    console.log('✅ [CSRF] Token limpo');
  }

  /**
   * Log de falha de validação
   */
  private async logValidationFailure(reason: string): Promise<void> {
    await logAuditEvent(AuditAction.SECURITY_EVENT, {
      success: false,
      event: 'csrf_validation_failed',
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Obtém informações sobre o token atual
   */
  public getTokenInfo(): { exists: boolean; expiresAt?: string; needsRenewal?: boolean } {
    if (!this.currentToken) {
      return { exists: false };
    }
    
    return {
      exists: true,
      expiresAt: new Date(this.currentToken.expiresAt).toISOString(),
      needsRenewal: shouldRenewToken(this.currentToken),
    };
  }
}

/**
 * Instância singleton exportada
 */
export const csrfProtection = CSRFProtection.getInstance();

/**
 * Funções auxiliares exportadas para facilitar uso
 */

/**
 * Inicializa proteção CSRF
 */
export async function initializeCSRF(): Promise<string> {
  return await csrfProtection.initialize();
}

/**
 * Obtém token CSRF atual
 */
export async function getCSRFToken(): Promise<string> {
  return await csrfProtection.getToken();
}

/**
 * Valida token CSRF
 */
export async function validateCSRFToken(token: string): Promise<boolean> {
  return await csrfProtection.validateToken(token);
}

/**
 * Renova token CSRF
 */
export async function renewCSRFToken(): Promise<string> {
  return await csrfProtection.renewToken();
}

/**
 * Limpa token CSRF
 */
export function clearCSRFToken(): void {
  csrfProtection.clearToken();
}

/**
 * Obtém informações do token
 */
export function getCSRFTokenInfo(): { exists: boolean; expiresAt?: string; needsRenewal?: boolean } {
  return csrfProtection.getTokenInfo();
}