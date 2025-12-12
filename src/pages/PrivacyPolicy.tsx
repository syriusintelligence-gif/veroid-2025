import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

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
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Política de Privacidade
          </h1>
          <p className="text-gray-600 text-lg">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Introdução */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                1. Introdução
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Bem-vindo à Política de Privacidade do <strong>Vero iD</strong>. Este documento descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais quando você utiliza nossa plataforma de assinatura digital e certificação de conteúdo.
              </p>
              <p>
                Ao utilizar o Vero iD, você concorda com os termos desta Política de Privacidade. Se você não concordar com qualquer parte desta política, por favor, não utilize nossos serviços.
              </p>
              <p className="font-semibold text-blue-600">
                Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e outras legislações aplicáveis.
              </p>
            </CardContent>
          </Card>

          {/* Informações Coletadas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-600" />
                2. Informações que Coletamos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold mb-2">2.1. Informações Fornecidas por Você</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Dados de Cadastro:</strong> Nome completo, e-mail, senha (criptografada)</li>
                  <li><strong>Dados de Perfil:</strong> Foto de perfil (opcional), informações biográficas</li>
                  <li><strong>Conteúdo Assinado:</strong> Textos, imagens e documentos que você escolhe assinar digitalmente</li>
                  <li><strong>Chaves Criptográficas:</strong> Par de chaves pública/privada geradas para sua conta (armazenadas de forma segura)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">2.2. Informações Coletadas Automaticamente</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Dados de Uso:</strong> Páginas visitadas, horários de acesso, ações realizadas</li>
                  <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, sistema operacional, dispositivo utilizado</li>
                  <li><strong>Cookies:</strong> Utilizamos cookies essenciais para manter sua sessão ativa e melhorar a experiência</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Como Usamos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-green-600" />
                3. Como Usamos Suas Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>Utilizamos suas informações para:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Fornecer o Serviço:</strong> Criar e gerenciar sua conta, processar assinaturas digitais, gerar certificados</li>
                <li><strong>Segurança:</strong> Proteger sua conta contra acessos não autorizados, detectar fraudes e atividades suspeitas</li>
                <li><strong>Comunicação:</strong> Enviar notificações importantes sobre sua conta, atualizações de segurança e alterações nos Termos de Uso</li>
                <li><strong>Melhorias:</strong> Analisar o uso da plataforma para melhorar funcionalidades e corrigir bugs</li>
                <li><strong>Conformidade Legal:</strong> Cumprir obrigações legais e regulatórias aplicáveis</li>
              </ul>
              <p className="font-semibold text-green-600">
                Nós NÃO vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing.
              </p>
            </CardContent>
          </Card>

          {/* Armazenamento e Segurança */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-red-600" />
                4. Armazenamento e Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold mb-2">4.1. Onde Armazenamos</h3>
                <p>
                  Seus dados são armazenados em servidores seguros fornecidos pela <strong>Supabase</strong> (infraestrutura AWS), localizados em data centers com certificações de segurança internacionais (ISO 27001, SOC 2).
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">4.2. Medidas de Segurança</h3>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li><strong>Criptografia em Trânsito:</strong> HTTPS/TLS para todas as comunicações</li>
                  <li><strong>Criptografia em Repouso:</strong> Senhas hasheadas com bcrypt, chaves privadas criptografadas</li>
                  <li><strong>Criptografia Assimétrica:</strong> RSA-OAEP para assinaturas digitais</li>
                  <li><strong>Controle de Acesso:</strong> Autenticação obrigatória, sessões seguras com tokens JWT</li>
                  <li><strong>Backups:</strong> Backups automáticos diários do banco de dados</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">4.3. Retenção de Dados</h3>
                <p>
                  Mantemos suas informações pelo tempo necessário para fornecer o serviço ou conforme exigido por lei. Você pode solicitar a exclusão de sua conta a qualquer momento (veja seção 6).
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Compartilhamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-orange-600" />
                5. Compartilhamento de Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>Podemos compartilhar suas informações apenas nas seguintes situações:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Com Seu Consentimento:</strong> Quando você autoriza explicitamente o compartilhamento</li>
                <li><strong>Provedores de Serviço:</strong> Supabase (banco de dados e autenticação), Vercel (hospedagem) - todos sob contratos de confidencialidade</li>
                <li><strong>Obrigações Legais:</strong> Quando exigido por lei, ordem judicial ou autoridades competentes</li>
                <li><strong>Proteção de Direitos:</strong> Para proteger nossos direitos legais, segurança dos usuários ou investigar fraudes</li>
              </ul>
              <p className="font-semibold text-orange-600">
                Certificados digitais públicos (aqueles que você escolhe tornar públicos) podem ser verificados por qualquer pessoa através do código de verificação.
              </p>
            </CardContent>
          </Card>

          {/* Seus Direitos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                6. Seus Direitos (LGPD)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>De acordo com a LGPD, você tem os seguintes direitos:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Acesso:</strong> Solicitar uma cópia de todos os dados que temos sobre você</li>
                <li><strong>Correção:</strong> Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li><strong>Exclusão:</strong> Solicitar a exclusão de seus dados (sujeito a obrigações legais)</li>
                <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado e legível por máquina</li>
                <li><strong>Revogação de Consentimento:</strong> Retirar seu consentimento a qualquer momento</li>
                <li><strong>Oposição:</strong> Opor-se ao tratamento de seus dados em determinadas situações</li>
                <li><strong>Informação:</strong> Obter informações sobre com quem compartilhamos seus dados</li>
              </ul>
              <p className="mt-4">
                Para exercer qualquer um desses direitos, entre em contato conosco através do e-mail:{" "}
                <a href="mailto:privacy@veroid.com" className="text-blue-600 hover:underline font-semibold">
                  privacy@veroid.com
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Cookies */}
          <Card>
            <CardHeader>
              <CardTitle>7. Cookies e Tecnologias Similares</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>Utilizamos cookies essenciais para:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Manter você logado durante sua sessão</li>
                <li>Lembrar suas preferências de idioma e tema</li>
                <li>Garantir a segurança da plataforma</li>
              </ul>
              <p>
                Você pode desativar cookies nas configurações do seu navegador, mas isso pode afetar a funcionalidade da plataforma.
              </p>
            </CardContent>
          </Card>

          {/* Menores de Idade */}
          <Card>
            <CardHeader>
              <CardTitle>8. Menores de Idade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                O Vero iD não é destinado a menores de 18 anos. Não coletamos intencionalmente informações de menores de idade. Se você é pai/mãe ou responsável e acredita que seu filho forneceu informações pessoais, entre em contato conosco imediatamente.
              </p>
            </CardContent>
          </Card>

          {/* Alterações */}
          <Card>
            <CardHeader>
              <CardTitle>9. Alterações nesta Política</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações significativas através de e-mail ou aviso na plataforma. A data da última atualização será sempre exibida no topo desta página.
              </p>
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardHeader>
              <CardTitle>10. Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Se você tiver dúvidas, preocupações ou solicitações relacionadas a esta Política de Privacidade, entre em contato conosco:
              </p>
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p><strong>E-mail:</strong> <a href="mailto:privacy@veroid.com" className="text-blue-600 hover:underline">privacy@veroid.com</a></p>
                <p><strong>E-mail do Encarregado de Dados (DPO):</strong> <a href="mailto:dpo@veroid.com" className="text-blue-600 hover:underline">dpo@veroid.com</a></p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Button onClick={() => navigate(-1)} size="lg">
            Voltar para o Vero iD
          </Button>
        </div>
      </main>
    </div>
  );
}