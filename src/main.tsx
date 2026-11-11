import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { Home } from './pages/Home';
import { iniciarPwa } from './lib/pwa';
import './styles.css';

// El admin se carga aparte para que el sitio público no baje el código de login
const Admin = lazy(() => import('./pages/Admin').then((m) => ({ default: m.Admin })));

const esAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin';

const raiz = document.getElementById('root');
if (!raiz) throw new Error('Falta el elemento #root');

createRoot(raiz).render(
  <StrictMode>
    {esAdmin ? (
      <Suspense fallback={<p className="adm-aviso">Cargando…</p>}>
        <Admin />
      </Suspense>
    ) : (
      <Home />
    )}
  </StrictMode>,
);

iniciarPwa();
