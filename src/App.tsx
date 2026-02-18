import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Index from './pages/Index';
import Login from './pages/Login';
import LoginV2 from './pages/Login-v2';
import Cadastro from './pages/Cadastro';
import EmailConfirmation from './pages/EmailConfirmation';
import Dashboard from './pages/Dashboard';
import SignContent from './pages/SignContent';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Certificate from './pages/Certificate';
import Verify from './pages/Verify';
import AdminUsers from './pages/AdminUsers';
import AdminDashboard from './pages/AdminDashboard';
import AdminSetup from './pages/AdminSetup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CreateAdminAccount from './pages/CreateAdminAccount';
import Pricing from './pages/Pricing';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { getCurrentUser } from './lib/supabase-auth-v2';
import { supabase } from './lib/supabase';
import type { User } from './lib/supabase-auth-v2';

// Componente wrapper para gerenciar o timeout de sessão
function SessionTimeoutManager({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated: boolean }) {
  const {
    isWarningVisible,
    remainingSeconds,
    handleContinue,
    handleLogout,
  } = useSessionTimeout({
    enabled: isAuthenticated, // Só ativa o timeout se o usuário estiver autenticado
    onTimeout: () => {
      console.log('🔒 Sessão expirada por inatividade');
    },
    onWarning: () => {
      console.log('⚠️ Aviso de timeout de sessão exibido');
    },
  });

  return (
    <>
      {children}
      <SessionTimeoutWarning
        isOpen={isWarningVisible}
        remainingSeconds={remainingSeconds}
        onContinue={handleContinue}
        onLogout={handleLogout}
      />
    </>
  );
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica o usuário inicial
    checkUser();

    // Escuta mudanças de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [App] Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('👋 [App] Usuário deslogado, limpando estado...');
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        console.log('✅ [App] Usuário logado, atualizando estado...');
        await checkUser();
      }
    });

    // Cleanup da subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      console.log('🔍 [App] Verificando usuário atual...');
      const currentUser = await getCurrentUser();
      console.log('👤 [App] Usuário:', currentUser ? currentUser.email : 'não autenticado');
      setUser(currentUser);
    } catch (error) {
      console.error('❌ [App] Erro ao verificar usuário:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <SessionTimeoutManager isAuthenticated={!!user}>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Rotas de autenticação antigas (mantidas para compatibilidade) */}
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          
          {/* 📧 Página de confirmação de email após cadastro */}
          <Route path="/email-confirmation" element={<EmailConfirmation />} />
          
          {/* Rotas de autenticação V2 (novas e melhoradas) */}
          <Route path="/login-v2" element={<LoginV2 />} />
          
          {/* Recuperação de senha */}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Admin Setup - Página para resetar senha do admin */}
          <Route path="/admin-setup" element={<AdminSetup />} />
          
          {/* Criar conta admin */}
          <Route path="/create-admin" element={<CreateAdminAccount />} />
          
          {/* Página de Preços/Planos */}
          <Route path="/pricing" element={<Pricing />} />
          
          {/* 🆕 Rotas de Pagamento - Públicas */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          
          {/* Rotas protegidas */}
          <Route
            path="/dashboard"
            element={user ? <Dashboard /> : <Navigate to="/login" />}
          />
          <Route
            path="/sign"
            element={user ? <SignContent /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={user ? <Profile /> : <Navigate to="/login" />}
          />
          <Route
            path="/settings"
            element={user ? <Settings /> : <Navigate to="/login" />}
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
      </SessionTimeoutManager>
    </Router>
  );
}

export default App;