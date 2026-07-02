import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowLeft,
  Cookie,
  Shield,
  BarChart3,
  Megaphone,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearStoredConsent } from '@/lib/consent';

/**
 * CookiePolicy
 * ------------
 * Página de Política de Cookies em conformidade com a LGPD e o Guia
 * Orientativo de Cookies da ANPD. Descreve as categorias de cookies
 * utilizados, finalidades, base legal e como o usuário pode gerenciar
 * suas escolhas.
 */
export default function CookiePolicy() {
  const navigate = useNavigate();

  const handleReopenBanner = () => {
    // Limpa a decisão salva e recarrega para o banner reaparecer
    clearStoredConsent();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl">Vero iD</span>
          </div>
          <div className="w-20" />
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-blue-100 mb-4">
            <Cookie className="h-7 w-7 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Política de Cookies
          </h1>
          <p className="text-gray-600 text-lg">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                1. O que são cookies
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                Cookies são pequenos arquivos de texto que sites armazenam no
                seu dispositivo para lembrar informações sobre sua visita.
                Também usamos tecnologias similares (localStorage,
                sessionStorage e pixels) para as mesmas finalidades.
              </p>
              <p>
                Esta política está em conformidade com a{' '}
                <strong>
                  Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)
                </strong>{' '}
                e com o <strong>Guia Orientativo sobre Cookies</strong> publicado
                pela Autoridade Nacional de Proteção de Dados (ANPD).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                2. Cookies necessários
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                <strong>Base legal:</strong> execução de contrato e legítimo
                interesse (art. 7º, V e IX da LGPD). Não exigem consentimento.
              </p>
              <p>
                Essenciais para o funcionamento da plataforma:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Autenticação:</strong> mantém você logado com segurança
                  (Supabase Auth).
                </li>
                <li>
                  <strong>Proteção CSRF:</strong> previne ataques de falsificação
                  de requisição.
                </li>
                <li>
                  <strong>Sessão e preferências mínimas:</strong> controle de
                  timeout de inatividade, tokens temporários.
                </li>
              </ul>
              <p className="text-sm text-gray-500">
                Estes cookies não podem ser desativados porque são
                indispensáveis para o serviço solicitado por você.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                3. Cookies de análise (analytics)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                <strong>Base legal:</strong> consentimento (art. 7º, I da LGPD).
                Só disparam se você aceitar.
              </p>
              <p>
                Nos ajudam a entender como as pessoas usam o site (páginas
                visitadas, tempo de permanência, funil de cadastro) para
                melhorar produto e experiência.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Google Analytics 4</strong> (via Google Tag Manager) —
                  medição agregada de tráfego.
                </li>
              </ul>
              <p className="text-sm text-gray-500">
                Utilizamos o <strong>Google Consent Mode v2</strong>: mesmo se
                você não consentir, o GTM pode funcionar em modo restrito, sem
                cookies persistentes e com dados anonimizados.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-purple-600" />
                4. Cookies de marketing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                <strong>Base legal:</strong> consentimento (art. 7º, I da LGPD).
                Só disparam se você aceitar.
              </p>
              <p>
                Usados para exibir anúncios mais relevantes e medir a eficácia
                das nossas campanhas em plataformas externas.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Google Ads</strong> — conversão e remarketing.
                </li>
                <li>
                  <strong>Meta Pixel (Facebook/Instagram)</strong> — quando
                  ativo, mede conversões de campanhas.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-amber-600" />
                5. Cookies funcionais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                <strong>Base legal:</strong> consentimento (art. 7º, I da LGPD).
              </p>
              <p>
                Salvam preferências não essenciais para melhorar sua
                experiência (idioma, tema visual, últimas escolhas em
                formulários). Sem eles o site funciona, apenas com menos
                personalização.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-cyan-600" />
                6. Como gerenciar suas escolhas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Você pode revisar ou alterar sua decisão a qualquer momento
                clicando no botão abaixo. Também pode limpar cookies e dados de
                site diretamente nas configurações do seu navegador.
              </p>
              <div>
                <Button
                  onClick={handleReopenBanner}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Revisar minhas escolhas de cookies
                </Button>
              </div>
              <p className="text-sm text-gray-500">
                Isso reabrirá o banner de consentimento para você escolher
                novamente.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                7. Contato e mais informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-gray-700">
              <p>
                Para exercer seus direitos como titular de dados (acesso,
                correção, exclusão, portabilidade, revogação de consentimento),
                consulte nossa{' '}
                <button
                  onClick={() => navigate('/privacy')}
                  className="text-blue-600 hover:text-blue-500 underline"
                >
                  Política de Privacidade
                </button>{' '}
                ou entre em contato através dos canais oficiais indicados nela.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}