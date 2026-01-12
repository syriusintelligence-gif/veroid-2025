/**
 * 🚩 FEATURE FLAGS - CONTROLE DE FUNCIONALIDADES
 * 
 * Sistema centralizado para ativar/desativar funcionalidades experimentais
 * ou em fase de rollout gradual.
 * 
 * @module FeatureFlags
 * @version 1.0.0
 * @phase FASE 3 - Integração Frontend
 */

/**
 * Enum com todas as feature flags disponíveis
 */
export enum FeatureFlag {
  /**
   * 🔐 Usa Edge Function para assinatura server-side
   * 
   * Quando ATIVO: Chama a Edge Function para assinatura segura
   * Quando INATIVO: Usa o método client-side tradicional
   * 
   * Status: EXPERIMENTAL
   * Recomendação: Testar primeiro em ambiente de desenvolvimento
   */
  USE_EDGE_FUNCTION_SIGNING = 'use_edge_function_signing',

  /**
   * 📊 Habilita logs detalhados de debug
   * 
   * Quando ATIVO: Mostra logs detalhados no console
   * Quando INATIVO: Apenas logs essenciais
   */
  ENABLE_DEBUG_LOGS = 'enable_debug_logs',

  /**
   * 🔄 Habilita fallback automático
   * 
   * Quando ATIVO: Se Edge Function falhar, usa método client-side
   * Quando INATIVO: Retorna erro se Edge Function falhar
   */
  ENABLE_FALLBACK = 'enable_fallback',
}

/**
 * Configuração padrão das feature flags
 * 
 * ⚠️ IMPORTANTE: Por padrão, a Edge Function está DESATIVADA
 * para garantir zero impacto no sistema existente.
 */
const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  [FeatureFlag.USE_EDGE_FUNCTION_SIGNING]: false, // 🔴 DESATIVADO por padrão
  [FeatureFlag.ENABLE_DEBUG_LOGS]: false,
  [FeatureFlag.ENABLE_FALLBACK]: true, // ✅ Fallback ativo por segurança
};

/**
 * Storage key para persistir flags no localStorage
 */
const STORAGE_KEY = 'veroId_feature_flags';

/**
 * Cache em memória das flags
 */
let flagsCache: Record<FeatureFlag, boolean> | null = null;

/**
 * 🔍 Verifica se uma feature flag está ativa
 * 
 * @param flag - Flag a ser verificada
 * @returns true se a flag estiver ativa
 * 
 * @example
 * ```typescript
 * if (isFeatureEnabled(FeatureFlag.USE_EDGE_FUNCTION_SIGNING)) {
 *   // Usa Edge Function
 *   await signContentViaEdgeFunction(...);
 * } else {
 *   // Usa método tradicional
 *   await signContent(...);
 * }
 * ```
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  // Carrega flags do cache ou storage
  if (!flagsCache) {
    loadFlags();
  }

  return flagsCache![flag] ?? DEFAULT_FLAGS[flag];
}

/**
 * ⚙️ Ativa uma feature flag
 * 
 * @param flag - Flag a ser ativada
 * @param persist - Se true, salva no localStorage (padrão: true)
 * 
 * @example
 * ```typescript
 * // Ativar Edge Function
 * enableFeature(FeatureFlag.USE_EDGE_FUNCTION_SIGNING);
 * 
 * // Ativar apenas na sessão atual (não persiste)
 * enableFeature(FeatureFlag.ENABLE_DEBUG_LOGS, false);
 * ```
 */
export function enableFeature(flag: FeatureFlag, persist: boolean = true): void {
  if (!flagsCache) {
    loadFlags();
  }

  flagsCache![flag] = true;

  if (persist) {
    saveFlags();
  }

  console.log(`✅ [FeatureFlags] Feature ativada: ${flag}`);
}

/**
 * 🔴 Desativa uma feature flag
 * 
 * @param flag - Flag a ser desativada
 * @param persist - Se true, salva no localStorage (padrão: true)
 * 
 * @example
 * ```typescript
 * // Desativar Edge Function
 * disableFeature(FeatureFlag.USE_EDGE_FUNCTION_SIGNING);
 * ```
 */
export function disableFeature(flag: FeatureFlag, persist: boolean = true): void {
  if (!flagsCache) {
    loadFlags();
  }

  flagsCache![flag] = false;

  if (persist) {
    saveFlags();
  }

  console.log(`🔴 [FeatureFlags] Feature desativada: ${flag}`);
}

/**
 * 🔄 Alterna o estado de uma feature flag
 * 
 * @param flag - Flag a ser alternada
 * @param persist - Se true, salva no localStorage (padrão: true)
 * @returns Novo estado da flag
 * 
 * @example
 * ```typescript
 * // Alternar Edge Function
 * const newState = toggleFeature(FeatureFlag.USE_EDGE_FUNCTION_SIGNING);
 * console.log('Edge Function agora está:', newState ? 'ATIVA' : 'INATIVA');
 * ```
 */
