import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts, type PublicProduct } from '../lib/api';
import { formatPrice, primaryImage, ProductGlyph, glyphFor } from './product-ui';

type Props = { onNavigate?: () => void; autoFocus?: boolean };

export default function SearchBox({ onNavigate, autoFocus }: Props) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<PublicProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Debounced search as the user types.
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      let active = true;
      getProducts({ q })
        .then((items) => {
          if (!active) return;
          setResults(items.slice(0, 6));
          setActive(-1);
        })
        .catch(() => active && setResults([]))
        .finally(() => active && setLoading(false));
      return () => {
        active = false;
      };
    }, 250);
    return () => clearTimeout(t);
  }, [term]);

  // Close when clicking outside.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function go(to: string) {
    setOpen(false);
    setTerm('');
    setResults([]);
    onNavigate?.();
    navigate(to);
  }

  function submit() {
    const q = term.trim();
    if (active >= 0 && results[active]) {
      go(`/urun/${results[active].slug}`);
    } else if (q.length > 0) {
      go(`/urunler?q=${encodeURIComponent(q)}`);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showPanel = open && term.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
          <SearchIcon />
        </span>
        <input
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          autoFocus={autoFocus}
          value={term}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Ürün ara…"
          className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-primary placeholder:text-text-secondary/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      {showPanel && (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-white shadow-lg"
        >
          {loading && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">Aranıyor…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-secondary">
              Sonuç bulunamadı. <span className="text-text-secondary/70">Enter ile tüm aramayı deneyin.</span>
            </p>
          ) : (
            <ul>
              {results.map((p, i) => {
                const img = primaryImage(p);
                return (
                  <li key={p.id} role="option" aria-selected={i === active}>
                    <button
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(`/urun/${p.slug}`)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                        i === active ? 'bg-surface' : 'hover:bg-surface'
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface text-primary/70">
                        {img ? (
                          <img
                            src={img.url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <ProductGlyph category={glyphFor(p.category?.slug)} size="60%" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-primary">
                          {p.name}
                        </span>
                        {p.brand && (
                          <span className="block truncate text-xs text-text-secondary">
                            {p.brand.name}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-bold text-primary">
                        {formatPrice(p.price)}
                      </span>
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  onClick={() => go(`/urunler?q=${encodeURIComponent(term.trim())}`)}
                  className="block w-full border-t border-border px-4 py-2.5 text-center text-sm font-semibold text-accent-dark hover:bg-surface"
                >
                  “{term.trim()}” için tüm sonuçlar →
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
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
      focusable="false"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
