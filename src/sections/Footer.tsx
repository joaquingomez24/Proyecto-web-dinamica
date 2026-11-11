import './Footer.css';
import { useState, type FormEvent } from 'react';
import { useShop } from '../store/shop';
import { goShop } from '../lib/nav';
import { scrollToId } from '../lib/motion';

export function Footer() {
  const { setFilter } = useShop();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'error' | 'sending' | 'done'>('idle');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState('error');
    setState('sending');
    window.setTimeout(() => setState('done'), 900);
  };
  return (
    <footer id="contacto" className="foot">
      <div className="foot__grid">
        <form onSubmit={submit} noValidate>
          <label htmlFor="foot-email" className="t-label">Recibí las novedades</label>
          <p className="t-meta" style={{ marginTop: 8 }}>10% de descuento en tu primera compra.</p>
          {state === 'done' ? (
            <p className="t-label" role="status" style={{ marginTop: 16 }}>Listo, revisá tu correo.</p>
          ) : (
            <div className="foot__field">
              <input id="foot-email" type="email" placeholder="Tu correo" value={email} onChange={(e) => setEmail(e.target.value)} />
              <button type="submit" className="btn" disabled={state === 'sending'}><span>{state === 'sending' ? 'Enviando' : 'Suscribirme'}</span></button>
            </div>
          )}
          {state === 'error' && <p className="t-meta foot__err">Ingresá un correo válido.</p>}
        </form>
        <nav className="foot__cols t-meta" aria-label="Pie de página">
          <div className="foot__col">
            <p className="foot__col-head">Tienda</p>
            <button className="u-link" onClick={() => goShop(setFilter, 'all')}>Todas las gorras</button>
            <button className="u-link" onClick={() => goShop(setFilter, 'new')}>Novedades</button>
            <button className="u-link" onClick={() => goShop(setFilter, 'sale')}>Ofertas</button>
          </div>
          <div className="foot__col">
            <p className="foot__col-head">Ayuda</p>
            <span>Envíos a todo el país</span>
            <span>Cambios dentro de 30 días</span>
            <span>WhatsApp · +54 299 000 0000</span>
          </div>
        </nav>
      </div>
      <div className="foot__legal t-meta">
        <p>© 2026 ASHE · Neuquén, Argentina</p>
        <p>Imágenes: ilustraciones de muestra</p>
        <button className="u-link" onClick={() => scrollToId('top')}>Volver arriba ↑</button>
      </div>
    </footer>
  );
}
