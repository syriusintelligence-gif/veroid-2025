import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import Index from './pages/Index';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import SignContent from './pages/SignContent';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import Settings from './pages/Settings';
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Verify from './pages/Verify';
import Certificate from './pages/Certificate';
import ChangePassword from './pages/ChangePassword';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';

// 🔒 CSRF Protection imports
import { initializeCSRF } from './lib/csrf-protection';
// 🚨 MIDDLEWARE DESATIVADO TEMPORARIAMENTE - Causando loop infinito
// import { initializeCSRFMiddleware } from './lib/csrf-middleware';
import { logAuditEvent, AuditAction } from './lib/audit-logger';

function AppContent() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // 🆕 Modal de aviso de timeout
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(30); // 30 segundos para teste
  
  // 🆕 CSRF initialization state
  const [csrfInitialized, setCsrfInitialized] = useState(false);

  // 🔒 Initialize CSRF Protection (SEM MIDDLEWARE)
  useEffect(() => {
    async function setupCSRFProtection() {
      try {
        console.log('🔐 [App] Inicializando proteção CSRF (sem middleware)...');
        
        // Inicializa token CSRF
        const token = await initializeCSRF();
        console.log('✅ [App] Token CSRF inicializado');
        
        // 🚨 MIDDLEWARE DESATIVADO - Estava causando loop infinito
        // Motivo: Interceptava requisições do Supabase, criando loop recursivo
        // TODO: Implementar middleware com blacklist adequada para Supabase
        
        console.log('⚠️ [App] Middleware CSRF desativado temporariamente');
        
        // Marca como inicializado
        setCsrfInitialized(true);
        
        // Log de auditoria
        await logAuditEvent(AuditAction.SECURITY_EVENT, {
          success: true,
          event: 'csrf_token_initialized',
          middleware_active: false,
          timestamp: new Date().toISOString(),
        });
        
        console.log('✅ [App] Token CSRF ativo (uso manual nos formulários)');
      } catch (error) {
        console.error('❌ [App] Erro ao inicializar CSRF:', error);
        
        // Log de erro
        await logAuditEvent(AuditAction.SECURITY_EVENT, {
          success: false,
          event: 'csrf_initialization_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        // Marca como inicializado mesmo com erro (para não bloquear app)
        setCsrfInitialized(true);
      }
    }
    
    setupCSRFProtection();
  }, []); // Executa apenas uma vez ao montar

  // ⚠️ FUNCIONALIDADE DE TIMEOUT DESATIVADA TEMPORARIAMENTE
  // Motivo: Bug na linha 241 - showTimeoutWarning nas dependências causa recriação constante dos event listeners
  // TODO: Corrigir removendo showTimeoutWarning das dependências e usar useCallback para handlers
  // Para reativar: descomentar o bloco abaixo e corrigir as dependências do useEffect
  
  /*
  // 🧪 MODO TESTE: Auto-logout por inatividade (1 minuto) + Modal de aviso (30 segundos antes)
  useEffect(() => {
    if (!session) return;

    // 🧪 VALORES PARA TESTE - Reduzir para produção
    const INACTIVITY_TIME = 1 * 60 * 1000; // 1 minuto (TESTE)
    const WARNING_TIME = 30 * 1000; // 30 segundos antes (TESTE)
    // 🔴 PRODUÇÃO: Usar 15 minutos e 2 minutos
    // const INACTIVITY_TIME = 15 * 60 * 1000; // 15 minutos
    // const WARNING_TIME = 2 * 60 * 1000; // 2 minutos antes
    
    const LAST_ACTIVITY_KEY = 'lastActivityTimestamp';

    const handleLogout = async () => {
      console.log('🔒 Auto-logout por inatividade (1 minuto - TESTE)');
      
      // Fecha modal se estiver aberto
      setShowTimeoutWarning(false);
      
      // Log de auditoria
      await logAuditEvent(AuditAction.LOGOUT, {
        success: true,
        reason: 'session_timeout',
        inactivity_duration: INACTIVITY_TIME,
      });
      
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      await supabase.auth.signOut();
      navigate('/login');
    };

    const showWarning = () => {
      console.log('⚠️ Mostrando aviso de timeout (30 segundos restantes - TESTE)');
      setShowTimeoutWarning(true);
      setRemainingSeconds(30); // 30 segundos para teste
      
      // Log de auditoria
      logAuditEvent(AuditAction.SECURITY_EVENT, {
        success: true,
        event: 'session_timeout_warning_shown',
        remaining_time: WARNING_TIME,
      });
    };

    const updateLastActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    };

    const resetTimer = () => {
      // Fecha modal de aviso se estiver aberto
      if (showTimeoutWarning) {
        setShowTimeoutWarning(false);
        console.log('✅ Sessão renovada - modal de aviso fechado');
      }

      // Limpa os timers anteriores
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }

      // Atualiza timestamp da última atividade
      updateLastActivity();

      // Inicia timer para mostrar aviso (aos 30 segundos - TESTE)
      warningTimerRef.current = setTimeout(showWarning, INACTIVITY_TIME - WARNING_TIME);

      // Inicia timer para logout (ao 1 minuto - TESTE)
      inactivityTimerRef.current = setTimeout(handleLogout, INACTIVITY_TIME);
    };

    const checkInactivityOnVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Aba voltou a ficar visível, verifica quanto tempo passou
        const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
        
        if (lastActivity) {
          const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
          
          if (timeSinceLastActivity >= INACTIVITY_TIME) {
            // Passou mais de 1 minuto, faz logout imediatamente
            console.log('🔒 Auto-logout: Tempo de inatividade excedido ao retornar à aba');
            handleLogout();
            return;
          } else if (timeSinceLastActivity >= INACTIVITY_TIME - WARNING_TIME) {
            // Está no período de aviso, mostra modal
            const remainingTime = INACTIVITY_TIME - timeSinceLastActivity;
            setRemainingSeconds(Math.floor(remainingTime / 1000));
            setShowTimeoutWarning(true);
            
            // Agenda logout para o tempo restante
            if (inactivityTimerRef.current) {
              clearTimeout(inactivityTimerRef.current);
            }
            inactivityTimerRef.current = setTimeout(handleLogout, remainingTime);
          }
        }
        
        // Se não passou o tempo, reseta o timer
        if (document.visibilityState === 'visible') {
          resetTimer();
        }
      } else {
        // Aba ficou inativa, salva timestamp
        updateLastActivity();
      }
    };

    // Eventos que detectam atividade do usuário
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Monitora mudanças de visibilidade da aba
    document.addEventListener('visibilitychange', checkInactivityOnVisibilityChange);

    // Verifica inatividade ao montar o componente
    const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
      if (timeSinceLastActivity >= INACTIVITY_TIME) {
        handleLogout();
        return;
      }
    }

    // Inicia o timer pela primeira vez
    resetTimer();

    // Cleanup: remove event listeners e limpa timers
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });

      document.removeEventListener('visibilitychange', checkInactivityOnVisibilityChange);

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, [session, navigate, showTimeoutWarning]); // ⚠️ BUG: showTimeoutWarning causa recriação constante
  */

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handler para "Continuar Conectado"
  const handleContinueSession = () => {
    console.log('✅ Usuário escolheu continuar conectado');
    setShowTimeoutWarning(false);
    
    // Força reset do timer através de um evento simulado
    const event = new Event('click');
    window.dispatchEvent(event);
    
    // Log de auditoria
    logAuditEvent(AuditAction.SECURITY_EVENT, {
      success: true,
      event: 'session_renewed_by_user',
    });
  };

  // Handler para "Fazer Logout"
  const handleManualLogout = async () => {
    console.log('👋 Usuário escolheu fazer logout');
    setShowTimeoutWarning(false);
    
    // Log de auditoria
    await logAuditEvent(AuditAction.LOGOUT, {
      success: true,
      reason: 'user_requested',
    });
    
    localStorage.removeItem('lastActivityTimestamp');
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Loading apenas enquanto carrega sessão (CSRF não bloqueia mais)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {/* Modal de Aviso de Timeout - DESATIVADO TEMPORARIAMENTE */}
      {/* 
      <SessionTimeoutWarning
        isOpen={showTimeoutWarning}
        remainingSeconds={remainingSeconds}
        onContinue={handleContinueSession}
        onLogout={handleManualLogout}
      />
      */}

      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/cadastro" element={!session ? <Cadastro /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/certificate" element={<Certificate />} />
        <Route
          path="/change-password"
          element={session ? <ChangePassword /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={session ? <Profile /> : <Navigate to="/login" />}
        />
        <Route
          path="/sign"
          element={session ? <SignContent /> : <Navigate to="/login" />}
        />
        <Route
          path="/sign-content"
          element={session ? <SignContent /> : <Navigate to="/login" />}
        />
        <Route
          path="/settings"
          element={session ? <Settings /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={session ? <AdminDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/dashboard"
          element={session ? <AdminDashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin/users"
          element={session ? <AdminUsers /> : <Navigate to="/login" />}
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;