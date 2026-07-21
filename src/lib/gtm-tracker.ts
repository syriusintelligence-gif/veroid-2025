/**
 * GTM Tracker — Utilitário de instrumentação para Google Tag Manager
 * ------------------------------------------------------------------
 * Centraliza os pushes de eventos no `window.dataLayer` do GTM.
 *
 * Por quê existe:
 *   - Antes desta biblioteca, o Cadastro.tsx só era rastreado pelo
 *     `spa_pageview` do GTMRouteTracker. A agência de tráfego não tinha
 *     visibilidade de conversão real (start, step, sign_up, error),
 *     inflando o CPA das campanhas.
 *   - Este módulo adiciona os eventos essenciais SEM tocar em nada que
 *     já funciona (GTM snippet em index.html e GTMRouteTracker seguem
 *     intactos).
 *
 * Segurança / robustez:
 *   - 100% defensivo: se o dataLayer não existir (ad-blocker, CSP em dev,
 *     GTM ainda não carregou), o push simplesmente vira no-op e o app
 *     continua normal. Nunca lança exceção.
 *   - Nunca envia PII crua (email, CPF, telefone). Apenas metadados de
 *     fluxo, opt-ins booleanos e códigos de erro genéricos.
 *   - Nunca faz chamada de rede própria — apenas escreve em um array
 *     global que o próprio GTM consome.
 *
 * @author Alex (Engineer)
 * @version 1.0.0
 * @created 2026-07-14
 */

// A tipagem global de window.dataLayer já é declarada em
// src/components/analytics/GTMRouteTracker.tsx. Aqui apenas reutilizamos.
// Isso evita duplicação e mantém a instrumentação existente intacta.

/**
 * Payload base aceito pelo dataLayer. Chaves adicionais são livres,
 * mas devem ser sempre serializáveis em JSON.
 */
type DataLayerPayload = Record<string, unknown>;

/**
 * Push defensivo no dataLayer. Nunca lança — falha silenciosamente
 * em ambientes onde o GTM não está disponível.
 */
function safePush(payload: DataLayerPayload): void {
  try {
    if (typeof window === 'undefined') return;

    // Garante a existência do dataLayer caso o snippet do GTM ainda não
    // tenha rodado (ex.: hot reload em dev, CSP experimental, etc.).
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }

    window.dataLayer.push(payload);
  } catch (err) {
    // Analytics NUNCA pode quebrar a UI. Só loga em warn.
    // eslint-disable-next-line no-console
    console.warn('[gtm-tracker] Falha ao publicar evento no dataLayer:', err);
  }
}

/**
 * Nome canônico do formulário de cadastro.
 * Usar constante evita divergência entre pontos do código.
 */
const CADASTRO_FORM_NAME = 'cadastro';

/**
 * Nomes canônicos de cada etapa do cadastro.
 * A ordem reflete a numeração visível ao usuário (Passo N de 3).
 * A tela intermediária "boas_vindas" fica entre step 1 e step 2 visuais,
 * mas conceitualmente é o marco de "dados pessoais confirmados".
 */
export const CadastroStep = {
  DADOS_PESSOAIS: 'dados_pessoais',
  BOAS_VINDAS: 'boas_vindas',
  VERIFICACAO: 'verificacao',
  SENHA: 'senha',
} as const;

export type CadastroStepName = (typeof CadastroStep)[keyof typeof CadastroStep];

/**
 * Dispara evento `form_start` quando o usuário chega no formulário
 * de cadastro. Deve ser chamado uma única vez, no mount da página.
 */
export function trackCadastroStart(): void {
  safePush({
    event: 'form_start',
    form_name: CADASTRO_FORM_NAME,
  });
}

/**
 * Dispara evento `form_step` sempre que o usuário avança para uma
 * nova etapa do cadastro (inclui a tela intermediária de boas-vindas).
 *
 * @param stepNumber Número visível ao usuário (1..4)
 * @param stepName   Slug canônico da etapa (ver `CadastroStep`)
 */
export function trackCadastroStep(
  stepNumber: number,
  stepName: CadastroStepName
): void {
  safePush({
    event: 'form_step',
    form_name: CADASTRO_FORM_NAME,
    step: stepNumber,
    step_name: stepName,
  });
}

/**
 * Dispara evento de conversão `sign_up` quando o usuário completa
 * o cadastro com sucesso (equivalente ao evento recomendado pelo
 * Google Analytics 4 e ao evento `CompleteRegistration` do Meta Pixel).
 *
 * ATENÇÃO: nunca passar email, CPF ou telefone brutos aqui.
 * O `whatsappOptin` é um booleano que ajuda a agência a segmentar
 * campanhas de remarketing / mensageria.
 */
export function trackCadastroSuccess(params: {
  whatsappOptin: boolean;
  ageDeclarationAccepted: boolean;
  // 🆕 Aceite de Termos de Uso e Política de Privacidade.
  //    Opcional para preservar 100% de compatibilidade com chamadas
  //    legadas do evento `sign_up`. A agência de tráfego pode continuar
  //    usando o evento exatamente como hoje; este campo aparece apenas
  //    como metadado adicional no payload.
  termsAccepted?: boolean;
}): void {
  safePush({
    event: 'sign_up',
    form_name: CADASTRO_FORM_NAME,
    method: 'email',
    whatsapp_optin: params.whatsappOptin,
    age_declaration_accepted: params.ageDeclarationAccepted,
    // 🆕 Campo aditivo: `terms_accepted` no payload de conversão.
    //    NÃO altera nenhum campo existente. Se a agência não usar,
    //    é inofensivo. Se quiser segmentar (ex.: GA4/Meta), já está disponível.
    terms_accepted: params.termsAccepted ?? false,
  });
}

/**
 * Dispara evento `form_error` quando uma validação falha em qualquer
 * etapa do cadastro. Permite à agência identificar exatamente em que
 * etapa o usuário desiste.
 *
 * @param stepNumber Etapa em que o erro ocorreu
 * @param stepName   Slug canônico da etapa
 * @param errorType  Slug genérico do erro (nunca mensagem crua ao usuário)
 */
export function trackCadastroError(params: {
  stepNumber: number;
  stepName: CadastroStepName;
  errorType: string;
}): void {
  safePush({
    event: 'form_error',
    form_name: CADASTRO_FORM_NAME,
    step: params.stepNumber,
    step_name: params.stepName,
    error_type: params.errorType,
  });
}