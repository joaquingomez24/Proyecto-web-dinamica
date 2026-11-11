import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap, EASE, lockScroll, reducedMotion } from '../lib/motion';
import { looks, money, productById, products, type Product } from '../data/catalog';
import { useShop, type Origin } from '../store/shop';
import { Img, shotProps } from '../components/Img';
import { Roll } from '../components/Roll';
import { ProductCard, Price } from '../components/ProductCard';
import { src } from '../lib/img';
import './ProductView.css';

/** Keeps the view mounted long enough to play its exit. */
export function ProductView() {
  const { productId, origin, closeProduct } = useShop();
  const [shown, setShown] = useState<{ id: string; origin: Origin } | null>(null);
  const closing = useRef(false);

  useEffect(() => {
    if (productId) {
      closing.current = false;
      setShown({ id: productId, origin });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    lockScroll('product', !!shown);
  }, [shown]);

  if (!shown) return null;
  const product = productById(shown.id);
  if (!product) return null;

  return (
    <View
      key={shown.id}
      product={product}
      origin={shown.origin}
      leaving={!productId}
      onGone={() => setShown(null)}
      onClose={closeProduct}
    />
  );
}

function View({
  product,
  origin,
  leaving,
  onGone,
  onClose,
}: {
  product: Product;
  origin: Origin;
  leaving: boolean;
  onGone: () => void;
  onClose: () => void;
}) {
  const { add, setCartOpen } = useShop();
  const [qty, setQty] = useState(1);
  const root = useRef<HTMLDivElement>(null);
  const [colourIdx, setColourIdx] = useState(0);
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const [status, setStatus] = useState<'idle' | 'need-size' | 'adding' | 'added'>('idle');
  const [openPanel, setOpenPanel] = useState<string>('details');
  const [slide, setSlide] = useState(0);
  const colour = product.colours[colourIdx];

  // Enter: the clicked image flies into place while the page opens behind it.
  useLayoutEffect(() => {
    const el = root.current!;
    const target = el.querySelector<HTMLElement>('.pv__shot');
    el.scrollTop = 0;
    const tl = gsap.timeline();
    if (origin && target && !reducedMotion()) {
      const to = target.getBoundingClientRect();
      const r = origin.rect;
      const ghost = document.createElement('div');
      ghost.className = 'pv__ghost';
      ghost.style.backgroundImage = `url(${src(origin.src)})`;
      ghost.style.backgroundPosition = origin.pos ?? '50% 50%';
      document.body.appendChild(ghost);
      gsap.set(ghost, { top: r.top, left: r.left, width: r.width, height: r.height });
      gsap.set(target, { opacity: 0 });
      tl.fromTo(
        el,
        { clipPath: `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px)` },
        { clipPath: 'inset(0px 0px 0px 0px)', duration: 1.1, ease: EASE.shutter },
        0,
      )
        .to(ghost, { top: to.top, left: to.left, width: to.width, height: to.height, duration: 1.1, ease: EASE.shutter }, 0)
        .set(target, { opacity: 1 })
        .to(ghost, { opacity: 0, duration: 0.3, onComplete: () => ghost.remove() });
    } else {
      tl.fromTo(el, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: EASE.shutter });
    }
    tl.fromTo(el.querySelectorAll('.pv__in'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, stagger: 0.05 }, 0.45);
    return () => {
      tl.kill();
      document.querySelectorAll('.pv__ghost').forEach((g) => g.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exit
  useEffect(() => {
    if (!leaving) return;
    const el = root.current!;
    gsap.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: EASE.shutter, onComplete: onGone });
  }, [leaving, onGone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    root.current?.querySelector<HTMLElement>('.pv__close')?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const addToBag = () => {
    if (!size) {
      setStatus('need-size');
      return;
    }
    setStatus('adding');
    window.setTimeout(() => {
      const from = root.current?.querySelector('.pv__shot')?.getBoundingClientRect();
      add({ productId: product.id, colourId: colour.id, size }, { from, qty });
      setStatus('added');
      window.setTimeout(() => setStatus((s) => (s === 'added' ? 'idle' : s)), 2600);
    }, 650);
  };

  const inLook = looks.find((l) => l.pieces.some((p) => p.productId === product.id));
  const pairs = (inLook?.pieces.map((p) => productById(p.productId)!).filter((p) => p.id !== product.id) ?? [])
    .concat(products.filter((p) => p.id !== product.id && p.collection === product.collection && p.category !== product.category))
    .concat(products.filter((p) => p.id !== product.id))
    .filter((p, i, a) => a.findIndex((x) => x.id === p.id) === i)
    .slice(0, 4);

  const panels = [
    { id: 'details', title: 'Detalles', body: product.description },
    { id: 'fit', title: 'Talle', body: product.fit },
    { id: 'care', title: 'Composición y cuidado', body: `${product.composition} ${product.care}` },
    { id: 'delivery', title: 'Envíos y cambios', body: 'Envío gratis a todo el país en compras desde $ 120.000. Entrega en 2 a 6 días hábiles. Pago contra entrega o con tarjeta. Cambios y devoluciones gratis dentro de 30 days.' },
  ];

  return (
    <div ref={root} className="pv" role="dialog" aria-modal="true" aria-label={product.name} data-lenis-prevent>
      <button className="pv__close t-label" onClick={onClose} data-cursor="Close">
        Cerrar <span aria-hidden="true">×</span>
      </button>

      <div className="pv__layout">
        <div
          className="pv__gallery"
          onScroll={(e) => {
            const g = e.currentTarget;
            if (g.scrollWidth > g.clientWidth) setSlide(Math.round(g.scrollLeft / g.clientWidth));
          }}
        >
          {colour.shots.map((s, i) => (
            <figure key={`${colour.id}-${i}`} className={`pv__shot${i === 0 ? '' : ' pv__shot--rest'}`}>
              <Img {...shotProps(s)} eager={i === 0} sizes="(max-width: 900px) 100vw, 58vw" alt={i === 0 ? `${product.name} en ${colour.label}` : ''} />
            </figure>
          ))}
        </div>
        {colour.shots.length > 1 && (
          <p className="pv__counter t-meta" aria-hidden="true">
            {String(slide + 1).padStart(2, '0')} / {String(colour.shots.length).padStart(2, '0')}
          </p>
        )}

        <div className="pv__info">
          <div className="pv__sticky">
            <p className="t-meta pv__crumbs pv__in">
              Shop / {product.category} / <span>P.{product.no}</span>
            </p>
            <h2 className="pv__name t-display pv__in">{product.name}</h2>
            <p className="pv__price pv__in">
              <Price p={product} />
              {product.badge && <span className="badge">{product.badge}</span>}
            </p>
            <p className="pv__line t-serif pv__in">{product.line}</p>

            <fieldset className="pv__group pv__in">
              <legend className="t-meta">
                Colour — <span>{colour.label}</span>
              </legend>
              <div className="pv__colours">
                {product.colours.map((c, i) => (
                  <button
                    key={c.id}
                    className={`pv__colour${i === colourIdx ? ' is-active' : ''}`}
                    onClick={() => {
                      setColourIdx(i);
                      setSlide(0);
                    }}
                    aria-pressed={i === colourIdx}
                    aria-label={c.label}
                  >
                    <i style={{ background: c.hex }} />
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className={`pv__group pv__in${status === 'need-size' ? ' is-error' : ''}`}>
              <legend className="t-meta pv__size-legend">
                <span>Talle{size ? ` — ${size}` : ''}</span>
                {status === 'need-size' && <span className="pv__need">Elegí un talle</span>}
              </legend>
              <div className="pv__sizes">
                {product.sizes.map((s) => {
                  const out = product.soldOut?.includes(s);
                  return (
                    <button
                      key={s}
                      className={`pv__size t-meta${size === s ? ' is-active' : ''}`}
                      disabled={out}
                      aria-pressed={size === s}
                      onClick={() => {
                        setSize(s);
                        if (status === 'need-size') setStatus('idle');
                      }}
                    >
                      {s}
                      {out && <span className="sr-only"> — sold out</span>}
                    </button>
                  );
                })}
              </div>
              {product.soldOut?.length ? <p className="t-meta pv__hint">Los talles tachados vuelven en 3 semanas.</p> : null}
              {product.stock && product.stock <= 5 ? <p className="t-meta pv__stock">Quedan {product.stock} in this drop</p> : null}
            </fieldset>

            <div className="pv__actions pv__in">
              <div className="pv__buy">
                <div className="pv__qty" role="group" aria-label="Cantidad">
                  <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Restar una unidad">−</button>
                  <span className="t-meta" aria-live="polite">{qty}</span>
                  <button onClick={() => setQty((q) => Math.min(9, q + 1))} aria-label="Sumar una unidad">+</button>
                </div>
              <button className={`btn pv__add is-${status}`} onClick={status === 'added' ? () => setCartOpen(true) : addToBag} disabled={status === 'adding'}>
                <span className="pv__add-fill" aria-hidden="true" />
                <Roll>{status === 'adding' ? 'Agregando' : status === 'added' ? 'Agregada — ver carrito' : 'Agregar al carrito'}</Roll>
                <span>{status === 'added' ? '✓' : money(product.price * qty)}</span>
              </button>
              </div>
              <p className="t-meta pv__ship">Envío gratis desde $ 120.000 · Pago contra entrega · 30 días para cambios</p>
            </div>

            <div className="pv__panels pv__in">
              {panels.map((p) => (
                <div key={p.id} className={`pv__panel${openPanel === p.id ? ' is-open' : ''}`}>
                  <button className="pv__panel-head t-label" aria-expanded={openPanel === p.id} onClick={() => setOpenPanel(openPanel === p.id ? '' : p.id)}>
                    {p.title}
                    <span aria-hidden="true">{openPanel === p.id ? '−' : '+'}</span>
                  </button>
                  <div className="pv__panel-body">
                    <p>{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <section className="pv__pairs" aria-label={inLook ? `Completá tu look — ${inLook.title}` : 'También te puede gustar'}>
        <p className="pv__pairs-title t-display">{inLook ? <>Completá <em>tu look</em></> : <>También <em>te puede gustar</em></>}</p>
        <div className="pv__pairs-row">
          {pairs.map((p) => (
            <ProductCard key={p.id} product={p} sizes="(max-width: 900px) 50vw, 25vw" />
          ))}
        </div>
      </section>
    </div>
  );
}
