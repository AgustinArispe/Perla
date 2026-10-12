import './development-crypto';
import './validation-config';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/cinzel/latin-600.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './styles/tokens.css';
import './styles/pulse.css';
import './styles/perla.css';
import './styles/operational.css';
import './styles/typography.css';
import './styles/home.css';
import './styles/results.css';
import './styles/merchandise.css';
import './styles/commerce.css';
import './styles/admin.css';

const client = new QueryClient();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
