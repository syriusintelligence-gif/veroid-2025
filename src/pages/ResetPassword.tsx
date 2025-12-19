import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);

  useEffect(() => {
    // Verificar se há uma sessão de recuperação válida
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        setError('Link de recuperação inválido ou expirado. Solicite um novo link.');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validações
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔑 Atualizando senha...');
      
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        throw updateError;
      }

      console.log('✅ Senha atualizada com sucesso');
      setSuccess(true);

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Senha redefinida com sucesso! Faça login com sua nova senha.'
          }
        });
      }, 2000);
    } catch (err) {
      console.error('❌ Erro ao atualizar senha:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Senha Redefinida!
                </h2>
                <p className="text-gray-600 mb-4">
                  Sua senha foi alterada com sucesso. Você será redirecionado para a página de login.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-gray-500">Redirecionando...</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidSession && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="h-10 w-10 text-blue-600" />
              <CardTitle className="text-2xl">Vero iD</CardTitle>
            </div>
            <CardDescription>Recuperação de Senha</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => navigate('/forgot-password')}
              className="w-full"
            >
              Solicitar Novo Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-10 w-10 text-blue-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vero iD
            </h1>
          </div>
          <p className="text-muted-foreground">Redefinir Senha</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nova Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Nova Senha */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite a senha novamente"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Redefinir Senha
                  </>
                )}
              </Button>
            </form>
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