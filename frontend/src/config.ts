export const WHATSAPP_NUMBER = '905437434209';
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const WHATSAPP_DISPLAY = '+90 543 743 42 09';

// Public site identity — used for SEO (canonical / Open Graph / JSON-LD).
// Override the base URL per-deploy with VITE_SITE_URL (no trailing slash).
export const SITE_NAME = 'GES MARKETİM';
export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || 'https://gesmarketim.com'
).replace(/\/+$/, '');
export const SITE_TAGLINE =
  'Solar panel, inverter ve enerji ürünleri için ekonomik alışveriş';
export const DEFAULT_DESCRIPTION =
  'GES MARKETİM — güneş paneli, inverter, batarya ve solar aksesuarlarda KDV dahil net fiyatlar. Manavgat (Antalya) deposundan hızlı kargo.';
