/**
 * ============================================
 * COMPONENTE: PaymentFailureAlert
 * ============================================
 * 
 * Alerta visual para problemas de cobrança/pagamento.
 * Exibe avisos quando há problemas com o cartão de crédito.
 * 
 * ⚠️ IMPORTANTE: Este componente APENAS EXIBE AVISOS
 * Não bloqueia funcionalidades, não afeta o fluxo atual.
 * 
 * Status de pagamento detectados:
 * - past_due: Pagamento atrasado (Stripe tentando cobrar)
 * - unpaid: Não pago após todas as tentativas
 * - incomplete: Pagamento incompleto (requer ação)
 * - incomplete_expired: Pagamento expirado
 * 
 * ============================================
 */

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CreditCard, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PaymentFailureAlertProps {
  className?: string;
}

export function PaymentFailureAlert({ className = '' }: PaymentFailureAlertProps) {
  const navigate = useNavigate();
  const { subscription, loading } = useSubscription();
  const { toast } = useToast();
  const [openingPortal, setOpeningPortal] = useState(false);

  // Não exibe se ainda está carregando
  if (loading || !subscription) {
    return null;
  }

  // Define quais status indicam problema de pagamento
  const paymentIssueStatuses = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'];
  const hasPaymentIssue = paymentIssueStatuses.includes(subscription.status);

  // Não exibe se não há problema de pagamento
  if (!hasPaymentIssue) {
    return null;
  }

  // Função para abrir o Stripe Customer Portal
  const handleOpenBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast({
          title: "Erro de Autenticação",
          description: "Você precisa estar logado para acessar o portal de pagamentos.",
          variant: "destructive",
        });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/create-billing-portal`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar sessão do portal');
      }

      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('URL do portal não retornada');
      }

    } catch (error) {
      console.error('❌ Erro ao abrir portal de pagamentos:', error);
      
      toast({
        title: "Erro ao Abrir Portal",
        description: error instanceof Error ? error.message : 'Erro desconhecido ao abrir portal de pagamentos.',
        variant: "destructive",
      });
    } finally {
      setOpeningPortal(false);
    }
  };

  // Define mensagem e estilo baseado no status
  const getAlertConfig = () => {
    switch (subscription.status) {
      case 'past_due':
        return {
          title: '⚠️ Problema com Pagamento',
          message: 'Não conseguimos processar seu pagamento. Seu acesso pode ser interrompido em breve. Por favor, atualize seu método de pagamento.',
          bgColor: 'bg-yellow-50 border-yellow-500',
          textColor: 'text-yellow-900',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
          urgent: false,
        };
      
      case 'unpaid':
        return {
          title: '🚫 Pagamento Não Realizado',
          message: 'Seu pagamento não foi processado após várias tentativas. Atualize seu método de pagamento imediatamente para evitar a suspensão do serviço.',
          bgColor: 'bg-red-50 border-red-500',
          textColor: 'text-red-900',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          urgent: true,
        };
      
      case 'incomplete':
        return {
          title: '⏳ Pagamento Incompleto',
          message: 'Seu pagamento requer ação adicional. Por favor, complete o processo de pagamento para continuar usando o serviço.',
          bgColor: 'bg-orange-50 border-orange-500',
          textColor: 'text-orange-900',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
          urgent: false,
        };
      
      case 'incomplete_expired':
        return {
          title: '❌ Pagamento Expirado',
          message: 'Seu processo de pagamento expirou. Por favor, configure um novo método de pagamento para reativar sua assinatura.',
          bgColor: 'bg-red-50 border-red-500',
          textColor: 'text-red-900',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          urgent: true,
        };
      
      default:
        return null;
    }
  };

  const config = getAlertConfig();

  if (!config) {
    return null;
  }

  return (
    <Alert className={`${config.bgColor} border-2 ${className}`}>
      <AlertTriangle className={`h-5 w-5 ${config.urgent ? 'text-red-600' : 'text-yellow-600'}`} />
      <AlertDescription className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className={`font-bold ${config.textColor} mb-2 text-base`}>
            {config.title}
          </p>
          <p className={`${config.textColor} text-sm mb-3`}>
            {config.message}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleOpenBillingPortal}
              disabled={openingPortal}
              className={`${config.buttonColor} text-white`}
              size="sm"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {openingPortal ? 'Abrindo Portal...' : 'Atualizar Método de Pagamento'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/settings?tab=subscription')}
              className="border-2"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Ver Detalhes da Assinatura
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}