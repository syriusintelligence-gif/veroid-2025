/**
 * ============================================
 * COMPONENTE: TrialInfoCard
 * ============================================
 * 
 * Card informativo sobre o período de teste (trial).
 * Versão reutilizável do TrialBanner para uso em Settings.
 * 
 * Características:
 * - Usa o mesmo hook useTrialStatus do Dashboard
 * - Exibe informações dinâmicas baseadas no banco de dados
 * - Sempre sincronizado com o TrialBanner
 * - Não afeta funcionalidades existentes
 * 
 * ============================================
 */

import { useTrialStatus, formatDaysRemaining } from '@/hooks/useTrialStatus';
import { AlertCircle, Clock } from 'lucide-react';

interface TrialInfoCardProps {
  className?: string;
}

export function TrialInfoCard({ className = '' }: TrialInfoCardProps) {
  const { trialStatus, loading } = useTrialStatus();

  // Não exibe se:
  // - Ainda está carregando
  // - Não tem trial status
  // - Trial expirou
  // - Usuário não tem trial (grandfathered ou assinante)
  if (loading || !trialStatus || trialStatus.isExpired || trialStatus.hasNoTrial) {
    return null;
  }

  // Só exibe se o trial está ativo
  if (!trialStatus.isActive) {
    return null;
  }

  // Define cores baseado no tempo restante
  const getCardStyle = () => {
    if (trialStatus.isCriticalPeriod) {
      // Último dia - Vermelho/Laranja
      return {
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-900',
        iconColor: 'text-red-600',
        accentColor: 'text-red-700',
      };
    } else if (trialStatus.isWarningPeriod) {
      // 3 dias ou menos - Amarelo
      return {
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        textColor: 'text-yellow-900',
        iconColor: 'text-yellow-600',
        accentColor: 'text-yellow-700',
      };
    } else {
      // Mais de 3 dias - Laranja (informativo)
      return {
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-900',
        iconColor: 'text-orange-600',
        accentColor: 'text-orange-700',
      };
    }
  };

  const style = getCardStyle();

  // Mensagem personalizada baseada no tempo restante
  const getMessage = () => {
    if (trialStatus.isCriticalPeriod) {
      return `⚠️ Último dia de teste! Seu acesso expira hoje.`;
    } else if (trialStatus.isWarningPeriod) {
      return `Seu período de teste expira em ${formatDaysRemaining(trialStatus.daysRemaining)}.`;
    } else {
      return `Você tem ${formatDaysRemaining(trialStatus.daysRemaining)} de teste restantes.`;
    }
  };

  return (
    <div className={`flex items-start gap-3 p-4 ${style.bgColor} border ${style.borderColor} rounded-lg ${className}`}>
      <AlertCircle className={`h-5 w-5 ${style.iconColor} mt-0.5 flex-shrink-0`} />
      <div className="space-y-1">
        <p className={`text-sm font-medium ${style.textColor}`}>
          Período de Teste Único
        </p>
        <p className={`text-xs ${style.accentColor}`}>
          {getMessage()} Após esgotar as assinaturas ou expirar o período, será necessário assinar um plano pago ou comprar pacotes avulsos para continuar usando o Vero iD.
        </p>
      </div>
    </div>
  );
}