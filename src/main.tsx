import { CssBaseline, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { initAnalytics } from './lib/analytics.ts';
import { theme } from './theme.ts';

// A crash inside Leaflet's own imperative code (tile loading, pan/zoom
// handlers, the custom KeyholeTileLayer) — as opposed to a React
// render error, which MapErrorBoundary catches instead — never reaches a
// React error boundary. Logging it here at least makes it visible instead
// of leaving the map silently frozen with no clue why.
window.addEventListener('error', (event) => {
  // eslint-disable-next-line no-console
  console.error('[window.onerror]', event.error ?? event.message, event);
});
window.addEventListener('unhandledrejection', (event) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledrejection]', event.reason, event);
});

initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
