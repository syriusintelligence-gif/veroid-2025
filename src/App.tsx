import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
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
import Terms from './pages/Terms';
import PrivacyPolicy from './pages/PrivacyPolicy';

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/cadastro" element={!session ? <Cadastro /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!session ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/profile"
          element={session ? <Profile /> : <Navigate to="/login" />}
        />
        <Route
          path="/sign-content"
          element={session ? <SignContent /> : <Navigate to="/login" />}
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
    </Router>
  );
}

export default App;