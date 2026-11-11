import { useEffect } from 'react';
import { ShopProvider } from './store/shop';
import { ScrollTrigger, startSmoothScroll } from './lib/motion';
import { Nav } from './components/Nav';
import { Menu } from './components/Menu';
import { Search } from './components/Search';
import { Toast } from './components/Toast';
import { Hero } from './sections/Hero';
import { Shop } from './sections/Shop';
import { Footer } from './sections/Footer';
import { ProductView } from './overlays/ProductView';
import { CartDrawer } from './overlays/CartDrawer';
import { Checkout } from './overlays/Checkout';

export default function App() {
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    startSmoothScroll();
    // fonts change text metrics — re-measure pinned scenes once, early (ScrollTrigger already refreshes on load)
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);

  return (
    <ShopProvider>
      <a className="skip sr-only" href="#shop">
        Ir a la tienda
      </a>
      <Nav />
      <Menu />
      <Search />
      <main>
        <Hero />
        <Shop />
      </main>
      <Footer />
      <ProductView />
      <CartDrawer />
      <Checkout />
      <Toast />
    </ShopProvider>
  );
}
