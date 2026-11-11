import './Hero.css';
import { Img } from '../components/Img';
import { useShop } from '../store/shop';
import { goShop } from '../lib/nav';

/** Portada minimalista: texto a la izquierda, una gorra a la derecha. */
export function Hero() {
  const { setFilter, openProduct } = useShop();
  return (
    <section id="top" className="hero" aria-label="ASHE — Gorras cerradas">
      <div className="hero__copy">
        <p className="t-meta">Colección 2026</p>
        <h1 className="hero__title">Gorras cerradas,<br />hechas para durar.</h1>
        <p className="hero__sub">Nueve modelos, seis paneles y un calce firme. Sin vueltas.</p>
        <div className="hero__ctas">
          <button className="btn" onClick={() => goShop(setFilter, 'all')}><span>Ver la tienda</span><span>→</span></button>
          <button className="btn btn--ghost" onClick={() => goShop(setFilter, 'new')}><span>Novedades</span></button>
        </div>
      </div>
      <button className="hero__img" aria-label="Ver Gorra Cerrada Roja LA" onClick={(e) => openProduct('rojo-la', { rect: e.currentTarget.getBoundingClientRect(), src: 'gorra-rojo-la-1' })}>
        <Img name="gorra-rojo-la-1" eager sizes="(max-width: 800px) 100vw, 50vw" alt="Gorra cerrada roja LA" />
      </button>
    </section>
  );
}
