/**
 * Conteúdo da apresentação online `/apresentacao`.
 *
 * Arquivo único de edição: textos, números, fontes e rodadas do simulador.
 * Para atualizar dados, altere apenas os valores abaixo.
 */

export const PRESENTATION_PASSWORD = 'acessoveroid';
export const PRESENTATION_ACCESS_KEY = 'veroid_apresentacao_acesso';
export const PRESENTATION_SITE_URL = 'https://www.veroid.com.br';
export const PRESENTATION_VIDEO = '/apresentacao/demo-vero-id-final.mp4';

export interface PresentationStat {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  detail?: string;
}

export interface PresentationItem {
  title: string;
  text?: string;
}

export interface SimulatorMessage {
  lines: string[];
  time: string;
  attachment?: string;
}

export interface SimulatorRound {
  topic: string;
  question: string;
  options: [SimulatorMessage, SimulatorMessage];
  realIndex: 0 | 1;
  verification: { code: string; registeredAt: string };
  fakeClue: string;
}

export const nav = [
  { id: 'cenario', label: 'O cenário' },
  { id: 'advocacia', label: 'A advocacia' },
  { id: 'solucao', label: 'A solução' },
  { id: 'demonstracao', label: 'Demonstração' },
  { id: 'simulador', label: 'Simulador' },
  { id: 'comece', label: 'Comece hoje' },
];

export const hero = {
  eyebrow: 'Confiança que se verifica',
  title: 'Confiança digital na advocacia',
  text: 'As fraudes estão cada vez mais sofisticadas. A segurança da relação entre advogado e cliente precisa ser verificável.',
  photo: '/apresentacao/fotos/abertura.jpg',
};

export const escala = {
  title: 'A fraude digital ganhou escala',
  text: 'Em 2026, o risco de fraude cresceu em volume e impacto financeiro, tornando-se uma operação em larga escala.',
  stats: [
    { value: 2.86, decimals: 2, suffix: ' mi', label: 'casos de alto risco', detail: '+32,9% em relação a 2025' },
    { value: 5, prefix: '1 a cada ', suffix: ' s', label: 'ritmo das tentativas de fraude' },
    { value: 3.77, decimals: 2, prefix: 'R$ ', suffix: ' bi', label: 'em prejuízo evitado' },
  ] as PresentationStat[],
  source: 'Mapa da Fraude Serasa Experian (1º sem. 2026)',
};

export const infraestrutura = {
  title: 'O golpe começa antes da mensagem chegar',
  text: 'Existe uma infraestrutura digital preparando a fraude muito antes do contato com a vítima.',
  photo: '/apresentacao/fotos/golpe.jpg',
  stats: [
    { value: 20840, label: 'anúncios e páginas falsas', detail: '+27%' },
    { value: 50.7, decimals: 1, suffix: ' mi', label: 'mensagens em seis meses' },
    { value: 2.1, decimals: 1, prefix: '~', suffix: ' mil', label: 'grupos dedicados a fraudes', detail: '+90%' },
  ] as PresentationStat[],
  steps: ['Preparar', 'Imitar', 'Convencer', 'Converter'],
  source: 'Mapa da Fraude Serasa Experian (1º sem. 2026)',
};

export const horario = {
  title: 'O fraudador também tem "horário comercial"',
  text: 'A fraude moderna tenta se misturar à rotina legítima das vítimas.',
  photo: '/apresentacao/fotos/relogio.jpg',
  stats: [
    { value: 11, suffix: 'h às 15h', label: 'pico das tentativas' },
    { value: 2.04, decimals: 2, prefix: '+', suffix: '%', label: 'terça e quarta, acima da média' },
    { value: 46.5, decimals: 1, suffix: '%', label: 'das ocorrências no Sudeste' },
  ] as PresentationStat[],
  source: 'Mapa da Fraude Serasa Experian (1º sem. 2026)',
};

export const inteligenciaArtificial = {
  title: 'A inteligência artificial potencializa a fraude',
  text: 'A IA está sendo usada para tornar os golpes mais convincentes e mais lucrativos.',
  photo: '/apresentacao/fotos/ia.jpg',
  stats: [
    { value: 94, suffix: '%', label: 'dos líderes de cibersegurança veem a IA como principal transformação', detail: 'Fórum Econômico Mundial' },
    { value: 4.5, decimals: 1, suffix: 'x', label: 'mais lucrativos são os esquemas com IA', detail: 'Interpol' },
    { value: 22, suffix: ' mil', label: 'indicadores de fraude ligados à IA', detail: 'FBI' },
    { value: 893, prefix: 'US$ ', suffix: ' mi', label: 'em perdas', detail: 'FBI' },
  ] as PresentationStat[],
};

