import { Link } from 'react-router-dom';
import { useCart } from '../cart/CartContext';
import { formatPrice, FulfillmentBadge } from '../components/product-ui';
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING, shippingFor } from '../lib/shipping';
import { useSeo } from '../lib/seo';

export default function Cart() {
  useSeo({ title: 'Sepetim', path: '/sepet', noindex: true });
  const { items, subtotal, setQuantity, remove } = useCart();

  const shipping = shippingFor(subtotal);
  const total = subtotal + shipping;
  const remainingForFree = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <div className="bg-surface">
      <div className="container-x py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-text-secondary sm:text-sm">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="font-medium text-primary hover:text-accent-dark">
                Anasayfa
              </Link>
            </li>
            <li aria-hidden="true" className="text-text-secondary/60">
              ›
            </li>
            <li aria-current="page" className="text-text-secondary">
              Sepetim
            </li>
          </ol>
        </nav>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-primary md:text-4xl">
          Sepetim
        </h1>

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* Items */}
            <ul className="flex-1 space-y-4">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-border bg-white p-4 shadow-card"
                >
                  <Link
                    to={`/urun/${item.slug}`}
                    className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary-light/10 via-surface to-accent/10"
                  >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-2xl text-primary/40">
                        ☀
                      </span>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/urun/${item.slug}`}
                        className="line-clamp-2 text-sm font-bold leading-snug text-primary hover:text-accent-dark"
                      >
                        {item.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="shrink-0 rounded-md p-1 text-text-secondary hover:bg-surface hover:text-danger focus:outline-none focus:ring-2 focus:ring-accent"
                        aria-label={`${item.name} sepetten çıkar`}
                      >
                        <TrashIcon />
                      </button>
                    </div>

                    <div className="mt-1">
                      <FulfillmentBadge fulfillment={item.fulfillmentType} />
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                      <div className="flex items-center rounded-lg border border-border">
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.quantity - 1)}
                          className="flex h-9 w-9 items-center justify-center text-lg font-bold text-primary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
                          aria-label="Adet azalt"
                        >
                          −
                        </button>
                        <span className="w-9 text-center text-sm font-bold text-primary">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity(item.id, item.quantity + 1)}
                          className="flex h-9 w-9 items-center justify-center text-lg font-bold text-primary hover:bg-surface focus:outline-none focus:ring-2 focus:ring-accent focus:ring-inset"
                          aria-label="Adet artır"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-base font-extrabold text-primary">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Summary */}
            <aside className="lg:w-80 lg:shrink-0">
              <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
                <h2 className="text-lg font-bold text-primary">Sipariş Özeti</h2>

                <dl className="mt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Ara toplam</dt>
                    <dd className="font-bold text-primary">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Kargo</dt>
                    <dd className="font-bold text-primary">
                      {shipping === 0 ? 'Ücretsiz' : formatPrice(shipping)}
                    </dd>
                  </div>
                </dl>

                {remainingForFree > 0 && (
                  <p className="mt-3 rounded-lg bg-accent/10 px-3 py-2 text-xs leading-relaxed text-primary">
                    <strong>{formatPrice(remainingForFree)}</strong> daha ekle, kargo{' '}
                    <strong>ücretsiz</strong> olsun.
                  </p>
                )}

                <div className="mt-4 flex justify-between border-t border-border pt-4">
                  <span className="text-base font-bold text-primary">Toplam</span>
                  <span className="text-xl font-extrabold text-primary">
                    {formatPrice(total)}
                  </span>
                </div>
                <p className="mt-1 text-right text-[11px] text-text-secondary">KDV dahil</p>

                <Link
                  to="/odeme"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-base font-bold text-primary shadow-sm transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                >
                  Siparişi Tamamla
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  to="/urunler"
                  className="mt-3 block text-center text-sm font-semibold text-primary hover:text-accent-dark"
                >
                  Alışverişe devam et
                </Link>
              </div>

              <p className="mt-4 px-1 text-xs leading-relaxed text-text-secondary">
                {FLAT_SHIPPING > 0 && (
                  <>
                    {formatPrice(FREE_SHIPPING_THRESHOLD)} ve üzeri siparişlerde kargo
                    ücretsiz. Aksi halde {formatPrice(FLAT_SHIPPING)} kargo ücreti uygulanır.
                  </>
                )}
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyCart() {
  return (
    <div className="mt-8 rounded-2xl border-2 border-dashed border-border bg-white p-10 text-center shadow-card sm:p-16">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-primary">
        <CartIcon />
      </div>
      <h2 className="mt-5 text-xl font-bold text-primary">Sepetin boş</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        Solar ürünlerimize göz at, beğendiklerini sepete ekle ve siparişini birkaç adımda
        tamamla.
      </p>
      <Link
        to="/urunler"
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-bold text-primary shadow-sm transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        Ürünleri keşfet
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="30"
      height="30"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
