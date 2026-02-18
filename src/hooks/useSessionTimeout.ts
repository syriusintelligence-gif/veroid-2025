/**
 * Hook para gerenciamento de timeout de sessão por inatividade
 * Desconecta o usuário após 15 minutos de inatividade
 * Exibe aviso 2 minutos antes do logout automático
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { logout } from '@/lib/supabase-auth-v2';

// Configurações de timeout (em milissegundos)
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutos
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000; // Aviso 2 minutos antes
const ACTIVITY_CHECK_INTERVAL = 1000; // Verificar a cada 1 segundo

// Eventos que indicam atividade do usuário
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'focus',
];

interface UseSessionTimeoutOptions {
  enabled?: boolean;
  onTimeout?: () => void;
  onWarning?: () => void;
}

interface UseSessionTimeoutReturn {
  isWarningVisible: boolean;
  remainingSeconds: number;
  resetActivity: () => void;
  handleContinue: () => void;
  handleLogout: () => Promise<void>;
}

export function useSessionTimeout(
  options: UseSessionTimeoutOptions = {}
): UseSessionTimeoutReturn {
  const { enabled = true, onTimeout, onWarning } = options;

  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(120); // 2 minutos em segundos
  
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Atualiza o timestamp da última atividade
  const updateLastActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Se o aviso estava visível e o usuário interagiu, esconde o aviso
    if (isWarningVisible) {
      setIsWarningVisible(false);
      warningShownRef.current = false;
    }
  }, [isWarningVisible]);

  // Reset manual da atividade (usado pelo botão "Continuar Conectado")
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    setIsWarningVisible(false);
    warningShownRef.current = false;
    setRemainingSeconds(120);
  }, []);

  // Handler para continuar conectado
  const handleContinue = useCallback(() => {
    resetActivity();
  }, [resetActivity]);

  // Handler para logout
  const handleLogout = useCallback(async () => {
    try {
      console.log('🔒 [SessionTimeout] Iniciando logout...');
      
      // Limpa o localStorage de atividade
      localStorage.removeItem('lastActivity');
      
      await logout();
      
      console.log('✅ [SessionTimeout] Logout realizado, recarregando página...');
      
      // Usa window.location.href para forçar um reload completo
      // Isso garante que o estado do React seja completamente resetado
      window.location.href = '/login';
    } catch (error) {
      console.error('❌ [SessionTimeout] Erro ao fazer logout:', error);
      // Força redirecionamento mesmo com erro
      window.location.href = '/login';
    }
  }, []);

  // Verifica o tempo de inatividade
  const checkInactivity = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    const timeUntilTimeout = SESSION_TIMEOUT - timeSinceLastActivity;

    // Se passou do tempo de timeout, faz logout
    if (timeUntilTimeout <= 0) {
      console.log('⏰ Session timeout - fazendo logout automático');
      onTimeout?.();
      handleLogout();
      return;
    }

    // Se está dentro do período de aviso (últimos 2 minutos)
    if (timeUntilTimeout <= WARNING_BEFORE_TIMEOUT) {
      const secondsRemaining = Math.ceil(timeUntilTimeout / 1000);
      setRemainingSeconds(secondsRemaining);

      // Mostra o aviso se ainda não foi mostrado
      if (!warningShownRef.current) {
        console.log('⚠️ Mostrando aviso de timeout de sessão');
        setIsWarningVisible(true);
        warningShownRef.current = true;
        onWarning?.();
      }
    }
  }, [enabled, onTimeout, onWarning, handleLogout]);

  // Configura os event listeners para detectar atividade
  useEffect(() => {
    if (!enabled) {
      console.log('⏱️ [SessionTimeout] Desabilitado - usuário não autenticado');
      return;
    }

    console.log('⏱️ [SessionTimeout] ✅ INICIADO - Monitorando inatividade');
    console.log(`⏱️ [SessionTimeout] Timeout configurado: ${SESSION_TIMEOUT / 1000 / 60} minutos`);
    console.log(`⏱️ [SessionTimeout] Aviso será exibido: ${WARNING_BEFORE_TIMEOUT / 1000 / 60} minutos antes do logout`);

    // Adiciona listeners para todos os eventos de atividade
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, updateLastActivity, { passive: true });
    });

    // Inicia o intervalo de verificação
    intervalRef.current = setInterval(checkInactivity, ACTIVITY_CHECK_INTERVAL);

    // Cleanup
    return () => {
      console.log('⏱️ [SessionTimeout] Cleanup - removendo listeners');
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, updateLastActivity);
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, updateLastActivity, checkInactivity]);

  // Salva o timestamp da última atividade no localStorage para persistência entre abas
  useEffect(() => {
    if (!enabled) return;

    const saveActivity = () => {
      localStorage.setItem('lastActivity', lastActivityRef.current.toString());
    };

    // Salva a cada 10 segundos
    const saveInterval = setInterval(saveActivity, 10000);

    // Carrega a última atividade salva
    const savedActivity = localStorage.getItem('lastActivity');
    if (savedActivity) {
      const savedTime = parseInt(savedActivity, 10);
      // Só usa o valor salvo se for mais recente
      if (savedTime > lastActivityRef.current) {
        lastActivityRef.current = savedTime;
      }
    }

    // Listener para sincronizar entre abas
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastActivity' && e.newValue) {
        const newTime = parseInt(e.newValue, 10);
        if (newTime > lastActivityRef.current) {
          lastActivityRef.current = newTime;
          // Se o aviso estava visível, esconde porque houve atividade em outra aba
          if (isWarningVisible) {
            setIsWarningVisible(false);
            warningShownRef.current = false;
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(saveInterval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [enabled, isWarningVisible]);

  return {
    isWarningVisible,
    remainingSeconds,
    resetActivity,
    handleContinue,
    handleLogout,
  };
}

export default useSessionTimeout;