export function toggleFeature(flag: FeatureFlag, persist: boolean = true): boolean {
  const currentState = isFeatureEnabled(flag);
  
  if (currentState) {
    disableFeature(flag, persist);
  } else {
    enableFeature(flag, persist);
  }

  return !currentState;
}

/**
 * 📋 Obtém todas as flags e seus estados
 * 
 * @returns Objeto com todas as flags e seus valores
 * 
 * @example
 * ```typescript
 * const flags = getAllFlags();
 * console.log('Edge Function:', flags.use_edge_function_signing ? 'ATIVA' : 'INATIVA');
 * ```
 */
export function getAllFlags(): Record<FeatureFlag, boolean> {
  if (!flagsCache) {
    loadFlags();
  }

  return { ...flagsCache! };
}

/**
 * 🔄 Reseta todas as flags para os valores padrão
 * 
 * @example
 * ```typescript
 * // Restaurar configuração padrão
 * resetFlags();
 * ```
 */
export function resetFlags(): void {
  flagsCache = { ...DEFAULT_FLAGS };
  saveFlags();
  console.log('🔄 [FeatureFlags] Flags resetadas para valores padrão');
}

/**
 * 📥 Carrega flags do localStorage
 */
function loadFlags(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
      const parsed = JSON.parse(stored);
      flagsCache = { ...DEFAULT_FLAGS, ...parsed };
      console.log('📥 [FeatureFlags] Flags carregadas do localStorage');
    } else {
      flagsCache = { ...DEFAULT_FLAGS };
      console.log('📥 [FeatureFlags] Usando flags padrão');
    }
  } catch (error) {
    console.error('❌ [FeatureFlags] Erro ao carregar flags:', error);
    flagsCache = { ...DEFAULT_FLAGS };
  }
}

/**
 * 💾 Salva flags no localStorage
 */
function saveFlags(): void {
  try {
    if (flagsCache) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flagsCache));
      console.log('💾 [FeatureFlags] Flags salvas no localStorage');
    }
  } catch (error) {
    console.error('❌ [FeatureFlags] Erro ao salvar flags:', error);
  }
}

/**
 * 🧪 Funções auxiliares para desenvolvimento/debug
 */
export const FeatureFlagsDebug = {
  /**
   * Exibe status de todas as flags no console
   */
  printStatus(): void {
    console.log('🚩 [FeatureFlags] Status Atual:');
    console.log('═'.repeat(50));
    
    Object.values(FeatureFlag).forEach(flag => {
      const status = isFeatureEnabled(flag);
      const icon = status ? '✅' : '🔴';
      console.log(`${icon} ${flag}: ${status ? 'ATIVA' : 'INATIVA'}`);
    });
    
    console.log('═'.repeat(50));
  },

  /**
   * Ativa modo debug (logs detalhados)
   */
  enableDebugMode(): void {
    enableFeature(FeatureFlag.ENABLE_DEBUG_LOGS);
    console.log('🐛 [FeatureFlags] Modo debug ativado');
  },

  /**
   * Desativa modo debug
   */
  disableDebugMode(): void {
    disableFeature(FeatureFlag.ENABLE_DEBUG_LOGS);
    console.log('🐛 [FeatureFlags] Modo debug desativado');
  },

  /**
   * Ativa Edge Function com fallback
   */
  enableEdgeFunctionSafely(): void {
    enableFeature(FeatureFlag.USE_EDGE_FUNCTION_SIGNING);
    enableFeature(FeatureFlag.ENABLE_FALLBACK);
    console.log('🔐 [FeatureFlags] Edge Function ativada com fallback de segurança');
  },

  /**
   * Desativa Edge Function
   */
  disableEdgeFunction(): void {
    disableFeature(FeatureFlag.USE_EDGE_FUNCTION_SIGNING);
    console.log('🔐 [FeatureFlags] Edge Function desativada');
  },
};

/**
 * 🌐 Expõe funções de debug no window para acesso via console do navegador
 * 
 * Uso no console do navegador:
 * - window.FeatureFlags.printStatus()
 * - window.FeatureFlags.enableEdgeFunction()
 * - window.FeatureFlags.disableEdgeFunction()
 */
if (typeof window !== 'undefined') {
  (window as any).FeatureFlags = {
    printStatus: FeatureFlagsDebug.printStatus,
    enableEdgeFunction: FeatureFlagsDebug.enableEdgeFunctionSafely,
    disableEdgeFunction: FeatureFlagsDebug.disableEdgeFunction,
    enableDebug: FeatureFlagsDebug.enableDebugMode,
    disableDebug: FeatureFlagsDebug.disableDebugMode,
    reset: resetFlags,
    getAll: getAllFlags,
  };

  console.log('🚩 [FeatureFlags] Funções de debug disponíveis em window.FeatureFlags');
  console.log('💡 Dica: Digite "window.FeatureFlags.printStatus()" no console para ver o status');
}