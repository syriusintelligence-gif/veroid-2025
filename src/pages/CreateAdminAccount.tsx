import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createAdminAccount } from '@/lib/supabase-auth';

export default function CreateAdminAccount() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [adminInfo] = useState({
    email: 'marcelo@vsparticipacoes.com',
    password: 'Admin@123'
  });

  const handleCreateAdmin = async () => {
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      console.log('🔧 Criando conta de administrador...');
      
      const result = await createAdminAccount();
      
      if (!result.success) {
        setError(result.error || 'Erro ao criar conta de administrador');
        setIsLoading(false);
        return;
      }

      console.log('✅ Conta de administrador criada com sucesso!');
      
      setSuccess(true);
      
    } catch (err) {
      console.error('❌ Erro ao criar conta admin:', err);
      setError('Erro ao criar conta de administrador. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <CardTitle className="text-2xl">Criar Conta Admin</CardTitle>
          </div>
          <CardDescription>
            Crie uma conta de administrador para gerenciar o sistema Vero iD
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success ? (
            <div className="space-y-4">
              <Alert className="border-green-600 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Conta de administrador criada com sucesso!
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email:</p>
                  <p className="text-lg font-mono font-semibold">{adminInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Senha:</p>
                  <p className="text-lg font-mono font-semibold">{adminInfo.password}</p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Guarde estas credenciais em um local seguro. 
                  Recomendamos alterar a senha após o primeiro login.
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate('/login')} 
                  className="flex-1"
                >
                  Ir para Login
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/')} 
                  className="flex-1"
                >
                  Voltar ao Início
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm">
                  <strong>Email:</strong> {adminInfo.email}
                </p>
                <p className="text-sm">
                  <strong>Senha:</strong> {adminInfo.password}
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Se a conta admin já existir, você receberá uma confirmação. 
                  Caso contrário, uma nova conta será criada.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleCreateAdmin} 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Criar Conta Admin
                  </>
                )}
              </Button>

              <Button 
                variant="outline"
                onClick={() => navigate('/')} 
                className="w-full"
                disabled={isLoading}
              >
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}