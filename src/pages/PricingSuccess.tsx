/**
 * 🎉 PÁGINA DE SUCESSO DO CHECKOUT
 * 
 * Exibida após o usuário completar o pagamento no Stripe.
 * Mostra confirmação e próximos passos.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

export default function PricingSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simula verificação da sessão
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-white text-lg">Processando seu pagamento...</p>
          <p className="text-gray-400 text-sm mt-2">Aguarde alguns instantes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-3">
            Pagamento Confirmado! 🎉
          </CardTitle>
          <CardDescription className="text-gray-300 text-lg">
            Sua assinatura foi ativada com sucesso
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Informações da Sessão */}
          {sessionId && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">ID da Sessão:</p>
              <code className="text-xs text-cyan-400 font-mono break-all">
                {sessionId}
              </code>
            </div>
          )}

          {/* Próximos Passos */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-400" />
              Próximos Passos
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-sm font-bold">
                  1
                </div>
                <div>
                  <p className="text-white font-medium">Acesse seu Dashboard</p>
                  <p className="text-gray-400 text-sm">Visualize seu plano ativo e comece a usar os recursos</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-sm font-bold">
                  2
                </div>
                <div>
                  <p className="text-white font-medium">Assine seu primeiro conteúdo</p>
                  <p className="text-gray-400 text-sm">Proteja suas publicações com assinatura digital</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="text-white font-medium">Receba confirmação por email</p>
                  <p className="text-gray-400 text-sm">Verifique sua caixa de entrada para mais detalhes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Informações Adicionais */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-blue-300 text-sm">
              <strong>💡 Dica:</strong> Você pode gerenciar sua assinatura, visualizar faturas e atualizar seu plano a qualquer momento no Dashboard.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => navigate('/dashboard')}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-6 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-300"
            >
              Ir para Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <Button
              onClick={() => navigate('/sign')}
              variant="outline"
              className="flex-1 border-2 border-slate-600 bg-slate-800/50 text-white hover:bg-slate-700/50 hover:border-cyan-400/50 py-6 font-semibold transition-all duration-300"
            >
              Assinar Conteúdo
            </Button>
          </div>

          {/* Link de Suporte */}
          <div className="text-center pt-4 border-t border-slate-700/50">
            <p className="text-gray-400 text-sm">
              Precisa de ajuda?{' '}
              <button
                onClick={() => navigate('/settings')}
                className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
              >
                Entre em contato com o suporte
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}