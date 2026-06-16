import Hero from '../components/Hero';
import TrustBadges from '../components/TrustBadges';
import CategoryGrid from '../components/CategoryGrid';
import HybridInfo from '../components/HybridInfo';
import ProductGrid from '../components/ProductGrid';
import GespaEnerjiReferral from '../components/GespaEnerjiReferral';
import { useSeo } from '../lib/seo';
import { SITE_NAME, SITE_URL } from '../config';

export default function Home() {
  useSeo({
    path: '/',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.svg`,
        sameAs: ['https://gespaenerji.com'],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+90 543 743 42 09',
          contactType: 'customer service',
          areaServed: 'TR',
          availableLanguage: 'Turkish',
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_URL}/urunler?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  });

  return (
    <>
      <Hero />
      <TrustBadges />
      <CategoryGrid />
      <HybridInfo />
      <ProductGrid />
      <GespaEnerjiReferral />
    </>
  );
}
