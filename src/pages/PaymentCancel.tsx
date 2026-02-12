import { useNavigate } from 'react-router-dom';
import { XCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PaymentCancel() {
  const navigate = useNavigate();

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
              <div className="bg-orange-500/20 p-4 rounded-full">
                <XCircle className="h-16 w-16 text-orange-400" />
              </div>
            </div>
            <CardTitle className="text-3xl text-white mb-2">
              Pagamento Cancelado
            </CardTitle>
            <CardDescription className="text-gray-300 text-lg">
              Você cancelou o processo de pagamento. Nenhuma cobrança foi realizada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-700/30 p-4 rounded-lg">
              <p className="text-gray-300 text-center">
                Não se preocupe! Você pode tentar novamente quando quiser. Seus dados estão seguros e nenhuma cobrança foi efetuada.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-white font-semibold text-lg">O que você pode fazer agora:</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Voltar para a página de planos e escolher novamente</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Entrar em contato com nosso suporte se tiver dúvidas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span>Continuar usando o plano Free enquanto decide</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={() => navigate('/pricing')}
              >
                Ver Planos Novamente
              </Button>
              <Button 
                variant="outline"
                className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                onClick={() => navigate('/dashboard')}
              >
                Ir para o Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}