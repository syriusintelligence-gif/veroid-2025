import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Lock, Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resetPassword, isValidPassword } from '@/lib/supabase-auth-v2';
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
  const [hasValidSession, setHasValidSession] = useState(false);

  // Verifica se há um token de recuperação na URL e estabelece sessão
  useEffect(() => {
    const checkSession = async () => {
      console.log('🔍 Verificando sessão de recuperação...');
      console.log('📍 URL completa:', window.location.href);
      console.log('📍 Hash:', window.location.hash);
      
      // Verifica se há hash na URL
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      console.log('🔑 Access Token presente:', !!accessToken);
      console.log('📋 Type:', type);
      
      if (type !== 'recovery') {
        console.warn('⚠️ Token de recuperação não encontrado na URL');
        setError('Link de recuperação inválido ou expirado. Por favor, solicite um novo link.');
        return;
      }
      
      // Verifica sessão atual
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('👤 Sessão atual:', session ? 'Ativa' : 'Não encontrada');
      console.log('❌ Erro de sessão:', sessionError?.message || 'Nenhum');
      
      if (session) {
        console.log('✅ Sessão de recuperação estabelecida');
        console.log('👤 User ID:', session.user?.id);
        setHasValidSession(true);
      } else {
        console.warn('⚠️ Sessão não estabelecida automaticamente');
        setError('Sessão de recuperação não encontrada. Por favor, clique no link do email novamente.');
      }
    };
    
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    console.log('🔐 [RESET PASSWORD] Iniciando processo...');
    console.log('✅ Sessão válida:', hasValidSession);

    // Verifica se há sessão válida
    if (!hasValidSession) {
      setError('Sessão de recuperação inválida. Por favor, clique no link do email novamente.');
      return;
    }

    // Validações
    if (!newPassword) {
      setError('Por favor, insira a nova senha');
      return;
    }

    if (!isValidPassword(newPassword)) {
      setError('A senha deve ter no mínimo 6 caracteres, incluindo 1 letra maiúscula e 1 caractere especial');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔑 Chamando função resetPassword...');
      const result = await resetPassword(newPassword);

      console.log('📊 Resultado:', result);

      if (result.success) {
        console.log('✅ Senha redefinida com sucesso');
        setSuccess(true);
        // Redireciona após 3 segundos
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } else {
        console.error('❌ Erro ao redefinir senha:', result.message);
        setError(result.message || 'Erro ao alterar senha. Tente novamente.');
      }
    } catch (err) {
      console.error('❌ Erro ao processar redefinição:', err);
      setError('Erro ao redefinir senha. Tente novamente ou solicite um novo link.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Fraca', color: 'bg-red-500' };
    if (strength <= 4) return { strength: 2, label: 'Média', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Forte', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Senha Redefinida!</h2>
                <p className="text-muted-foreground">
                  Sua senha foi alterada com sucesso. Você será redirecionado para a página de login em instantes...
                </p>
              </div>
              <Button onClick={() => navigate('/login')} className="w-full">
                Ir para Login Agora
              </Button>
            </div>
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
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Login
          </button>
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
            <CardTitle>Criar Nova Senha</CardTitle>
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

              {!hasValidSession && !error && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Verificando link de recuperação...
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading || !hasValidSession}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    disabled={!hasValidSession}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            level <= passwordStrength.strength ? passwordStrength.color : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Força da senha: <span className="font-medium">{passwordStrength.label}</span>
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres, 1 maiúscula e 1 caractere especial
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite novamente sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={isLoading || !hasValidSession}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    disabled={!hasValidSession}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`text-xs ${newPassword === confirmPassword ? 'text-green-600' : 'text-red-600'}`}>
                    {newPassword === confirmPassword ? '✓ As senhas coincidem' : '✗ As senhas não coincidem'}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !hasValidSession}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redefinindo...
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Dica:</strong> Você chegou aqui através do link enviado por email. Não é necessário inserir nenhum código adicional.
          </p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Link expirado?{' '}
            <button
              onClick={() => navigate('/forgot-password')}
              className="text-blue-600 hover:underline font-medium"
            >
              Solicitar novo link
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}