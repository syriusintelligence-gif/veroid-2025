/**
 * Rate Limiter - Hybrid (Client + Server)
 * 
 * Implementa controle de taxa de requisições com sincronização
 * entre cliente (localStorage) e servidor (Supabase).
 * 
 * Funcionalidades:
 * - Controle de tentativas por tempo
 * - Armazenamento local (localStorage) + Backend (Supabase)
 * - Limpeza automática de dados antigos
 * - Feedback visual para o usuário
 * - Proteção contra bypass via DevTools
 */

import { checkBackendRateLimit, getUserIdentifier } from './supabase-backend-rate-limit';

export interface RateLimitConfig {
  maxAttempts: number;      // Número máximo de tentativas
  windowMs: number;         // Janela de tempo em milissegundos
  blockDurationMs?: number; // Tempo de bloqueio após exceder (opcional)
  useBackend?: boolean;     // Se deve usar verificação no backend
}

export interface RateLimitResult {
  allowed: boolean;           // Se a ação é permitida
  remaining: number;          // Tentativas restantes
  resetAt: Date;             // Quando o contador reseta
  blockedUntil?: Date;       // Quando o bloqueio expira (se bloqueado)
  message?: string;          // Mensagem para o usuário
}

interface RateLimitEntry {
  attempts: number[];        // Array de timestamps das tentativas
  blockedUntil?: number;     // Timestamp do fim do bloqueio
}

/**
 * Classe principal de Rate Limiting
 */
export class RateLimiter {
  private storageKey: string;
  private config: Required<RateLimitConfig>;
  private action: string;

  constructor(
    identifier: string,
    config: RateLimitConfig
  ) {
    this.storageKey = `rate_limit_${identifier}`;
    this.action = identifier.toUpperCase();
    this.config = {
      maxAttempts: config.maxAttempts,
      windowMs: config.windowMs,
      blockDurationMs: config.blockDurationMs || config.windowMs * 2,
      useBackend: config.useBackend ?? true, // Backend habilitado por padrão
    };
  }

  /**
   * Verifica se uma ação é permitida e registra a tentativa
   */
  async check(): Promise<RateLimitResult> {
    const now = Date.now();
    
    // Se backend estiver habilitado, verifica lá primeiro
    if (this.config.useBackend) {
      try {
        const identifier = getUserIdentifier();
        const backendResult = await checkBackendRateLimit(this.action, identifier);
        
        if (!backendResult.allowed) {
          // Sincroniza com localStorage
          const entry = this.getEntry();
          entry.blockedUntil = backendResult.blockedUntil?.getTime() || (now + this.config.blockDurationMs);
          this.saveEntry(entry);
          
          return {
            allowed: false,
            remaining: backendResult.remaining,
            resetAt: backendResult.blockedUntil || new Date(now + this.config.blockDurationMs),
            blockedUntil: backendResult.blockedUntil,
            message: backendResult.message || 'Muitas tentativas. Tente novamente mais tarde.',
          };
        }
        
        // Backend permitiu, registra localmente também
        const entry = this.getEntry();
        entry.attempts.push(now);
        this.saveEntry(entry);
        
        return {
          allowed: true,
          remaining: backendResult.remaining,
          resetAt: new Date(now + this.config.windowMs),
          message: backendResult.message,
        };
      } catch (error) {
        console.error('[RateLimiter] Erro ao verificar backend, usando apenas local:', error);
        // Continua com verificação local se backend falhar
      }
    }
    
    // Verificação local (fallback ou quando backend está desabilitado)
    const entry = this.getEntry();

    // Verifica se está bloqueado
    if (entry.blockedUntil && entry.blockedUntil > now) {
      const blockedUntil = new Date(entry.blockedUntil);
      const remainingSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: blockedUntil,
        blockedUntil,
        message: `Muitas tentativas. Tente novamente em ${remainingSeconds} segundos.`,
      };
    }

    // Remove tentativas antigas (fora da janela de tempo)
    const windowStart = now - this.config.windowMs;
    entry.attempts = entry.attempts.filter(timestamp => timestamp > windowStart);

