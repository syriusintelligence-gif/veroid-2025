import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSentry } from './lib/sentry';
import { ErrorBoundary } from './components/ErrorBoundary';
import { setupCSPReporting } from './lib/csp';

// Inicializa o Sentry antes de renderizar a aplicação
initSentry();

// Configura reporting de violações CSP em desenvolvimento
setupCSPReporting();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);