# ASHE — Drop 04

Storefront for a Cairo fashion brand. Vite + React + TypeScript, GSAP ScrollTrigger for scroll choreography, Lenis for smooth scroll.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run images   # (re)download + resize placeholder photography
```

## Structure

| Path | What |
| --- | --- |
| `src/data/catalog.ts` | Products (price in EGP, sale price, badge, stock, sizes, colours), filters, looks, collections — all content lives here |
| `src/store/shop.tsx` | Bag (saved in localStorage), shop filter, search, product view routing (`#/piece/<id>`), overlays, toast |
| `src/lib/motion.ts` | GSAP/Lenis setup, shared easing, scroll lock |
| `src/sections/` | Hero → Looks (7-look outfit change) → Shop (filters + grid) → Categories → Collections (lookbook) → About → Footer |
| `src/components/ProductCard.tsx` | The product card used everywhere (shop, related products) |
| `src/overlays/` | Product view, bag drawer, checkout |
| `scripts/fetch-images.mjs` | Image pipeline: source → `public/img/<name>-{720,1400}.webp` |

## Replacing the photography

Images are referenced by name (e.g. `look-03`, `p-bag-1`). Either edit the map in `scripts/fetch-images.mjs`, or drop your own
files into `public/img/` as `<name>-720.webp` and `<name>-1400.webp`.

**Outfit-change scene:** it works best with one model photographed in the same spot, framing and light for every look. Per-look
`frame` values in `catalog.ts` (`x`, `y`, `scale`, `bright`) line up the body and match the studio grey between shots.

Placeholder imagery is from Unsplash contributors (see `public/img/CREDITS.txt`). Brand, copy, people and addresses are fictional.
Checkout is a front-end demo (cash on delivery or card) — no order is sent and no payment is taken.
