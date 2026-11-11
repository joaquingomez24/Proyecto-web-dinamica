import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/base.css';
import './styles/minimal.css';
import App from './App.tsx';
import { loadProductsFromApi } from './data/catalog.ts';

// Primero los productos de MySQL (si la API no responde, quedan los de catalog.ts), después la tienda
loadProductsFromApi().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
