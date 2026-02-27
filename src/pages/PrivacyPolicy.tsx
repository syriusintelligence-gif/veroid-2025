import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
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
            POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS
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
                PARTE I — DISPOSIÇÕES GERAIS
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    01. OBJETO E ABRANGÊNCIA
                  </h3>
                  <p className="mb-2">
                    A presente Política integra os Termos de Uso do VERO iD e disciplina:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>práticas de tratamento de dados pessoais;</li>
                    <li>fundamentos jurídicos aplicáveis;</li>
                    <li>mecanismos de segurança da informação;</li>
                    <li>governança e compliance regulatório;</li>
                    <li>limites técnicos e jurídicos do serviço.</li>
                  </ul>
                  <p className="mt-2 mb-2">A Plataforma disponibiliza:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>geração de assinaturas digitais;</li>
                    <li>certificação de integridade criptográfica;</li>
                    <li>verificação pública de autenticidade;</li>
                    <li>armazenamento seguro de registros de assinatura.</li>
                  </ul>
                  <p className="mt-2">
                    Ao utilizar a Plataforma, o Usuário declara ciência e concordância com este instrumento.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    02. FUNDAMENTAÇÃO NORMATIVA
                  </h3>
                  <p className="mb-2">O tratamento de dados observa:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Lei nº 13.709/2018 (LGPD);</li>
                    <li>Marco Civil da Internet;</li>
                    <li>Medida Provisória nº 2.200-2/2001;</li>
                    <li>Regulamentos da Autoridade Nacional de Proteção de Dados;</li>
                    <li>Demais normas civis e digitais aplicáveis.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    03. NATUREZA DO SERVIÇO
                  </h3>
                  <p className="mb-2">
                    O VERO iD fornece infraestrutura tecnológica baseada em criptografia assimétrica e não se confunde com:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Autoridade Certificadora da ICP-Brasil (salvo se expressamente indicado);</li>
                    <li>Serviço notarial;</li>
                    <li>Consultoria jurídica;</li>
                    <li>Assessoria probatória.</li>
                  </ul>
                  <p className="mt-2">
                    O serviço possui natureza técnica e instrumental, consistindo em obrigação de meio tecnológico.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    04. AUSÊNCIA DE CONTROLE EDITORIAL
                  </h3>
                  <p className="mb-2">O Vero iD:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>não realiza moderação prévia de conteúdo;</li>
                    <li>não revisa mérito, contexto ou finalidade da publicação;</li>
                    <li>não interfere na linha editorial do usuário;</li>
                    <li>não acompanha a circulação posterior do conteúdo em redes sociais.</li>
                  </ul>
                  <p className="mt-2">
                    O usuário reconhece que a plataforma atua como instrumento tecnológico neutro, não sendo provedora de conteúdo, nos termos do Marco Civil da Internet (Lei nº 12.965/2014).
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE II — COMPARTILHAMENTO E USO DE DADOS PESSOAIS
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    05. POLÍTICA DE NÃO COMERCIALIZAÇÃO
                  </h3>
                  <p className="mb-2">O VERO iD não vende, aluga, licencia ou comercializa dados pessoais para:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>marketing de terceiros;</li>
                    <li>publicidade direcionada externa;</li>
                    <li>enriquecimento por data brokers;</li>
                    <li>mailing lists;</li>
                    <li>campanhas promocionais de terceiros sem consentimento específico.</li>
                  </ul>
                  <p className="mt-2 mb-2">Também não realiza:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>perfilhamento discriminatório;</li>
                    <li>tratamento de dados sensíveis para segmentação mercadológica;</li>
                    <li>cessão onerosa de bases de dados.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    06. HIPÓTESES LEGÍTIMAS DE COMPARTILHAMENTO
                  </h3>
                  <p className="mb-2">
                    O eventual compartilhamento ocorre exclusivamente quando necessário e nas seguintes hipóteses:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Cumprimento de obrigação legal ou regulatória;</li>
                    <li>Execução contratual;</li>
                    <li>Exercício regular de direitos;</li>
                    <li>Segurança da plataforma e prevenção a fraudes;</li>
                    <li>Prestação de serviços por operadores contratados sob DPA.</li>
                  </ul>
                  <p className="mt-2">
                    O compartilhamento é limitado ao mínimo necessário, observando os princípios da LGPD: finalidade, adequação, necessidade, transparência, segurança e responsabilização.
                  </p>
                  <p className="mt-2">
                    Transferências internacionais, quando aplicáveis, observam os artigos 33 a 36 da LGPD.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE III — GOVERNANÇA E ESTRUTURA DE TRATAMENTO
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    07. PAPEL NA CADEIA DE TRATAMENTO
                  </h3>
                  <p className="mb-2">O VERO iD atua:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>como Controlador dos dados cadastrais;</li>
                    <li>como Controlador ou Operador quanto ao conteúdo submetido, conforme o caso.</li>
                  </ul>
                  <p className="mt-2">A definição observa finalidade e relação contratual.</p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    08. CATEGORIAS DE DADOS TRATADOS
                  </h3>
                  
                  <div className="ml-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-blue-200 mb-1">8.1 Dados Cadastrais</h4>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Nome</li>
                        <li>E-mail</li>
                        <li>Credenciais (hash irreversível)</li>
                        <li>Telefone</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-blue-200 mb-1">8.2 Dados Técnicos</h4>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>IP</li>
                        <li>Logs (art. 15 do Marco Civil da Internet)</li>
                        <li>Identificadores de sessão</li>
                        <li>Metadados técnicos</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-blue-200 mb-1">8.3 Conteúdos Submetidos</h4>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Documentos,</li>
                        <li>imagens</li>
                        <li>e textos enviados para autenticação.</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-blue-200 mb-1">8.4 Dados Criptográficos</h4>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Chave pública</li>
                        <li>Chave privada (modelo sob controle exclusivo do usuário ou criptografia robusta)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE IV — PROVA DE INTEGRIDADE E VALIDADE JURÍDICA
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    09. MECANISMO DE ASSINATURA
                  </h3>
                  <p className="mb-2">
                    Utiliza criptografia assimétrica (RSA-OAEP ou padrão equivalente), garantindo:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>autenticidade;</li>
                    <li>integridade;</li>
                    <li>não repúdio técnico.</li>
                  </ul>
                  <p className="mt-2 mb-2">Cada assinatura gera:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>hash criptográfico único;</li>
                    <li>registro temporal;</li>
                    <li>código público de verificação;</li>
                    <li>certificado técnico.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    10. VALIDADE JURÍDICA
                  </h3>
                  <p className="mb-2">As assinaturas:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>observam o art. 10, §2º da Medida Provisória nº 2.200-2/2001;</li>
                    <li>possuem admissibilidade probatória;</li>
                    <li>podem ser submetidas à perícia técnica.</li>
                  </ul>
                  <p className="mt-2">Não há garantia de aceitação automática como prova plena.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE V — LIMITES DO SERVIÇO E PROTEÇÃO PROBATÓRIA
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    11. NATUREZA ESTRITAMENTE TÉCNICA
                  </h3>
                  <p className="mb-2">A certificação:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>não verifica veracidade factual;</li>
                    <li>não constitui chancela jurídica;</li>
                    <li>não substitui perícia ou ata notarial;</li>
                    <li>não gera presunção absoluta.</li>
                  </ul>
                  <p className="mt-2">
                    O serviço limita-se à autenticação técnica de integridade digital.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    12. AUSÊNCIA DE CONTROLE EDITORIAL
                  </h3>
                  <p className="mb-2">O VERO iD:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>não modera conteúdo;</li>
                    <li>não revisa mérito;</li>
                    <li>não interfere na circulação posterior.</li>
                  </ul>
                  <p className="mt-2">
                    Atua como instrumento tecnológico neutro, nos termos do Marco Civil da Internet.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    13. RESPONSABILIDADE EXCLUSIVA DO USUÁRIO
                  </h3>
                  <p className="mb-2">O usuário declara que:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>é titular legítimo do conteúdo;</li>
                    <li>possui autorizações necessárias;</li>
                    <li>não viola direitos de terceiros;</li>
                    <li>fornece informações verdadeiras.</li>
                  </ul>
                  <p className="mt-2">
                    Responsabilidades civis, administrativas e penais recaem exclusivamente sobre o usuário.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    14. USO ILÍCITO OU FRAUDULENTO
                  </h3>
                  <p className="mb-2">É vedado utilizar a plataforma para:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>simular prova;</li>
                    <li>conferir aparência de legitimidade a conteúdo ilícito;</li>
                    <li>autenticar conteúdo fraudulento;</li>
                    <li>induzir terceiros a erro.</li>
                  </ul>
                  <p className="mt-2 mb-2">Poderão ocorrer:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>suspensão de conta;</li>
                    <li>cancelamento de certificação;</li>
                    <li>preservação de logs;</li>
                    <li>comunicação às autoridades.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    15. PRESERVAÇÃO E PRODUÇÃO DE PROVA
                  </h3>
                  <p className="mb-2">Registros técnicos poderão ser preservados:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>para integridade do sistema;</li>
                    <li>mediante ordem judicial;</li>
                    <li>para exercício regular de direitos (art. 7º, VI, da LGPD).</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    16. LIMITAÇÃO DE RESPONSABILIDADE
                  </h3>
                  <p className="mb-2">Na máxima extensão legal:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>não responde por danos indiretos, lucros cessantes ou danos reputacionais;</li>
                    <li>não responde por interpretação judicial do conteúdo baseadas em interpretação do conteúdo autenticado;</li>
                    <li>não responde por compartilhamentos posteriores realizados por terceiros;</li>
                    <li>não responde por adulterações realizadas após o momento da autenticação.</li>
                  </ul>
                  <p className="mt-2">
                    Eventual responsabilidade da plataforma limita-se ao valor efetivamente pago pelo usuário pelo serviço específico que originou a controvérsia.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    17. ÔNUS PROBATÓRIO
                  </h3>
                  <p className="mb-2">Compete ao usuário comprovar:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>licitude;</li>
                    <li>veracidade;</li>
                    <li>eventual alegação de falha.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    18. CLÁUSULA DE INDENIZAÇÃO
                  </h3>
                  <p className="mb-2">
                    O usuário compromete-se a manter o VERO iD indene de reclamações decorrentes:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>do conteúdo autenticado;</li>
                    <li>de violação de direitos;</li>
                    <li>de uso fraudulento;</li>
                    <li>de informações falsas.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    19. COOPERAÇÃO COM AUTORIDADES
                  </h3>
                  <p>A plataforma poderá cooperar com autoridades quando exigido por lei.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE VI — MENORES DE IDADE
              </h2>
              
              <div className="space-y-3">
                <p>O serviço não é destinado a menores de 18 anos.</p>
                
                <p>
                  No ato do cadastro, o usuário declara expressamente possuir 18 (dezoito) anos ou mais, sendo essa confirmação requisito obrigatório para a criação e manutenção da conta. Tal declaração é prestada sob responsabilidade exclusiva do usuário.
                </p>

                <p>
                  Nos termos do art. 14 da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados – LGPD), o tratamento de dados pessoais de crianças e adolescentes deve observar requisitos específicos e somente pode ocorrer em seu melhor interesse. O Vero iD não realiza coleta intencional, tratamento deliberado ou direcionamento de serviços a menores de idade.
                </p>

                <p>
                  Caso seja identificado que o usuário tenha prestado informação inverídica quanto à sua idade, poderão ser adotadas as medidas cabíveis, incluindo a suspensão ou exclusão imediata da conta, sem prejuízo de outras providências legais eventualmente aplicáveis.
                </p>

                <p>
                  Adicionalmente, até o presente momento, não foi constatada na plataforma a existência de conteúdo publicado pelo referido usuário que indique interação, direcionamento, incentivo ou postagem relacionada a menores de 18 (dezoito) anos.
                </p>

                <p>
                  Nos termos do art. 7º da LGPD, o tratamento de dados pessoais realizado pela plataforma fundamenta-se nas bases legais aplicáveis, respeitando os princípios da finalidade, adequação, necessidade, boa-fé e responsabilidade.
                </p>

                <p>
                  Caso pai, mãe ou responsável legal entenda que um menor tenha fornecido informações pessoais de forma indevida, solicitamos contato imediato para apuração e adoção das providências necessárias, inclusive eventual exclusão de dados.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE VII — SEGURANÇA DA INFORMAÇÃO
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    20. MEDIDAS TÉCNICAS
                  </h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>TLS 1.2+</li>
                    <li>Criptografia em repouso</li>
                    <li>Hash scrypt</li>
                    <li>Gestão de chaves segregada</li>
                    <li>Controle de privilégio mínimo</li>
                    <li>Monitoramento contínuo</li>
                    <li>Backups redundantes</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    21. GESTÃO DE INCIDENTES
                  </h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Plano formal de resposta</li>
                    <li>Notificação à Autoridade Nacional de Proteção de Dados</li>
                    <li>Registro documentado de eventos</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE VIII — RETENÇÃO E ELIMINAÇÃO
              </h2>
              
              <p className="mb-2">Dados mantidos:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>durante vigência contratual;</li>
                <li>prazo prescricional;</li>
                <li>exercício regular de direitos.</li>
              </ul>
              <p className="mt-2">Posteriormente eliminados ou anonimizados.</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE IX — DIREITOS DOS TITULARES
              </h2>
              
              <p className="mb-2">Nos termos do art. 18 da LGPD:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>confirmação;</li>
                <li>acesso;</li>
                <li>correção;</li>
                <li>eliminação;</li>
                <li>portabilidade;</li>
                <li>revogação de consentimento;</li>
                <li>informação sobre compartilhamentos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE X — GOVERNANÇA E COMPLIANCE
              </h2>
              
              <p className="mb-2">O VERO iD mantém:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>política interna formal;</li>
                <li>registro de operações;</li>
                <li>data mapping;</li>
                <li>avaliação periódica de riscos;</li>
                <li>cláusulas com operadores;</li>
                <li>due diligence de fornecedores.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE XI — MITIGAÇÃO DE RISCO REGULATÓRIO
              </h2>
              
              <p className="mb-2">Postura preventiva quanto às sanções do art. 52 da LGPD:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>monitoramento regulatório;</li>
                <li>revisão periódica;</li>
                <li>canal estruturado ao titular;</li>
                <li>cooperação com a Autoridade Nacional de Proteção de Dados.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                PARTE XII — NATUREZA JURÍDICA DO SERVIÇO
              </h2>
              
              <div className="space-y-4">
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>obrigação de meio técnico;</li>
                  <li>inexistência de garantia de resultado;</li>
                  <li>ausência de assessoria jurídica;</li>
                  <li>responsabilidade subjetiva mediante prova de falha técnica;</li>
                  <li>limitação contratual ao valor pago;</li>
                  <li>reconhecimento expresso das limitações pelo usuário.</li>
                </ul>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    22. NATUREZA TÉCNICA E INSTRUMENTAL
                  </h3>
                  <p className="mb-2">
                    O Vero iD constitui ferramenta tecnológica especializada de autenticação digital, destinada à geração de registro técnico de integridade e vinculação de autoria declarada.
                  </p>
                  <p>
                    O serviço possui natureza instrumental, técnica e acessória, não se configurando como produto de consumo final, mas como ferramenta tecnológica de apoio à atividade digital do usuário.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    23. AUSÊNCIA DE DESTINAÇÃO FINAL ECONÔMICA
                  </h3>
                  <p className="mb-2">O usuário declara que:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>utiliza o serviço como instrumento técnico de sua atividade digital, profissional, informacional ou comunicacional;</li>
                    <li>não adquire o serviço como destinatário final econômico do produto;</li>
                    <li>possui conhecimento técnico mínimo acerca da finalidade e limitações da autenticação digital.</li>
                  </ul>
                  <p className="mt-2">
                    O Vero iD não é estruturado como serviço massificado de consumo indiscriminado, mas como ferramenta tecnológica de uso específico e consciente.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    24. INEXISTÊNCIA DE GARANTIA DE RESULTADO
                  </h3>
                  <p className="mb-2">O serviço não garante:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>aceitação automática da certificação como prova judicial;</li>
                    <li>reconhecimento por terceiros como selo de veracidade;</li>
                    <li>qualquer resultado econômico, reputacional ou probatório.</li>
                  </ul>
                  <p className="mt-2">
                    A obrigação assumida pelo Vero iD é obrigação de meio técnico, consistente na geração de registro de integridade digital conforme padrões tecnológicos adotados.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    25. AUSÊNCIA DE ASSESSORIA JURÍDICA OU EDITORIAL
                  </h3>
                  <p className="mb-2">O Vero iD:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>não presta consultoria jurídica;</li>
                    <li>não orienta quanto à estratégia probatória;</li>
                    <li>não atua como perito;</li>
                    <li>não realiza curadoria ou análise de conteúdo.</li>
                  </ul>
                  <p className="mt-2">
                    O usuário é responsável por avaliar a adequação do serviço às suas finalidades.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    26. RESPONSABILIDADE SUBJETIVA
                  </h3>
                  <p className="mb-2">
                    Eventual responsabilidade do Vero iD dependerá de comprovação inequívoca de:
                  </p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>falha técnica comprovada;</li>
                    <li>nexo causal direto;</li>
                    <li>dano efetivamente demonstrado.</li>
                  </ul>
                  <p className="mt-2">
                    Não se aplica qualquer regime de responsabilidade objetiva automática por conteúdo de terceiros.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    27. LIMITAÇÃO CONTRATUAL
                  </h3>
                  <p className="mb-2">Na máxima extensão permitida pela legislação aplicável:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>o Vero iD não responde por danos indiretos ou reflexos;</li>
                    <li>eventual responsabilidade limita-se ao valor efetivamente pago pelo serviço específico.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    28. RECONHECIMENTO EXPRESSO
                  </h3>
                  <p className="mb-2">Ao aderir aos Termos, o usuário declara que:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>leu e compreendeu as limitações técnicas do serviço;</li>
                    <li>reconhece que a certificação não equivale a ato público notarial;</li>
                    <li>assume integral responsabilidade pelo conteúdo autenticado.</li>
                  </ul>
                  
                  <div className="mt-4 space-y-2">
                    <p>
                      ☑ Declara, sob as penas da lei, possuir 18 (dezoito) anos completos ou mais na data do cadastro, assumindo integral responsabilidade civil, administrativa e penal pela veracidade dessa informação.
                    </p>
                    <p>
                      ☑ Declara que o conteúdo submetido à autenticação não envolve, não explora, não representa e não faz referência a menores de 18 (dezoito) anos em contexto ilícito, abusivo ou sexualizado, tampouco veicula material de natureza criminosa, fraudulenta, difamatória ou que viole direitos de terceiros ou normas legais vigentes.
                    </p>
                    <p>☑ CONCORDO.</p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                29. Armazenamento e Segurança
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    29.1. Onde Armazenamos
                  </h3>
                  <p>
                    Seus dados são armazenados em servidores seguros fornecidos pela Supabase (infraestrutura AWS), localizados em data centers com certificações de segurança internacionais (ISO 27001, SOC 2).
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-blue-300 mb-2">
                    29.2. Medidas de Segurança
                  </h3>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Criptografia em Trânsito: HTTPS/TLS para todas as comunicações</li>
                    <li>Criptografia em Repouso: Senhas hasheadas com bcrypt, chaves privadas criptografadas</li>
                    <li>Criptografia Assimétrica: RSA-OAEP para assinaturas digitais</li>
                    <li>Controle de Acesso: Autenticação obrigatória, sessões seguras com tokens JWT</li>
                    <li>Backups: Backups automáticos diários do banco de dados</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                30. Alterações nesta Política
              </h2>
              
              <p>
                Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre alterações significativas através de e-mail ou aviso na plataforma. A data da última atualização será sempre exibida no topo desta página.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">
                31. Contato
              </h2>
              
              <p className="mb-2">
                Se você tiver dúvidas, preocupações ou solicitações relacionadas a esta Política de Privacidade, entre em contato conosco:
              </p>
              <p className="font-semibold">E-mail: contato@veroid.com.br</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}