import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from './lib/sentry';
import { ErrorBoundary } from './components/ErrorBoundary';
import { addCSPMetaTag } from './lib/csp';

// Inicializa o sistema de Feature Flags
import '@/lib/services/feature-flags';

// Inicializa o Sentry antes de renderizar a aplicação
initSentry();

// Adiciona CSP meta tag para permitir vídeos do Supabase
addCSPMetaTag();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);