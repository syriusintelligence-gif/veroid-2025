import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useRef, useCallback } from 'react';
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
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminSetup from './pages/AdminSetup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';
import CreateAdminAccount from './pages/CreateAdminAccount';
import Pricing from './pages/Pricing';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Terms from './pages/Terms';
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
  
  // Ref para controlar se a verificação inicial já foi feita
  const initialCheckDoneRef = useRef(false);
  // Ref para evitar chamadas simultâneas
  const isCheckingRef = useRef(false);

  const checkUser = useCallback(async () => {
    // Evita chamadas simultâneas
    if (isCheckingRef.current) {
      console.log('🔄 [App] Verificação já em andamento, ignorando...');
      return;
    }
    
    isCheckingRef.current = true;
    
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
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Verifica o usuário inicial apenas uma vez
    if (!initialCheckDoneRef.current) {
      initialCheckDoneRef.current = true;
      checkUser();
    }

    // Escuta mudanças de autenticação do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 [App] Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || !session) {
        console.log('👋 [App] Usuário deslogado, limpando estado...');
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN') {
        // 🆕 CORREÇÃO: Só atualiza se o usuário ainda não estiver logado
        // Isso evita re-renderizações desnecessárias quando navega entre páginas
        if (!user) {
          console.log('✅ [App] Usuário logado, atualizando estado...');
          await checkUser();
        } else {
          console.log('ℹ️ [App] Usuário já logado, ignorando evento SIGNED_IN');
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 [App] Token atualizado');
        // Não precisa verificar novamente, apenas log
      } else if (event === 'INITIAL_SESSION') {
        // 🆕 Ignora INITIAL_SESSION se já temos um usuário
        if (!user && session) {
          console.log('🔄 [App] Sessão inicial detectada, verificando usuário...');
          await checkUser();
        } else {
          console.log('ℹ️ [App] INITIAL_SESSION ignorado - usuário já carregado');
        }
      }
    });

    // Cleanup da subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [checkUser, user]);

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
          
          {/* Auth Callback - Processa tokens de autenticação do Supabase */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          
          {/* Admin Setup - Página para resetar senha do admin */}
          <Route path="/admin-setup" element={<AdminSetup />} />
          
          {/* Criar conta admin */}
          <Route path="/create-admin" element={<CreateAdminAccount />} />
          
          {/* Página de Preços/Planos */}
          <Route path="/pricing" element={<Pricing />} />
          
          {/* 🆕 Rotas de Pagamento - Públicas */}
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          
          {/* Páginas Institucionais */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<Terms />} />
          
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
            path="/admin/audit-logs"
            element={user?.isAdmin ? <AdminAuditLogs /> : <Navigate to="/dashboard" />}
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