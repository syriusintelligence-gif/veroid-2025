import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o início
        </Link>

        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-white mb-6">
            Termos de Uso
          </h1>
          <p className="text-gray-300 mb-4">
            VERO iD – Plataforma de Assinatura Digital e Certificação de Conteúdo
          </p>
          <p className="text-gray-300 mb-8">
            <strong>Última atualização: 27/02/2026</strong>
          </p>

          <div className="space-y-6 text-gray-200">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                1. Aceitação dos Termos
              </h2>
              <p>
                Ao acessar e usar o Vero iD, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                2. Descrição do Serviço
              </h2>
              <p className="mb-2">
                O Vero iD é uma plataforma de assinatura digital que permite:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Criar assinaturas digitais criptográficas para conteúdo</li>
                <li>Verificar a autenticidade de conteúdo assinado</li>
                <li>Gerar certificados de autenticidade</li>
                <li>Armazenar e gerenciar chaves criptográficas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                3. Cadastro e Conta
              </h2>
              <div className="space-y-3">
                <p>
                  <strong>3.1. Elegibilidade:</strong> Você deve ter pelo menos 18 anos para usar o Vero iD.
                </p>
                <p>
                  <strong>3.2. Informações Precisas:</strong> Você concorda em fornecer informações verdadeiras, precisas e atualizadas durante o cadastro.
                </p>
                <p>
                  <strong>3.3. Segurança da Conta:</strong> Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorram em sua conta.
                </p>
                <p>
                  <strong>3.4. Notificação de Uso Não Autorizado:</strong> Você deve notificar imediatamente o Vero iD sobre qualquer uso não autorizado de sua conta.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                4. Uso Aceitável
              </h2>
              <div className="space-y-3">
                <p>Você concorda em NÃO usar o Vero iD para:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Violar qualquer lei local, estadual, nacional ou internacional</li>
                  <li>Infringir direitos de propriedade intelectual de terceiros</li>
                  <li>Transmitir conteúdo ilegal, ofensivo, difamatório ou prejudicial</li>
                  <li>Assinar digitalmente conteúdo que você não possui ou não tem autorização para usar</li>
                  <li>Tentar comprometer a segurança da plataforma ou acessar contas de outros usuários</li>
                  <li>Usar o serviço para fins fraudulentos ou enganosos</li>
                  <li>Fazer upload de vírus, malware ou código malicioso</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                5. Propriedade Intelectual
              </h2>
              <div className="space-y-3">
                <p>
                  <strong>5.1. Propriedade do Vero iD:</strong> Todo o conteúdo, recursos e funcionalidades do Vero iD (incluindo, mas não se limitando a, texto, gráficos, logotipos, ícones, imagens, clipes de áudio, downloads digitais e software) são de propriedade do Vero iD ou de seus licenciadores.
                </p>
                <p>
                  <strong>5.2. Seu Conteúdo:</strong> Você mantém todos os direitos sobre o conteúdo que assina digitalmente. Ao usar o Vero iD, você nos concede uma licença limitada para processar, armazenar e exibir seu conteúdo conforme necessário para fornecer o serviço.
                </p>
                <p>
                  <strong>5.3. Licença de Uso:</strong> Concedemos a você uma licença limitada, não exclusiva, intransferível e revogável para usar o Vero iD de acordo com estes Termos.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                6. Assinaturas Digitais e Certificados
              </h2>
              <div className="space-y-3">
                <p>
                  <strong>6.1. Natureza Técnica:</strong> As assinaturas digitais fornecidas pelo Vero iD são baseadas em criptografia assimétrica (RSA-OAEP) e servem para verificar a integridade e autoria do conteúdo.
                </p>
                <p>
                  <strong>6.2. Não é Certificação Legal:</strong> O Vero iD não é uma Autoridade Certificadora da ICP-Brasil. Nossas assinaturas digitais têm valor técnico, mas podem não ter o mesmo valor legal que certificados digitais emitidos por autoridades certificadoras reconhecidas.
                </p>
                <p>
                  <strong>6.3. Responsabilidade pelo Conteúdo:</strong> Você é o único responsável pelo conteúdo que assina digitalmente. O Vero iD não verifica a veracidade, legalidade ou adequação do conteúdo assinado.
                </p>
                <p>
                  <strong>6.4. Verificação Pública:</strong> Certificados marcados como "públicos" podem ser verificados por qualquer pessoa através do código de verificação.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                7. Privacidade e Proteção de Dados
              </h2>
              <p>
                O uso de suas informações pessoais é regido por nossa{' '}
                <Link to="/privacy" className="text-blue-400 hover:text-blue-300 underline">
                  Política de Privacidade
                </Link>
                . Ao usar o Vero iD, você concorda com a coleta e uso de informações conforme descrito na Política de Privacidade.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                8. Planos e Pagamentos
              </h2>
              <div className="space-y-3">
                <p>
                  <strong>8.1. Planos Disponíveis:</strong> O Vero iD oferece diferentes planos de assinatura (Gratuito, Básico, Premium, Enterprise) com recursos e limites variados.
                </p>
                <p>
                  <strong>8.2. Pagamentos:</strong> Os pagamentos são processados através do Stripe. Ao assinar um plano pago, você concorda com os termos de pagamento do Stripe.
                </p>
                <p>
                  <strong>8.3. Renovação Automática:</strong> Planos pagos são renovados automaticamente, a menos que você cancele antes do final do período de cobrança.
                </p>
                <p>
                  <strong>8.4. Cancelamento:</strong> Você pode cancelar sua assinatura a qualquer momento através das configurações da conta. O cancelamento entrará em vigor no final do período de cobrança atual.
                </p>
                <p>
                  <strong>8.5. Reembolsos:</strong> Não oferecemos reembolsos para períodos de assinatura já pagos, exceto quando exigido por lei.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                9. Limitação de Responsabilidade
              </h2>
              <div className="space-y-3">
                <p>
                  <strong>9.1. Serviço "Como Está":</strong> O Vero iD é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo, expressas ou implícitas.
                </p>
                <p>
                  <strong>9.2. Exclusão de Garantias:</strong> Não garantimos que o serviço será ininterrupto, seguro ou livre de erros.
                </p>
                <p>
                  <strong>9.3. Limitação de Danos:</strong> Em nenhuma circunstância o Vero iD será responsável por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados, uso, boa vontade ou outras perdas intangíveis.
                </p>
                <p>
                  <strong>9.4. Limite Máximo:</strong> Nossa responsabilidade total não excederá o valor pago por você ao Vero iD nos últimos 12 meses.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                10. Indenização
              </h2>
              <p>
                Você concorda em indenizar, defender e isentar o Vero iD, seus diretores, funcionários e agentes de todas as reivindicações, responsabilidades, danos, perdas e despesas (incluindo honorários advocatícios) decorrentes de:
              </p>
              <ul className="list-disc list-inside ml-4 space-y-1 mt-2">
                <li>Seu uso do serviço</li>
                <li>Violação destes Termos</li>
                <li>Violação de direitos de terceiros</li>
                <li>Conteúdo que você assina digitalmente</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                11. Modificações do Serviço e dos Termos
              </h2>
              <div className="space-y-3">
                <p>
                  <strong>11.1. Alterações no Serviço:</strong> Reservamo-nos o direito de modificar ou descontinuar o serviço (ou qualquer parte dele) a qualquer momento, com ou sem aviso prévio.
                </p>
                <p>
                  <strong>11.2. Alterações nos Termos:</strong> Podemos revisar estes Termos de Uso periodicamente. Notificaremos você sobre alterações significativas através de e-mail ou aviso na plataforma.
                </p>
                <p>
                  <strong>11.3. Aceitação de Alterações:</strong> Seu uso continuado do serviço após alterações constitui aceitação dos novos termos.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                12. Rescisão
              </h2>
              <div className="space-y-3">
                <p>
                  <strong>12.1. Rescisão por Você:</strong> Você pode encerrar sua conta a qualquer momento através das configurações da conta.
                </p>
                <p>
                  <strong>12.2. Rescisão por Nós:</strong> Podemos suspender ou encerrar sua conta imediatamente, sem aviso prévio, se você violar estes Termos ou por qualquer outro motivo, a nosso exclusivo critério.
                </p>
                <p>
                  <strong>12.3. Efeitos da Rescisão:</strong> Após a rescisão, seu direito de usar o serviço cessará imediatamente. Podemos reter certas informações conforme exigido por lei ou para fins legítimos de negócios.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                13. Lei Aplicável e Jurisdição
              </h2>
              <p>
                Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa decorrente destes Termos será submetida à jurisdição exclusiva dos tribunais brasileiros.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                14. Disposições Gerais
              </h2>
              <div className="space-y-3">
                <p>
                  <strong>14.1. Acordo Integral:</strong> Estes Termos, juntamente com a Política de Privacidade, constituem o acordo integral entre você e o Vero iD.
                </p>
                <p>
                  <strong>14.2. Renúncia:</strong> A falha em fazer cumprir qualquer direito ou disposição destes Termos não constituirá uma renúncia a esse direito ou disposição.
                </p>
                <p>
                  <strong>14.3. Divisibilidade:</strong> Se qualquer disposição destes Termos for considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor e efeito.
                </p>
                <p>
                  <strong>14.4. Cessão:</strong> Você não pode ceder ou transferir estes Termos sem nosso consentimento prévio por escrito. Podemos ceder estes Termos sem restrições.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                15. Contato
              </h2>
              <p className="mb-2">
                Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco:
              </p>
              <p className="font-semibold">E-mail: contato@veroid.com.br</p>
            </section>

            <section className="border-t border-gray-600 pt-6 mt-8">
              <p className="text-sm text-gray-400">
                Ao usar o Vero iD, você reconhece que leu, compreendeu e concorda em estar vinculado a estes Termos de Uso e à nossa Política de Privacidade.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}