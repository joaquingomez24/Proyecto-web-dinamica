/**
 * Catalogue data — the single place to edit products, looks and collections.
 * Image values are asset names resolved by `src/lib/img.ts` (public/img/<name>-<width>.webp).
 */

export type Shot = {
  name: string;
  /** object-position for the crop, e.g. "50% 20%" */
  pos?: string;
  /** >1 turns the shot into a tight detail crop of the same photograph */
  zoom?: number;
};

export type Colour = { id: string; label: string; hex: string; shots: Shot[] };

export type Category = 'Clásicas' | 'Deportivas' | 'Premium';
export type CollectionId = 'salt' | 'iron' | 'chalk';
export type Badge = 'Nuevo' | 'Más vendida' | 'Edición limitada' | 'Pocas unidades';

export type Product = {
  id: string;
  no: string;
  name: string;
  category: Category;
  collection: CollectionId;
  price: number;
  /** original price when on sale */
  was?: number;
  badge?: Badge;
  isNew?: boolean;
  colours: Colour[];
  sizes: string[];
  soldOut?: string[];
  /** units left — shown when low */
  stock?: number;
  line: string;
  description: string;
  composition: string;
  fit: string;
  care: string;
};

const TALLES = ['S/M', 'M/L', 'L/XL'];
type Row = [id: string, name: string, cat: Product['category'], col: CollectionId, price: number, color: string, label: string, hex: string, line: string, badge?: Product['badge'], extra?: Partial<Product>];
const ROWS: Row[] = [
  ['rojo-la', 'Gorra Cerrada Roja LA', 'Clásicas', 'salt', 29900, 'rojo', 'Rojo', '#C8102E', 'La de todos los días, sin vueltas.', 'Más vendida'],
  ['crema-negra', 'Gorra Cerrada Crema y Negra', 'Clásicas', 'salt', 29900, 'crema', 'Crema', '#E6DFD0', 'Tono claro con visera negra.', 'Nuevo', { isNew: true }],
  ['negra-caja', 'Gorra Cerrada Negra Logo', 'Clásicas', 'chalk', 29900, 'negro', 'Negro', '#1C1C1C', 'Logo de caja al frente, simple y directa.'],
  ['negra-la', 'Gorra Fitted Negra LA', 'Deportivas', 'iron', 32900, 'negro', 'Negro', '#1C1C1C', 'Visera plana y calce firme.', undefined, { isNew: true }],
  ['negra-halo', 'Gorra Fitted Negra Halo', 'Deportivas', 'iron', 32900, 'negro', 'Negro', '#1C1C1C', 'Negra con detalles en rojo.'],
  ['negra-escrita', 'Gorra Fitted Negra Escrita', 'Deportivas', 'chalk', 32900, 'negro', 'Negro', '#1C1C1C', 'Letras blancas a mano alrededor de la copa.'],
  ['azul-bordada', 'Gorra Cerrada Azul Bordada', 'Premium', 'salt', 38900, 'azul', 'Azul', '#1F4FD8', 'Bordado tono sobre tono en toda la copa.', 'Edición limitada', { stock: 4 }],
  ['roja-bordada', 'Gorra Cerrada Roja Bordada', 'Premium', 'chalk', 38900, 'rojo', 'Rojo', '#C8102E', 'Bordado tono sobre tono para destacar.', undefined, { was: 44900 }],
  ['negra-dados', 'Gorra Cerrada Negra Dados', 'Premium', 'iron', 38900, 'negro', 'Negro', '#1C1C1C', 'Ilustraciones bordadas y detalle en la visera.', 'Pocas unidades', { stock: 3 }],
];

