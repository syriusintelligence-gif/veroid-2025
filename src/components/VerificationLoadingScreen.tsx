import { useEffect, useState } from 'react';
import { Shield, Loader2 } from 'lucide-react';

interface VerificationLoadingScreenProps {
  onComplete: () => void;
  duration?: number; // Duration in milliseconds (default: 3000ms = 3s)
}

/**
 * Loading screen component that displays for 3 seconds during certificate verification
 * Shows promotional message to encourage users to protect their own content
 */
export default function VerificationLoadingScreen({ 
  onComplete, 
  duration = 3000 
}: VerificationLoadingScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Progress animation (0 to 100% over the duration)
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (100 / (duration / 50)); // Update every 50ms
      });
    }, 50);

    // Complete loading after duration
    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [duration, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        {/* Logo/Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Verificando Certificado
          </h2>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mt-4 text-gray-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Carregando...</span>
          </div>
        </div>

        {/* Promotional Message */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200">
          <p className="text-lg font-semibold text-gray-800 mb-3">
            Proteja seu conteúdo também!
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Acesse e crie sua conta para autenticar suas publicações
          </p>
          <a
            href="https://www.veroid.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-base transition-colors"
          >
            <span>→ www.veroid.com.br</span>
          </a>
        </div>

        {/* Footer Note */}
        <p className="text-xs text-gray-500 mt-6">
          Aguarde enquanto carregamos o certificado digital...
        </p>
      </div>
    </div>
  );
}