    // Verifica se excedeu o limite
    if (entry.attempts.length >= this.config.maxAttempts) {
      // Bloqueia por um período
      entry.blockedUntil = now + this.config.blockDurationMs;
      this.saveEntry(entry);

      const blockedUntil = new Date(entry.blockedUntil);
      const blockSeconds = Math.ceil(this.config.blockDurationMs / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt: blockedUntil,
        blockedUntil,
        message: `Limite excedido. Bloqueado por ${blockSeconds} segundos.`,
      };
    }

    // Registra a tentativa
    entry.attempts.push(now);
    this.saveEntry(entry);

    // Calcula quando o contador reseta
    const oldestAttempt = entry.attempts[0];
    const resetAt = new Date(oldestAttempt + this.config.windowMs);

    return {
      allowed: true,
      remaining: this.config.maxAttempts - entry.attempts.length,
      resetAt,
      message: `${this.config.maxAttempts - entry.attempts.length} tentativas restantes.`,
    };
  }

  /**
   * Reseta o contador de tentativas
   */
  reset(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Obtém o status atual sem registrar tentativa
   */
  getStatus(): RateLimitResult {
    const now = Date.now();
    const entry = this.getEntry();

    // Verifica se está bloqueado
    if (entry.blockedUntil && entry.blockedUntil > now) {
      const blockedUntil = new Date(entry.blockedUntil);
      return {
        allowed: false,
        remaining: 0,
        resetAt: blockedUntil,
        blockedUntil,
      };
    }

    // Remove tentativas antigas
    const windowStart = now - this.config.windowMs;
    entry.attempts = entry.attempts.filter(timestamp => timestamp > windowStart);

    const remaining = this.config.maxAttempts - entry.attempts.length;
    const oldestAttempt = entry.attempts[0] || now;
    const resetAt = new Date(oldestAttempt + this.config.windowMs);

    return {
      allowed: remaining > 0,
      remaining,
      resetAt,
    };
  }

  /**
   * Obtém entrada do localStorage
   */
  private getEntry(): RateLimitEntry {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return { attempts: [] };
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('[RateLimiter] Erro ao ler localStorage:', error);
      return { attempts: [] };
    }
  }

  /**
   * Salva entrada no localStorage
   */
  private saveEntry(entry: RateLimitEntry): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(entry));
    } catch (error) {
      console.error('[RateLimiter] Erro ao salvar no localStorage:', error);
    }
  }
}

/**
 * Configurações pré-definidas para diferentes tipos de ações
 */
export const RateLimitPresets = {
  // Login: 5 tentativas por minuto
  LOGIN: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 15 * 60 * 1000, // 15 minutos de bloqueio
    useBackend: true, // Usa backend para login
  },

  // Registro: 3 contas por hora
  REGISTER: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 24 * 60 * 60 * 1000, // 24 horas de bloqueio
    useBackend: true,
  },

  // Assinatura de conteúdo: 10 por hora
  SIGN_CONTENT: {
    maxAttempts: 10,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 2 * 60 * 60 * 1000, // 2 horas de bloqueio
    useBackend: true,
  },

  // Verificação de certificado: 20 por minuto
  VERIFY_CERTIFICATE: {
    maxAttempts: 20,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 10 * 60 * 1000, // 10 minutos de bloqueio
    useBackend: false, // Apenas local para verificação
  },

  // Reset de senha: 3 tentativas por hora
  RESET_PASSWORD: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hora
    blockDurationMs: 6 * 60 * 60 * 1000, // 6 horas de bloqueio
    useBackend: true,
  },

  // Genérico: 10 tentativas por minuto
  GENERIC: {
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minuto
    blockDurationMs: 5 * 60 * 1000, // 5 minutos de bloqueio
    useBackend: false,
  },
};

/**
 * Função auxiliar para criar rate limiters com presets
 */
export function createRateLimiter(
  action: keyof typeof RateLimitPresets,
  identifier?: string
): RateLimiter {
  const id = identifier || action.toLowerCase();
  return new RateLimiter(id, RateLimitPresets[action]);
}

/**
 * Limpa todos os rate limiters (útil para testes ou logout)
 */
export function clearAllRateLimiters(): void {
  const keys = Object.keys(localStorage);
  keys.forEach(key => {
    if (key.startsWith('rate_limit_')) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Formata tempo restante em formato legível
 */
export function formatTimeRemaining(date: Date): string {
  const now = Date.now();
  const diff = date.getTime() - now;

  if (diff <= 0) return 'agora';

  const seconds = Math.ceil(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}