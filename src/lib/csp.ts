/**
 * Content Security Policy (CSP) — Módulo neutralizado
 *
 * A CSP em produção é gerenciada EXCLUSIVAMENTE via header HTTP no
 * `vercel.json`. Este arquivo NÃO deve mais injetar nenhuma meta tag CSP
 * no <head> em runtime, pois isso conflita com o header e sobrescreve
 * regras (bloqueando GTM, GA4, Meta Pixel, Google Ads e Tag Assistant).
 *
 * Fonte única de verdade: `vercel.json` → `headers[*].headers[Content-Security-Policy]`.
 *
 * Os exports abaixo são mantidos como no-ops apenas para preservar
 * compatibilidade com qualquer import legado. Nada aqui altera o DOM.
 */

/**
 * @deprecated CSP é gerenciada via header HTTP em `vercel.json`.
 * Este objeto NÃO reflete a CSP real de produção. Não usar.
 */
export const CSP_DIRECTIVES: Record<string, string[]> = {};

/**
 * @deprecated Headers de segurança são definidos em `vercel.json`.
 */
export const SECURITY_HEADERS: Record<string, string> = {};

/**
 * @deprecated A CSP real vem do header HTTP; esta função retorna string vazia.
 */
export function buildCSPHeader(): string {
  return '';
}

/**
 * @deprecated NÃO faz mais nada. Anteriormente injetava uma meta tag CSP
 * no <head>, o que conflitava com o header HTTP definido em `vercel.json`
 * e bloqueava ferramentas de tracking (GTM, GA4, Meta Pixel, Google Ads).
 *
 * A meta CSP em runtime foi removida em favor da CSP centralizada no header.
 */
export function addCSPMetaTag(): void {
  // Intencionalmente vazio. NÃO reintroduzir injeção de meta CSP.
  // A CSP é servida via header HTTP em `vercel.json`.
}

/**
 * @deprecated Validação de URL contra CSP não é feita no cliente. A CSP
 * real é aplicada pelo navegador com base no header HTTP.
 */
export function isURLAllowed(_url: string, _directive: string): boolean {
  return true;
}

/**
 * @deprecated Reporting de violações CSP foi desabilitado (causava loop
 * infinito). Se necessário, use `report-uri` / `report-to` na CSP do
 * `vercel.json`.
 */
export function setupCSPReporting(): void {
  // Intencionalmente vazio.
}