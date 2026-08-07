/**
 * UTM Tracker — Captura de origem de leads (First-Touch, janela 90 dias)
 * ----------------------------------------------------------------------
 * Centraliza a captura, persistência e leitura dos parâmetros UTM
 * (Urchin Tracking Module) e dos click IDs de plataformas de anúncios
 * (gclid, fbclid) para atribuir corretamente cada cadastro à sua origem.
 *
 * Estratégia de atribuição:
 *   - First-touch: só grava na PRIMEIRA visita com UTM válido; visitas
 *     posteriores com novos UTMs NÃO sobrescrevem (respeita a origem
 *     que realmente trouxe o lead).
 *   - Janela de 90 dias: após 90 dias sem cadastro, o UTM antigo expira
 *     e a próxima visita com UTM inicia uma nova atribuição.
 *   - Persistência: sessionStorage (curta) + localStorage (longa).
 *
 * Por que existe:
 *   - A agência de tráfego precisa saber qual campanha gerou cada lead.
 *   - Sem UTM tracking, todo cadastro é tratado como "direct" — impossível
 *     otimizar CPA por canal, campanha ou anúncio.
 *
 * Segurança / robustez:
 *   - 100% defensivo: nunca lança exceção; falhas viram no-op silencioso.
 *   - Nunca bloqueia o cadastro por erro de captura UTM.
 *   - Sanitiza valores lidos da URL (defesa contra XSS via query string).
 *   - Zero chamadas de rede próprias.
 *
 * Padrão de código:
 *   - Segue exatamente o mesmo padrão defensivo de `gtm-tracker.ts`
 *     (safePush, try/catch total, tipos explícitos).
 *
 * @author Alex (Engineer)
 * @version 1.0.0
 * @created 2026-08-07
 */

/**
 * Estrutura canônica dos dados UTM + click IDs capturados.
 * Todos os campos são opcionais para refletir que o lead pode chegar
 * sem qualquer parâmetro (tráfego direto ou orgânico).
 */
export interface UtmTrackingData {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  utm_captured_at?: string | null; // ISO 8601
  utm_referrer?: string | null;
}

/**
 * Payload enviado ao backend (mesma shape do banco).
 * Extraído em interface separada para uso explícito na chamada de
 * `registerUser` sem risco de erro de tipagem.
 */
export interface UtmPayload {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  utm_captured_at: string | null;
  utm_referrer: string | null;
}

/**
 * Constantes canônicas — evitam divergência entre pontos do código.
 */
const STORAGE_KEY = 'vero_id_utm_attribution';
/** Janela de atribuição first-touch: 90 dias (padrão GA4 e Meta) */
const ATTRIBUTION_WINDOW_DAYS = 90;
/** Tamanho máximo permitido para cada valor UTM lido da URL (defesa contra abuso) */
const MAX_UTM_VALUE_LENGTH = 255;

/**
 * Lista dos 5 UTMs padrão do Google Analytics + os 2 click IDs.
 * Congelada para prevenir mutação acidental.
 */
const UTM_PARAM_KEYS = Object.freeze([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const);

const CLICK_ID_KEYS = Object.freeze(['gclid', 'fbclid'] as const);

type UtmParamKey = (typeof UTM_PARAM_KEYS)[number];
type ClickIdKey = (typeof CLICK_ID_KEYS)[number];

/**
 * Sanitiza um valor lido da URL:
 *   - Remove espaços nas bordas.
 *   - Corta em MAX_UTM_VALUE_LENGTH.
 *   - Descarta strings vazias.
 *   - Remove caracteres de controle e tags básicas (defesa contra
 *     `?utm_source=<script>`). Não usamos DOMPurify aqui para manter
 *     o bundle enxuto — os valores nunca são inseridos como HTML,
 *     apenas persistidos como texto e enviados ao backend, que também
 *     trata como texto.
 */
function sanitizeUtmValue(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Remove caracteres de controle e '<' / '>' para prevenir injeção
  // caso algum consumidor renderize o valor sem escapar (defesa em profundidade).
  // eslint-disable-next-line no-control-regex
  const cleaned = trimmed.replace(/[\u0000-\u001F<>]/g, '');
  if (!cleaned) return null;

  return cleaned.slice(0, MAX_UTM_VALUE_LENGTH);
}

/**
 * Lê o document.referrer de forma defensiva.
 */
function readReferrer(): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const ref = document.referrer;
    if (!ref) return null;
    return sanitizeUtmValue(ref);
  } catch {
    return null;
  }
}

/**
 * Lê a URL atual da janela de forma defensiva.
 */
