/**
 * ============================================
 * PÁGINA: TrialExpired
 * ============================================
 * 
 * 🔒 FASE 3: Página de Bloqueio de Trial Expirado
 * 
 * Exibida quando o usuário tenta acessar funcionalidades
 * protegidas após o trial expirar.
 * 
 * Características:
 * - Design amigável e informativo
 * - Mostra quantos dias expirou
 * - Botão para ver planos
 * - Botão para fazer logout
 * - Não é uma página de erro, é uma página de conversão
 * 
 * ============================================
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CreditCard, LogOut, Clock, CheckCircle2, Zap, Star } from 'lucide-react';
import { useTrialStatus, formatDaysRemaining } from '@/hooks/useTrialStatus';
import { logout } from '@/lib/supabase-auth';

export default function TrialExpired() {
  const navigate = useNavigate();
  const { trialStatus, loading } = useTrialStatus();

  useEffect(() => {
    // Se o trial não expirou, redireciona de volta para o dashboard
    if (!loading && trialStatus && !trialStatus.isExpired) {
      console.log('✅ [TrialExpired] Trial não expirou, redirecionando para dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [loading, trialStatus, navigate]);

  const handleGoToPlans = () => {
    navigate('/pricing');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
    }
  };

  // Calcula dias expirados (número negativo)
  const daysExpired = trialStatus?.daysRemaining ? Math.abs(trialStatus.daysRemaining) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Vero iD
            </span>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Main Card */}
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-white to-yellow-50">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-4 bg-orange-100 rounded-full w-fit">
              <Clock className="h-12 w-12 text-orange-600" />
            </div>
            <CardTitle className="text-3xl font-bold text-orange-900 mb-2">
              Seu Período de Teste Expirou
            </CardTitle>
            <CardDescription className="text-lg text-orange-700">
              {daysExpired === 0 && 'Seu trial expirou hoje.'}
              {daysExpired === 1 && 'Seu trial expirou há 1 dia.'}
              {daysExpired > 1 && `Seu trial expirou há ${daysExpired} dias.`}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Mensagem Principal */}
            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="h-5 w-5 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <p className="font-semibold mb-2">
                  Não se preocupe! Seus dados estão seguros.
                </p>
                <p className="text-sm">
                  Todas as suas assinaturas digitais e certificados continuam válidos e acessíveis.
                  Para continuar criando novos conteúdos assinados, escolha um plano que atenda suas necessidades.
                </p>
              </AlertDescription>
            </Alert>

            {/* Benefícios de Assinar */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
              <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <Star className="h-6 w-6 text-yellow-500" />
                Ao assinar um plano, você garante:
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Acesso Ilimitado</p>
                    <p className="text-xs text-muted-foreground">
                      Crie assinaturas digitais sem limite
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Certificados Personalizados</p>
                    <p className="text-xs text-muted-foreground">
                      Customize seus certificados com sua marca
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Suporte Prioritário</p>
                    <p className="text-xs text-muted-foreground">
                      Atendimento rápido e dedicado
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Recursos Avançados</p>
                    <p className="text-xs text-muted-foreground">
                      Acesso a todas as funcionalidades premium
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={handleGoToPlans}
                size="lg"
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold h-14 text-lg shadow-lg hover:shadow-xl"
              >
                <CreditCard className="mr-2 h-5 w-5" />
                Ver Planos e Assinar
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleLogout}
                className="sm:w-auto h-14"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Sair
              </Button>
            </div>

            {/* Informação Adicional */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Tem dúvidas? Entre em contato conosco pelo email{' '}
                <a href="mailto:suporte@veroid.com.br" className="text-blue-600 hover:underline font-medium">
                  suporte@veroid.com.br
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Depoimentos ou Estatísticas (Opcional) */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-bold text-2xl text-blue-900">10.000+</p>
              <p className="text-sm text-muted-foreground">Assinaturas Criadas</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-2xl text-green-900">99.9%</p>
              <p className="text-sm text-muted-foreground">Uptime Garantido</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6">
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="font-bold text-2xl text-yellow-900">4.9/5</p>
              <p className="text-sm text-muted-foreground">Avaliação Média</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}