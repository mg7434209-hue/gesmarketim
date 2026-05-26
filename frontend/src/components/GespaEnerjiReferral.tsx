const GESPAENERJI_URL = 'https://gespaenerji.com';

export default function GespaEnerjiReferral() {
  return (
    <section
      aria-label="Kurulum hizmeti referansı"
      className="border-b border-border bg-surface"
    >
      <div className="container-x py-16 sm:py-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-white p-8 shadow-card sm:p-12">
          <div className="flex flex-col items-start gap-8 lg:flex-row lg:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary lg:h-20 lg:w-20">
              <ToolboxIcon />
            </div>

            <div className="flex-1">
              <h2 className="text-2xl font-bold tracking-tight text-primary md:text-3xl">
                Kurulum hizmeti almak ister misiniz?
              </h2>
              <p className="mt-3 text-base leading-relaxed text-text-secondary md:text-lg">
                GES MARKETİM sadece ürün satışı yapar. Profesyonel solar kurulumu için referans
                aldığımız bağımsız firma:
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={GESPAENERJI_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                >
                  GespaEnerji'ye git
                  <ExternalLinkIcon />
                </a>
                <span className="text-xs text-text-secondary sm:text-sm">
                  gespaenerji.com
                </span>
              </div>

              <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-secondary sm:text-sm">
                <strong className="font-semibold text-text-secondary">Bilgilendirme:</strong>{' '}
                GespaEnerji bağımsız bir hizmet sağlayıcıdır. GES MARKETİM, GespaEnerji'nin
                hizmet kalitesinden, kurulumdan veya sonrasındaki süreçlerden sorumlu değildir.
                Kurulum sözleşmesi doğrudan GespaEnerji ile yapılır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolboxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="32"
      height="32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 9h18v11H3z" />
      <path d="M8 9V5h8v4" />
      <line x1="3" y1="13" x2="21" y2="13" />
      <rect x="10" y="11" width="4" height="4" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