export const cenarioClaro = {
  title: 'O cenário é claro: a fraude já evoluiu',
  items: [
    { title: 'Preparação', text: 'A fraude se organiza antes do contato.' },
    { title: 'Escala', text: 'Opera em volume, como uma empresa.' },
    { title: 'Potencialização', text: 'Usa IA para se disfarçar de rotina.' },
  ] as PresentationItem[],
};

export const dadosReais = {
  title: 'O golpe não precisa inventar uma história',
  text: 'Criminosos combinam dados reais de processos com identidades falsas.',
  photo: '/apresentacao/fotos/justica.jpg',
  items: [
    'Nome do cliente',
    'Nome do advogado',
    'Número do processo',
    'Tribunal',
    'Fase processual',
    'Valores',
    'Alvarás',
    'Honorários',
    'Custas',
  ],
};

export const falsoAdvogado = {
  title: 'O golpe do falso advogado já é um problema institucional',
  text: 'A OAB e os escritórios tratam o tema como prioridade, diante do alto volume de denúncias.',
  stats: [
    { value: 4388, label: 'denúncias em 1,5 ano' },
    { value: 32318, label: 'verificações na plataforma ConfirmADV' },
    { value: 9633, label: 'verificações não confirmadas' },
  ] as PresentationStat[],
  source: 'OAB São Paulo',
};

export const casosIsolados = {
  title: 'Não são casos isolados',
  text: 'As operações de 2026 revelam prejuízos crescentes e o uso profissional de informações processuais reais.',
  range: [
    { value: 150, prefix: 'R$ ', suffix: ' mil', label: 'menores prejuízos e bloqueios registrados' },
    { value: 3.5, decimals: 1, prefix: '~R$ ', suffix: ' mi', label: 'maiores prejuízos e bloqueios registrados' },
  ] as PresentationStat[],
  period: 'Julho a outubro de 2026',
};

export const segundaVitima = {
  title: 'Existe uma segunda vítima nessa história',
  text: 'O advogado verdadeiro também é vítima: sua reputação e a confiança do cliente são atingidas.',
  photo: '/apresentacao/fotos/vitima.jpg',
  items: [
    { title: 'Reputação', text: 'O nome do profissional é usado no golpe.' },
    { title: 'Gestão de crise', text: 'O escritório precisa responder ao cliente e ao mercado.' },
  ] as PresentationItem[],
};

export const crise = {
  title: 'O prejuízo não termina quando o PIX é feito',
  text: 'O golpe gera uma crise interna que exige uma série de ações imediatas.',
  photo: '/apresentacao/fotos/crise.jpg',
  actions: [
    'Parar a equipe',
    'Atender o cliente',
    'Reconstruir a cronologia',
    'Verificar as mensagens',
    'Orientar sobre o boletim de ocorrência',
    'Acionar jurídico e TI',
    'Alertar outros clientes',
    'Gerir a reputação',
  ],
};

export const escritorioSeguro = {
  title: 'O escritório pode estar seguro. E ainda assim ter sua reputação usada.',
  text: 'O ataque não mira a infraestrutura do escritório, e sim a relação de confiança entre escritório e cliente.',
  items: ['Firewall', 'MFA', 'Antivírus', 'Servidor protegido'],
};

export const verificavel = {
  title: 'O Vero iD não tenta descobrir o que é falso.',
  highlight: 'Ele torna o legítimo verificável.',
  presumida: ['Foto', 'Nome', 'Número', 'Linguagem'],
  verificavel: ['Origem', 'Integridade', 'Tempo', 'Verificação'],
};

export const clienteVerifica = {
  title: 'O que, exatamente, o cliente consegue verificar?',
  text: 'A confiança deixa de depender da aparência e passa a ter evidências.',
  items: [
    { title: 'Origem', text: 'Quem enviou o conteúdo.' },
    { title: 'Integridade', text: 'O conteúdo não foi alterado.' },
    { title: 'Tempo', text: 'Quando foi registrado.' },
    { title: 'Verificação', text: 'Confirmação independente.' },
  ] as PresentationItem[],
};

export const camadas = {
  title: 'Segurança não é uma ferramenta. É um conjunto de camadas.',
  text: 'Nenhuma camada elimina o risco sozinha. Juntas, reduzem a exposição e melhoram a resposta.',
  items: ['Firewall', 'MFA', 'Antivírus', 'Procedimentos', 'Vero iD'],
};

export const prioridades = {
  title: 'Não precisa autenticar tudo. Comece pelo que mais importa.',
  text: 'Priorize as comunicações em que um erro de confiança pode causar dano financeiro, de dados ou de reputação.',
  items: ['Solicitações de pagamento', 'Dados bancários', 'Contratos', 'Documentos importantes', 'Mensagens urgentes'],
};

export const demonstracao = {
  title: 'Vamos ver isso funcionando?',
  steps: [
    { title: 'Do conteúdo', text: 'O advogado escolhe o que vai enviar.' },
    { title: 'À autenticação', text: 'O Vero iD registra origem, integridade e horário.' },
    { title: 'À verificação', text: 'O cliente confere o certificado em segundos.' },
  ] as PresentationItem[],
};

