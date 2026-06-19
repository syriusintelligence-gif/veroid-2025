import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';
import Index from './pages/Index';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import SignContent from './pages/SignContent';
import SignCarousel from './pages/SignCarousel';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLogs from './pages/AdminAuditLogs';
import Settings from './pages/Settings';
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Verify from './pages/Verify';
import Certificate from './pages/Certificate';
import CertificateDebug from './pages/CertificateDebug';
import CarouselTest from './pages/CarouselTest';
import ChangePassword from './pages/ChangePassword';
import ShortUrlRedirect from './pages/ShortUrlRedirect';
import Pricing from './pages/Pricing';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';

// 🔒 CSRF Protection imports
import { initializeCSRF } from './lib/csrf-protection';
// 🚨 MIDDLEWARE DESATIVADO TEMPORARIAMENTE - Causando loop infinito
// import { initializeCSRFMiddleware } from './lib/csrf-middleware';
import { logAuditEvent, AuditAction } from './lib/audit-logger';
import { clearAllKeys } from './lib/crypto';

function AppContent() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // 🆕 Modal de aviso de timeout
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(60); // 1 minuto de aviso
  
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

  // 🔐 SESSION TIMEOUT - Auto-logout por inatividade (15 minutos) + Modal de aviso (1 minuto antes)
  // ✅ CORRIGIDO: Removido showTimeoutWarning das dependências e usado useCallback
  
  // Configuração de tempos
  const INACTIVITY_TIME = 15 * 60 * 1000; // 15 minutos (PRODUÇÃO)
  const WARNING_TIME = 1 * 60 * 1000; // 1 minuto antes (PRODUÇÃO)
  const LAST_ACTIVITY_KEY = 'lastActivityTimestamp';

  // ✅ Handler de logout com useCallback (evita recriação)
  const handleLogout = useCallback(async () => {
    console.log('🔒 Auto-logout por inatividade (15 minutos)');
    
    // Fecha modal se estiver aberto
    setShowTimeoutWarning(false);
    
    // 🆕 Limpa chaves locais ANTES do logout
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('🗑️ Limpando chaves locais antes do logout...');
        clearAllKeys(user.id);
        console.log('✅ Chaves locais limpas com sucesso!');
      }
    } catch (error) {
      console.error('❌ Erro ao limpar chaves:', error);
    }
    
    // Log de auditoria
    await logAuditEvent(AuditAction.LOGOUT, {
      success: true,
      reason: 'session_timeout',
      inactivity_duration: INACTIVITY_TIME,
    });
    
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    await supabase.auth.signOut();
    navigate('/login');
  }, [navigate, INACTIVITY_TIME]);

  // ✅ Handler de aviso com useCallback
  const showWarning = useCallback(() => {
    console.log('⚠️ Mostrando aviso de timeout (1 minuto restante)');
    setShowTimeoutWarning(true);
    setRemainingSeconds(60); // 1 minuto
    
    // Log de auditoria
    logAuditEvent(AuditAction.SECURITY_EVENT, {
      success: true,
      event: 'session_timeout_warning_shown',
      remaining_time: WARNING_TIME,
    });
  }, [WARNING_TIME]);

  // ✅ Atualiza última atividade
  const updateLastActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
  }, [LAST_ACTIVITY_KEY]);

  // ✅ Reset timer com useCallback
  const resetTimer = useCallback(() => {
    // Fecha modal de aviso se estiver aberto
    setShowTimeoutWarning(prev => {
      if (prev) {
        console.log('✅ Sessão renovada - modal de aviso fechado');
      }
      return false;
    });

    // Limpa os timers anteriores
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }

    // Atualiza timestamp da última atividade
    updateLastActivity();

    // Inicia timer para mostrar aviso (aos 14 minutos)
    warningTimerRef.current = setTimeout(showWarning, INACTIVITY_TIME - WARNING_TIME);

    // Inicia timer para logout (aos 15 minutos)
    inactivityTimerRef.current = setTimeout(handleLogout, INACTIVITY_TIME);
  }, [INACTIVITY_TIME, WARNING_TIME, showWarning, handleLogout, updateLastActivity]);

  // ✅ Verifica inatividade ao mudar visibilidade da aba
  const checkInactivityOnVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // Aba voltou a ficar visível, verifica quanto tempo passou
      const lastActivity = localStorage.getItem(LAST_ACTIVITY_KEY);
      
      if (lastActivity) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);
        
        if (timeSinceLastActivity >= INACTIVITY_TIME) {
          // Passou mais de 15 minutos, faz logout imediatamente
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
  }, [INACTIVITY_TIME, WARNING_TIME, LAST_ACTIVITY_KEY, handleLogout, resetTimer, updateLastActivity]);

  // ✅ useEffect principal do timeout (SEM showTimeoutWarning nas dependências)
  useEffect(() => {
    if (!session) return;

    console.log('🔐 Timeout de sessão ativado: 15 minutos de inatividade');

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
  }, [session, resetTimer, checkInactivityOnVisibilityChange, handleLogout, INACTIVITY_TIME, LAST_ACTIVITY_KEY]); // ✅ CORRIGIDO: SEM showTimeoutWarning

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
  const handleContinueSession = useCallback(() => {
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
  }, []);

  // Handler para "Fazer Logout"
  const handleManualLogout = useCallback(async () => {
    console.log('👋 Usuário escolheu fazer logout');
    setShowTimeoutWarning(false);
    
    // 🆕 Limpa chaves locais ANTES do logout
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('🗑️ Limpando chaves locais...');
        clearAllKeys(user.id);
        console.log('✅ Chaves locais limpas!');
      }
    } catch (error) {
      console.error('❌ Erro ao limpar chaves:', error);
    }
    
    // Log de auditoria
    await logAuditEvent(AuditAction.LOGOUT, {
      success: true,
      reason: 'user_requested',
    });
    
    localStorage.removeItem('lastActivityTimestamp');
    await supabase.auth.signOut();
    navigate('/login');
  }, [navigate]);

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
      {/* Modal de Aviso de Timeout - ATIVADO */}
      <SessionTimeoutWarning
        isOpen={showTimeoutWarning}
        remainingSeconds={remainingSeconds}
        onContinue={handleContinueSession}
        onLogout={handleManualLogout}
      />

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
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/certificate" element={<Certificate />} />
        <Route path="/c/:shortCode" element={<ShortUrlRedirect />} />
        <Route path="/certificate-debug" element={<CertificateDebug />} />
        <Route path="/carousel-test" element={<CarouselTest />} />
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
          path="/sign-carousel"
          element={session ? <SignCarousel /> : <Navigate to="/login" />}
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
        <Route
          path="/admin/audit-logs"
          element={session ? <AdminAuditLogs /> : <Navigate to="/login" />}
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