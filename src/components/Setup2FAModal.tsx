import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Copy, Check, Download, Loader2 } from 'lucide-react';
import { setup2FA, enable2FA } from '@/lib/supabase-2fa';
import { generateTOTPQRCodeURL } from '@/lib/totp';
import QRCode from 'qrcode';

interface Setup2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail: string;
  userId: string;
}

export default function Setup2FAModal({ isOpen, onClose, onSuccess, userEmail, userId }: Setup2FAModalProps) {
  const [step, setStep] = useState<'setup' | 'verify'>('setup');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedBackup, setCopiedBackup] = useState(false);

  useEffect(() => {
    if (isOpen && step === 'setup') {
      initializeSetup();
    }
  }, [isOpen]);

  const initializeSetup = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const result = await setup2FA(userId);
      
      if (!result.success || !result.secret || !result.backupCodes) {
        setError(result.error || 'Erro ao inicializar 2FA');
        return;
      }
      
      setSecret(result.secret);
      setBackupCodes(result.backupCodes);
      
      // Gera QR Code
      const otpUrl = generateTOTPQRCodeURL(result.secret, userEmail);
      const qrDataUrl = await QRCode.toDataURL(otpUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      setError('Erro ao gerar QR Code');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const content = `Vero iD - Códigos de Backup 2FA\n\nEmail: ${userEmail}\nData: ${new Date().toLocaleString('pt-BR')}\n\n${backupCodes.join('\n')}\n\nGuarde estes códigos em local seguro!\nCada código pode ser usado apenas uma vez.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veroid-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Digite um código de 6 dígitos');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const result = await enable2FA(userId, verificationCode);
      
      if (!result.success) {
        setError(result.error || 'Código inválido');
        return;
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      setError('Erro ao verificar código');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('setup');
    setSecret('');
    setBackupCodes([]);
    setQrCodeUrl('');
    setVerificationCode('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Configurar Autenticação de Dois Fatores (2FA)
          </DialogTitle>
          <DialogDescription>
            {step === 'setup' 
              ? 'Adicione uma camada extra de segurança à sua conta'
              : 'Digite o código gerado pelo aplicativo autenticador'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && step === 'setup' ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          </div>
        ) : step === 'setup' ? (
          <div className="space-y-6">
            {/* Passo 1: Instalar App */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">1. Instale um Aplicativo Autenticador</h3>
              <p className="text-sm text-muted-foreground">
                Baixe um dos aplicativos abaixo no seu smartphone:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="border rounded-lg p-3 text-sm">
                  <p className="font-medium">Google Authenticator</p>
                  <p className="text-xs text-muted-foreground">iOS e Android</p>
                </div>
                <div className="border rounded-lg p-3 text-sm">
                  <p className="font-medium">Microsoft Authenticator</p>
                  <p className="text-xs text-muted-foreground">iOS e Android</p>
                </div>
                <div className="border rounded-lg p-3 text-sm">
                  <p className="font-medium">Authy</p>
                  <p className="text-xs text-muted-foreground">iOS e Android</p>
                </div>
                <div className="border rounded-lg p-3 text-sm">
                  <p className="font-medium">1Password</p>
                  <p className="text-xs text-muted-foreground">Multiplataforma</p>
                </div>
              </div>
            </div>

            {/* Passo 2: Escanear QR Code */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">2. Escaneie o QR Code</h3>
              <div className="flex flex-col items-center gap-4 p-6 bg-muted rounded-lg">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code 2FA" className="w-64 h-64" />
                )}
                <p className="text-sm text-center text-muted-foreground">
                  Abra o aplicativo e escaneie este código
                </p>
              </div>
            </div>

            {/* Passo 3: Chave Manual (Backup) */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">3. Ou Digite a Chave Manualmente</h3>
              <div className="flex items-center gap-2">
                <Input
                  value={secret}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                >
                  {copiedSecret ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use esta chave se não conseguir escanear o QR Code
              </p>
            </div>

            {/* Códigos de Backup */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">4. Salve os Códigos de Backup</h3>
              <Alert className="border-yellow-500 bg-yellow-50">
                <AlertDescription className="text-yellow-800">
                  ⚠️ <strong>Importante:</strong> Guarde estes códigos em local seguro! Você precisará deles se perder acesso ao aplicativo autenticador.
                </AlertDescription>
              </Alert>
              <div className="border rounded-lg p-4 bg-muted">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm mb-3">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="bg-background p-2 rounded">
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyBackupCodes}
                    className="flex-1"
                  >
                    {copiedBackup ? (
                      <>
                        <Check className="h-4 w-4 mr-2 text-green-600" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Códigos
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadBackupCodes}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar Arquivo
                  </Button>
                </div>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={() => setStep('verify')} className="flex-1">
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Digite o código de 6 dígitos gerado pelo aplicativo autenticador para ativar o 2FA
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="verification-code">Código de Verificação</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl font-mono tracking-widest"
                autoFocus
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

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep('setup')}
                className="flex-1"
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button
                onClick={handleVerify}
                className="flex-1"
                disabled={isLoading || verificationCode.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Ativar 2FA'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}