import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import Kvkk from './pages/Kvkk';
import MesafeliSatis from './pages/MesafeliSatis';
import Cerez from './pages/Cerez';
import OnBilgilendirme from './pages/OnBilgilendirme';
import Categories from './pages/Categories';
import CategoryPage from './pages/CategoryPage';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Account from './pages/Account';
import NotFound from './pages/NotFound';
import Sss from './pages/Sss';
import Kargo from './pages/Kargo';
import IadeDegisim from './pages/IadeDegisim';

// Admin paneli (~1600 satır + adminApi) mağaza ziyaretçisinin bundle'ına
// girmesin: sadece /admin ziyaretinde yüklenir.
const Admin = lazy(() => import('./pages/Admin'));

// Reset scroll to the top on every route change — without this, navigating
// (e.g. clicking a product) keeps the previous page's scroll position.
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/admin/*"
            element={
              <Suspense
                fallback={
                  <div className="container-x py-16 text-center text-sm text-text-secondary">
                    Yükleniyor…
                  </div>
                }
              >
                <Admin />
              </Suspense>
            }
          />
          <Route path="/hakkimizda" element={<About />} />
          <Route path="/iletisim" element={<Contact />} />
          <Route path="/kvkk" element={<Kvkk />} />
          <Route path="/mesafeli-satis" element={<MesafeliSatis />} />
          <Route path="/cerez-politikasi" element={<Cerez />} />
          <Route path="/on-bilgilendirme" element={<OnBilgilendirme />} />
          <Route path="/sss" element={<Sss />} />
          <Route path="/kargo" element={<Kargo />} />
          <Route path="/iade-degisim" element={<IadeDegisim />} />
          <Route path="/kategoriler" element={<Categories />} />
          <Route path="/kategori/:slug" element={<CategoryPage />} />
          <Route path="/urunler" element={<Products />} />
          <Route path="/urun/:slug" element={<ProductDetail />} />
          <Route path="/sepet" element={<Cart />} />
          <Route path="/odeme" element={<Checkout />} />
          <Route path="/siparis/:number" element={<OrderConfirmation />} />
          <Route path="/hesabim" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
