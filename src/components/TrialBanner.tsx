/**
 * ============================================
 * COMPONENTE: TrialBanner
 * ============================================
 * 
 * Banner de aviso do período de teste (trial).
 * Exibe no topo do Dashboard quando o trial está ativo.
 * 
 * ⚠️ FASE 2: Este componente APENAS EXIBE AVISOS
 * Não bloqueia funcionalidades, não afeta o fluxo atual.
 * 
 * Características:
 * - Aparece apenas para usuários com trial ativo
 * - Mostra dias restantes
 * - Cores diferentes baseado no tempo restante
 * - Botão para ir para página de planos
 * - Pode ser fechado temporariamente
 * 
 * ============================================
 */

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, Clock, CreditCard, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTrialStatus, formatDaysRemaining } from '@/hooks/useTrialStatus';

interface TrialBannerProps {
  className?: string;
}

export function TrialBanner({ className = '' }: TrialBannerProps) {
  const navigate = useNavigate();
  const { trialStatus, loading } = useTrialStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state quando o trial status mudar
  useEffect(() => {
    setIsDismissed(false);
  }, [trialStatus?.daysRemaining]);

  // Não exibe se:
  // - Ainda está carregando
  // - Usuário fechou o banner
  // - Não tem trial status
  // - Trial expirou (será tratado na Fase 3)
  // - Usuário não tem trial (grandfathered ou assinante)
  if (loading || isDismissed || !trialStatus || trialStatus.isExpired || trialStatus.hasNoTrial) {
    return null;
  }

  // Só exibe se o trial está ativo
  if (!trialStatus.isActive) {
    return null;
  }

  // Define cores e ícones baseado no tempo restante
  const getBannerStyle = () => {
    if (trialStatus.isCriticalPeriod) {
      // Último dia - Vermelho/Laranja
      return {
        bgColor: 'bg-red-50 border-red-200',
        textColor: 'text-red-900',
        iconColor: 'text-red-600',
        buttonColor: 'bg-red-600 hover:bg-red-700',
        icon: AlertTriangle,
      };
    } else if (trialStatus.isWarningPeriod) {
      // 3 dias ou menos - Amarelo
      return {
        bgColor: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-900',
        iconColor: 'text-yellow-600',
        buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
        icon: Clock,
      };
    } else {
      // Mais de 3 dias - Azul (informativo)
      return {
        bgColor: 'bg-blue-50 border-blue-200',
        textColor: 'text-blue-900',
        iconColor: 'text-blue-600',
        buttonColor: 'bg-blue-600 hover:bg-blue-700',
        icon: Clock,
      };
    }
  };

  const style = getBannerStyle();
  const Icon = style.icon;

  // Mensagem personalizada baseada no tempo restante
  const getMessage = () => {
    if (trialStatus.isCriticalPeriod) {
      return `⚠️ Último dia de teste! Seu acesso expira hoje.`;
    } else if (trialStatus.isWarningPeriod) {
      return `Seu período de teste expira em ${formatDaysRemaining(trialStatus.daysRemaining)}.`;
    } else {
      return `Você está no período de teste. Restam ${formatDaysRemaining(trialStatus.daysRemaining)}.`;
    }
  };

  return (
    <Alert className={`${style.bgColor} border ${className} relative`}>
      <Icon className={`h-5 w-5 ${style.iconColor}`} />
      <AlertDescription className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className={`font-semibold ${style.textColor} mb-1`}>
            {getMessage()}
          </p>
          <p className={`text-sm ${style.textColor} opacity-90`}>
            Assine um plano para continuar usando o Vero iD sem interrupções.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/pricing')}
            className={`${style.buttonColor} text-white`}
            size="sm"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Ver Planos
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDismissed(true)}
            className={`${style.textColor} hover:bg-black/5`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}