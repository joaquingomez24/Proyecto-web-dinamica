import { useEffect, useRef, useState, type FormEvent } from 'react';
import { gsap, EASE, lockScroll } from '../lib/motion';
import { FREE_SHIPPING, money, productById } from '../data/catalog';
import { useShop } from '../store/shop';
import { Img, shotProps } from '../components/Img';
import { Roll } from '../components/Roll';
import './Checkout.css';

type Fields = Record<'email' | 'first' | 'last' | 'address' | 'city' | 'postcode' | 'country' | 'card' | 'expiry' | 'cvc', string>;

const EMPTY: Fields = { email: '', first: '', last: '', address: '', city: '', postcode: '', country: 'Neuquén', card: '', expiry: '', cvc: '' };
const GOVERNORATES = ['Neuquén', 'Río Negro', 'Buenos Aires', 'CABA', 'Córdoba', 'Santa Fe', 'Mendoza', 'Chubut', 'Otra'];

const RULES: Partial<Record<keyof Fields, (v: string) => string | null>> = {
  email: (v) => (/^\S+@\S+\.\S+$/.test(v) ? null : 'Ingresá un correo válido'),
  first: (v) => (v.trim() ? null : 'Obligatorio'),
  last: (v) => (v.trim() ? null : 'Obligatorio'),
  address: (v) => (v.trim() ? null : 'Obligatorio'),
  city: (v) => (v.trim() ? null : 'Obligatorio'),
  postcode: (v) => (/^\d{8,13}$/.test(v.replace(/\D/g, '')) ? null : 'Ingresá un celular válido (solo números)'),
  card: (v) => (v.replace(/\s/g, '').length >= 12 ? null : 'Ingresá el número de tarjeta'),
  expiry: (v) => (/^\d{2}\s?\/\s?\d{2}$/.test(v) ? null : 'MM / YY'),
  cvc: (v) => (/^\d{3,4}$/.test(v) ? null : '3–4 digits'),
};

