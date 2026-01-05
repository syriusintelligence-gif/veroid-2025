import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle } from 'lucide-react';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onLogout: () => void;
}

export default function SessionTimeoutWarning({
  isOpen,
  remainingSeconds,
  onContinue,
  onLogout,
}: SessionTimeoutWarningProps) {
  const [countdown, setCountdown] = useState(remainingSeconds);

  useEffect(() => {
    setCountdown(remainingSeconds);
  }, [remainingSeconds]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <AlertDialogTitle className="text-xl">
              Sua sessão está expirando
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base space-y-3">
            <p>
              Por motivos de segurança, você será desconectado automaticamente devido à inatividade.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-sm text-yellow-800 mb-2">
                Tempo restante:
              </p>
              <p className="text-3xl font-bold text-yellow-900 tabular-nums">
                {formatTime(countdown)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Clique em "Continuar Conectado" para permanecer logado, ou "Fazer Logout" para sair agora.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            onClick={onLogout}
            className="sm:flex-1"
          >
            Fazer Logout
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className="sm:flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Continuar Conectado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}