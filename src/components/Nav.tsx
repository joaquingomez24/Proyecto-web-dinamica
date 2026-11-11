import { useEffect, useRef, useState } from 'react';
import { useShop } from '../store/shop';
import { ScrollTrigger, scrollToId, scrollToTop } from '../lib/motion';
import { goShop } from '../lib/nav';
import { BagIcon, SearchIcon } from './Icons';
import './Nav.css';


export function Nav() {
  const { count, setCartOpen, menuOpen, setMenuOpen, setFilter, setSearchOpen, closeProduct } = useShop();
  const [scrolled, setScrolled] = useState(false);
  const scrolledRef = useRef(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const s = self.scroll() > 40;
        if (s !== scrolledRef.current) {
          scrolledRef.current = s;
          setScrolled(s);
        }
        if (bar.current) bar.current.style.transform = `scaleX(${self.progress})`;
      },
    });
    return () => st.kill();
  }, []);

  const link = (label: string, onClick: () => void) => (
    <a
      href="#shop"
      className="nav__link u-link"
      onClick={(e) => {
        e.preventDefault();
        setMenuOpen(false);
        onClick();
      }}
    >
      {label}
    </a>
  );

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' is-menu' : ''}`}>
      <div className="nav__bar">
        <div className="nav__left">
          <button className="nav__burger" aria-expanded={menuOpen} aria-controls="site-menu" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setMenuOpen(!menuOpen)}>
            <i />
            <i />
          </button>
          <a
            href="#top"
            className="nav__mark t-display"
            aria-label="ASHE — inicio"
            onClick={(e) => {
              e.preventDefault();
              // Al inicio desde cualquier lado: cierra producto, carrito y buscador (pausan el scroll)
              setMenuOpen(false);
              setCartOpen(false);
              setSearchOpen(false);
              closeProduct();
              requestAnimationFrame(scrollToTop);
            }}
          >
            ASHE
          </a>
          <nav className="nav__links t-label" aria-label="Principal">
            {link('Tienda', () => goShop(setFilter, 'all'))}
            {link('Novedades', () => goShop(setFilter, 'new'))}
            {link('Contacto', () => scrollToId('contacto'))}
          </nav>
        </div>

        <div className="nav__right t-label">
          <button className="nav__shop-m" onClick={() => goShop(setFilter, 'all')}>
            Tienda
          </button>
          <button className="nav__icon-btn" onClick={() => setSearchOpen(true)} aria-label="Buscar productos">
            <SearchIcon />
            <span className="nav__icon-label">Buscar</span>
          </button>
          <button className="nav__icon-btn nav__bag" onClick={() => setCartOpen(true)} aria-label={`Abrir carrito, ${count} productos`}>
            <span className="nav__bag-icon">
              <BagIcon />
              <span className="nav__count" aria-hidden="true">
                <span key={count}>{count}</span>
              </span>
            </span>
            <span className="nav__icon-label">Carrito</span>
          </button>
        </div>
        <div className="nav__progress" ref={bar} />
      </div>
    </header>
  );
}
