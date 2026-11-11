import { useEffect, useRef } from 'react';
import { useShop } from '../store/shop';
import { gsap, EASE, lockScroll, scrollToId } from '../lib/motion';
import { goShop } from '../lib/nav';
import { FILTERS, matchesFilter, products, type Filter } from '../data/catalog';
import './Menu.css';

/** Mobile menu: shop first, categories one tap away, bag always in reach. */
export function Menu() {
  const { menuOpen, setMenuOpen, setFilter, count, setCartOpen } = useShop();
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = root.current!;
    if (first.current) {
      first.current = false;
      gsap.set(el, { clipPath: 'inset(0% 0% 100% 0%)', visibility: 'hidden' });
      return;
    }
    lockScroll('menu', menuOpen);
    if (menuOpen) {
      gsap.timeline()
        .set(el, { visibility: 'visible' })
        .to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: EASE.shutter })
        .fromTo(el.querySelectorAll('.menu__in'), { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.04, duration: 0.8 }, 0.25);
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    gsap.timeline()
      .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.6, ease: EASE.shutter })
      .set(el, { visibility: 'hidden' });
  }, [menuOpen, setMenuOpen]);

  const go = (f: Filter) => {
    setMenuOpen(false);
    window.setTimeout(() => goShop(setFilter, f), 250);
  };
  const to = (id: string) => {
    setMenuOpen(false);
    window.setTimeout(() => scrollToId(id), 250);
  };

  return (
    <div id="site-menu" ref={root} className="menu" role="dialog" aria-modal="true" aria-label="Menú" aria-hidden={!menuOpen} data-lenis-prevent>
      <ul className="menu__big">
        {[
          ['Toda la tienda', () => go('all')],
          ['Novedades', () => go('new')],
          ['Contacto', () => to('contacto')],
        ].map(([label, fn], i) => (
          <li key={label as string} className="menu__row">
            <button className="menu__in menu__link t-display" onClick={fn as () => void} tabIndex={menuOpen ? 0 : -1}>
              <span className="t-meta">0{i + 1}</span>
              {label as string}
            </button>
          </li>
        ))}
      </ul>

      <div className="menu__cats menu__in">
        <p className="t-meta">Categorías</p>
        <div className="menu__chips">
          {FILTERS.filter((f) => f.id !== 'all' && f.id !== 'new').map((f) => (
            <button key={f.id} className="chip" onClick={() => go(f.id)} tabIndex={menuOpen ? 0 : -1}>
              {f.label} <sup>{products.filter((p) => matchesFilter(p, f.id)).length}</sup>
            </button>
          ))}
        </div>
      </div>

      <div className="menu__foot menu__in">
        <button
          className="btn"
          onClick={() => {
            setMenuOpen(false);
            setCartOpen(true);
          }}
          tabIndex={menuOpen ? 0 : -1}
        >
          <span>Carrito ({count})</span>
          <span>→</span>
        </button>
        <p className="t-meta">@ashe.gorras · hola@ashe.com.ar</p>
      </div>
    </div>
  );
}
