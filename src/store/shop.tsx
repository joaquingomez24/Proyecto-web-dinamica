import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { productById, type Filter, type LookPiece } from '../data/catalog';
import { flyToCart } from '../lib/fly';

export type CartLine = { key: string; productId: string; colourId: string; size: string; qty: number };

type CartAction =
  | { type: 'add'; line: Omit<CartLine, 'key' | 'qty'>; qty?: number }
  | { type: 'qty'; key: string; qty: number }
  | { type: 'remove'; key: string }
  | { type: 'clear' };

const STORAGE = 'ashe.bag.v2';
const lineKey = (l: Omit<CartLine, 'key' | 'qty'>) => `${l.productId}:${l.colourId}:${l.size}`;

function cartReducer(state: CartLine[], a: CartAction): CartLine[] {
  switch (a.type) {
    case 'add': {
      const key = lineKey(a.line);
      const found = state.find((l) => l.key === key);
      if (found) return state.map((l) => (l.key === key ? { ...l, qty: Math.min(9, l.qty + (a.qty ?? 1)) } : l));
      return [...state, { ...a.line, key, qty: a.qty ?? 1 }];
    }
    case 'qty':
      return a.qty <= 0 ? state.filter((l) => l.key !== a.key) : state.map((l) => (l.key === a.key ? { ...l, qty: Math.min(9, a.qty) } : l));
    case 'remove':
      return state.filter((l) => l.key !== a.key);
    case 'clear':
      return [];
  }
}

function loadCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return parsed.filter((l) => productById(l.productId));
  } catch {
    return [];
  }
}

/** Where a product view was opened from — used for the shared-image transition. */
export type Origin = { rect: DOMRect; src: string; pos?: string } | null;

export type Toast = { id: number; title: string; detail: string; image: string; pos?: string };

type Shop = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, 'key' | 'qty'>, opts?: { from?: DOMRect | null; qty?: number; silent?: boolean }) => void;
  addLook: (pieces: LookPiece[], title: string, from?: DOMRect | null) => void;

  filter: Filter;
  setFilter: (f: Filter) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;

  productId: string | null;
  origin: Origin;
  openProduct: (id: string, origin?: Origin) => void;
  closeProduct: () => void;

  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  checkoutOpen: boolean;
  setCheckoutOpen: (v: boolean) => void;
  menuOpen: boolean;
  setMenuOpen: (v: boolean) => void;

  toast: Toast | null;
  dismissToast: () => void;
};

const ShopContext = createContext<Shop | null>(null);

const productFromHash = () => {
  const m = window.location.hash.match(/^#\/piece\/([\w-]+)/);
  return m && productById(m[1]) ? m[1] : null;
};

export function ShopProvider({ children }: { children: ReactNode }) {
  const [lines, dispatch] = useReducer(cartReducer, undefined, loadCart);
  const [productId, setProductId] = useState<string | null>(productFromHash);
  const [origin, setOrigin] = useState<Origin>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const toastTimer = useRef<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(lines));
    } catch {
      /* storage unavailable — bag lives for this session only */
    }
  }, [lines]);

  // Product views are addressable (#/piece/<id>) so back/forward and sharing work.
  useEffect(() => {
    const onHash = () => {
      const id = productFromHash();
      setProductId(id);
      if (!id) setOrigin(null);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const showToast = useCallback((t: Omit<Toast, 'id'>) => {
    window.clearTimeout(toastTimer.current);
    setToast({ ...t, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 4200);
  }, []);

  const add = useCallback<Shop['add']>(
    (line, opts = {}) => {
      dispatch({ type: 'add', line, qty: opts.qty });
      if (opts.silent) return;
      const p = productById(line.productId)!;
      const c = p.colours.find((c) => c.id === line.colourId) ?? p.colours[0];
      if (opts.from) flyToCart(opts.from, c.shots[0].name, c.shots[0].pos);
      showToast({ title: p.name, detail: `${c.label} · ${line.size}${opts.qty && opts.qty > 1 ? ` · ×${opts.qty}` : ''}`, image: c.shots[0].name, pos: c.shots[0].pos });
    },
    [showToast],
  );

  const addLook = useCallback<Shop['addLook']>(
    (pieces, title, from) => {
      pieces.forEach((line) => dispatch({ type: 'add', line }));
      const first = productById(pieces[0].productId)!;
      const c = first.colours.find((c) => c.id === pieces[0].colourId) ?? first.colours[0];
      if (from) flyToCart(from, c.shots[0].name, c.shots[0].pos);
      showToast({ title: `The look — ${title}`, detail: `${pieces.length} pieces added`, image: c.shots[0].name, pos: c.shots[0].pos });
    },
    [showToast],
  );

  const openProduct = useCallback((id: string, o: Origin = null) => {
    setOrigin(o);
    setProductId(id);
    setMenuOpen(false);
    setCartOpen(false);
    if (window.location.hash !== `#/piece/${id}`) window.history.pushState(null, '', `#/piece/${id}`);
  }, []);

  const closeProduct = useCallback(() => {
    setProductId(null);
    setOrigin(null);
    if (window.location.hash.startsWith('#/piece/')) window.history.pushState(null, '', window.location.pathname + window.location.search);
  }, []);

  const value = useMemo<Shop>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + l.qty * (productById(l.productId)?.price ?? 0), 0);
    return {
      lines,
      count,
      subtotal,
      add,
      addLook,
      setQty: (key, qty) => dispatch({ type: 'qty', key, qty }),
      remove: (key) => dispatch({ type: 'remove', key }),
      clear: () => dispatch({ type: 'clear' }),
      productId,
      origin,
      openProduct,
      closeProduct,
      cartOpen,
      setCartOpen,
      checkoutOpen,
      setCheckoutOpen,
      menuOpen,
      setMenuOpen,
      toast,
      dismissToast: () => setToast(null),
      filter,
      setFilter,
      searchOpen,
      setSearchOpen,
    };
  }, [lines, add, addLook, productId, origin, openProduct, closeProduct, cartOpen, checkoutOpen, menuOpen, toast, filter, searchOpen]);

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used inside <ShopProvider>');
  return ctx;
}
