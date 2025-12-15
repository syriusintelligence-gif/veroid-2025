import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock } from 'lucide-react';
import { formatTimeRemaining } from '@/lib/rate-limiter';
import { useEffect, useState } from 'react';

interface RateLimitAlertProps {
  blockedUntil?: Date;
  message?: string;
  remaining?: number;
}

export function RateLimitAlert({ blockedUntil, message, remaining }: RateLimitAlertProps) {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!blockedUntil) return;

    const updateTime = () => {
      setTimeRemaining(formatTimeRemaining(blockedUntil));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [blockedUntil]);

  if (!blockedUntil && !message) return null;

  return (
    <Alert variant="destructive" className="animate-in fade-in-50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Limite de Tentativas Excedido
      </AlertTitle>
      <AlertDescription className="space-y-1">
        <p>{message || 'Você excedeu o número máximo de tentativas.'}</p>
        {blockedUntil && (
          <p className="text-sm font-medium">
            Tente novamente em: <span className="font-mono">{timeRemaining}</span>
          </p>
        )}
        {remaining !== undefined && remaining > 0 && (
          <p className="text-sm text-muted-foreground">
            Tentativas restantes: {remaining}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
}