import { useState, useEffect, useCallback, useMemo } from 'react';
import { RateLimiter, RateLimitResult, RateLimitPresets } from '@/lib/rate-limiter';

/**
 * Hook React para Rate Limiting
 * 
 * Facilita o uso de rate limiting em componentes React
 * com gerenciamento automático de estado e timers.
 * 
 * @example
 * const { check, status, isBlocked, reset } = useRateLimit('LOGIN');
 * 
 * const handleLogin = async () => {
 *   const result = await check();
 *   if (!result.allowed) {
 *     alert(result.message);
 *     return;
 *   }
 *   // Prosseguir com login
 * };
 */
export function useRateLimit(
  action: keyof typeof RateLimitPresets,
  identifier?: string
) {
  const [limiter] = useState(() => {
    const id = identifier || action.toLowerCase();
    return new RateLimiter(id, RateLimitPresets[action]);
  });

  const [status, setStatus] = useState<RateLimitResult | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  /**
   * Atualiza o status atual
   */
  const updateStatus = useCallback(() => {
    const currentStatus = limiter.getStatus();
    setStatus(currentStatus);
    setIsBlocked(!currentStatus.allowed);
  }, [limiter]);

  /**
   * Verifica e registra uma tentativa
   */
  const check = useCallback(async (): Promise<RateLimitResult> => {
    const result = await limiter.check();
    setStatus(result);
    setIsBlocked(!result.allowed);
    return result;
  }, [limiter]);

  /**
   * Reseta o rate limiter
   */
  const reset = useCallback(() => {
    limiter.reset();
    updateStatus();
  }, [limiter, updateStatus]);

  /**
   * Atualiza status ao montar e periodicamente
   */
  useEffect(() => {
    updateStatus();

    // Atualiza a cada segundo se estiver bloqueado
    const interval = setInterval(() => {
      if (isBlocked) {
        updateStatus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [updateStatus, isBlocked]);

  return {
    check,
    reset,
    status,
    isBlocked,
    remaining: status?.remaining ?? 0,
    resetAt: status?.resetAt,
    blockedUntil: status?.blockedUntil,
    message: status?.message,
  };
}

/**
 * Hook para múltiplos rate limiters
 * Útil quando uma ação precisa verificar múltiplos limites
 */
export function useMultipleRateLimits(
  actions: Array<keyof typeof RateLimitPresets>
) {
  // Cria os limiters uma única vez usando useMemo
  const limitersData = useMemo(() => {
    return actions.map(action => ({
      action,
      limiter: new RateLimiter(action.toLowerCase(), RateLimitPresets[action])
    }));
  }, [actions]);

  const [statuses, setStatuses] = useState<RateLimitResult[]>([]);

  const updateAllStatuses = useCallback(() => {
    const newStatuses = limitersData.map(({ limiter }) => limiter.getStatus());
    setStatuses(newStatuses);
  }, [limitersData]);

  const checkAll = useCallback(async () => {
    const results = await Promise.all(limitersData.map(({ limiter }) => limiter.check()));
    setStatuses(results);
    const blocked = results.find(r => !r.allowed);
    return blocked || results[0];
  }, [limitersData]);

  const resetAll = useCallback(() => {
    limitersData.forEach(({ limiter }) => limiter.reset());
    updateAllStatuses();
  }, [limitersData, updateAllStatuses]);

  const isAnyBlocked = statuses.some(s => !s.allowed);

  useEffect(() => {
    updateAllStatuses();
  }, [updateAllStatuses]);

  return {
    checkAll,
    resetAll,
    isAnyBlocked,
    statuses,
  };
}