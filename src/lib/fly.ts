import { gsap } from './motion';
import { src } from './img';

/** A thumbnail arcs from where the product was added into the bag icon, which then pulses. */
export function flyToCart(from: DOMRect, image: string, pos?: string) {
  const bag = document.querySelector<HTMLElement>('.nav__bag-icon');
  if (!bag || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const to = bag.getBoundingClientRect();
  const size = Math.min(120, Math.max(56, from.width * 0.4));
  const el = document.createElement('div');
  el.className = 'fly';
  el.style.cssText = `width:${size}px;height:${size * 1.25}px;background-image:url(${src(image, 720)});background-position:${pos ?? '50% 30%'}`;
  document.body.appendChild(el);
  const sx = from.left + from.width / 2 - size / 2;
  const sy = from.top + from.height / 2 - (size * 1.25) / 2;
  const tx = to.left + to.width / 2 - size / 2;
  const ty = to.top + to.height / 2 - (size * 1.25) / 2;
  gsap.set(el, { x: sx, y: sy, scale: 0.6, opacity: 0 });
  gsap
    .timeline({ onComplete: () => el.remove() })
    .to(el, { opacity: 1, scale: 1, duration: 0.25, ease: 'power2.out' })
    .to(el, { x: tx, duration: 0.75, ease: 'power2.inOut' }, 0.15)
    .to(el, { y: ty, duration: 0.75, ease: 'back.in(1.4)' }, 0.15)
    .to(el, { scale: 0.12, opacity: 0.2, duration: 0.75, ease: 'power3.in' }, 0.15)
    .fromTo(bag, { scale: 1 }, { scale: 1.35, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.85);
}
