import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ShieldCheck, X, Loader2 } from 'lucide-react';
import { has2FAEnabled } from '@/lib/supabase-2fa';

interface TwoFactorAlertProps {
  userId: string;
  className?: string;
}

export default function TwoFactorAlert({ userId, className = '' }: TwoFactorAlertProps) {
  const navigate = useNavigate();
  const [has2FA, setHas2FA] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Verifica se o alerta já foi dispensado nesta sessão
    const dismissed = sessionStorage.getItem(`2fa_alert_dismissed_${userId}`);
    if (dismissed === 'true') {
      setIsDismissed(true);
      setIsLoading(false);
      return;
    }

    check2FAStatus();
  }, [userId]);

  const check2FAStatus = async () => {
    setIsLoading(true);
    try {
      const enabled = await has2FAEnabled(userId);
      setHas2FA(enabled);
    } catch (error) {
      console.error('Erro ao verificar status do 2FA:', error);
      setHas2FA(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    // Salva no sessionStorage para não mostrar novamente nesta sessão
    sessionStorage.setItem(`2fa_alert_dismissed_${userId}`, 'true');
    setIsDismissed(true);
  };

  const handleActivate2FA = () => {
    navigate('/profile');
  };

  // Não mostra nada se está carregando, já foi dispensado ou 2FA já está ativo
  if (isLoading) {
    return null;
  }

  if (isDismissed || has2FA) {
    return null;
  }

  return (
    <Alert 
      className={`border-amber-500 bg-amber-50 dark:bg-amber-950/20 ${className}`}
    >
      <ShieldAlert className="h-5 w-5 text-amber-600" />
      <div className="flex-1">
        <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-2">
          🔐 Proteja sua conta com 2FA
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 mt-1">
          <p className="mb-3">
            Sua conta ainda não possui autenticação de dois fatores (2FA) ativada. 
            Adicione uma camada extra de segurança para proteger suas assinaturas digitais e dados pessoais.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleActivate2FA}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              Ativar 2FA Agora
            </Button>
            <Button 
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="text-amber-700 hover:text-amber-800 hover:bg-amber-100"
            >
              Lembrar depois
            </Button>
          </div>
        </AlertDescription>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}