export const simulador = {
  title: 'Quando seu cliente recebe uma mensagem com seu nome… como ele sabe que foi realmente você?',
  text: 'Foto, nome e número já não bastam. Teste: em cada rodada, escolha qual mensagem é a verdadeira.',
  contactName: 'Dr. Rafael Almeida',
  contactOffice: 'Almeida & Costa Advocacia',
  rounds: [
    {
      topic: 'Boleto de honorários',
      question: 'Qual destas mensagens com o boleto é a verdadeira?',
      options: [
        {
          lines: [
            'Bom dia, Sra. Marina! Segue o boleto dos honorários referentes ao processo 0012345-67.2026.',
            'Vencimento em 20/11. Qualquer dúvida, estou à disposição.',
          ],
          time: '09:42',
          attachment: 'boleto-honorarios-novembro.pdf',
        },
        {
          lines: [
            'Bom dia, Sra. Marina! Segue o boleto dos honorários referentes ao processo 0012345-67.2026.',
            'Por favor, pague hoje para evitarmos atraso no andamento.',
          ],
          time: '09:47',
          attachment: 'boleto-honorarios-atualizado.pdf',
        },
      ],
      realIndex: 0,
      verification: { code: '7F3A21C9', registeredAt: '12/11/2026 às 09:41' },
      fakeClue: 'O boleto foi gerado por terceiros com outro beneficiário. Não há registro no Vero iD.',
    },
    {
      topic: 'Troca de chave PIX',
      question: 'Uma destas mensagens informa uma nova chave PIX. Qual é a verdadeira?',
      options: [
        {
          lines: [
            'Sra. Marina, o escritório mudou de banco. A partir de hoje, use a nova chave PIX para os pagamentos.',
            'Chave: financeiro.almeidacosta@pagbanco.com',
          ],
          time: '14:03',
        },
        {
          lines: [
            'Sra. Marina, os pagamentos continuam na mesma conta do escritório, informada no contrato.',
            'Não alteramos dados bancários por mensagem.',
          ],
          time: '14:10',
        },
      ],
      realIndex: 1,
      verification: { code: 'B82D04E6', registeredAt: '12/11/2026 às 14:09' },
      fakeClue: 'Mudança de dados bancários por mensagem é um sinal clássico de golpe. Não há registro no Vero iD.',
    },
    {
      topic: 'Custas urgentes',
      question: 'As duas mensagens falam de custas do processo. Qual é a verdadeira?',
      options: [
        {
          lines: [
            'Sra. Marina, saiu o alvará! Para liberar o valor, é preciso pagar R$ 2.480,00 de custas ainda hoje.',
            'Envio o PIX para agilizar.',
          ],
          time: '16:21',
        },
        {
          lines: [
            'Sra. Marina, o juiz expediu o alvará. Vou explicar os próximos passos na reunião de amanhã, às 10h.',
            'Não há nenhum pagamento pendente.',
          ],
          time: '16:25',
        },
      ],
      realIndex: 1,
      verification: { code: '4C19F7A2', registeredAt: '12/11/2026 às 16:24' },
      fakeClue: 'Usa um fato real (o alvará) para criar urgência e pedir pagamento. Não há registro no Vero iD.',
    },
  ] as SimulatorRound[],
  finalMessage: 'Pela aparência, não dá para saber. Só verificando.',
};

export const protocolo = {
  title: 'Não espere a primeira crise para criar o protocolo',
  text: 'A segurança preventiva parece cara antes de um incidente. Depois, ela se torna óbvia.',
  semProtocolo: ['Mensagem suspeita', 'Dúvida', 'Pagamento', 'Crise'],
  comProtocolo: ['Mensagem', 'Verificação no Vero iD', 'Decisão segura'],
};

export const oferta = {
  title: 'Você pode começar hoje. Sem compromisso.',
  stats: [
    { value: 10, label: 'autenticações gratuitas', detail: 'válidas por 30 dias' },
    { value: 30, suffix: '%', label: 'de desconto em qualquer plano', detail: 'advogados conveniados à CAA' },
    { value: 50, suffix: '%', label: 'de desconto por 12 meses', detail: 'Jovem Advocacia' },
  ] as PresentationStat[],
};

export const usoReal = {
  title: 'Não crie sua conta apenas para conhecer o sistema.',
  highlight: 'Autentique hoje uma comunicação real.',
  photo: '/apresentacao/fotos/advogado.jpg',
  steps: ['Autentique', 'Envie', 'Abra', 'Verifique'],
};

export const encerramento = {
  title: 'Confiar já não basta.',
  highlight: 'É preciso verificar.',
  text: 'Crie sua conta e comece com 10 autenticações gratuitas.',
  cta: 'Acessar o Vero iD',
};
