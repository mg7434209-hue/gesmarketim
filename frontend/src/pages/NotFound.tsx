import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';

export default function NotFound() {
  useSeo({ title: 'Sayfa bulunamadı', noindex: true });

  return (
    <div className="bg-surface">
      <div className="container-x py-20 text-center sm:py-28">
        <p className="text-6xl font-extrabold tracking-tight text-accent sm:text-7xl">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-primary sm:text-3xl">
          Sayfa bulunamadı
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-text-secondary sm:text-base">
          Aradığınız sayfa taşınmış veya hiç var olmamış olabilir. Aşağıdaki
          bağlantılardan devam edebilirsiniz.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-primary">
            Anasayfaya dön
          </Link>
          <Link to="/urunler" className="btn-secondary">
            Tüm ürünler
          </Link>
        </div>
      </div>
    </div>
  );
}
