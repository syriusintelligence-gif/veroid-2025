import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, HelpCircle } from 'lucide-react';
import { verify2FALogin } from '@/lib/supabase-2fa';

interface Verify2FAInputProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function Verify2FAInput({ userId, onSuccess, onCancel }: Verify2FAInputProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [showBackupHelp, setShowBackupHelp] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6 && code.length !== 8) {
      setError('Digite um código de 6 dígitos (app) ou 8 dígitos (backup)');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await verify2FALogin(userId, code);

      if (!result.success) {
        setError(result.error || 'Código inválido');
        return;
      }

      onSuccess();
    } catch (err) {
      setError('Erro ao verificar código. Tente novamente.');
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length >= 6) {
      handleVerify();
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="p-3 bg-blue-100 rounded-full">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Verificação em Duas Etapas</h2>
        <p className="text-muted-foreground">
          Digite o código de 6 dígitos do seu aplicativo autenticador
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="2fa-code">Código de Verificação</Label>
          <Input
            id="2fa-code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            onKeyPress={handleKeyPress}
            className="text-center text-2xl font-mono tracking-widest"
            autoFocus
            disabled={isVerifying}
          />
          <p className="text-xs text-muted-foreground text-center">
            O código muda a cada 30 segundos
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleVerify}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
            size="lg"
            disabled={isVerifying || code.length < 6}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Shield className="h-5 w-5 mr-2" />
                Verificar Código
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
            disabled={isVerifying}
          >
            Cancelar
          </Button>
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={() => setShowBackupHelp(!showBackupHelp)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
          >
            <HelpCircle className="h-4 w-4" />
            Não consegue acessar o aplicativo?
          </button>

          {showBackupHelp && (
            <div className="mt-3 p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Use um código de backup</p>
              <p className="text-xs text-muted-foreground">
                Se você perdeu acesso ao aplicativo autenticador, pode usar um dos códigos de backup de 8 dígitos que salvou durante a configuração.
              </p>
              <p className="text-xs text-muted-foreground">
                ⚠️ Cada código de backup pode ser usado apenas uma vez.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}