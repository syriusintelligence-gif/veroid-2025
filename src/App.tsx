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
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import Settings from './pages/Settings';
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Verify from './pages/Verify';
import Certificate from './pages/Certificate';

function AppContent() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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