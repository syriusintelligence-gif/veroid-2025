import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/supabase-auth-v2';
import type { User } from '@/lib/supabase-auth-v2';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    } finally {
      // Simular processamento
      setTimeout(() => {
        setLoading(false);
      }, 2000);
    }
  }

  useEffect(() => {
    // Se não houver usuário logado, redirecionar para login
    if (!loading && !user) {
      navigate('/login-v2');
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 text-cyan-400 animate-spin" />
            <p className="text-white text-lg">Processando seu pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Shield className="h-8 w-8 text-cyan-400" />
            <span className="text-2xl font-bold text-white">
              Vero iD
            </span>
          </div>
          <nav className="flex gap-3">
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="w-full max-w-2xl bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="bg-green-500/20 p-4 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-400" />
              </div>
            </div>
            <CardTitle className="text-3xl text-white mb-2">
              Pagamento Realizado com Sucesso! 🎉
            </CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              Sua assinatura foi ativada e você já pode começar a usar todos os recursos do seu plano.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {sessionId && (
              <div className="bg-slate-700/30 p-4 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">ID da Transação:</p>
                <p className="text-white font-mono text-sm break-all">{sessionId}</p>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="text-white font-semibold text-lg">Próximos Passos:</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Acesse seu Dashboard para ver os detalhes da sua assinatura</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Comece a autenticar seu conteúdo imediatamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span>Você receberá um email de confirmação em breve</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={() => navigate('/dashboard')}
              >
                Ir para o Dashboard
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                onClick={() => navigate('/')}
              >
                Voltar para Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}