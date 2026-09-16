import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from './i18n';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <I18nProvider>
      <App />
    </I18nProvider>
  </BrowserRouter>
);