export function Checkout() {
  const { checkoutOpen, setCheckoutOpen, lines, subtotal, clear } = useShop();
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const [f, setF] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [ship, setShip] = useState<'express' | 'atelier'>('express');
  const [pay, setPay] = useState<'cod' | 'card'>('cod');
  const [phase, setPhase] = useState<'form' | 'processing' | 'done'>('form');
  const [order, setOrder] = useState<{ no: string; total: number; name: string; email: string } | null>(null);

  const shipping = ship === 'atelier' || subtotal >= FREE_SHIPPING ? 0 : 4500;
  const total = subtotal + shipping;

  useEffect(() => {
    const el = root.current!;
    if (first.current) {
      first.current = false;
      gsap.set(el, { visibility: 'hidden', clipPath: 'inset(100% 0% 0% 0%)' });
      return;
    }
    lockScroll('checkout', checkoutOpen);
    if (checkoutOpen) {
      el.scrollTop = 0;
      gsap.timeline()
        .set(el, { visibility: 'visible' })
        .to(el, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: EASE.shutter })
        .fromTo(el.querySelectorAll('.co__in'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.05, duration: 0.9 }, 0.4);
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCheckoutOpen(false);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    gsap.timeline()
      .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.9, ease: EASE.shutter })
      .set(el, { visibility: 'hidden', clipPath: 'inset(100% 0% 0% 0%)' })
      .call(() => {
        if (phase === 'done') {
          setPhase('form');
          setF(EMPTY);
          setOrder(null);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOpen]);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let v = e.target.value;
    if (k === 'card') v = v.replace(/[^\d]/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
    if (k === 'expiry') v = v.replace(/[^\d]/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1 / $2');
    if (k === 'cvc') v = v.replace(/[^\d]/g, '').slice(0, 4);
    setF((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    (Object.keys(RULES) as (keyof Fields)[]).filter((k) => pay === 'card' || !['card', 'expiry', 'cvc'].includes(k)).forEach((k) => {
      const msg = RULES[k]!(f[k]);
      if (msg) next[k] = msg;
    });
    setErrors(next);
    const firstBad = Object.keys(next)[0];
    if (firstBad) {
      root.current?.querySelector<HTMLElement>(`[name="${firstBad}"]`)?.focus();
      return;
    }
    setPhase('processing');
    // El pedido se guarda en MySQL (POST /api/pedidos); el servidor recalcula precios y envío
    fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: { email: f.email, first: f.first, last: f.last, address: f.address, city: f.city, postcode: f.postcode, country: f.country },
        envio: ship,
        pago: pay,
        tarjeta: pay === 'card' ? f.card : '',
        items: lines.map(({ productId, colourId, size, qty }) => ({ productId, colourId, size, qty })),
      }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || String(r.status));
        setOrder({ no: data.no, total: data.total, name: f.first, email: f.email });
        clear();
        setPhase('done');
        root.current?.scrollTo({ top: 0 });
      })
      .catch((err) => {
        console.error('No se pudo guardar el pedido:', err);
        setPhase('form');
        setErrors({ email: 'No pudimos registrar el pedido — ¿está prendido el servidor? Probá de nuevo.' });
      });
  };

  const field = (k: keyof Fields, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={`co__field${errors[k] ? ' is-error' : ''}${props.className ? ` ${props.className}` : ''}`}>
      <span className="t-meta">{label}</span>
      <input name={k} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} className={undefined} />
      {errors[k] && <span className="co__err t-meta">{errors[k]}</span>}
    </label>
  );

  return (
    <div ref={root} className="co" role="dialog" aria-modal="true" aria-label="Finalizar compra" aria-hidden={!checkoutOpen} data-lenis-prevent>
      <header className="co__head">
        <p className="co__brand t-display">ASHE</p>
        <p className="t-meta co__secure">Compra segura · Tienda de prueba — no se cobra nada</p>
        <button className="t-label u-link" onClick={() => setCheckoutOpen(false)}>
          {phase === 'done' ? 'Cerrar' : 'Volver al carrito'}
        </button>
      </header>

      {phase === 'done' && order ? (
        <div className="co__done">
          <p className="t-meta">Pedido {order.no}</p>
          <h2 className="co__done-title t-serif">
            Gracias{order.name ? `, ${order.name}` : ''}.
            <br />
            <em>Ya lo preparamos.</em>
          </h2>
          <p className="t-body">
            Recibimos tu pedido. Te avisamos por WhatsApp y por correo a {order.email} cuando salga. Total: {money(order.total)}.
          </p>
          <button className="btn" onClick={() => setCheckoutOpen(false)}>
            <Roll>Continuar</Roll>
            <span>→</span>
          </button>
        </div>
      ) : (
        <div className="co__layout">
          <form className="co__form" onSubmit={submit} noValidate>
            <section className="co__step co__in">
              <h3 className="co__step-title">
                <span className="t-meta">01</span> Contacto
              </h3>
              {field('email', 'Correo', { type: 'email', autoComplete: 'email' })}
            </section>

            <section className="co__step co__in">
              <h3 className="co__step-title">
                <span className="t-meta">02</span> Entrega
              </h3>
              <div className="co__grid">
                {field('first', 'Nombre', { autoComplete: 'given-name' })}
                {field('last', 'Apellido', { autoComplete: 'family-name' })}
                {field('address', 'Dirección', { autoComplete: 'street-address', className: 'co__wide' })}
                {field('city', 'Ciudad', { autoComplete: 'address-level2' })}
                {field('postcode', 'Celular', { autoComplete: 'tel', inputMode: 'tel', placeholder: '299 123 4567' })}
                <label className="co__field co__wide">
                  <span className="t-meta">Provincia</span>
                  <select name="country" value={f.country} onChange={set('country')} autoComplete="address-level1">
                    {GOVERNORATES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="co__options" role="radiogroup" aria-label="Método de entrega">
                <label className={`co__option${ship === 'express' ? ' is-active' : ''}`}>
                  <input type="radio" name="ship" checked={ship === 'express'} onChange={() => setShip('express')} />
                  <span>Correo — 2 a 6 días hábiles</span>
                  <span className="t-meta">{subtotal >= FREE_SHIPPING ? 'Gratis' : money(4500)}</span>
                </label>
                <label className={`co__option${ship === 'atelier' ? ' is-active' : ''}`}>
                  <input type="radio" name="ship" checked={ship === 'atelier'} onChange={() => setShip('atelier')} />
                  <span>Retiro en el local, Neuquén</span>
                  <span className="t-meta">Gratis</span>
                </label>
              </div>
            </section>

            <section className="co__step co__in">
              <h3 className="co__step-title">
                <span className="t-meta">03</span> Payment
              </h3>
              <div className="co__options co__options--pay" role="radiogroup" aria-label="Método de pago">
                <label className={`co__option${pay === 'cod' ? ' is-active' : ''}`}>
                  <input type="radio" name="pay" checked={pay === 'cod'} onChange={() => setPay('cod')} />
                  <span>Pago contra entrega</span>
                  <span className="t-meta">Pagás al recibir</span>
                </label>
                <label className={`co__option${pay === 'card' ? ' is-active' : ''}`}>
                  <input type="radio" name="pay" checked={pay === 'card'} onChange={() => setPay('card')} />
                  <span>Tarjeta</span>
                  <span className="t-meta">Visa · Mastercard</span>
                </label>
              </div>
              {pay === 'card' && (
              <div className="co__grid co__card">
                {field('card', 'Número de tarjeta', { inputMode: 'numeric', autoComplete: 'cc-number', placeholder: '4242 4242 4242 4242', className: 'co__wide' })}
                {field('expiry', 'Vencimiento', { inputMode: 'numeric', autoComplete: 'cc-exp', placeholder: 'MM / YY' })}
                {field('cvc', 'CVC', { inputMode: 'numeric', autoComplete: 'cc-csc', placeholder: '123' })}
              </div>
              )}
            </section>

            <button type="submit" className="btn co__submit co__in" disabled={phase === 'processing' || lines.length === 0}>
              <Roll>{phase === 'processing' ? 'Procesando' : 'Confirmar pedido'}</Roll>
              <span>{money(total)}</span>
              {phase === 'processing' && <span className="co__progress" aria-hidden="true" />}
            </button>
          </form>

          <aside className="co__summary co__in" aria-label="Resumen del pedido">
            <p className="t-meta co__summary-head">Tu pedido</p>
            <ul>
              {lines.map((l) => {
                const p = productById(l.productId)!;
                const c = p.colours.find((c) => c.id === l.colourId) ?? p.colours[0];
                return (
                  <li key={l.key} className="co__line">
                    <span className="co__line-img">
                      <Img {...shotProps(c.shots[0])} sizes="80px" />
                      <span className="co__qty t-meta">{l.qty}</span>
                    </span>
                    <span className="co__line-name">
                      <span className="t-serif">{p.name}</span>
                      <span className="t-meta">
                        {c.label} — {l.size}
                      </span>
                    </span>
                    <span className="t-meta">{money(p.price * l.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="co__totals">
              <div>
                <dt className="t-meta">Subtotal</dt>
                <dd className="t-meta">{money(subtotal)}</dd>
              </div>
              <div>
                <dt className="t-meta">Envío</dt>
                <dd className="t-meta">{shipping ? money(shipping) : 'Gratis'}</dd>
              </div>
              <div className="co__grand">
                <dt className="t-label">Total</dt>
                <dd className="t-serif">{money(total)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}
