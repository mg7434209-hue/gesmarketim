import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, type PublicProduct } from '../lib/api';
import {
  LoadError,
  ProductCard,
  ProductGridSkeleton,
  ProductsEmpty,
} from './product-ui';

type Status = 'loading' | 'ready' | 'error';

export default function ProductGrid() {
  const [status, setStatus] = useState<Status>('loading');
  const [products, setProducts] = useState<PublicProduct[]>([]);

  const load = useCallback(() => {
    let active = true;
    setStatus('loading');
    getProducts()
      .then((data) => {
        if (!active) return;
        setProducts(data);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <section aria-label="Öne çıkan ürünler" className="border-b border-border bg-surface">
      <div className="container-x py-16 sm:py-20">
        <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
              Öne çıkan ürünler
            </h2>
            <p className="mt-2 text-sm text-text-secondary sm:text-base">
              En çok tercih edilen panel, inverter ve batarya modelleri.
            </p>
          </div>
          <Link
            to="/urunler"
            className="hidden shrink-0 text-sm font-semibold text-primary hover:text-accent-dark sm:inline-flex sm:items-center sm:gap-1"
          >
            Tümünü gör <span aria-hidden="true">→</span>
          </Link>
        </div>

        {status === 'loading' && <ProductGridSkeleton count={4} />}

        {status === 'error' && <LoadError onRetry={load} />}

        {status === 'ready' && products.length === 0 && (
          <ProductsEmpty title="Ürünler çok yakında — WhatsApp'tan sorabilirsiniz" />
        )}

        {status === 'ready' && products.length > 0 && (
          <>
            <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {products.slice(0, 8).map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} />
                </li>
              ))}
            </ul>

            <div className="mt-8 text-center sm:hidden">
              <Link
                to="/urunler"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
              >
                Tüm ürünleri gör <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