function getCurrentSearchParams(): URLSearchParams | null {
  try {
    if (typeof window === 'undefined' || !window.location) return null;
    return new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
}

/**
 * Verifica se um objeto de atribuição está DENTRO da janela de 90 dias.
 * Registros expirados são descartados na leitura, permitindo que uma
 * nova visita com UTM inicie uma nova atribuição.
 */
function isWithinAttributionWindow(capturedAt: string | null | undefined): boolean {
  if (!capturedAt) return false;

  try {
    const capturedTime = new Date(capturedAt).getTime();
    if (Number.isNaN(capturedTime)) return false;

    const now = Date.now();
    const windowMs = ATTRIBUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return now - capturedTime <= windowMs;
  } catch {
    return false;
  }
}

/**
 * Lê os dados UTM já persistidos (se houver e estiverem dentro da janela).
 * Prioriza localStorage; se ausente, tenta sessionStorage; se ambos
 * falharem, retorna null.
 */
function readStoredAttribution(): UtmTrackingData | null {
  try {
    if (typeof window === 'undefined') return null;

    // localStorage tem prioridade (persiste entre sessões, 90 dias)
    let raw: string | null = null;
    try {
      raw = window.localStorage?.getItem(STORAGE_KEY) ?? null;
    } catch {
      raw = null;
    }

    if (!raw) {
      try {
        raw = window.sessionStorage?.getItem(STORAGE_KEY) ?? null;
      } catch {
        raw = null;
      }
    }

    if (!raw) return null;

    const parsed = JSON.parse(raw) as UtmTrackingData;
    if (!parsed || typeof parsed !== 'object') return null;

    // Expira registros fora da janela de 90 dias
    if (!isWithinAttributionWindow(parsed.utm_captured_at)) {
      return null;
    }

    return parsed;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[utm-tracker] Falha ao ler atribuição armazenada:', err);
    return null;
  }
}

/**
 * Persiste os dados UTM em localStorage E sessionStorage (dupla camada).
 * Nunca lança exceção.
 */
function persistAttribution(data: UtmTrackingData): void {
  try {
    if (typeof window === 'undefined') return;
    const payload = JSON.stringify(data);

    try {
      window.localStorage?.setItem(STORAGE_KEY, payload);
    } catch {
      // localStorage pode estar bloqueado (modo privado, cookies desabilitados)
    }

    try {
      window.sessionStorage?.setItem(STORAGE_KEY, payload);
    } catch {
      // sessionStorage também pode estar bloqueado
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[utm-tracker] Falha ao persistir atribuição:', err);
  }
}

/**
 * Extrai os UTMs e click IDs presentes na URL atual.
 * Retorna null se nenhum parâmetro relevante foi encontrado.
 */
function extractFromCurrentUrl(): UtmTrackingData | null {
  const params = getCurrentSearchParams();
  if (!params) return null;

  const data: UtmTrackingData = {};
  let hasAny = false;

  for (const key of UTM_PARAM_KEYS) {
    const value = sanitizeUtmValue(params.get(key));
    if (value) {
      data[key as UtmParamKey] = value;
      hasAny = true;
    }
  }

  for (const key of CLICK_ID_KEYS) {
    const value = sanitizeUtmValue(params.get(key));
    if (value) {
      data[key as ClickIdKey] = value;
      hasAny = true;
    }
  }

  if (!hasAny) return null;

  data.utm_captured_at = new Date().toISOString();
  data.utm_referrer = readReferrer();

  return data;
}

/**
 * Ponto de entrada principal — deve ser chamado UMA VEZ no mount da
 * aplicação (App.tsx). Executa a lógica de captura first-touch:
 *
 *   1) Se já existe atribuição válida no storage (< 90 dias), NÃO
 *      sobrescreve — respeita first-touch.
 *   2) Se não existe, tenta extrair da URL atual e persiste.
 *   3) Se a URL não tem UTM, não faz nada (registro fica NULL no cadastro).
 *
 * Nunca falha o app. Nunca lança exceção.
 */
export function initializeUtmTracking(): void {
  try {
    if (typeof window === 'undefined') return;

    const existing = readStoredAttribution();
    if (existing) {
      // First-touch: já temos atribuição válida, respeitar
      // eslint-disable-next-line no-console
      console.log(
        '[utm-tracker] Atribuição first-touch já registrada:',
        existing.utm_source ?? '(sem source)',
        '|',
        existing.utm_campaign ?? '(sem campaign)'
      );
      return;
    }

    const fromUrl = extractFromCurrentUrl();
    if (fromUrl) {
      persistAttribution(fromUrl);
      // eslint-disable-next-line no-console
      console.log(
        '[utm-tracker] Nova atribuição capturada (first-touch, janela 90d):',
        fromUrl.utm_source ?? '(sem source)',
        '|',
        fromUrl.utm_campaign ?? '(sem campaign)'
      );
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[utm-tracker] Falha na inicialização:', err);
  }
}

/**
 * Retorna os dados UTM atualmente armazenados (para envio ao backend).
 * Sempre retorna um objeto completo — campos ausentes viram `null`,
 * garantindo shape estável para o payload da Edge Function.
 *
 * Nunca lança exceção. Se nada foi capturado, retorna todos `null`.
 */
export function getStoredUtm(): UtmPayload {
  const stored = readStoredAttribution();

  return {
    utm_source: stored?.utm_source ?? null,
    utm_medium: stored?.utm_medium ?? null,
    utm_campaign: stored?.utm_campaign ?? null,
    utm_term: stored?.utm_term ?? null,
    utm_content: stored?.utm_content ?? null,
    gclid: stored?.gclid ?? null,
    fbclid: stored?.fbclid ?? null,
    utm_captured_at: stored?.utm_captured_at ?? null,
    utm_referrer: stored?.utm_referrer ?? null,
  };
}

/**
 * Utilitário de debug — retorna se existe atribuição ativa (dentro da
 * janela de 90 dias). Útil para logs internos e testes.
 * Não expõe os dados em si, apenas o estado boolean.
 */
export function hasActiveAttribution(): boolean {
  return readStoredAttribution() !== null;
}