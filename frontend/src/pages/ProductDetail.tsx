import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getProduct,
  NotFoundError,
  type PublicProduct,
} from '../lib/api';
import {
  AddToCartButton,
  FulfillmentBadge,
  ProductGlyph,
  WhatsAppIcon,
  formatPrice,
  glyphFor,
  primaryImage,
  whatsappProductUrl,
} from '../components/product-ui';
import { useSeo } from '../lib/seo';
import { SITE_NAME, SITE_URL } from '../config';

type Status = 'loading' | 'ready' | 'notfound' | 'error';

export default function ProductDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [product, setProduct] = useState<PublicProduct | null>(null);

  const load = useCallback(() => {
    let active = true;
    setStatus('loading');
    getProduct(slug)
      .then((data) => {
        if (!active) return;
        setProduct(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setStatus(err instanceof NotFoundError ? 'notfound' : 'error');
      });
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => load(), [load]);

  return (
    <div className="bg-surface">
      <div className="container-x py-12">
        {status === 'loading' && <DetailSkeleton />}
        {status === 'notfound' && <NotFound />}
        {status === 'error' && <DetailError onRetry={load} />}
        {status === 'ready' && product && <DetailView product={product} />}
      </div>
    </div>
  );
}

function DetailView({ product }: { product: PublicProduct }) {
  const image = primaryImage(product);
  const [quantity, setQuantity] = useState(1);

  const path = `/urun/${product.slug}`;
  const metaDescription = (
    product.description
      ? product.description.replace(/\s+/g, ' ').trim()
      : `${product.name} — KDV dahil net fiyatla GES MARKETİM'de.`
  ).slice(0, 160);

  useSeo({
    title: product.brand ? `${product.name} — ${product.brand.name}` : product.name,
    description: metaDescription,
    path,
    image: image?.url,
    imageAlt: product.name,
    type: 'product',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        description: metaDescription,
        image: product.images.map((img) => img.url).filter(Boolean),
        sku: product.id,
        ...(product.brand
          ? { brand: { '@type': 'Brand', name: product.brand.name } }
          : {}),
        ...(product.category ? { category: product.category.name } : {}),
        offers: {
          '@type': 'Offer',
          url: `${SITE_URL}${path}`,
          price: product.price.toFixed(2),
          priceCurrency: product.currency,
          availability: product.inStock
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: { '@type': 'Organization', name: SITE_NAME },
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Anasayfa', item: SITE_URL },
          ...(product.category
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: product.category.name,
                  item: `${SITE_URL}/kategori/${product.category.slug}`,
                },
              ]
            : []),
          {
            '@type': 'ListItem',
            position: product.category ? 3 : 2,
            name: product.name,
            item: `${SITE_URL}${path}`,
          },
        ],
      },
    ],
  });

  return (
    <>
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
          {product.category && (
            <>
              <li>
                <Link
                  to={`/kategori/${product.category.slug}`}
                  className="font-medium text-primary hover:text-accent-dark"
                >
                  {product.category.name}
                </Link>
              </li>
              <li aria-hidden="true" className="text-text-secondary/60">
                ›
              </li>
            </>
          )}
          <li aria-current="page" className="truncate text-text-secondary">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl border-2 border-border bg-gradient-to-br from-primary-light/10 via-white to-accent/10 shadow-card">
          {image ? (
            <img
              src={image.url}
              alt={image.alt || product.name}
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-primary/80">
              <ProductGlyph category={glyphFor(product.category?.slug)} size="50%" />
            </div>
          )}
          <div className="absolute left-4 top-4">
            <FulfillmentBadge fulfillment={product.fulfillmentType} withTimeframe />
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.brand && (
            <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              {product.brand.name}
            </p>
          )}
          <h1 className="mt-1.5 text-2xl font-extrabold leading-tight tracking-tight text-primary sm:text-3xl">
            {product.name}
          </h1>

          <div className="mt-5 flex items-end gap-3">
            <p className="text-3xl font-extrabold text-primary sm:text-4xl">
              {formatPrice(product.price)}
            </p>
            <span className="pb-1 text-sm font-medium text-text-secondary">
              KDV dahil
            </span>
          </div>

          <div className="mt-4">
            <FulfillmentBadge fulfillment={product.fulfillmentType} withTimeframe />
          </div>

          {product.description && (
            <div className="mt-6 border-t border-border pt-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
                Ürün Açıklaması
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-text-secondary sm:text-base">
                {product.description}
              </p>
            </div>
          )}

          <div className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="flex items-center rounded-lg border-2 border-border bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex h-12 w-12 items-center justify-center text-xl font-bold text-primary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
                  aria-label="Adet azalt"
                >
                  −
                </button>
                <span
                  className="w-10 text-center text-base font-bold text-primary"
                  aria-live="polite"
                >
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  className="flex h-12 w-12 items-center justify-center text-xl font-bold text-primary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
                  aria-label="Adet artır"
                >
                  +
                </button>
              </div>
              <div className="flex-1">
                <AddToCartButton product={product} quantity={quantity} size="lg" />
              </div>
            </div>

            <a
              href={whatsappProductUrl(product.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary px-6 py-3 text-base font-bold text-primary transition-colors hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              <WhatsAppIcon />
              WhatsApp ile sor
            </a>
            <p className="mt-3 text-xs text-text-secondary">
              Siparişini sepetten tamamlayabilir ya da fiyat, stok ve teslimat detayları
              için WhatsApp üzerinden bize ulaşabilirsin.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border-2 border-dashed border-border bg-white p-10 text-center shadow-card sm:p-14">
      <p className="text-5xl font-extrabold text-accent">404</p>
      <h1 className="mt-4 text-xl font-bold text-primary sm:text-2xl">
        Ürün bulunamadı
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        Aradığın ürün kaldırılmış ya da adresi değişmiş olabilir.
      </p>
      <Link
        to="/kategoriler"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        Kategorilere dön
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function DetailError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border-2 border-dashed border-danger/40 bg-white p-10 text-center shadow-card sm:p-14">
      <h1 className="text-xl font-bold text-primary sm:text-2xl">
        Ürün şu an yüklenemedi
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        Bağlantıda bir sorun oluştu. Lütfen birazdan tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg border-2 border-primary px-5 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        Tekrar dene
      </button>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="h-3 w-48 animate-pulse rounded bg-border/60" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="aspect-square animate-pulse rounded-2xl border-2 border-border bg-border/40" />
        <div className="space-y-4">
          <div className="h-3 w-24 animate-pulse rounded bg-border/60" />
          <div className="h-7 w-3/4 animate-pulse rounded bg-border/60" />
          <div className="h-9 w-1/2 animate-pulse rounded bg-border/60" />
          <div className="h-px w-full bg-border" />
          <div className="h-4 w-full animate-pulse rounded bg-border/50" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-border/50" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-border/50" />
          <div className="mt-4 h-12 w-full animate-pulse rounded-lg bg-border/50 sm:w-48" />
        </div>
      </div>
    </>
  );
}
