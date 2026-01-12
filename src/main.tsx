import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from './lib/sentry';
import { ErrorBoundary } from './components/ErrorBoundary';
// import { setupCSPReporting } from './lib/csp'; // Desabilitado temporariamente para resolver loop infinito de violações CSP

// Inicializa o sistema de Feature Flags
import '@/lib/services/feature-flags';

// Inicializa o Sentry antes de renderizar a aplicação
initSentry();

// Configura reporting de violações CSP em desenvolvimento
// setupCSPReporting(); // Desabilitado temporariamente para resolver loop infinito de violações CSP

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);