/**
 * ============================================
 * COMPONENTE: TrialExpiredGuard
 * ============================================
 * 
 * 🔒 FASE 3: Bloqueio de Acesso Após Trial Expirar
 * 
 * Componente wrapper que protege rotas quando o trial expira.
 * 
 * Características:
 * - Verifica se trial expirou usando useTrialStatus
 * - Redireciona para /trial-expired se expirado
 * - NÃO afeta usuários premium/assinantes
 * - NÃO afeta usuários grandfathered
 * - NÃO afeta funcionalidades existentes
 * 
 * Uso:
 * ```tsx
 * <TrialExpiredGuard>
 *   <Dashboard />
 * </TrialExpiredGuard>
 * ```
 * 
 * ============================================
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { Loader2 } from 'lucide-react';

interface TrialExpiredGuardProps {
  children: React.ReactNode;
}

export function TrialExpiredGuard({ children }: TrialExpiredGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { trialStatus, loading } = useTrialStatus();

  useEffect(() => {
    // Aguarda carregamento do status
    if (loading) return;

    // Se não tem trial status, permite acesso (fallback seguro)
    if (!trialStatus) {
      console.log('⚠️ [TrialExpiredGuard] Sem trial status, permitindo acesso');
      return;
    }

    // ✅ PERMITE ACESSO se:
    // 1. Usuário é assinante (premium/basic/enterprise)
    // 2. Usuário é grandfathered (acesso vitalício)
    // 3. Trial ainda está ativo
    if (trialStatus.hasNoTrial || trialStatus.isActive) {
      console.log('✅ [TrialExpiredGuard] Acesso permitido:', {
        hasNoTrial: trialStatus.hasNoTrial,
        isActive: trialStatus.isActive,
        subscriptionTier: trialStatus.subscriptionTier,
      });
      return;
    }

    // ❌ BLOQUEIA ACESSO se trial expirou
    if (trialStatus.isExpired) {
      console.log('🔒 [TrialExpiredGuard] Trial expirado, redirecionando para /trial-expired');
      console.log('📊 [TrialExpiredGuard] Status:', {
        daysRemaining: trialStatus.daysRemaining,
        trialEndsAt: trialStatus.trialEndsAt,
        subscriptionTier: trialStatus.subscriptionTier,
      });

      // Redireciona para página de trial expirado
      // Salva a rota atual para redirecionar de volta após assinatura
      navigate('/trial-expired', {
        state: { from: location.pathname },
        replace: true,
      });
    }
  }, [loading, trialStatus, navigate, location]);

  // Mostra loading enquanto verifica status
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Se passou pelas verificações, renderiza o conteúdo
  return <>{children}</>;
}