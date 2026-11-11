import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/** Shared easing vocabulary — one motion language for the whole site. */
export const EASE = {
  out: 'expo.out',
  inOut: 'expo.inOut',
  soft: 'power3.out',
  shutter: 'power4.inOut',
};
gsap.defaults({ ease: EASE.out, duration: 1.1 });

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => window.matchMedia('(pointer: fine)').matches;
/** Phones/tablets: lighter effects so scroll-driven scenes hold 60fps. */
export const lite = () => window.matchMedia('(pointer: coarse), (max-width: 900px)').matches;

let lenis: Lenis | null = null;

export function startSmoothScroll() {
  // Smoothing follows the user's own scroll input, so it stays on even with reduced motion —
  // turning it off made the pinned scenes step and stutter.
  if (lenis) return lenis;
  // Touch devices already have native momentum scrolling and Lenis doesn't smooth touch —
  // running it there only adds a second scroll listener and per-frame work.
  if (window.matchMedia('(pointer: coarse)').matches) return null;
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  // keep Lenis' idea of the page height in step with pin spacers after every re-measure
  ScrollTrigger.addEventListener('refresh', () => lenis?.resize());
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export const getLenis = () => lenis;

/** Freeze page scroll while any overlay (keyed) is open. */
const locks = new Set<string>();
export function lockScroll(key: string, locked: boolean) {
  if (locked) locks.add(key);
  else locks.delete(key);
  const on = locks.size > 0;
  document.documentElement.classList.toggle('is-locked', on);
  if (!lenis) return;
  if (on) lenis.stop();
  else lenis.start();
}

export function scrollToId(id: string, force = false) {
  const el = document.getElementById(id);
  if (!el) return;
  // force: también si Lenis está pausado (un panel se estaba cerrando recién)
  if (lenis) lenis.scrollTo(el, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), force });
  else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}

// Arriba de todo (el hero está fijado con ScrollTrigger, así que su posición no sirve de destino)
export function scrollToTop() {
  if (lenis) lenis.scrollTo(0, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
  else window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

export { gsap, ScrollTrigger };

if (import.meta.env.DEV) (window as unknown as { __ST: typeof ScrollTrigger }).__ST = ScrollTrigger;
