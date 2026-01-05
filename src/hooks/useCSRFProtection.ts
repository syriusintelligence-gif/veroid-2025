/**
 * 🔒 useCSRFProtection Hook
 * Hook React para facilitar o uso da proteção CSRF em componentes
 * 
 * Características:
 * - Auto-inicialização do token CSRF
 * - Renovação automática em background
 * - Estado reativo do token
 * - Validação simplificada
 * - Integração com formulários
 * 
 * @version 1.0.0
 * @date 2026-01-05
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCSRFToken,
  validateCSRFToken,
  renewCSRFToken,
  clearCSRFToken,
  getCSRFTokenInfo,
  initializeCSRF,
} from '@/lib/csrf-protection';

// 📊 Interface para estado do hook
interface CSRFState {
  token: string | null;
  isLoading: boolean;
  isValid: boolean;
  error: string | null;
  expiresAt: string | null;
  needsRenewal: boolean;
}

// 📊 Interface para retorno do hook
interface UseCSRFProtectionReturn {
  // Estado
  token: string | null;
  isLoading: boolean;
  isValid: boolean;
  error: string | null;
  expiresAt: string | null;
  needsRenewal: boolean;
  
  // Ações
  getToken: () => Promise<string>;
  validateToken: (token: string) => Promise<boolean>;
  renewToken: () => Promise<string>;
  clearToken: () => void;
  
  // Utilitários
  getTokenHeader: () => Promise<{ 'X-CSRF-Token': string }>;
  addTokenToFormData: (formData: FormData) => Promise<FormData>;
}

/**
 * Hook principal para proteção CSRF
 * 
 * @param autoInitialize - Se deve inicializar automaticamente (padrão: true)
 * @param autoRenew - Se deve renovar automaticamente (padrão: true)
 * @returns Estado e funções para gerenciar CSRF
 * 
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { token, getTokenHeader, isLoading } = useCSRFProtection();
 *   
 *   async function handleSubmit(e) {
 *     e.preventDefault();
 *     const headers = await getTokenHeader();
 *     // Use headers na requisição
 *   }
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export function useCSRFProtection(
  autoInitialize: boolean = true,
  autoRenew: boolean = true
): UseCSRFProtectionReturn {
  // Estado
  const [state, setState] = useState<CSRFState>({
    token: null,
    isLoading: true,
    isValid: false,
    error: null,
    expiresAt: null,
    needsRenewal: false,
  });

  // Ref para controlar intervalos
  const renewalIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Atualiza estado com informações do token
   */
  const updateTokenInfo = useCallback(async () => {
    try {
      const info = getCSRFTokenInfo();
      
      if (info.exists) {
        const token = await getCSRFToken();
        setState(prev => ({
          ...prev,
          token,
          isValid: true,
          expiresAt: info.expiresAt || null,
          needsRenewal: info.needsRenewal || false,
          error: null,
        }));
      } else {
        setState(prev => ({
          ...prev,
          token: null,
          isValid: false,
          expiresAt: null,
          needsRenewal: false,
        }));
      }
    } catch (error) {
      console.error('❌ [useCSRFProtection] Erro ao atualizar info do token:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      }));
    }
  }, []);

  /**
   * Inicializa o token CSRF
   */
  const initialize = useCallback(async () => {
    console.log('🚀 [useCSRFProtection] Inicializando...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const token = await initializeCSRF();
      console.log('✅ [useCSRFProtection] Token inicializado');
      
      await updateTokenInfo();
      
      setState(prev => ({
        ...prev,
        token,
        isLoading: false,
        isValid: true,
        error: null,
      }));
    } catch (error) {
      console.error('❌ [useCSRFProtection] Erro ao inicializar:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isValid: false,
        error: error instanceof Error ? error.message : 'Falha ao inicializar CSRF',
      }));
    }
  }, [updateTokenInfo]);

  /**
   * Obtém o token atual
   */
  const getToken = useCallback(async (): Promise<string> => {
    try {
      const token = await getCSRFToken();
      await updateTokenInfo();
      return token;
    } catch (error) {
      console.error('❌ [useCSRFProtection] Erro ao obter token:', error);
      throw error;
    }
  }, [updateTokenInfo]);

  /**
   * Valida um token
   */
  const validateToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      const isValid = await validateCSRFToken(token);
      setState(prev => ({ ...prev, isValid }));
      return isValid;
    } catch (error) {
      console.error('❌ [useCSRFProtection] Erro ao validar token:', error);
      setState(prev => ({ ...prev, isValid: false }));
      return false;
    }
  }, []);

  /**
   * Renova o token
   */
  const renewToken = useCallback(async (): Promise<string> => {
    console.log('🔄 [useCSRFProtection] Renovando token...');
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const newToken = await renewCSRFToken();
      console.log('✅ [useCSRFProtection] Token renovado');
      
      await updateTokenInfo();
      
      setState(prev => ({
        ...prev,
        token: newToken,
        isLoading: false,
        isValid: true,
        needsRenewal: false,
        error: null,
      }));
      
      return newToken;
    } catch (error) {
      console.error('❌ [useCSRFProtection] Erro ao renovar token:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Falha ao renovar token',
      }));
      throw error;
    }
  }, [updateTokenInfo]);

  /**
   * Limpa o token
   */
  const clearToken = useCallback(() => {
    console.log('🗑️ [useCSRFProtection] Limpando token...');
    clearCSRFToken();
    setState({
      token: null,
      isLoading: false,
      isValid: false,
      error: null,
      expiresAt: null,
      needsRenewal: false,
    });
  }, []);

  /**
   * Obtém header com token CSRF
   */
  const getTokenHeader = useCallback(async (): Promise<{ 'X-CSRF-Token': string }> => {
    const token = await getToken();
    return { 'X-CSRF-Token': token };
  }, [getToken]);

  /**
   * Adiciona token a FormData
   */
  const addTokenToFormData = useCallback(async (formData: FormData): Promise<FormData> => {
    const token = await getToken();
    formData.append('csrf_token', token);
    return formData;
  }, [getToken]);

  /**
   * Configura renovação automática
   */
  useEffect(() => {
    if (!autoRenew) return;

    // Verifica a cada 5 minutos se precisa renovar
    checkIntervalRef.current = setInterval(async () => {
      const info = getCSRFTokenInfo();
      
      if (info.exists && info.needsRenewal) {
        console.log('🔄 [useCSRFProtection] Renovação automática acionada');
        try {
          await renewToken();
        } catch (error) {
          console.error('❌ [useCSRFProtection] Erro na renovação automática:', error);
        }
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [autoRenew, renewToken]);

  /**
   * Inicialização automática
   */
  useEffect(() => {
    if (autoInitialize) {
      initialize();
    }

    // Cleanup ao desmontar
    return () => {
      if (renewalIntervalRef.current) {
        clearInterval(renewalIntervalRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [autoInitialize, initialize]);

  return {
    // Estado
    token: state.token,
    isLoading: state.isLoading,
    isValid: state.isValid,
    error: state.error,
    expiresAt: state.expiresAt,
    needsRenewal: state.needsRenewal,
    
    // Ações
    getToken,
    validateToken,
    renewToken,
    clearToken,
    
    // Utilitários
    getTokenHeader,
    addTokenToFormData,
  };
}

/**
 * Hook simplificado para obter apenas o token
 * Útil quando você só precisa do token, sem gerenciamento de estado
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const token = useCSRFToken();
 *   
 *   async function handleAction() {
 *     const headers = { 'X-CSRF-Token': token };
 *     // Use headers
 *   }
 * }
 * ```
 */
export function useCSRFToken(): string | null {
  const { token } = useCSRFProtection();
  return token;
}

/**
 * Hook para obter header CSRF pronto para uso
 * Útil para requisições fetch/axios
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const getHeaders = useCSRFHeader();
 *   
 *   async function handleSubmit() {
 *     const headers = await getHeaders();
 *     const response = await fetch('/api/endpoint', {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         ...headers,
 *       },
 *       body: JSON.stringify(data),
 *     });
 *   }
 * }
 * ```
 */
export function useCSRFHeader(): () => Promise<{ 'X-CSRF-Token': string }> {
  const { getTokenHeader } = useCSRFProtection();
  return getTokenHeader;
}

/**
 * Hook para validação de CSRF em formulários
 * Retorna função de validação e estado
 * 
 * @example
 * ```tsx
 * function MyForm() {
 *   const { validate, isValid, error } = useCSRFValidation();
 *   
 *   async function handleSubmit(e) {
 *     e.preventDefault();
 *     const formData = new FormData(e.target);
 *     const token = formData.get('csrf_token');
 *     
 *     if (!await validate(token as string)) {
 *       alert('Token CSRF inválido!');
 *       return;
 *     }
 *     
 *     // Prosseguir com submit
 *   }
 * }
 * ```
 */
export function useCSRFValidation() {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { validateToken } = useCSRFProtection();

  const validate = useCallback(async (token: string): Promise<boolean> => {
    setError(null);
    
    try {
      const valid = await validateToken(token);
      setIsValid(valid);
      
      if (!valid) {
        setError('Token CSRF inválido ou expirado');
      }
      
      return valid;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao validar token';
      setError(errorMessage);
      setIsValid(false);
      return false;
    }
  }, [validateToken]);

  return {
    validate,
    isValid,
    error,
  };
}