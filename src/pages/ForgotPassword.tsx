import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isValidEmail } from '@/lib/supabase-auth-v2';
import { useCSRFProtection } from '@/hooks/useCSRFProtection';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // CSRF Protection
  const { csrfToken, isLoading: csrfLoading } = useCSRFProtection();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validações
    if (!email.trim()) {
      setError('Por favor, insira seu email');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Por favor, insira um email válido');
      return;
    }

    // Validação CSRF
    if (!csrfToken) {
      setError('Token de segurança não disponível. Recarregue a página.');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔑 [FORGOT PASSWORD] Enviando link de recuperação para:', email);
      console.log('🔒 [CSRF] Token:', csrfToken);
      console.log('🌐 Origin:', window.location.origin);
      
      // Usando o template customizado do Supabase com token_hash
      // O link será: https://veroid-2025.vercel.app/reset-password?token_hash=...&type=recovery
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      console.log('🔗 Redirect URL:', redirectUrl);
      
      // Envia email de recuperação
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.toLowerCase(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (resetError) {
        console.error('❌ Erro ao enviar email:', resetError);
        throw resetError;
      }

      console.log('✅ Link de recuperação enviado com sucesso');
      console.log('📧 Email enviado para:', email);
      console.log('🔗 Link redirecionará para:', redirectUrl);
      
      setSuccess(true);
    } catch (err) {
      console.error('❌ Erro ao enviar link de recuperação:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar link de recuperação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vero iD
            </h1>
          </div>
          <p className="text-muted-foreground">Recuperação de Senha</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Esqueceu sua senha?</CardTitle>
            <CardDescription>
              {!success
                ? 'Digite seu email para receber um link de recuperação'
                : 'Link enviado com sucesso'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading || csrfLoading}
                    />
                  </div>
                </div>

                {/* Hidden CSRF Token Input */}
                <input type="hidden" name="csrf_token" value={csrfToken || ''} />

                <Button type="submit" className="w-full" disabled={isLoading || csrfLoading || !csrfToken}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : csrfLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Enviar Link de Recuperação
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Alert className="border-green-500 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <p className="font-medium mb-2">Link enviado com sucesso!</p>
                    <p className="text-sm mb-3">
                      Enviamos um link de recuperação para <strong>{email}</strong>
                    </p>
                    <p className="text-sm">
                      Clique no link do email para redefinir sua senha.
                    </p>
                  </AlertDescription>
                </Alert>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>💡 Importante:</strong>
                  </p>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>O link é válido por 1 hora</li>
                    <li>Você pode clicar no link múltiplas vezes</li>
                    <li>Se não encontrar, verifique a pasta de spam</li>
                  </ul>
                </div>

                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full"
                >
                  Voltar para o Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Lembrou sua senha?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:underline font-medium"
            >
              Fazer Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}