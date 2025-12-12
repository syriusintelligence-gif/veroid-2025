import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, AlertTriangle, Scale, Ban, RefreshCw, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Terms() {
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
            <FileText className="h-6 w-6 text-blue-600" />
            <span className="font-bold text-xl">Vero iD</span>
          </div>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Termos de Uso
          </h1>
          <p className="text-gray-600 text-lg">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Aceitação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                1. Aceitação dos Termos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Bem-vindo ao <strong>Vero iD</strong>, uma plataforma de assinatura digital e certificação de conteúdo. Ao acessar ou utilizar nossos serviços, você concorda em cumprir e estar vinculado a estes Termos de Uso.
              </p>
              <p className="font-semibold text-blue-600">
                Se você não concordar com qualquer parte destes termos, não utilize nossos serviços.
              </p>
              <p>
                Ao criar uma conta, você declara que:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Tem pelo menos 18 anos de idade ou possui consentimento dos pais/responsáveis</li>
                <li>Forneceu informações verdadeiras, precisas e completas</li>
                <li>Manterá suas informações atualizadas</li>
                <li>É responsável por manter a confidencialidade de sua senha</li>
              </ul>
            </CardContent>
          </Card>

          {/* Descrição do Serviço */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                2. Descrição do Serviço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                O Vero iD oferece os seguintes serviços:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Assinatura Digital:</strong> Criação de assinaturas digitais criptografadas para textos, imagens e documentos</li>
                <li><strong>Certificação de Conteúdo:</strong> Geração de certificados digitais que comprovam autoria e integridade</li>
                <li><strong>Verificação:</strong> Validação de certificados digitais através de códigos de verificação únicos</li>
                <li><strong>Gerenciamento de Chaves:</strong> Armazenamento seguro de pares de chaves criptográficas (pública/privada)</li>
                <li><strong>Histórico:</strong> Acesso ao histórico de conteúdos assinados e certificados gerados</li>
              </ul>
              <p className="font-semibold text-purple-600">
                O Vero iD utiliza criptografia assimétrica (RSA-OAEP) e hashing (SHA-256) para garantir a segurança e integridade das assinaturas.
              </p>
            </CardContent>
          </Card>

          {/* Uso Aceitável */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-green-600" />
                3. Uso Aceitável
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>Você concorda em utilizar o Vero iD apenas para fins legais e de acordo com estes Termos. É proibido:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Conteúdo Ilegal:</strong> Assinar ou certificar conteúdo que viole leis aplicáveis (difamação, pornografia infantil, incitação ao ódio, etc.)</li>
                <li><strong>Fraude:</strong> Falsificar identidade, criar contas falsas ou tentar enganar outros usuários</li>
                <li><strong>Violação de Propriedade Intelectual:</strong> Assinar conteúdo que infrinja direitos autorais, marcas registradas ou patentes de terceiros</li>
                <li><strong>Abuso do Sistema:</strong> Tentar hackear, sobrecarregar ou comprometer a segurança da plataforma</li>
                <li><strong>Spam:</strong> Enviar mensagens não solicitadas ou usar a plataforma para fins de marketing não autorizado</li>
                <li><strong>Compartilhamento de Credenciais:</strong> Compartilhar sua senha ou chave privada com terceiros</li>
              </ul>
              <p className="font-semibold text-red-600">
                Violações destes termos podem resultar na suspensão ou exclusão permanente de sua conta.
              </p>
            </CardContent>
          </Card>

          {/* Propriedade Intelectual */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-600" />
                4. Propriedade Intelectual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold mb-2">4.1. Propriedade do Vero iD</h3>
                <p>
                  Todos os direitos de propriedade intelectual relacionados à plataforma Vero iD (código-fonte, design, logotipos, marcas) são de propriedade exclusiva do Vero iD ou de seus licenciadores.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">4.2. Seu Conteúdo</h3>
                <p>
                  Você mantém todos os direitos sobre o conteúdo que assina digitalmente. Ao usar o Vero iD, você nos concede uma licença limitada, não exclusiva e revogável para:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Armazenar e processar seu conteúdo para fornecer o serviço</li>
                  <li>Gerar hashes criptográficos e assinaturas digitais</li>
                  <li>Exibir certificados públicos (quando você escolhe torná-los públicos)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">4.3. Responsabilidade pelo Conteúdo</h3>
                <p className="font-semibold text-orange-600">
                  Você é o único responsável pelo conteúdo que assina. O Vero iD não revisa, aprova ou endossa o conteúdo dos usuários.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Limitações de Responsabilidade */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                5. Limitações de Responsabilidade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                O Vero iD é fornecido "como está" e "conforme disponível". Não garantimos que:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>O serviço será ininterrupto, livre de erros ou totalmente seguro</li>
                <li>Os resultados obtidos serão precisos ou confiáveis em todas as circunstâncias</li>
                <li>Defeitos serão corrigidos imediatamente</li>
              </ul>
              <p className="font-semibold text-red-600 mt-4">
                IMPORTANTE: O Vero iD não se responsabiliza por:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Perda de dados devido a falhas técnicas, ataques cibernéticos ou erros do usuário</li>
                <li>Uso indevido de certificados digitais por terceiros</li>
                <li>Danos indiretos, incidentais ou consequenciais decorrentes do uso da plataforma</li>
                <li>Disputas legais relacionadas ao conteúdo assinado pelos usuários</li>
              </ul>
              <p className="mt-4">
                <strong>Recomendação:</strong> Faça backup de seus conteúdos importantes e mantenha suas chaves privadas em local seguro.
              </p>
            </CardContent>
          </Card>

          {/* Segurança da Conta */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                6. Segurança da Conta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>Você é responsável por:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Manter a confidencialidade de sua senha e chave privada</li>
                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado de sua conta</li>
                <li>Garantir que sua conta não seja acessada por menores de idade sem supervisão</li>
                <li>Fazer logout ao usar dispositivos compartilhados</li>
              </ul>
              <p className="font-semibold text-blue-600">
                Não nos responsabilizamos por perdas decorrentes do uso não autorizado de sua conta, a menos que seja devido a negligência nossa.
              </p>
            </CardContent>
          </Card>

          {/* Suspensão e Cancelamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5 text-red-600" />
                7. Suspensão e Cancelamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <div>
                <h3 className="font-semibold mb-2">7.1. Suspensão pela Plataforma</h3>
                <p>
                  Reservamo-nos o direito de suspender ou encerrar sua conta imediatamente, sem aviso prévio, se:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Você violar estes Termos de Uso</li>
                  <li>Houver suspeita de atividade fraudulenta ou ilegal</li>
                  <li>Recebermos ordem judicial ou solicitação de autoridades competentes</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">7.2. Cancelamento pelo Usuário</h3>
                <p>
                  Você pode cancelar sua conta a qualquer momento através das configurações da plataforma ou entrando em contato conosco. Após o cancelamento:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Seus dados pessoais serão excluídos conforme nossa Política de Privacidade</li>
                  <li>Certificados públicos já emitidos permanecerão verificáveis (para manter a integridade do sistema)</li>
                  <li>Você não terá mais acesso ao histórico de conteúdos assinados</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Modificações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                8. Modificações nos Termos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Podemos modificar estes Termos de Uso a qualquer momento. Notificaremos você sobre alterações significativas através de:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>E-mail enviado para o endereço cadastrado</li>
                <li>Aviso destacado na plataforma</li>
                <li>Atualização da data no topo desta página</li>
              </ul>
              <p className="font-semibold text-purple-600">
                O uso continuado da plataforma após as alterações constitui sua aceitação dos novos termos.
              </p>
            </CardContent>
          </Card>

          {/* Lei Aplicável */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-green-600" />
                9. Lei Aplicável e Jurisdição
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-gray-700">
              <p>
                Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer disputa relacionada a estes termos será resolvida nos tribunais brasileiros, com foro na cidade de [CIDADE], [ESTADO].
              </p>
              <p>
                Antes de iniciar qualquer ação judicial, as partes concordam em tentar resolver disputas através de mediação ou arbitragem.
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
                Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco:
              </p>
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p><strong>E-mail de Suporte:</strong> <a href="mailto:support@veroid.com" className="text-blue-600 hover:underline">support@veroid.com</a></p>
                <p><strong>E-mail Jurídico:</strong> <a href="mailto:legal@veroid.com" className="text-blue-600 hover:underline">legal@veroid.com</a></p>
              </div>
            </CardContent>
          </Card>

          {/* Aceitação Final */}
          <Card className="border-2 border-blue-600">
            <CardContent className="pt-6">
              <p className="text-center text-lg font-semibold text-blue-600">
                Ao utilizar o Vero iD, você reconhece que leu, compreendeu e concorda com estes Termos de Uso e nossa Política de Privacidade.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center space-y-4">
          <Button onClick={() => navigate(-1)} size="lg">
            Voltar para o Vero iD
          </Button>
          <p className="text-sm text-gray-600">
            Tem dúvidas? <a href="mailto:support@veroid.com" className="text-blue-600 hover:underline">Entre em contato conosco</a>
          </p>
        </div>
      </main>
    </div>
  );
}