import * as Sentry from "@sentry/react";

/**
 * Inicializa o Sentry para monitoramento de erros em produção
 * 
 * Funcionalidades:
 * - Captura erros JavaScript não tratados
 * - Rastreia performance de navegação
 * - Monitora requisições HTTP
 * - Captura informações de contexto do usuário
 * 
 * Configuração:
 * - DSN deve ser configurado via variável de ambiente VITE_SENTRY_DSN
 * - Apenas ativo em produção (NODE_ENV === 'production')
 * - Sample rate de 100% para erros, 10% para performance
 */
export function initSentry() {
  // Só inicializa em produção e se o DSN estiver configurado
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;
  
  if (!dsn) {
    console.warn('[Sentry] DSN não configurado. Monitoramento de erros desabilitado.');
    return;
  }

  // Não inicializa em desenvolvimento para não poluir o Sentry
  if (environment === 'development') {
    console.info('[Sentry] Desabilitado em ambiente de desenvolvimento.');
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment,
      
      // Integrations
      integrations: [
        // Captura erros de navegação e renderização
        Sentry.browserTracingIntegration(),
        
        // Captura erros de replay de sessão (útil para debug)
        Sentry.replayIntegration({
          maskAllText: true, // Mascara textos sensíveis
          blockAllMedia: true, // Bloqueia mídia para privacidade
        }),
        
        // Captura erros do React
        Sentry.reactRouterV6BrowserTracingIntegration({
          useEffect: React.useEffect,
        }),
      ],

      // Performance Monitoring
      tracesSampleRate: 0.1, // 10% das transações para performance
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% das sessões normais
      replaysOnErrorSampleRate: 1.0, // 100% das sessões com erro
      
      // Configurações de privacidade
      beforeSend(event, hint) {
        // Remove informações sensíveis antes de enviar
        if (event.request) {
          // Remove tokens de autenticação dos headers
          if (event.request.headers) {
            delete event.request.headers['Authorization'];
            delete event.request.headers['Cookie'];
          }
          
          // Remove query params sensíveis
          if (event.request.url) {
            const url = new URL(event.request.url);
            url.searchParams.delete('token');
            url.searchParams.delete('password');
            url.searchParams.delete('apiKey');
            event.request.url = url.toString();
          }
        }
        
        // Remove dados sensíveis do contexto
        if (event.contexts?.user) {
          delete event.contexts.user.email;
          delete event.contexts.user.ip_address;
        }
        
        return event;
      },
      
      // Ignora erros conhecidos e não críticos
      ignoreErrors: [
        // Erros de rede que não podemos controlar
        'Network request failed',
        'NetworkError',
        'Failed to fetch',
        
        // Erros de extensões do browser
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        
        // Erros de third-party scripts
        'Script error',
        
        // Erros de cancelamento (usuário navegou antes da requisição terminar)
        'AbortError',
        'The user aborted a request',
      ],
      
      // Configurações de debug
      debug: false, // Desabilita logs em produção
      
      // Release tracking
      release: `veroid@${import.meta.env.VITE_APP_VERSION || '1.0.0'}`,
    });

    console.info('[Sentry] Inicializado com sucesso');
  } catch (error) {
    console.error('[Sentry] Erro ao inicializar:', error);
  }
}

/**
 * Captura um erro manualmente e envia para o Sentry
 * 
 * @param error - Erro a ser capturado
 * @param context - Contexto adicional (opcional)
 */
export function captureError(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('custom', context);
  }
  Sentry.captureException(error);
}

/**
 * Captura uma mensagem de log e envia para o Sentry
 * 
 * @param message - Mensagem a ser capturada
 * @param level - Nível de severidade (error, warning, info, debug)
 */
export function captureMessage(
  message: string, 
  level: 'error' | 'warning' | 'info' | 'debug' = 'info'
) {
  Sentry.captureMessage(message, level);
}

/**
 * Define informações do usuário para contexto de erros
 * 
 * @param user - Informações do usuário (sem dados sensíveis)
 */
export function setUserContext(user: { id: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    username: user.username,
  });
}

/**
 * Limpa informações do usuário (útil no logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Adiciona breadcrumb (rastro de navegação) para contexto de erros
 * 
 * @param message - Mensagem do breadcrumb
 * @param category - Categoria (navigation, http, user, etc)
 * @param level - Nível de severidade
 */
export function addBreadcrumb(
  message: string,
  category: string = 'custom',
  level: 'error' | 'warning' | 'info' | 'debug' = 'info'
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    timestamp: Date.now() / 1000,
  });
}

// Re-exporta o Sentry para uso avançado se necessário
export { Sentry };

// Import React para o integration
import React from 'react';