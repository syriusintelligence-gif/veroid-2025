import React, { Component, ErrorInfo, ReactNode } from 'react';
import { captureError } from '@/lib/sentry';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Componente que captura erros do React e exibe UI de fallback
 * 
 * Funcionalidades:
 * - Captura erros em qualquer componente filho
 * - Envia erros para o Sentry automaticamente
 * - Exibe UI amigável para o usuário
 * - Permite reload da página ou voltar para home
 * 
 * Uso:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Atualiza o estado para exibir a UI de fallback
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log do erro no console para desenvolvimento
    console.error('[ErrorBoundary] Erro capturado:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Atualiza o estado com informações do erro
    this.setState({
      error,
      errorInfo,
    });

    // Envia erro para o Sentry
    captureError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Se um fallback customizado foi fornecido, usa ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI de fallback padrão
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full glass-card glass-noise">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl md:text-3xl text-white">
                Ops! Algo deu errado
              </CardTitle>
              <CardDescription className="text-base md:text-lg text-gray-300 mt-2">
                Encontramos um erro inesperado. Nossa equipe já foi notificada e estamos trabalhando para resolver.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Detalhes do erro (apenas em desenvolvimento) */}
              {import.meta.env.MODE === 'development' && this.state.error && (
                <div className="bg-red-950/30 border border-red-500/30 rounded-lg p-4 text-sm">
                  <p className="text-red-400 font-semibold mb-2">Detalhes do erro (apenas em dev):</p>
                  <p className="text-red-300 font-mono text-xs break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-red-400 cursor-pointer hover:text-red-300">
                        Component Stack
                      </summary>
                      <pre className="text-red-300 text-xs mt-2 overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={this.handleReload}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Recarregar Página
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1 border-white/20 text-cyan-400 hover:bg-white/10"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Voltar para Home
                </Button>
              </div>

              {/* Informações adicionais */}
              <div className="text-center text-sm text-gray-400 pt-4 border-t border-white/10">
                <p>Se o problema persistir, entre em contato com o suporte:</p>
                <a
                  href="mailto:support@veroid.com"
                  className="text-cyan-400 hover:text-cyan-300 hover:underline"
                >
                  support@veroid.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Se não houver erro, renderiza os filhos normalmente
    return this.props.children;
  }
}