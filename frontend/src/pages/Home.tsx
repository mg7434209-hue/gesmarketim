import Hero from '../components/Hero';
import TrustBadges from '../components/TrustBadges';
import CategoryGrid from '../components/CategoryGrid';
import HybridInfo from '../components/HybridInfo';
import ProductGrid from '../components/ProductGrid';
import GespaEnerjiReferral from '../components/GespaEnerjiReferral';

export default function Home() {
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
