import { useEffect } from 'react';
import {
  SITE_NAME,
  SITE_URL,
  SITE_TAGLINE,
  DEFAULT_DESCRIPTION,
} from '../config';

export type SeoInput = {
  /** Page title without the brand suffix. Omit on the home page. */
  title?: string;
  description?: string;
  /** Canonical path (e.g. "/urunler"). Defaults to the current location. */
  path?: string;
  /** Absolute or site-relative image URL for social cards. */
  image?: string;
  /** Open Graph object type. */
  type?: 'website' | 'product' | 'article';
  /** Keep the page out of search indexes (cart, checkout, admin…). */
  noindex?: boolean;
  /** Structured data injected as <script type="application/ld+json">. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[] | null;
};

const FALLBACK_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

function absoluteUrl(pathOrUrl?: string): string | undefined {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/** Create or update a managed <meta>/<link> tag, keyed by a CSS selector. */
function upsert(
  selector: string,
  create: () => HTMLElement,
  apply: (el: HTMLElement) => void,
): void {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    el.setAttribute('data-seo', '');
    document.head.appendChild(el);
  }
  apply(el);
}

function metaName(name: string, content: string | undefined): void {
  if (!content) return;
  upsert(
    `meta[name="${name}"]`,
    () => {
      const m = document.createElement('meta');
      m.setAttribute('name', name);
      return m;
    },
    (el) => el.setAttribute('content', content),
  );
}

function metaProp(property: string, content: string | undefined): void {
  if (!content) return;
  upsert(
    `meta[property="${property}"]`,
    () => {
      const m = document.createElement('meta');
      m.setAttribute('property', property);
      return m;
    },
    (el) => el.setAttribute('content', content),
  );
}

/**
 * Sets the document title, meta description, canonical link, Open Graph /
 * Twitter cards and (optionally) JSON-LD structured data for the current page.
 *
 * Lightweight on purpose — no react-helmet dependency. Tags are reused across
 * route changes, so navigating between pages overwrites rather than stacks.
 */
export function useSeo(input: SeoInput): void {
  const {
    title,
    description = DEFAULT_DESCRIPTION,
    path,
    image,
    type = 'website',
    noindex = false,
    jsonLd = null,
  } = input;

  const fullTitle = title ? `${title} | ${SITE_NAME}` : FALLBACK_TITLE;
  const canonical = absoluteUrl(
    path ?? (typeof window !== 'undefined' ? window.location.pathname : '/'),
  );
  const imageUrl = absoluteUrl(image);
  const jsonLdString = jsonLd
    ? JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd])
    : null;

  useEffect(() => {
    document.title = fullTitle;

    metaName('description', description);
    metaName('robots', noindex ? 'noindex, nofollow' : 'index, follow');

    upsert(
      'link[rel="canonical"]',
      () => {
        const l = document.createElement('link');
        l.setAttribute('rel', 'canonical');
        return l;
      },
      (el) => canonical && el.setAttribute('href', canonical),
    );

    metaProp('og:site_name', SITE_NAME);
    metaProp('og:title', fullTitle);
    metaProp('og:description', description);
    metaProp('og:type', type);
    metaProp('og:url', canonical);
    metaProp('og:image', imageUrl);
    metaProp('og:locale', 'tr_TR');

    metaName('twitter:card', imageUrl ? 'summary_large_image' : 'summary');
    metaName('twitter:title', fullTitle);
    metaName('twitter:description', description);
    metaName('twitter:image', imageUrl);

    const scriptSel = 'script[type="application/ld+json"][data-seo]';
    const existing = document.head.querySelector(scriptSel);
    if (jsonLdString) {
      if (existing) {
        existing.textContent = jsonLdString;
      } else {
        const s = document.createElement('script');
        s.setAttribute('type', 'application/ld+json');
        s.setAttribute('data-seo', '');
        s.textContent = jsonLdString;
        document.head.appendChild(s);
      }
    } else if (existing) {
      existing.remove();
    }
  }, [
    fullTitle,
    description,
    canonical,
    imageUrl,
    type,
    noindex,
    jsonLdString,
  ]);
}
