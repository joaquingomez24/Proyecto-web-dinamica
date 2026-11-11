import { forwardRef, type CSSProperties, type ImgHTMLAttributes } from 'react';
import { src, srcSet } from '../lib/img';
import type { Shot } from '../data/catalog';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  name: string;
  pos?: string;
  zoom?: number;
  eager?: boolean;
};

/** Responsive campaign image. `zoom` turns one photograph into a detail crop. */
export const Img = forwardRef<HTMLImageElement, Props>(function Img(
  { name, pos, zoom, eager, sizes = '(max-width: 800px) 100vw, 50vw', alt = '', style, ...rest },
  ref,
) {
  const s: CSSProperties = { objectPosition: pos, ...style };
  if (zoom && zoom !== 1) {
    s.transform = `scale(${zoom})`;
    s.transformOrigin = pos ?? '50% 50%';
  }
  return (
    <img
      ref={ref}
      src={src(name)}
      srcSet={srcSet(name)}
      sizes={sizes}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      style={s}
      {...rest}
    />
  );
});

export const shotProps = (s: Shot) => ({ name: s.name, pos: s.pos, zoom: s.zoom });