/** Fotos de cada producto: public/img/gorra-<carpeta>-<n>-<720|1080|1400>.webp (la primera es la de la tarjeta). */
const FOTOS: Record<string, [slug: string, n: number]> = {
  'rojo-la': ['rojo-la', 2],
  'crema-negra': ['crema-sox', 3],
  'negra-caja': ['negra-caja', 2],
  'negra-la': ['negra-la', 1],
  'negra-halo': ['angels', 3],
  'negra-escrita': ['negra-escrita', 2],
  'azul-bordada': ['azul-bordada', 3],
  'roja-bordada': ['roja-bordada', 3],
  'negra-dados': ['negra-dados', 4],
};
const shotsOf = (id: string): Shot[] => {
  const [slug, n] = FOTOS[id];
  return Array.from({ length: n }, (_, k) => ({ name: `gorra-${slug}-${k + 1}` }));
};

export const products: Product[] = ROWS.map(([id, name, category, collection, price, c, label, hex, line, badge, extra], i) => ({
  id, no: String(i + 1).padStart(2, '0'), name, category, collection, price, badge,
  colours: [{ id: c, label, hex, shots: shotsOf(id) }],
  sizes: TALLES,
  line,
  description: `${name} en color ${label.toLowerCase()}. Copa estructurada de seis paneles, cierre total (sin ajuste trasero), ojales bordados y badana interior suave.`,
  composition: '100% algodón twill. Badana interior de poliéster.',
  fit: 'Cerrada: elegí tu talle según el contorno de la cabeza (S/M 55–58 cm, M/L 57–60 cm, L/XL 59–62 cm).',
  care: 'Lavar a mano con agua fría. No usar secarropas.',
  ...extra,
}));

export const productById = (id: string) => products.find((p) => p.id === id);

/**
 * Reemplaza los productos de arriba por los de MySQL (GET /api/productos, servidor/servidor.js).
 * Se cambia el mismo arreglo, así todo lo que importa `products` ve los datos de la base.
 * Si la API no está prendida, la tienda sigue con los datos de este archivo.
 */
export async function loadProductsFromApi() {
  try {
    const r = await fetch('/api/productos', { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error(String(r.status));
    const raw: Product[] = await r.json();
    // Se descartan los productos de la base sin colores, fotos o talles (los viejos con pedidos quedan así y rompían las tarjetas)
    const fromDb = Array.isArray(raw) ? raw.filter((p) => p.colours?.length && p.colours.every((c) => c.shots?.length) && p.sizes?.length) : [];
    if (!fromDb.length) throw new Error('vacío');
    products.splice(0, products.length, ...fromDb);
    console.info(`ASHE: ${fromDb.length} productos desde MySQL`);
  } catch (e) {
    console.warn('ASHE: la API no respondió, uso los productos de catalog.ts', e);
  }
}

/* ——— filtros de la tienda ——— */
export type Filter = 'all' | 'new' | Category | 'sale' | CollectionId;

export const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'new', label: 'Novedades' },
  { id: 'Clásicas', label: 'Clásicas' },
  { id: 'Deportivas', label: 'Deportivas' },
  { id: 'Premium', label: 'Premium' },
  { id: 'sale', label: 'Ofertas' },
];

export const matchesFilter = (p: Product, f: Filter) => {
  if (f === 'all') return true;
  if (f === 'new') return !!p.isNew;
  if (f === 'sale') return !!p.was;
  if (f === 'salt' || f === 'iron' || f === 'chalk') return p.collection === f;
  return p.category === f;
};

/* Se mantienen estos tipos por compatibilidad con la vista de producto; esta versión no usa «looks». */
export type LookPiece = { productId: string; colourId: string; size: string };
export type Look = { id: string; no: string; title: string; mood: string; image: string; frame: { x: number; y: number; scale: number; bright: number }; tint: string; pieces: LookPiece[] };
export const looks: Look[] = [];

export type Collection = { id: CollectionId; numeral: string; title: string; tagline: string; caption: string; bg: string; fg: string; images: string[] };
export const collections: Collection[] = [];

export const FREE_SHIPPING = 120000;

export const money = (n: number) => `$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)}`;
