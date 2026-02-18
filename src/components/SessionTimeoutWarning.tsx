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
import { Clock, LogOut, RefreshCw } from 'lucide-react';

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

  // Calculate progress percentage for the circular timer
  const progressPercentage = (countdown / remainingSeconds) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl shadow-cyan-500/10">
        <AlertDialogHeader className="text-center">
          {/* Circular Timer */}
          <div className="flex justify-center mb-4">
            <div className="relative w-28 h-28">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-slate-700/50"
                />
                {/* Progress circle */}
                <circle
                  cx="56"
                  cy="56"
                  r="45"
                  stroke="url(#gradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                    transition: 'stroke-dashoffset 1s linear',
                  }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Timer text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Clock className="w-5 h-5 text-cyan-400 mb-1" />
                <span className="text-2xl font-bold text-white tabular-nums">
                  {formatTime(countdown)}
                </span>
              </div>
            </div>
          </div>

          <AlertDialogTitle className="text-xl font-bold text-white">
            Sessão Expirando
          </AlertDialogTitle>
          
          <AlertDialogDescription className="text-gray-400 mt-3 space-y-3">
            <p>
              Por motivos de segurança, você será desconectado automaticamente devido à inatividade.
            </p>
            <p className="text-sm text-gray-500">
              Clique em "Continuar" para permanecer conectado.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
          <AlertDialogCancel
            onClick={onLogout}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-gray-300 border border-slate-700 hover:border-slate-600 transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 transition-all"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Continuar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}