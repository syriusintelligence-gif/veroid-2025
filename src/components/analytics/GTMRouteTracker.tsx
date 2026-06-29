/**
 * GTMRouteTracker
 * ----------------
 * Componente "headless" (não renderiza nada) que escuta mudanças de rota
 * do React Router e publica um evento `spa_pageview` no dataLayer do
 * Google Tag Manager a cada navegação.
 *
 * Por quê?
 *   O GTM, em uma SPA, só dispara `pageview` no primeiro load. Para que
 *   a agência de tráfego consiga configurar conversões e funis por rota
 *   (ex.: "chegou em /cadastro"), precisamos avisar manualmente o GTM
 *   sempre que a URL muda.
 *
 * Segurança / não-quebra:
 *   - 100% defensivo: se `window.dataLayer` não existir (ex.: o snippet
 *     do GTM foi bloqueado por ad-blocker, CSP, ou está rodando em dev
 *     sem o snippet ativo), o push simplesmente não acontece e o app
 *     continua normal.
 *   - Não faz nenhuma chamada de rede própria — apenas escreve em um
 *     array global que o próprio GTM consome.
 *   - Não interfere em nenhum fluxo existente (auth, Supabase, Stripe,
 *     CSRF, session timeout, etc.).
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// dataLayer é criado pelo snippet do GTM em index.html.
// Aqui apenas garantimos a tipagem para evitar `any`.
declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export default function GTMRouteTracker(): null {
  const location = useLocation();

  useEffect(() => {
    // Garante a existência defensiva — caso o snippet GTM falhe ou
    // ainda não tenha rodado, criamos um array vazio em vez de quebrar.
    if (typeof window === 'undefined') return;
    if (!Array.isArray(window.dataLayer)) {
      window.dataLayer = [];
    }

    try {
      window.dataLayer.push({
        event: 'spa_pageview',
        page_path:
          location.pathname + location.search + (location.hash || ''),
        page_location:
          typeof window.location !== 'undefined'
            ? window.location.href
            : undefined,
        page_title:
          typeof document !== 'undefined' ? document.title : undefined,
      });
    } catch (err) {
      // Nunca propaga erro — analytics nunca pode quebrar a UI.
      // eslint-disable-next-line no-console
      console.warn('[GTMRouteTracker] Falha ao publicar spa_pageview:', err);
    }
  }, [location.pathname, location.search, location.hash]);

  return null;
}