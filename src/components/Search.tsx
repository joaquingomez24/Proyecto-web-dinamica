import { useEffect, useMemo, useRef, useState } from 'react';
import { useShop } from '../store/shop';
import { gsap, EASE, lockScroll } from '../lib/motion';
import { money, products } from '../data/catalog';
import { Img, shotProps } from './Img';
import { SearchIcon } from './Icons';
import './Search.css';

const SUGGEST = ['Clásica', 'Fitted', 'Negro', 'Premium', 'Oliva'];

export function Search() {
  const { searchOpen, setSearchOpen, openProduct } = useShop();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const first = useRef(true);
  const [q, setQ] = useState('');

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products.filter((p) => p.badge === 'Más vendida' || p.isNew).slice(0, 6);
    return products.filter((p) => `${p.name} ${p.category} ${p.collection} ${p.colours.map((c) => c.label).join(' ')}`.toLowerCase().includes(t));
  }, [q]);

  useEffect(() => {
    const el = root.current!;
    if (first.current) {
      first.current = false;
      gsap.set(el, { visibility: 'hidden' });
      gsap.set(el.querySelector('.search__panel'), { yPercent: -100 });
      return;
    }
    lockScroll('search', searchOpen);
    const panel = el.querySelector('.search__panel');
    if (searchOpen) {
      gsap.timeline()
        .set(el, { visibility: 'visible' })
        .to(el.querySelector('.search__shade'), { opacity: 1, duration: 0.4 }, 0)
        .to(panel, { yPercent: 0, duration: 0.8, ease: EASE.out }, 0);
      window.setTimeout(() => input.current?.focus(), 80);
      const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSearchOpen(false);
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    gsap.timeline()
      .to(panel, { yPercent: -100, duration: 0.6, ease: EASE.shutter }, 0)
      .to(el.querySelector('.search__shade'), { opacity: 0, duration: 0.4 }, 0.1)
      .set(el, { visibility: 'hidden' });
  }, [searchOpen, setSearchOpen]);

  const open = (id: string, e?: React.MouseEvent<HTMLElement>) => {
    const img = e?.currentTarget.querySelector('img');
    const p = products.find((x) => x.id === id)!;
    const s = p.colours[0].shots[0];
    setSearchOpen(false);
    openProduct(id, img ? { rect: img.getBoundingClientRect(), src: s.name, pos: s.pos } : null);
  };

  return (
    <div ref={root} className="search" aria-hidden={!searchOpen}>
      <div className="search__shade" onClick={() => setSearchOpen(false)} />
      <div className="search__panel" role="dialog" aria-modal="true" aria-label="Buscar" data-lenis-prevent>
        <form
          className="search__form"
          onSubmit={(e) => {
            e.preventDefault();
            if (results[0]) open(results[0].id);
          }}
        >
          <SearchIcon />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar gorras, colores…" aria-label="Buscar productos" />
          <button type="button" className="t-label" onClick={() => setSearchOpen(false)}>
            Close
          </button>
        </form>
        <div className="search__suggest">
          {SUGGEST.map((s) => (
            <button key={s} className="chip" onClick={() => setQ(s)}>
              {s}
            </button>
          ))}
        </div>
        <p className="t-meta search__label">{q ? `${results.length} resultado${results.length === 1 ? '' : 's'}` : 'Más pedidas'}</p>
        <ul className="search__results">
          {results.map((p) => (
            <li key={p.id}>
              <button className="search__item" onClick={(e) => open(p.id, e)}>
                <span className="search__thumb">
                  <Img {...shotProps(p.colours[0].shots[0])} sizes="120px" />
                </span>
                <span className="search__name">{p.name}</span>
                <span className="t-meta search__meta">
                  {p.category} · {money(p.price)}
                </span>
              </button>
            </li>
          ))}
          {!results.length && <li className="t-meta search__empty">Sin resultados — probá con “clásica” o “negro”.</li>}
        </ul>
      </div>
    </div>
  );
}
