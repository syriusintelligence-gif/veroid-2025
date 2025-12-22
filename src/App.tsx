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

  // Auto-logout por inatividade (30 minutos)
  useEffect(() => {
    if (!session) return;

    const INACTIVITY_TIME = 30 * 60 * 1000; // 30 minutos em milissegundos

    const handleLogout = async () => {
      console.log('🔒 Auto-logout por inatividade (30 minutos)');
      await supabase.auth.signOut();
      navigate('/login');
    };

    const resetTimer = () => {
      // Limpa o timer anterior
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      // Inicia novo timer
      inactivityTimerRef.current = setTimeout(handleLogout, INACTIVITY_TIME);
    };

    // Eventos que detectam atividade do usuário
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Inicia o timer pela primeira vez
    resetTimer();

    // Cleanup: remove event listeners e limpa timer
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });

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