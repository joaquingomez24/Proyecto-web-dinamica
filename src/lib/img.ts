const BASE = import.meta.env.BASE_URL + 'img/';
export const WIDTHS = [720, 1080, 1400] as const;

export const src = (name: string, w: (typeof WIDTHS)[number] = 1400) => `${BASE}${name}-${w}.webp`;
export const srcSet = (name: string) => WIDTHS.map((w) => `${src(name, w)} ${w}w`).join(', ');
