// Hero headline carousel slides (Opcao A: textos rotativos)
// Nao editar diretamente sem confirmacao do usuario.
export interface HeroSlide {
  titleLead: string;
  titleAccent: string;
  subtitleLead: string;
  subtitleAccent: string;
  subtitleTail: string;
}

export const heroSlides: HeroSlide[] = [
  {
    titleLead: 'Como seus clientes sabem que uma comunica\u00e7\u00e3o veio',
    titleAccent: 'realmente de voc\u00ea?',
    subtitleLead: 'Com o VeroID, profissionais e organiza\u00e7\u00f5es certificam documentos, mensagens e conte\u00fados, permitindo que qualquer pessoa ',
    subtitleAccent: 'verifique sua origem',
    subtitleTail: ' antes de tomar uma decis\u00e3o.',
  },
  {
    titleLead: 'Torne sua identidade e suas comunica\u00e7\u00f5es',
    titleAccent: 'verific\u00e1veis.',
    subtitleLead: 'Proteja sua ',
    subtitleAccent: 'reputa\u00e7\u00e3o',
    subtitleTail: ' e permita que clientes, parceiros e p\u00fablicos confirmem a origem e a autenticidade de documentos, mensagens e conte\u00fados importantes.',
  },
  {
    titleLead: 'Parecer verdadeiro j\u00e1 n\u00e3o basta.',
    titleAccent: '\u00c9 preciso poder verificar.',
    subtitleLead: 'O VeroID cria uma ',
    subtitleAccent: 'camada de confian\u00e7a',
    subtitleTail: ' para as rela\u00e7\u00f5es digitais, comprovando a origem, a autoria e a integridade das comunica\u00e7\u00f5es de profissionais, empresas e criadores.',
  },
];