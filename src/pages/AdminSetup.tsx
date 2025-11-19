import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, XCircle, Loader2, RefreshCw, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

interface UserStatus {
  authExists: boolean;
  publicExists: boolean;
  idsMatch: boolean;
  emailConfirmed: boolean;
  isAdmin: boolean;
  authId?: string;
  publicId?: string;
}

export default function AdminSetup() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const adminEmail = 'syriusintelligence@gmail.com';
  const adminPassword = 'Admin@2025';

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      // Verifica usuário no Auth
      const { data: authUsers, error: authError } = await supabase
        .from('auth.users')
        .select('id, email, email_confirmed_at')
        .eq('email', adminEmail)
        .maybeSingle();

      // Verifica usuário na tabela public.users
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('id, email, is_admin, verified')
        .eq('email', adminEmail)
        .maybeSingle();

      const newStatus: UserStatus = {
        authExists: !!authUsers,
        publicExists: !!publicUser,
        idsMatch: authUsers?.id === publicUser?.id,
        emailConfirmed: !!authUsers?.email_confirmed_at,
        isAdmin: publicUser?.is_admin || false,
        authId: authUsers?.id,
        publicId: publicUser?.id,
      };

      setStatus(newStatus);
    } catch (err) {
      console.error('Erro ao verificar status:', err);
      setError('Erro ao verificar status do usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    setIsResetting(true);
    setError('');
    setMessage('');

    try {
      if (!status?.authId) {
        setError('Usuário não encontrado no Auth. Execute os scripts SQL primeiro.');
        setIsResetting(false);
        return;
      }

      // Usa a API Admin do Supabase para atualizar a senha
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        status.authId,
        { password: adminPassword }
      );

      if (updateError) {
        throw updateError;
      }

      setMessage(`✅ Senha resetada com sucesso para: ${adminPassword}`);
      await checkStatus();
    } catch (err) {
      console.error('Erro ao resetar senha:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`Erro ao resetar senha: ${errorMessage}`);
    } finally {
      setIsResetting(false);
    }
  };

  const testLogin = () => {
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vero iD - Admin Setup
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Status do Usuário Admin</CardTitle>
            <CardDescription>
              Email: {adminEmail}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{message}</AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Verificações:</h3>
              
              <div className="space-y-3">
                <StatusItem
                  label="Usuário existe no Auth"
                  status={status?.authExists || false}
                  detail={status?.authId ? `ID: ${status.authId}` : undefined}
                />
                
                <StatusItem
                  label="Usuário existe na tabela public.users"
                  status={status?.publicExists || false}
                  detail={status?.publicId ? `ID: ${status.publicId}` : undefined}
                />
                
                <StatusItem
                  label="IDs sincronizados"
                  status={status?.idsMatch || false}
                />
                
                <StatusItem
                  label="Email confirmado"
                  status={status?.emailConfirmed || false}
                />
                
                <StatusItem
                  label="Marcado como Admin"
                  status={status?.isAdmin || false}
                />
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                onClick={resetPassword}
                disabled={isResetting || !status?.authExists}
                className="w-full"
                size="lg"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetando senha...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Resetar Senha para: {adminPassword}
                  </>
                )}
              </Button>

              <Button
                onClick={checkStatus}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <RefreshCw className="mr-2 h-5 w-5" />
                Atualizar Status
              </Button>

              <Button
                onClick={testLogin}
                variant="secondary"
                className="w-full"
                size="lg"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Ir para Login
              </Button>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Instruções:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Verifique se todas as verificações acima estão ✅</li>
                <li>Se o usuário não existir no Auth, execute os scripts SQL primeiro</li>
                <li>Clique em "Resetar Senha" para definir a senha como: {adminPassword}</li>
                <li>Clique em "Ir para Login" e faça login com as credenciais</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusItem({ label, status, detail }: { label: string; status: boolean; detail?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      {status ? (
        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        {detail && <p className="text-sm text-muted-foreground mt-1">{detail}</p>}
      </div>
    </div>
  );
}