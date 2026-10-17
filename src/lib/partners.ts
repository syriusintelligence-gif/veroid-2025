/**
 * Parceiros institucionais do Vero iD.
 *
 * Fonte única de dados da faixa de parceiros da Home e das páginas
 * `/parceiros/todos` e `/parceiros/:slug`.
 *
 * Como incluir:
 * - Nova regional: adicione um item em `regionals` do órgão correspondente
 *   e salve o logo em `public/images/parceiros/`.
 * - Novo órgão: adicione um novo objeto em `partnerOrgs` com um `slug` único.
 *   Órgãos com `active: false` ou sem regionais não aparecem no site.
 */

export interface PartnerRegional {
  id: string;
  name: string;
  shortName: string;
  uf: string;
  state: string;
  logo?: string;
  website?: string;
}

export interface PartnerBenefitHighlight {
  value: string;
  label: string;
}

export interface PartnerStep {
  text: string;
  note?: string;
  action?: 'signup' | 'email';
}

export interface PartnerContent {
  introTitle: string;
  introText: string;
  whyTitle: string;
  whyParagraphs: string[];
  whyBulletsIntro: string;
  whyBullets: string[];
  whyClosing: string[];
  benefitsTitle: string;
  benefitHighlights: PartnerBenefitHighlight[];
  benefitsParagraphs: string[];
  stepsTitle: string;
  steps: PartnerStep[];
  closingLines: string[];
  closingSignature: string;
  closingTagline: string;
  benefitEmailSubject: string;
}

export interface PartnerOrg {
  slug: string;
  name: string;
  shortName: string;
  homeTitle: string;
  logo: string;
  logoAlt: string;
  regionalLabel: string;
  active: boolean;
  order: number;
  utmCampaign: string;
  content: PartnerContent;
  regionals: PartnerRegional[];
}

export const PARTNER_CONTACT = {
  email: 'contato@veroid.com.br',
  whatsapp: '5531997693660',
  whatsappDisplay: '(31) 99769-3660',
} as const;

export const PARTNERS_MULTI_TITLE = 'Parceiros que confiam no Vero iD';
export const PARTNERS_MARQUEE_THRESHOLD = 6;
export const REGIONAL_SEARCH_THRESHOLD = 10;

