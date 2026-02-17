import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Mail, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, Inbox, AlertCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function EmailConfirmation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const email = searchParams.get('email') || '';
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  
  // Countdown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);
  
  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      console.warn('⚠️ [EmailConfirmation] Nenhum email fornecido, redirecionando para cadastro');
      navigate('/cadastro');
    }
  }, [email, navigate]);
  
  const handleResendEmail = async () => {
    if (resendCooldown > 0 || isResending) return;
    
    // Limit resend attempts
    if (resendCount >= 3) {
      toast({
        title: "⚠️ Limite atingido",
        description: "Você já reenviou o email 3 vezes. Aguarde alguns minutos ou entre em contato com o suporte.",
        variant: "destructive",
      });
      return;
    }
    
    setIsResending(true);
    
    try {
      console.log('📧 [EmailConfirmation] Reenviando email de confirmação para:', email);
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });
      
      if (error) {
        console.error('❌ [EmailConfirmation] Erro ao reenviar:', error);
        toast({
          title: "Erro ao reenviar",
          description: "Não foi possível reenviar o email. Tente novamente mais tarde.",
          variant: "destructive",
        });
      } else {
        console.log('✅ [EmailConfirmation] Email reenviado com sucesso');
        setResendCount(prev => prev + 1);
        setResendCooldown(60); // 60 seconds cooldown
        toast({
          title: "✅ Email reenviado!",
          description: "Verifique sua caixa de entrada e pasta de spam.",
        });
      }
    } catch (err) {
      console.error('❌ [EmailConfirmation] Erro inesperado:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };
  
  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vero iD
            </span>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-xl mx-auto">
          {/* Success Card */}
          <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-white shadow-lg">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">
                Cadastro Realizado com Sucesso! 🎉
              </CardTitle>
              <CardDescription className="text-base text-green-700">
                Sua conta foi criada, mas ainda precisa ser confirmada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Confirmation Alert */}
              <Alert className="border-2 border-blue-300 bg-blue-50">
                <Mail className="h-5 w-5 text-blue-600" />
                <AlertTitle className="text-blue-900 font-bold text-lg">
                  📧 Confirme seu Email
                </AlertTitle>
                <AlertDescription className="text-blue-800 mt-2">
                  <p className="mb-2">
                    Enviamos um email de confirmação para:
                  </p>
                  <p className="font-bold text-lg bg-blue-100 px-3 py-2 rounded text-center">
                    {email || maskedEmail}
                  </p>
                </AlertDescription>
              </Alert>
              
              {/* Instructions */}
              <div className="bg-white border rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-blue-600" />
                  O que fazer agora:
                </h3>
                
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <span>
                      Acesse sua <strong>caixa de entrada</strong> do email cadastrado
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <span>
                      Procure pelo email com o assunto <strong>"Confirme seu email"</strong> ou <strong>"Confirm your email"</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <span>
                      Clique no <strong>link de confirmação</strong> dentro do email
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      4
                    </span>
                    <span>
                      Após confirmar, você poderá <strong>fazer login</strong> normalmente
                    </span>
                  </li>
                </ol>
              </div>
              
              {/* SPAM Warning */}
              <Alert className="border-2 border-amber-300 bg-amber-50">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <AlertTitle className="text-amber-900 font-bold">
                  ⚠️ Não encontrou o email?
                </AlertTitle>
                <AlertDescription className="text-amber-800 mt-2 space-y-2">
                  <p>
                    <strong>Verifique sua pasta de SPAM ou Lixo Eletrônico!</strong>
                  </p>
                  <p className="text-sm">
                    Às vezes, emails de confirmação podem ser filtrados automaticamente. 
                    Se encontrar na pasta de spam, marque como "Não é spam" para receber 
                    futuras comunicações.
                  </p>
                </AlertDescription>
              </Alert>
              
              {/* Important Notice */}
              <Alert className="border-2 border-red-200 bg-red-50">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <AlertTitle className="text-red-900 font-bold">
                  🔒 Importante
                </AlertTitle>
                <AlertDescription className="text-red-800 mt-1">
                  <strong>Você não conseguirá fazer login</strong> até confirmar seu email. 
                  Este é um passo obrigatório de segurança.
                </AlertDescription>
              </Alert>
              
              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                {/* Resend Email Button */}
                <Button
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={handleResendEmail}
                  disabled={isResending || resendCooldown > 0}
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Reenviando...
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reenviar em {resendCooldown}s
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reenviar Email de Confirmação
                      {resendCount > 0 && ` (${3 - resendCount} restantes)`}
                    </>
                  )}
                </Button>
                
                {/* Go to Login Button */}
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  onClick={() => navigate('/login')}
                >
                  Já confirmei, ir para Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              
              {/* Help Text */}
              <p className="text-center text-xs text-muted-foreground pt-2">
                Se continuar tendo problemas, entre em contato com nosso suporte.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}