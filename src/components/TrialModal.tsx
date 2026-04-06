/**
 * ============================================
 * COMPONENTE: TrialModal
 * ============================================
 * 
 * Modal de aviso do período de teste (trial).
 * Exibe ao fazer login quando o trial está próximo de expirar.
 * 
 * ⚠️ FASE 2: Este componente APENAS EXIBE AVISOS
 * Não bloqueia funcionalidades, não afeta o fluxo atual.
 * 
 * Características:
 * - Aparece apenas uma vez por dia (localStorage)
 * - Exibe apenas quando faltam 3 dias ou menos
 * - Mostra progresso visual do trial
 * - Botão para ir para página de planos
 * - Pode ser fechado e não aparece novamente no dia
 * 
 * ============================================
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, CreditCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTrialStatus, formatDaysRemaining } from '@/hooks/useTrialStatus';

interface TrialModalProps {
  userId?: string;
}

export function TrialModal({ userId }: TrialModalProps) {
  const navigate = useNavigate();
  const { trialStatus, loading } = useTrialStatus();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (loading || !trialStatus || !userId) return;

    // Não exibe se:
    // - Trial expirou (será tratado na Fase 3)
    // - Usuário não tem trial (grandfathered ou assinante)
    // - Trial não está no período de aviso (mais de 3 dias)
    if (trialStatus.isExpired || trialStatus.hasNoTrial || !trialStatus.isWarningPeriod) {
      return;
    }

    // Verifica se já foi exibido hoje
    const lastShownKey = `trial_modal_shown_${userId}`;
    const lastShown = localStorage.getItem(lastShownKey);
    const today = new Date().toDateString();

    if (lastShown === today) {
      console.log('ℹ️ Modal de trial já foi exibido hoje, não mostrando novamente');
      return;
    }

    // Exibe o modal
    console.log('⚠️ Exibindo modal de aviso de trial');
    setIsOpen(true);

    // Marca como exibido hoje
    localStorage.setItem(lastShownKey, today);
  }, [loading, trialStatus, userId]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleGoToPlans = () => {
    setIsOpen(false);
    navigate('/pricing');
  };

  if (!trialStatus || !trialStatus.isWarningPeriod) {
    return null;
  }

  // Define estilo baseado no tempo restante
  const isCritical = trialStatus.isCriticalPeriod;
  const iconColor = isCritical ? 'text-red-600' : 'text-yellow-600';
  const Icon = isCritical ? AlertTriangle : Clock;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-3 rounded-full ${isCritical ? 'bg-red-100' : 'bg-yellow-100'}`}>
              <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <DialogTitle className="text-xl">
              {isCritical ? 'Último Dia de Teste!' : 'Seu Trial Está Expirando'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {isCritical
              ? 'Seu período de teste expira hoje. Assine agora para continuar usando o Vero iD.'
              : `Seu período de teste expira em ${formatDaysRemaining(trialStatus.daysRemaining)}. Não perca o acesso!`}
          </DialogDescription>
        </DialogHeader>

        {/* Progresso Visual */}
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso do Trial</span>
              <span className="font-semibold">
                {Math.round(trialStatus.percentageUsed)}% usado
              </span>
            </div>
            <Progress 
              value={trialStatus.percentageUsed} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Início: {new Date(trialStatus.trialStartsAt!).toLocaleDateString('pt-BR')}</span>
              <span>Fim: {new Date(trialStatus.trialEndsAt!).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          {/* Informações */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Assinando um plano você garante:</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Acesso ilimitado a todas as funcionalidades</li>
                  <li>• Assinaturas digitais sem limite</li>
                  <li>• Suporte prioritário</li>
                  <li>• Certificados personalizados</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Lembrar Depois
          </Button>
          <Button
            onClick={handleGoToPlans}
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Ver Planos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}