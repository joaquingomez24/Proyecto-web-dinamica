import { useState, type CSSProperties } from 'react';
import { money, type Product } from '../data/catalog';
import { useShop } from '../store/shop';
import { Img, shotProps } from './Img';
import './ProductCard.css';

const badgeClass: Record<string, string> = { Nuevo: 'badge--new', 'Edición limitada': 'badge--limited', 'Pocas unidades': 'badge--low' };

export function Price({ p }: { p: Product }) {
  return p.was ? (
    <span className="price price--sale">
      <s>{money(p.was)}</s>
      {money(p.price)}
    </span>
  ) : (
    <span className="price">{money(p.price)}</span>
  );
}

/**
 * The ASHE card: photo with a hover swap, a badge, the product number, and a
 * square "+" that opens a size tray right on the image. One language, two sizes.
 */
export function ProductCard({
  product,
  feature = false,
  sizes = '(max-width: 900px) 50vw, 25vw',
  style,
  className = '',
}: {
  product: Product;
  feature?: boolean;
  sizes?: string;
  style?: CSSProperties;
  className?: string;
}) {
  const { openProduct, add } = useShop();
  const [colourIdx, setColourIdx] = useState(0);
  const [tray, setTray] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const colour = product.colours[colourIdx];
  const [first, second] = colour.shots;
  const alt = second ?? { ...first, zoom: 1.6 };
  const single = product.sizes.length === 1;
  const sale = product.was ? Math.round((1 - product.price / product.was) * 100) : 0;

  const open = (e: React.MouseEvent<HTMLElement>) => {
    const img = e.currentTarget.closest('.card')?.querySelector<HTMLImageElement>('.card__img--a');
    openProduct(product.id, img ? { rect: img.getBoundingClientRect(), src: first.name, pos: first.pos } : null);
  };

  const quickAdd = (size: string, e: React.MouseEvent<HTMLElement>) => {
    const frame = e.currentTarget.closest('.card')?.querySelector('.card__frame');
    add({ productId: product.id, colourId: colour.id, size }, { from: frame?.getBoundingClientRect() });
    setAdded(size);
    setTray(false);
    window.setTimeout(() => setAdded(null), 1800);
  };

  return (
    <article className={`card${feature ? ' card--feature' : ''}${tray ? ' is-tray' : ''} ${className}`} style={style} onMouseLeave={() => setTray(false)}>
      <div className="card__media">
        <div className="card__frame">
          <Img {...shotProps(first)} className="card__img card__img--a" sizes={sizes} alt={`${product.name} en ${colour.label}`} />
          <div className="card__alt">
            <Img {...shotProps(alt)} className="card__img card__img--b" sizes={sizes} alt="" />
          </div>
        </div>
        <button className="card__open" onClick={open} aria-label={`Ver ${product.name}`} />

        <div className="card__tags" aria-hidden="true">
          {sale ? <span className="badge badge--sale">−{sale}%</span> : null}
          {product.badge && <span className={`badge ${badgeClass[product.badge] ?? ''}`}>{product.badge}</span>}
        </div>
        <span className="card__no t-meta" aria-hidden="true">
          Nº{product.no}
        </span>

        {feature && (
          <p className="card__feature-name t-display" aria-hidden="true">
            {product.name}
          </p>
        )}

        <div className="card__tray" aria-hidden={!tray}>
          <span className="t-meta">{added ? `Agregada ${added} ✓` : 'Elegí un talle'}</span>
          <div className="card__sizes">
            {product.sizes.map((s) => {
              const out = product.soldOut?.includes(s);
              return (
                <button key={s} className="card__size" disabled={out} onClick={(e) => quickAdd(s, e)} tabIndex={tray ? 0 : -1} aria-label={out ? `${s}, agotado` : `Add size ${s}`}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <button
          className={`card__plus${added ? ' is-added' : ''}`}
          aria-label={single ? `Agregar ${product.name} al carrito` : `Agregar ${product.name}`}
          aria-expanded={single ? undefined : tray}
          onClick={(e) => (single ? quickAdd(product.sizes[0], e) : setTray((t) => !t))}
        >
          <span aria-hidden="true">{added ? '✓' : '+'}</span>
        </button>
      </div>

      <div className="card__info">
        <h3 className="card__name">
          <button onClick={open}>{product.name}</button>
        </h3>
        <Price p={product} />
        <div className="card__meta">
          {product.colours.length > 1 ? (
            <div className="card__swatches" role="radiogroup" aria-label="Color">
              {product.colours.map((c, i) => (
                <button
                  key={c.id}
                  role="radio"
                  aria-checked={i === colourIdx}
                  aria-label={c.label}
                  className={`card__swatch${i === colourIdx ? ' is-active' : ''}`}
                  style={{ background: c.hex }}
                  onClick={() => setColourIdx(i)}
                  onMouseEnter={() => setColourIdx(i)}
                />
              ))}
            </div>
          ) : (
            <span className="t-meta card__colour">{colour.label}</span>
          )}
          {product.stock && product.stock <= 5 ? <span className="t-meta card__stock">Quedan {product.stock}</span> : <span className="t-meta card__cat">{product.category}</span>}
        </div>
        {feature && <p className="card__line t-serif">{product.line}</p>}
      </div>
    </article>
  );
}
