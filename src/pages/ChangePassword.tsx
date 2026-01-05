import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ArrowLeft, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase-auth';
import { isValidPassword } from '@/lib/password-validator';
import { PasswordStrengthIndicator } from '@/components/PasswordStrengthIndicator';
import { updatePasswordChangedAt, getExpirationMessage, PasswordExpirationStatus } from '@/lib/password-policy';
import { useToast } from '@/hooks/use-toast';

export default function ChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  // Informações de expiração vindas do Login
  const expirationStatus = location.state?.expirationStatus as PasswordExpirationStatus | undefined;
  const isForced = expirationStatus?.isExpired || expirationStatus?.mustChangePassword;
  
  useEffect(() => {
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    const user = await getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setIsCheckingAuth(false);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    // Validações
    if (!isForced && !currentPassword) {
      setError('Senha atual é obrigatória');
      return;
    }
    
    if (!newPassword) {
      setError('Nova senha é obrigatória');
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
    
    if (!isForced && currentPassword === newPassword) {
      setError('A nova senha deve ser diferente da senha atual');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('🔑 [CHANGE PASSWORD] Alterando senha...');
      
      // Se não é troca forçada, verifica senha atual
      if (!isForced) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          throw new Error('Usuário não encontrado');
        }
        
        // Tenta fazer login com senha atual para validar
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });
        
        if (signInError) {
          setError('Senha atual incorreta');
          setIsLoading(false);
          return;
        }
      }
      
      // Atualiza senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (updateError) {
        throw updateError;
      }
      
      console.log('✅ [CHANGE PASSWORD] Senha atualizada no Supabase Auth');
      
      // Atualiza data de última troca no banco
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await updatePasswordChangedAt(user.id);
        console.log('✅ [CHANGE PASSWORD] Data de troca atualizada no banco');
      }
      
      setSuccess(true);
      
      toast({
        title: 'Senha Alterada!',
        description: 'Sua senha foi alterada com sucesso.',
      });
      
      // Redireciona após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err) {
      console.error('❌ [CHANGE PASSWORD] Erro ao alterar senha:', err);
      setError(err instanceof Error ? err.message : 'Erro ao alterar senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-gray-600">Verificando autenticação...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
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
                  Senha Alterada!
                </h2>
                <p className="text-gray-600 mb-4">
                  Sua senha foi alterada com sucesso. Você será redirecionado para o dashboard.
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isForced && (
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Vero iD
              </span>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {isForced ? 'Troca de Senha Obrigatória' : 'Alterar Senha'}
            </CardTitle>
            <CardDescription>
              {expirationStatus ? getExpirationMessage(expirationStatus) : 'Crie uma nova senha segura'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Aviso de expiração */}
              {isForced && (
                <Alert className="border-amber-500 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    {expirationStatus?.mustChangePassword 
                      ? 'Você deve trocar sua senha antes de continuar usando o sistema.'
                      : 'Sua senha expirou por motivos de segurança. Crie uma nova senha para continuar.'}
                  </AlertDescription>
                </Alert>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {/* Senha Atual (apenas se não for troca forçada) */}
              {!isForced && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="Digite sua senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              )}
              
              {/* Nova Senha */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
              
              {/* Indicador de Força da Senha */}
              <PasswordStrengthIndicator password={newPassword} />
              
              {/* Confirmar Nova Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite a senha novamente"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>
              
              <div className="flex gap-2">
                {!isForced && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                )}
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className={isForced ? 'w-full' : 'flex-1'}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}