export const partnerOrgs: PartnerOrg[] = [
  {
    slug: 'oab',
    name: 'OAB — Caixas de Assistência dos Advogados',
    shortName: 'OAB/CAA',
    homeTitle: 'Parceiro Oficial da OAB/CAA',
    logo: '/images/parceiros/oab-caa.png',
    logoAlt: 'OAB CAA — Caixa de Assistência dos Advogados',
    regionalLabel: 'Caixas de Assistência parceiras',
    active: true,
    order: 1,
    utmCampaign: 'oab-caa',
    content: {
      introTitle: 'Uma parceria para fortalecer a advocacia.',
      introText:
        'O Vero iD e a OAB, por meio das Caixas de Assistência dos Advogados (CAA), se unem para ampliar o acesso dos profissionais da advocacia a tecnologias de autenticidade, integridade e confiança digital.',
      whyTitle: 'Por que o Vero iD é relevante para a advocacia?',
      whyParagraphs: [
        'Na rotina jurídica, grande parte da relação entre advogado e cliente acontece por meios digitais: WhatsApp, e-mail, documentos eletrônicos, orientações processuais, solicitações de pagamento, contratos e procurações.',
        'O problema é que nome, foto, identidade visual, linguagem e até informações reais de um processo podem ser reproduzidos por terceiros, tornando uma comunicação falsa cada vez mais difícil de identificar apenas pela aparência.',
        'O Vero iD adiciona uma camada de confiança verificável a essa relação.',
      ],
      whyBulletsIntro:
        'A plataforma permite que o advogado ou escritório autentique comunicações, documentos e conteúdos digitais para que o destinatário possa verificar:',
      whyBullets: ['a origem do conteúdo', 'sua integridade', 'o momento em que foi registrado'],
      whyClosing: [
        'Na prática, isso permite ao cliente confirmar se determinada comunicação realmente foi reconhecida pelo profissional ou escritório antes de pagar, assinar, enviar documentos ou compartilhar informações sensíveis.',
        'O Vero iD não substitui os controles de segurança já utilizados pelo escritório. Ele os complementa, criando uma forma objetiva de transformar confiança em algo verificável.',
      ],
      benefitsTitle: 'Benefícios da parceria',
      benefitHighlights: [
        { value: '10', label: 'certificações gratuitas, válidas por 30 dias' },
        { value: '30%', label: 'de desconto em qualquer plano' },
        { value: '50%', label: 'para a Jovem Advocacia nos primeiros 12 meses' },
      ],
      benefitsParagraphs: [
        'Advogados e demais públicos contemplados pelo Programa de Convênios da CAA poderão criar gratuitamente sua conta no Vero iD e começar a utilizar a plataforma com 10 certificações gratuitas, válidas por 30 dias, sem necessidade de contratar um plano ou cadastrar cartão nessa primeira experiência.',
        'Após essa etapa, profissionais adimplentes com a OAB terão acesso a uma condição exclusiva de 30% de desconto em qualquer plano Vero iD.',
        'Para a Jovem Advocacia, a parceria também prevê uma condição diferenciada: 50% de desconto em qualquer plano Vero iD durante os primeiros 12 meses, além das 10 certificações gratuitas iniciais.',
      ],
      stepsTitle: 'Como solicitar o benefício',
      steps: [
        { text: 'Faça seu cadastro em www.veroid.com.br', action: 'signup' },
        {
          text: 'Após o cadastro, envie um e-mail para contato@veroid.com.br solicitando o benefício e anexe uma foto ou cópia da sua carteira da OAB',
          note: 'Seus dados serão usados apenas para validar este benefício.',
          action: 'email',
        },
        { text: 'Após a validação, você receberá seu cupom exclusivo de desconto' },
      ],
      closingLines: [
        'Mais tecnologia para o advogado.',
        'Mais confiança para o cliente.',
        'Mais segurança para a advocacia.',
      ],
      closingSignature: 'Vero iD + OAB CAA',
      closingTagline: 'Uma parceria que transforma confiança em algo verificável.',
      benefitEmailSubject: 'Solicitação de benefício — Parceria Vero iD + OAB/CAA',
    },
    regionals: [
      {
        id: 'caa-pr',
        name: 'Caixa de Assistência dos Advogados do Paraná',
        shortName: 'CAA/PR',
        uf: 'PR',
        state: 'Paraná',
        logo: '/images/parceiros/caa-pr.png',
        website: 'https://www.caapr.org.br/beneficios/convenios',
      },
      {
        id: 'caa-rr',
        name: 'Caixa de Assistência dos Advogados de Roraima',
        shortName: 'CAA/RR',
        uf: 'RR',
        state: 'Roraima',
        logo: '/images/parceiros/caa-rr.png',
        website: 'https://www.caarr.org.br/',
      },
    ],
  },
];

/** Órgãos visíveis no site: ativos, com ao menos uma regional, em ordem. */
export function getActivePartnerOrgs(): PartnerOrg[] {
  return partnerOrgs
    .filter((org) => org.active && org.regionals.length > 0)
    .sort((a, b) => a.order - b.order);
}

export function getPartnerOrgBySlug(slug: string | undefined): PartnerOrg | undefined {
  if (!slug) return undefined;
  return getActivePartnerOrgs().find((org) => org.slug === slug);
}

/** Título da faixa da Home: muda sozinho conforme a quantidade de órgãos. */
export function getPartnersSectionTitle(orgs: PartnerOrg[]): string {
  return orgs.length === 1 ? orgs[0].homeTitle : PARTNERS_MULTI_TITLE;
}

export function buildPartnerSignupUrl(org: PartnerOrg): string {
  const params = new URLSearchParams({
    utm_source: `parceria-${org.slug}`,
    utm_medium: 'parceiros',
    utm_campaign: org.utmCampaign,
  });
  return `/cadastro?${params.toString()}`;
}

export function buildMailtoUrl(subject: string, body?: string): string {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${PARTNER_CONTACT.email}?${params.join('&')}`;
}

export function buildWhatsappUrl(message: string): string {
  return `https://wa.me/${PARTNER_CONTACT.whatsapp}?text=${encodeURIComponent(message)}`;
}
