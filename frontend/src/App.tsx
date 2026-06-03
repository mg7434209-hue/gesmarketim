import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Admin from './pages/Admin';
import About from './pages/About';
import Contact from './pages/Contact';
import Kvkk from './pages/Kvkk';
import MesafeliSatis from './pages/MesafeliSatis';
import Cerez from './pages/Cerez';
import OnBilgilendirme from './pages/OnBilgilendirme';
import Categories from './pages/Categories';
import Products from './pages/Products';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/hakkimizda" element={<About />} />
          <Route path="/iletisim" element={<Contact />} />
          <Route path="/kvkk" element={<Kvkk />} />
          <Route path="/mesafeli-satis" element={<MesafeliSatis />} />
          <Route path="/cerez-politikasi" element={<Cerez />} />
          <Route path="/on-bilgilendirme" element={<OnBilgilendirme />} />
          <Route path="/kategoriler" element={<Categories />} />
          <Route path="/urunler" element={<Products />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
