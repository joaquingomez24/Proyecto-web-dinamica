import type { Filter } from '../data/catalog';
import { scrollToId } from './motion';

/** Jump to the shop with a filter applied — used by nav, categories, collections and looks. */
export function goShop(setFilter: (f: Filter) => void, f: Filter = 'all') {
  setFilter(f);
  requestAnimationFrame(() => scrollToId('shop'));
}
