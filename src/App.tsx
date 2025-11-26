import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, lazy, Suspense } from 'react';
import { getCurrentUser } from './lib/supabase-auth-v2';
import type { User } from './lib/supabase-auth-v2';
import { LoadingSpinner } from './components/LoadingSpinner';

// Eager load: Landing page and auth pages (critical for first paint)
import Index from './pages/Index';
import Login from './pages/Login';
import LoginV2 from './pages/Login-v2';
import Cadastro from './pages/Cadastro';

// Lazy load: Heavy pages loaded on demand
const Dashboard = lazy(() => import('./pages/Dashboard'));
const SignContent = lazy(() => import('./pages/SignContent'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Certificate = lazy(() => import('./pages/Certificate'));
const Verify = lazy(() => import('./pages/Verify'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminSetup = lazy(() => import('./pages/AdminSetup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const CreateAdminAccount = lazy(() => import('./pages/CreateAdminAccount'));

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Rotas de autenticação antigas (mantidas para compatibilidade) */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          
          {/* Rotas de autenticação V2 (novas e melhoradas) */}
          <Route path="/login-v2" element={<LoginV2 />} />
          
          {/* Recuperação de senha */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Admin Setup - Página para resetar senha do admin */}
          <Route path="/admin-setup" element={<AdminSetup />} />
          
          {/* Criar conta admin */}
          <Route path="/create-admin" element={<CreateAdminAccount />} />
          
          {/* Rotas protegidas */}
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <Navigate to="/login-v2" />}
          />
          <Route
            path="/sign"
            element={user ? <SignContent /> : <Navigate to="/login-v2" />}
          />
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login-v2" />}
          />
          <Route
            path="/settings"
            element={user ? <Settings /> : <Navigate to="/login-v2" />}
          />
          <Route path="/certificate" element={<Certificate />} />
          <Route path="/c" element={<Certificate />} />
          <Route path="/verify" element={<Verify />} />
          <Route
            path="/admin/users"
            element={user?.isAdmin ? <AdminUsers /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/admin/dashboard"
            element={user?.isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />}
          />
          <Route
            path="/admin"
            element={user?.isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" />}
          />
          
          {/* Rota padrão */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;