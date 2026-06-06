import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCategories,
  getProducts,
  type PublicProduct,
} from '../lib/api';
import {
  LoadError,
  ProductCard,
  ProductGridSkeleton,
  ProductsEmpty,
} from '../components/product-ui';

type Status = 'loading' | 'ready' | 'error';

export default function CategoryPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categoryName, setCategoryName] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setStatus('loading');
    Promise.all([getProducts({ category: slug }), getCategories()])
      .then(([items, categories]) => {
        if (!active) return;
        const match = categories.find((c) => c.slug === slug);
        setCategoryName(match ? match.name : null);
        setProducts(items);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => load(), [load]);

  const title = categoryName ?? 'Kategori';

  return (
    <div className="bg-surface">
      <div className="container-x py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-secondary sm:text-sm">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link to="/" className="font-medium text-primary hover:text-accent-dark">
                Anasayfa
              </Link>
            </li>
            <li aria-hidden="true" className="text-text-secondary/60">
              ›
            </li>
            <li>
              <Link
                to="/kategoriler"
                className="font-medium text-primary hover:text-accent-dark"
              >
                Kategoriler
              </Link>
            </li>
            <li aria-hidden="true" className="text-text-secondary/60">
              ›
            </li>
            <li aria-current="page" className="text-text-secondary">
              {title}
            </li>
          </ol>
        </nav>

        <header className="mt-6 max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
            {title} kategorisindeki ürünler — KDV dahil net fiyatlarla.
          </p>
        </header>

        <div className="mt-10">
          {status === 'loading' && <ProductGridSkeleton count={6} />}

          {status === 'error' && <LoadError onRetry={load} />}

          {status === 'ready' && products.length === 0 && (
            <ProductsEmpty title="Bu kategoride ürünler çok yakında" />
          )}

          {status === 'ready' && products.length > 0 && (
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
