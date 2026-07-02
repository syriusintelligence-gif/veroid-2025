/**
 * consent.ts
 * ----------
 * Gestão de consentimento de cookies em conformidade com a LGPD
 * (Lei 13.709/2018) e o Guia Orientativo de Cookies da ANPD.
 *
 * Integração com Google Consent Mode v2:
 *   - Antes do consentimento, todos os sinais estão como "denied"
 *     (definido em index.html, ANTES do GTM carregar).
 *   - Quando o usuário decide, chamamos gtag('consent', 'update', {...})
 *     para atualizar os sinais em runtime, sem recarregar a página.
 *
 * Design defensivo:
 *   - Nunca lança erro para o app: analytics/consent NUNCA pode quebrar UI.
 *   - Se localStorage falhar (modo privado, quota), degrada silenciosamente.
 *   - Se `window.gtag` não existir (GTM bloqueado por adblock/CSP),
 *     apenas persiste a preferência local sem quebrar.
 *
 * Este módulo NÃO interfere em nenhum fluxo existente (auth, Supabase,
 * Stripe, CSRF, session timeout, etc.). É 100% aditivo.
 */

/**
 * Categorias de consentimento (modelo Consent Mode v2).
 * - necessary: sempre true (cookies essenciais — sessão, auth, CSRF).
 * - analytics: GA4, GTM analytics_storage.
 * - marketing: Google Ads, Meta Pixel, ad_storage, ad_user_data, ad_personalization.
 * - functional: preferências não-essenciais (ex.: tema salvo).
 */
export interface ConsentPreferences {
  necessary: true; // sempre true — não é opcional por lei
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

export interface StoredConsent {
  version: number;
  timestamp: string; // ISO
  preferences: ConsentPreferences;
}

const STORAGE_KEY = 'vero_cookie_consent_v1';
const CONSENT_VERSION = 1;

/**
 * Tipagem defensiva para gtag global (injetada pelo GTM).
 */
type GtagFn = (
  command: 'consent',
  action: 'default' | 'update',
  params: Record<string, string>
) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * Retorna o consentimento salvo, ou null se ainda não decidido.
 * Nunca lança erro.
 */
export function getStoredConsent(): StoredConsent | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    // Garante formato mínimo válido
    if (!parsed.preferences || typeof parsed.preferences !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persiste o consentimento no localStorage.
 * Nunca lança erro.
 */
export function saveConsent(preferences: Omit<ConsentPreferences, 'necessary'>): StoredConsent {
  const payload: StoredConsent = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    preferences: {
      necessary: true,
      analytics: !!preferences.analytics,
      marketing: !!preferences.marketing,
      functional: !!preferences.functional,
    },
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }
  } catch {
    // ignore — modo privado ou storage quota; ainda propagamos para gtag
  }
  return payload;
}

/**
 * Aplica preferências no Google Consent Mode v2 via gtag / dataLayer.
 * Nunca lança erro. Se gtag/dataLayer não existir, apenas ignora.
 *
 * Referência oficial:
 *   https://developers.google.com/tag-platform/security/guides/consent
 */
export function applyConsentToGoogle(preferences: ConsentPreferences): void {
  try {
    if (typeof window === 'undefined') return;

    const analyticsGranted = preferences.analytics ? 'granted' : 'denied';
    const marketingGranted = preferences.marketing ? 'granted' : 'denied';
    const functionalGranted = preferences.functional ? 'granted' : 'denied';

    const consentUpdate: Record<string, string> = {
      // Consent Mode v2 signals
      ad_storage: marketingGranted,
      ad_user_data: marketingGranted,
      ad_personalization: marketingGranted,
      analytics_storage: analyticsGranted,
      functionality_storage: functionalGranted,
      personalization_storage: functionalGranted,
      // security_storage é sempre granted (essencial)
      security_storage: 'granted',
    };

    // Preferência: chamar gtag diretamente (mais correto para Consent Mode).
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', consentUpdate);
    } else {
      // Fallback: push manual no dataLayer com o formato oficial do gtag.
      // O GTM interpreta este push corretamente quando o snippet do gtag
      // não foi definido explicitamente.
      if (!Array.isArray(window.dataLayer)) {
        window.dataLayer = [];
      }
      // O formato correto para dataLayer.push é um array-like com 'consent'.
      // Como o GTM aceita objetos, publicamos um evento auxiliar que a
      // agência pode mapear como trigger de consent update.
      window.dataLayer.push({
        event: 'consent_update',
        consent: consentUpdate,
      });
    }

    // Evento auxiliar para a agência de tráfego configurar tags/triggers
    // com base na decisão do usuário (ex.: disparar remarketing só após aceite).
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }
    window.dataLayer.push({
      event: 'cookie_consent_decision',
      cookie_consent_analytics: preferences.analytics,
      cookie_consent_marketing: preferences.marketing,
      cookie_consent_functional: preferences.functional,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[consent] Falha ao aplicar consentimento no Google:', err);
  }
}

/**
 * Aceitar tudo (analytics + marketing + functional).
 */
export function acceptAll(): StoredConsent {
  const stored = saveConsent({ analytics: true, marketing: true, functional: true });
  applyConsentToGoogle(stored.preferences);
  return stored;
}

/**
 * Rejeitar tudo (mantém apenas cookies necessários).
 */
export function rejectAll(): StoredConsent {
  const stored = saveConsent({ analytics: false, marketing: false, functional: false });
  applyConsentToGoogle(stored.preferences);
  return stored;
}

/**
 * Salvar preferências customizadas.
 */
export function savePreferences(prefs: Omit<ConsentPreferences, 'necessary'>): StoredConsent {
  const stored = saveConsent(prefs);
  applyConsentToGoogle(stored.preferences);
  return stored;
}

/**
 * Retorna true se o usuário ainda não decidiu (precisamos mostrar o banner).
 */
export function needsConsentDecision(): boolean {
  return getStoredConsent() === null;
}

/**
 * Se já existe consentimento salvo, reaplica no Consent Mode.
 * Deve ser chamado no boot do app (após o snippet do GTM já ter rodado).
 */
export function reapplyStoredConsent(): void {
  const stored = getStoredConsent();
  if (stored) {
    applyConsentToGoogle(stored.preferences);
  }
}

/**
 * Limpa o consentimento salvo (usado quando o usuário quer refazer a escolha).
 */
export function clearStoredConsent(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}