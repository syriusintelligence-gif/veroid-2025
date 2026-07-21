/**
 * Versões dos documentos de consentimento aceitos no cadastro.
 * ------------------------------------------------------------
 * Formato: "YYYY-MM-DD-vMAJOR.MINOR.PATCH"
 *
 * REGRA de bump:
 * - Bumpar a versão SOMENTE quando o texto de /terms ou /privacy mudar.
 * - Aceites feitos antes do bump permanecem com a versão antiga
 *   (auditável via SELECT terms_version, privacy_version FROM users).
 *
 * OBSERVAÇÃO:
 * - Termos e Política sempre são bumpados juntos (mesma versão),
 *   conforme decisão do produto em 2026-07-20.
 * - A data no identificador é a data em que a versão entra em vigor
 *   (data de publicação em produção).
 *
 * @author Alex (Engineer)
 * @version 1.0.0
 * @created 2026-07-20
 */

/**
 * Versão atual dos Termos de Uso.
 * Bumpar quando o texto de /terms mudar.
 */
export const TERMS_VERSION = '2026-07-20-v1.0.2';

/**
 * Versão atual da Política de Privacidade.
 * Bumpar quando o texto de /privacy mudar.
 * Por padrão, mantém a mesma versão de TERMS_VERSION.
 */
export const PRIVACY_VERSION = '2026-07-20-v1.0.2';