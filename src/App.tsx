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

// 🔒 CSRF Protection imports
import { initializeCSRF } from './lib/csrf-protection';
import { initializeCSRFMiddleware } from './lib/csrf-middleware';
import { logAuditEvent, AuditAction } from './lib/audit-logger';

function AppContent() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  
  // 🆕 CSRF initialization state
  const [csrfInitialized, setCsrfInitialized] = useState(false);

  // 🔒 Initialize CSRF Protection
  useEffect(() => {
    async function setupCSRFProtection() {
      try {
        console.log('🔐 [App] Inicializando proteção CSRF...');
        
        // Inicializa token CSRF
        const token = await initializeCSRF();
        console.log('✅ [App] Token CSRF inicializado');
        
        // Inicializa middleware (intercepta fetch automaticamente)
        initializeCSRFMiddleware({
          // Configuração customizada
          blacklist: [
            // APIs externas que não precisam de CSRF
            'https://api.ipify.org',
            'https://ipapi.co',
            'https://geolocation-db.com',
          ],
          methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
          validateResponses: false,
          logRequests: true,
        });
        
        console.log('✅ [App] Middleware CSRF ativo');
        
        // Marca como inicializado
        setCsrfInitialized(true);
        
        // Log de auditoria
        await logAuditEvent(AuditAction.SECURITY_EVENT, {
          success: true,
          event: 'csrf_protection_initialized',
          timestamp: new Date().toISOString(),
        });
        
        console.log('🎉 [App] Proteção CSRF totalmente ativa!');
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

  // Auto-logout por inatividade (15 minutos)
  useEffect(() => {
    if (!session) return;

    const INACTIVITY_TIME = 15 * 60 * 1000; // 15 minutos em milissegundos
    const LAST_ACTIVITY_KEY = 'lastActivityTimestamp';

    const handleLogout = async () => {
      console.log('🔒 Auto-logout por inatividade (15 minutos)');
      localStorage.removeItem(LAST_ACTIVITY_KEY);
      await supabase.auth.signOut();
      navigate('/login');
    };

    const updateLastActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString());
    };

    const resetTimer = () => {
      // Limpa o timer anterior
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      // Atualiza timestamp da última atividade
      updateLastActivity();

      // Inicia novo timer
      inactivityTimerRef.current = setTimeout(handleLogout, INACTIVITY_TIME);
    };

    const checkInactivityOnVisibilityChange = () => {
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
          }
        }
        
        // Se não passou o tempo, reseta o timer
        resetTimer();
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

    // Cleanup: remove event listeners e limpa timer
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });

      document.removeEventListener('visibilitychange', checkInactivityOnVisibilityChange);

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [session, navigate]);

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

  // 🆕 Mostra loading enquanto CSRF não está inicializado
  if (loading || !csrfInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          {!csrfInitialized && (
            <p className="text-sm text-gray-600">Inicializando proteção de segurança...</p>
          )}
        </div>
      </div>
    );
  }

  return (
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