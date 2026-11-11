import { useEffect, useRef } from 'react';
import { gsap, EASE, lockScroll, scrollToId } from '../lib/motion';
import { FREE_SHIPPING, money, productById } from '../data/catalog';
import { useShop } from '../store/shop';
import { Img, shotProps } from '../components/Img';
import { Roll } from '../components/Roll';
import './CartDrawer.css';

export function CartDrawer() {
  const { cartOpen, setCartOpen, lines, count, subtotal, setQty, remove, setCheckoutOpen, openProduct, dismissToast } = useShop();
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = root.current!;
    const panel = el.querySelector('.bag__panel');
    const shade = el.querySelector('.bag__shade');
    if (first.current) {
      first.current = false;
      gsap.set(el, { visibility: 'hidden' });
      gsap.set(panel, { xPercent: 100 });
      gsap.set(shade, { opacity: 0 });
      return;
    }
    if (cartOpen) {
      lockScroll('bag', true);
      dismissToast();
      gsap.timeline()
        .set(el, { visibility: 'visible' })
        .to(shade, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0)
        .to(panel, { xPercent: 0, duration: 1, ease: EASE.out }, 0)
        .fromTo(el.querySelectorAll('.bag__line, .bag__in'), { opacity: 0, x: 30 }, { opacity: 1, x: 0, stagger: 0.05, duration: 0.9 }, 0.2);
      el.querySelector<HTMLElement>('.bag__close')?.focus({ preventScroll: true });
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCartOpen(false);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    lockScroll('bag', false);
    gsap.timeline()
      .to(panel, { xPercent: 100, duration: 0.8, ease: EASE.shutter }, 0)
      .to(shade, { opacity: 0, duration: 0.6 }, 0.1)
      .set(el, { visibility: 'hidden' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartOpen]);

  const remaining = Math.max(0, FREE_SHIPPING - subtotal);

  return (
    <div ref={root} className="bag" aria-hidden={!cartOpen}>
      <div className="bag__shade" onClick={() => setCartOpen(false)} data-cursor="Close" />
      <aside className="bag__panel" role="dialog" aria-modal="true" aria-labelledby="bag-title" data-lenis-prevent>
        <header className="bag__head">
          <h2 id="bag-title" className="bag__title t-serif">
            Tu carrito <sup className="t-meta">({count})</sup>
          </h2>
          <button className="bag__close t-label" onClick={() => setCartOpen(false)}>
            Close ×
          </button>
        </header>

        {lines.length > 0 && (
          <div className="bag__ship bag__in">
            <p className="t-meta">
              {remaining > 0 ? (
                <>
                  <span>{money(remaining)}</span> para el envío gratis
                </>
              ) : (
                'Envío gratis desbloqueado'
              )}
            </p>
            <span className="bag__ship-bar">
              <span style={{ transform: `scaleX(${Math.min(1, subtotal / FREE_SHIPPING)})` }} />
            </span>
          </div>
        )}

        {lines.length === 0 ? (
          <div className="bag__empty bag__in">
            <div className="bag__empty-img">
              <Img name="gorra-rojo-la-1" sizes="300px" alt="" />
            </div>
            <p className="bag__empty-title t-serif">Todavía no hay nada.</p>
            <p className="t-meta">Nueve gorras te están esperando.</p>
            <button
              className="btn"
              onClick={() => {
                setCartOpen(false);
                window.setTimeout(() => scrollToId('shop'), 500);
              }}
            >
              <Roll>Ver las gorras</Roll>
              <span>→</span>
            </button>
          </div>
        ) : (
          <ul className="bag__lines">
            {lines.map((l) => {
              const p = productById(l.productId)!;
              const c = p.colours.find((c) => c.id === l.colourId) ?? p.colours[0];
              return (
                <li key={l.key} className="bag__line">
                  <button
                    className="bag__img"
                    onClick={() => {
                      setCartOpen(false);
                      openProduct(p.id);
                    }}
                    aria-label={`View ${p.name}`}
                  >
                    <Img {...shotProps(c.shots[0])} sizes="120px" />
                  </button>
                  <div className="bag__line-body">
                    <div className="bag__line-top">
                      <p className="bag__name t-serif">{p.name}</p>
                      <p className="t-meta">{money(p.price * l.qty)}</p>
                    </div>
                    <p className="t-meta bag__variant">
                      {c.label} — {l.size}
                    </p>
                    <div className="bag__line-bottom">
                      <div className="bag__qty" role="group" aria-label={`Cantidad de ${p.name}`}>
                        <button onClick={() => setQty(l.key, l.qty - 1)} aria-label="Restar una unidad">
                          −
                        </button>
                        <span className="t-meta" aria-live="polite">
                          {l.qty}
                        </span>
                        <button onClick={() => setQty(l.key, l.qty + 1)} aria-label="Sumar una unidad" disabled={l.qty >= 9}>
                          +
                        </button>
                      </div>
                      <button className="t-meta u-link bag__remove" onClick={() => remove(l.key)}>
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {lines.length > 0 && (
          <footer className="bag__foot bag__in">
            <div className="bag__row">
              <span className="t-label">Subtotal</span>
              <span className="bag__total">{money(subtotal)}</span>
            </div>
            <p className="t-meta bag__note">Impuestos incluidos. El envío se calcula al pagar.</p>
            <button
              className="btn bag__checkout"
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
            >
              <Roll>Finalizar compra</Roll>
              <span>{money(subtotal)}</span>
            </button>
            <button className="t-label u-link bag__continue" onClick={() => setCartOpen(false)}>
              Seguir comprando
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}
