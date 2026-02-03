/**
 * ❌ PÁGINA DE CANCELAMENTO DO CHECKOUT
 * 
 * Exibida quando o usuário cancela o pagamento no Stripe.
 * Oferece opções para tentar novamente ou explorar outros planos.
 */

import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function PricingCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-slate-900/80 backdrop-blur-xl border-slate-700/50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
            <XCircle className="h-12 w-12 text-white" />
          </div>
          <CardTitle className="text-3xl md:text-4xl font-bold text-white mb-3">
            Pagamento Cancelado
          </CardTitle>
          <CardDescription className="text-gray-300 text-lg">
            Você cancelou o processo de assinatura
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Mensagem Principal */}
          <div className="text-center space-y-3">
            <p className="text-gray-300 text-base">
              Não se preocupe! Nenhuma cobrança foi realizada.
            </p>
            <p className="text-gray-400 text-sm">
              Você pode voltar e escolher um plano a qualquer momento.
            </p>
          </div>

          {/* Por que escolher Vero iD? */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-400" />
              Por que escolher Vero iD?
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-lg">
                  ✓
                </div>
                <div>
                  <p className="text-white font-medium">Proteção contra Deepfakes</p>
                  <p className="text-gray-400 text-sm">Assinatura digital criptografada para cada publicação</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-lg">
                  ✓
                </div>
                <div>
                  <p className="text-white font-medium">Verificação Instantânea</p>
                  <p className="text-gray-400 text-sm">Qualquer pessoa pode verificar a autenticidade em segundos</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 text-lg">
                  ✓
                </div>
                <div>
                  <p className="text-white font-medium">Credibilidade Aumentada</p>
                  <p className="text-gray-400 text-sm">Marcas confiam mais em criadores com autenticação garantida</p>
                </div>
              </div>
            </div>
          </div>

          {/* Plano Gratuito */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg p-4">
            <p className="text-cyan-300 text-sm">
              <strong>💡 Experimente Grátis:</strong> Comece com nosso plano Free e teste o Vero iD sem compromisso. 10 autenticações por mês, sem cartão de crédito necessário!
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => navigate('/pricing')}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold py-6 shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/50 transition-all duration-300"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Ver Planos Novamente
            </Button>
            
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="flex-1 border-2 border-slate-600 bg-slate-800/50 text-white hover:bg-slate-700/50 hover:border-cyan-400/50 py-6 font-semibold transition-all duration-300"
            >
              <ArrowLeft className="mr-2 h-5 w-5" />
              Voltar ao Dashboard
            </Button>
          </div>

          {/* Link de Suporte */}
          <div className="text-center pt-4 border-t border-slate-700/50">
            <p className="text-gray-400 text-sm">
              Tem dúvidas sobre os planos?{' '}
              <button
                onClick={() => navigate('/settings')}
                className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
              >
                Fale com nosso suporte
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}