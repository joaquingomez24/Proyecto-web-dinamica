import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FILTERS, collections, matchesFilter, products, type Filter, type Product } from '../data/catalog';
import { useShop } from '../store/shop';
import { ProductCard } from '../components/ProductCard';
import { ArrowIcon } from '../components/Icons';
import { ScrollTrigger } from '../lib/motion';
import './Shop.css';

type Sort = 'featured' | 'new' | 'low' | 'high';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'featured', label: 'Destacadas' },
  { id: 'new', label: 'Más nuevas' },
  { id: 'low', label: 'Precio: menor a mayor' },
  { id: 'high', label: 'Precio: mayor a menor' },
];

const sorters: Record<Sort, (a: Product, b: Product) => number> = {
  featured: () => 0,
  new: (a, b) => Number(!!b.isNew) - Number(!!a.isNew),
  low: (a, b) => a.price - b.price,
  high: (a, b) => b.price - a.price,
};

const labelFor = (f: Filter) => FILTERS.find((x) => x.id === f)?.label ?? collections.find((c) => c.id === f)?.title ?? 'Todas';

/** The main store: category chips, sort, and a uniform card grid. */
export function Shop() {
  const { filter, setFilter } = useShop();
  const [sort, setSort] = useState<Sort>('featured');
  // revealed once, via the DOM — a React re-render of 20 cards here landed mid-scroll
  const seen = useRef(false);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const section = useRef<HTMLElement>(null);

  const list = useMemo(() => products.filter((p) => matchesFilter(p, filter)).sort(sorters[sort]), [filter, sort]);

  useEffect(() => {
    // observe the section, not the grid — the grid is re-keyed (remounted) on every filter change
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || seen.current) return;
        seen.current = true;
        gridRef.current?.classList.add('is-in');
        io.disconnect();
      },
      { rootMargin: '0px 0px -25% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // grid height changes with the filter — pinned scenes below need re-measuring
  useEffect(() => {
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 60);
    return () => window.clearTimeout(id);
  }, [filter, sort]);

  // one card size throughout — the grid is for comparing, the campaign lives in the lookbook
  const items = list.map((p, i) => <ProductCard key={p.id} product={p} style={{ '--d': `${Math.min(i, 10) * 0.05}s` } as CSSProperties} />);

  return (
    <section id="shop" ref={section} className="shop" aria-labelledby="shop-title">
      <div className="shop__head">
        <div className="shop__title-wrap">
          <p className="t-meta">{products.length} gorras</p>
          <h2 id="shop-title" className="section-title">
            Tienda <em>{filter === 'all' ? 'completa' : labelFor(filter).toLowerCase()}</em>
          </h2>
        </div>
        <span className="t-meta shop__sticker">Pago contra entrega · Cambios gratis</span>
      </div>

      <div className="shop__bar">
        <div className="shop__chips" role="toolbar" aria-label="Filtrar por categoría">
          {FILTERS.map((f) => {
            const n = products.filter((p) => matchesFilter(p, f.id)).length;
            return (
              <button key={f.id} className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)} disabled={!n}>
                {f.label} <sup>{n}</sup>
              </button>
            );
          })}
          {collections.some((c) => c.id === filter) && (
            <button className="chip is-active" onClick={() => setFilter('all')} aria-label={`Quitar filtro ${labelFor(filter)}`}>
              {labelFor(filter)} ×
            </button>
          )}
        </div>
        <label className="shop__sort t-meta">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        key={`${filter}-${sort}`}
        className="shop__grid"
        ref={(n) => {
          // the grid remounts per filter — re-apply the reveal state without a React render
          gridRef.current = n;
          if (n && seen.current) n.classList.add('is-in');
        }}
      >
        {items}
      </div>

      {!list.length && <p className="shop__empty t-meta">Por ahora no hay gorras acá — sumamos modelos todos los meses.</p>}

      <div className="shop__foot">
        <p className="t-meta">
          Mostrando {list.length} de {products.length}
        </p>
        {filter !== 'all' ? (
          <button className="btn btn--ghost" onClick={() => setFilter('all')}>
            <span>Ver todo</span>
            <ArrowIcon />
          </button>
        ) : null}
      </div>
    </section>
  );
}

