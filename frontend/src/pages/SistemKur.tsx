import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { WHATSAPP_URL } from '../config';
import { getProduct, getProducts, type PublicProduct } from '../lib/api';
import { formatPrice } from '../components/product-ui';
import { useSeo } from '../lib/seo';
import { useCart } from '../cart/CartContext';
import {
  AsistanKapaliError,
  asistanSor,
  CIHAZLAR,
  hesapla,
  PROFILLER,
  POMPA_KADEMELERI,
  SENARYOLAR,
  sendLead,
  urunEslestir,
  VARSAYILAN_ADETLER,
  type AsistanTeklif,
  type GecmisTur,
  type HesaplaRequest,
  type HesaplaSonuc,
  type Senaryo,
} from '../lib/sistemkur';

const AI_KAPALI_MESAJI =
  'Şu an asistana ulaşılamıyor — aşağıdaki hazır senaryolardan devam edebilirsiniz.';

const ORNEKLER = [
  {
    etiket: '🚐 Karavan örneği',
    metin:
      'Karavanda buzdolabı, 4 lamba ve akşamları 2 saat TV kullanıyorum. Bana uygun sistem nedir?',
  },
  {
    etiket: '🌱 Tarımsal örnek',
    metin: '10 beygir dalgıç pompam var, günde 6 saat sulama yapıyorum.',
  },
];

type TeklifSatir = {
  key: string;
  ad: string;
  slug: string;
  adet: number;
  birimFiyat: number;
  product: PublicProduct | null;
};

type Teklif = {
  satirlar: TeklifSatir[];
  toplamTL: number;
  /** Sihirbaz yolunda yapılandırılmış hesap; asistan yolunda null. */
  hesap: HesaplaSonuc | null;
  /** Asistanın hesap özeti metni (yalnız asistan yolunda). */
  ozetMetin: string | null;
  notlar: string[];
  eksikler: string[];
};

export default function SistemKur() {
  useSeo({
    title: 'Sistem Kur — Güneş Enerjisi Sistemi Hesaplayıcı',
    description:
      'İhtiyacınızı yazın, sistemi biz hesaplayalım: panel, inverter ve akü — gerçek stok ve canlı fiyatlarla, saniyeler içinde size özel güneş enerjisi teklifi.',
    path: '/hesaplayici',
  });

  const { add } = useCart();

  // --- Doğal dil / asistan durumu ---
  const [nlText, setNlText] = useState('');
  const [gecmis, setGecmis] = useState<GecmisTur[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiHata, setAiHata] = useState<string | null>(null);

  // --- Sihirbaz durumu ---
  const [senaryo, setSenaryo] = useState<Senaryo | null>(null);
  const [profilId, setProfilId] = useState<string | null>(null);
  const [ozellestir, setOzellestir] = useState(false);
  const [adetler, setAdetler] = useState<Record<string, number>>({});
  const [ozerklik, setOzerklik] = useState(1);
  const [pompaHp, setPompaHp] = useState(10);
  const [pompaSaat, setPompaSaat] = useState(6);
  const [sihirbazBusy, setSihirbazBusy] = useState(false);
  const [sihirbazHata, setSihirbazHata] = useState<string | null>(null);

  // --- Teklif ---
  const [teklif, setTeklif] = useState<Teklif | null>(null);
  const [sepetMesaj, setSepetMesaj] = useState<
    | { ok: true; eklenemeyen: string[] }
    | { ok: false; mesaj: string }
    | null
  >(null);
  const teklifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (teklif) {
      teklifRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [teklif]);

  // -------------------------------------------------------------------------
  // Asistan akışı
  // -------------------------------------------------------------------------

  async function teklifYukleAsistan(t: AsistanTeklif) {
    // Görsel + canlı ürün kaydı için her kalemi katalogdan çek; ulaşılamayan
    // kalem satırda kalır ama sepete eklenemez (uyarı gösterilir).
    const satirlar = await Promise.all(
      t.urunler.map(async (u): Promise<TeklifSatir> => {
        let product: PublicProduct | null = null;
        try {
          product = await getProduct(u.slug);
        } catch {
          product = null;
        }
        return {
          key: u.productId,
          ad: u.ad,
          slug: u.slug,
          adet: u.adet,
          birimFiyat: u.birimFiyat,
          product,
        };
      }),
    );
    setSepetMesaj(null);
    setTeklif({
      satirlar,
      toplamTL: t.toplamTL,
      hesap: null,
      ozetMetin: t.hesapOzeti,
      notlar: [],
      eksikler: [],
    });
  }

  async function aiGonder(metin: string) {
    const mesaj = metin.trim();
    if (!mesaj || aiBusy) return;
    const onceki = gecmis;
    setAiBusy(true);
    setAiHata(null);
    setGecmis([...onceki, { rol: 'user' as const, metin: mesaj }].slice(-10));
    setNlText('');
    try {
      const yanit = await asistanSor(mesaj, onceki);
      setGecmis(
        [
          ...onceki,
          { rol: 'user' as const, metin: mesaj },
          { rol: 'asistan' as const, metin: yanit.metin },
        ].slice(-10),
      );
      if (yanit.tip === 'teklif' && yanit.teklif) {
        await teklifYukleAsistan(yanit.teklif);
      }
    } catch (err) {
      // Başarısız turu geçmişten geri al ki tekrar deneme çift kayıt yazmasın.
      setGecmis(onceki);
      setNlText(mesaj);
      setAiHata(
        err instanceof AsistanKapaliError
          ? AI_KAPALI_MESAJI
          : err instanceof Error
            ? err.message
            : AI_KAPALI_MESAJI,
      );
    } finally {
      setAiBusy(false);
    }
  }

  function handleAiSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void aiGonder(nlText);
  }

  // -------------------------------------------------------------------------
  // Sihirbaz akışı
  // -------------------------------------------------------------------------

  function senaryoSec(id: Senaryo) {
    setSenaryo(id);
    setSihirbazHata(null);
    const profiller = PROFILLER[id];
    if (profiller) {
      // Karavan / bağ evi: hazır profillerle başla ("standart" ön seçili).
      const varsayilan = profiller[1] ?? profiller[0];
      setProfilId(varsayilan.id);
      setAdetler({ ...varsayilan.adetler });
      setOzellestir(false);
    } else {
      setProfilId(null);
      setAdetler({ ...(VARSAYILAN_ADETLER[id] ?? {}) });
      setOzellestir(true);
    }
  }

  function profilSec(id: string) {
    if (!senaryo) return;
    const profil = PROFILLER[senaryo]?.find((p) => p.id === id);
    if (!profil) return;
    setProfilId(id);
    setAdetler({ ...profil.adetler });
  }

  function adetDegistir(cihazId: string, fark: number) {
    setAdetler((prev) => {
      const yeni = Math.max(0, Math.min(100, (prev[cihazId] ?? 0) + fark));
      return { ...prev, [cihazId]: yeni };
    });
  }

  async function sihirbazHesapla() {
    if (!senaryo || sihirbazBusy) return;
    setSihirbazBusy(true);
    setSihirbazHata(null);
    try {
      let req: HesaplaRequest;
      if (senaryo === 'tarimsal_sulama') {
        req = { senaryo, pompa: { hp: pompaHp, gunlukSaat: pompaSaat } };
      } else {
        const cihazlar = CIHAZLAR.filter(
          (c) => c.senaryolar.includes(senaryo) && (adetler[c.id] ?? 0) > 0,
        ).map((c) => ({
          ad: c.ad,
          adet: adetler[c.id],
          watt: c.watt,
          saatGun: c.saatGun,
        }));
        if (cihazlar.length === 0) {
          throw new Error('En az bir cihaz seçin (adedini artırın).');
        }
        req = { senaryo, cihazlar, ozerklikGun: ozerklik };
      }
      const sonuc = await hesapla(req);
      const products = await getProducts({ inStock: true });
      const eslesme = urunEslestir(sonuc, products);
      const satirlar: TeklifSatir[] = eslesme.kalemler.map((k) => ({
        key: k.product.id,
        ad: k.product.name,
        slug: k.product.slug,
        adet: k.adet,
        birimFiyat: k.product.price,
        product: k.product,
      }));
      setSepetMesaj(null);
      setTeklif({
        satirlar,
        toplamTL: satirlar.reduce((s, r) => s + r.birimFiyat * r.adet, 0),
        hesap: sonuc,
        ozetMetin: null,
        notlar: sonuc.notlar,
        eksikler: eslesme.eksikler,
      });
    } catch (err) {
      setSihirbazHata(
        err instanceof Error ? err.message : 'Hesaplama başarısız. Lütfen tekrar deneyin.',
      );
    } finally {
      setSihirbazBusy(false);
    }
  }

  // -------------------------------------------------------------------------
  // Teklif eylemleri
  // -------------------------------------------------------------------------

  function sepeteEkle() {
    if (!teklif) return;
    const eklenemeyen: string[] = [];
    let eklendi = 0;
    for (const satir of teklif.satirlar) {
      if (satir.product && satir.product.inStock) {
        add(satir.product, satir.adet);
        eklendi += 1;
      } else {
        eklenemeyen.push(satir.ad);
      }
    }
    setSepetMesaj(
      eklendi > 0
        ? { ok: true, eklenemeyen }
        : {
            ok: false,
            mesaj:
              'Ürünler sepete eklenemedi — lütfen WhatsApp üzerinden bize ulaşın.',
          },
    );
  }

  const waHref = useMemo(() => {
    if (!teklif) return WHATSAPP_URL;
    const parcalar = [
      'Merhaba! Sistem Kur sayfasından teklifim:',
      ...teklif.satirlar.map(
        (s) => `• ${s.adet} × ${s.ad} — ${formatPrice(s.birimFiyat)}`,
      ),
      `Toplam: ${formatPrice(teklif.toplamTL)}`,
    ];
    if (teklif.hesap) {
      parcalar.push(
        `Tahmini yıllık üretim: ~${Math.round(
          teklif.hesap.tasarruf.yillikUretimKwh,
        )} kWh (≈ ${formatPrice(teklif.hesap.tasarruf.yillikTasarrufTL)} tasarruf)`,
      );
    }
    parcalar.push('Bu sistemi sipariş etmek istiyorum.');
    return `${WHATSAPP_URL}?text=${encodeURIComponent(parcalar.join('\n'))}`;
  }, [teklif]);

  const leadOzet = useMemo(
    () =>
      teklif
        ? {
            kalemler: teklif.satirlar.map(({ ad, slug, adet, birimFiyat }) => ({
              ad,
              slug,
              adet,
              birimFiyat,
            })),
            toplamTL: teklif.toplamTL,
            hesap: teklif.hesap,
            asistanOzeti: teklif.ozetMetin,
          }
        : undefined,
    [teklif],
  );

  const buyukSistem = (teklif?.hesap?.gereksinim.panelWatt ?? 0) > 10000;
  const aktifProfiller = senaryo ? PROFILLER[senaryo] : undefined;
  const aktifCihazlar = senaryo
    ? CIHAZLAR.filter((c) => c.senaryolar.includes(senaryo))
    : [];

  return (
    <div className="bg-white">
      <div className="container-x py-10 md:py-12">
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
              Sistem Kur
            </li>
          </ol>
        </nav>

        {/* ---------------- Doğal dil girişi (varsayılan görünüm) ---------------- */}
        <section aria-label="İhtiyacınızı yazın" className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
            🛠️ İhtiyacınızı yazın, sistemi biz hesaplayalım
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            Cihazlarınızı veya pompanızı kendi cümlelerinizle anlatın; yapay zekâ
            destekli asistanımız ihtiyacınızı hesaplayıp{' '}
            <strong>stoktaki gerçek ürünlerden canlı fiyatlı</strong> bir sistem
            teklifi hazırlasın.
          </p>

          <div className="mt-6 max-w-3xl">
            {gecmis.length > 0 && (
              <div className="mb-4 space-y-3" aria-live="polite">
                {gecmis.map((g, i) => (
                  <div
                    key={`${i}-${g.rol}`}
                    className={g.rol === 'user' ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <p
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        g.rol === 'user'
                          ? 'rounded-br-md bg-primary text-white'
                          : 'rounded-bl-md border border-border bg-surface text-primary'
                      }`}
                    >
                      {g.metin}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {aiBusy && (
              <div
                className="mb-4 max-w-[85%] animate-pulse space-y-2 rounded-2xl rounded-bl-md border border-border bg-surface p-4"
                role="status"
                aria-label="Asistan hesaplıyor"
              >
                <div className="h-2.5 w-3/4 rounded bg-border" />
                <div className="h-2.5 w-1/2 rounded bg-border" />
                <p className="pt-1 text-xs font-semibold text-text-secondary">
                  Asistan hesaplıyor…
                </p>
              </div>
            )}

            {aiHata && (
              <p
                role="alert"
                className="mb-4 rounded-lg bg-warning/10 px-4 py-3 text-sm font-semibold text-primary"
              >
                {aiHata}
              </p>
            )}

            <form onSubmit={handleAiSubmit}>
              <label htmlFor="nl-input" className="sr-only">
                İhtiyacınızı yazın
              </label>
              <textarea
                id="nl-input"
                rows={3}
                value={nlText}
                onChange={(e) => setNlText(e.target.value)}
                placeholder="Örn: Bağ evinde buzdolabı, 5 lamba var; akşamları 3 saat TV izliyoruz…"
                className="w-full rounded-2xl border border-border bg-white px-4 py-3.5 text-base text-primary shadow-card focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={aiBusy || nlText.trim().length === 0}
                  className="btn-primary w-full text-base disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                  {aiBusy ? 'Hesaplanıyor…' : '⚡ Hesapla'}
                </button>
                <div className="flex flex-wrap gap-2">
                  {ORNEKLER.map((o) => (
                    <button
                      key={o.etiket}
                      type="button"
                      disabled={aiBusy}
                      onClick={() => {
                        setNlText(o.metin);
                        void aiGonder(o.metin);
                      }}
                      className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent hover:text-primary disabled:opacity-60"
                    >
                      {o.etiket}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </section>

        {/* ---------------- Hazır senaryolar (ikincil) ---------------- */}
        <section aria-label="Hazır senaryolar" className="mt-12">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-text-secondary">
              veya hazır senaryodan başlayın
            </h2>
            <span className="h-px flex-1 bg-border" aria-hidden="true" />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SENARYOLAR.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => senaryoSec(s.id)}
                aria-pressed={senaryo === s.id}
                className={`rounded-xl border p-3.5 text-left transition-colors ${
                  senaryo === s.id
                    ? 'border-accent bg-accent/10'
                    : 'border-border bg-white hover:border-accent/60'
                }`}
              >
                <span className="text-xl" aria-hidden="true">
                  {s.emoji}
                </span>
                <span className="mt-1.5 block text-sm font-bold text-primary">{s.ad}</span>
                <span className="mt-1 hidden text-xs leading-snug text-text-secondary sm:block">
                  {s.aciklama}
                </span>
              </button>
            ))}
          </div>

          {senaryo === 'tarimsal_sulama' && (
            <div className="mt-6 max-w-xl rounded-2xl border border-border bg-surface p-5 sm:p-6">
              <h3 className="text-base font-bold text-primary">🌱 Pompanızı seçin</h3>
              <p className="mt-1 text-xs text-text-secondary">
                Tarımsal sulamada akü kullanılmaz — pompa gündüz doğrudan güneşten çalışır.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pompa-hp" className="block text-sm font-semibold text-primary">
                    Pompa gücü
                  </label>
                  <select
                    id="pompa-hp"
                    value={pompaHp}
                    onChange={(e) => setPompaHp(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    {POMPA_KADEMELERI.map((k) => (
                      <option key={k.hp} value={k.hp}>
                        {k.hp} HP ({k.kw} kW)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="pompa-saat" className="block text-sm font-semibold text-primary">
                    Günlük sulama (saat)
                  </label>
                  <input
                    id="pompa-saat"
                    type="number"
                    min={0.5}
                    max={24}
                    step={0.5}
                    value={pompaSaat}
                    onChange={(e) => setPompaSaat(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
              </div>
            </div>
          )}

          {senaryo && senaryo !== 'tarimsal_sulama' && (
            <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
              {aktifProfiller && (
                <>
                  <h3 className="text-base font-bold text-primary">Hazır profil seçin</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {aktifProfiller.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => profilSec(p.id)}
                        aria-pressed={profilId === p.id}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          profilId === p.id
                            ? 'border-accent bg-white shadow-card'
                            : 'border-border bg-white hover:border-accent/60'
                        }`}
                      >
                        <span className="block text-sm font-bold text-primary">{p.ad}</span>
                        <span className="mt-1 block text-xs leading-snug text-text-secondary">
                          {p.aciklama}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOzellestir((v) => !v)}
                    aria-expanded={ozellestir}
                    className="mt-4 text-sm font-semibold text-primary underline decoration-accent decoration-2 underline-offset-2 hover:text-accent-dark"
                  >
                    {ozellestir ? 'Cihaz listesini gizle' : '⚙️ Özelleştir — cihazları düzenle'}
                  </button>
                </>
              )}

              {(ozellestir || !aktifProfiller) && (
                <div className="mt-4">
                  <h3 className="text-base font-bold text-primary">Cihazlarınız ve adetleri</h3>
                  <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {aktifCihazlar.map((c) => {
                      const adet = adetler[c.id] ?? 0;
                      return (
                        <div
                          key={c.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3 ${
                            adet > 0 ? 'border-accent' : 'border-border'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-primary">
                              <span aria-hidden="true">{c.emoji}</span> {c.ad}
                            </p>
                            <p className="text-xs text-text-secondary">
                              {c.watt} W × {c.saatGun} sa/gün
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => adetDegistir(c.id, -1)}
                              aria-label={`${c.ad} adedini azalt`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-primary hover:bg-surface"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-primary">
                              {adet}
                            </span>
                            <button
                              type="button"
                              onClick={() => adetDegistir(c.id, +1)}
                              aria-label={`${c.ad} adedini artır`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-primary hover:bg-surface"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 max-w-xs">
                <label htmlFor="ozerklik" className="block text-sm font-semibold text-primary">
                  Akü yedeği (güneşsiz gün)
                </label>
                <select
                  id="ozerklik"
                  value={ozerklik}
                  onChange={(e) => setOzerklik(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value={0}>Akü istemiyorum</option>
                  <option value={1}>1 gün (önerilen)</option>
                  <option value={2}>2 gün</option>
                  <option value={3}>3 gün</option>
                </select>
              </div>
            </div>
          )}

          {senaryo && (
            <div className="mt-5">
              {sihirbazHata && (
                <p
                  role="alert"
                  className="mb-3 rounded-lg bg-danger/10 px-4 py-3 text-sm font-semibold text-danger"
                >
                  {sihirbazHata}
                </p>
              )}
              <button
                type="button"
                onClick={() => void sihirbazHesapla()}
                disabled={sihirbazBusy}
                className="btn-primary w-full text-base disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {sihirbazBusy ? 'Hesaplanıyor…' : '⚡ Sistemi Hesapla'}
              </button>
            </div>
          )}
        </section>

        {/* ---------------- Teklif kartı ---------------- */}
        {teklif && (
          <section aria-label="Sistem teklifi" className="mt-12" ref={teklifRef}>
            <div className="overflow-hidden rounded-2xl border-2 border-accent bg-white shadow-card">
              <div className="border-b border-border bg-accent/10 px-5 py-4 sm:px-6">
                <h2 className="text-lg font-bold text-primary sm:text-xl">
                  ☀️ Size Özel Sistem Teklifi
                </h2>
                {teklif.ozetMetin && (
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                    {teklif.ozetMetin}
                  </p>
                )}
              </div>

              <ul className="divide-y divide-border">
                {teklif.satirlar.map((s) => (
                  <li key={s.key} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface">
                      {s.product?.images?.length ? (
                        <img
                          src={
                            (
                              s.product.images.find((i) => i.isPrimary) ??
                              s.product.images[0]
                            ).url
                          }
                          alt={s.ad}
                          width={56}
                          height={56}
                          loading="lazy"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span aria-hidden="true">☀️</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/urun/${s.slug}`}
                        className="block truncate text-sm font-semibold text-primary hover:text-accent-dark"
                      >
                        {s.ad}
                      </Link>
                      <p className="text-xs text-text-secondary">
                        {s.adet} adet × {formatPrice(s.birimFiyat)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-primary">
                      {formatPrice(s.birimFiyat * s.adet)}
                    </p>
                  </li>
                ))}
              </ul>

              {teklif.eksikler.length > 0 && (
                <div className="border-t border-border bg-warning/10 px-5 py-3 sm:px-6">
                  {teklif.eksikler.map((e) => (
                    <p key={e} className="text-sm font-semibold text-primary">
                      ⚠️ {e}{' '}
                      <a
                        href={WHATSAPP_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-accent decoration-2 underline-offset-2"
                      >
                        WhatsApp'tan sorun
                      </a>
                      .
                    </p>
                  ))}
                </div>
              )}

              {teklif.hesap && (
                <div className="border-t border-border bg-surface px-5 py-3 sm:px-6">
                  <p className="text-sm font-semibold text-primary">
                    💡 Bu sistem yılda ~
                    {Math.round(teklif.hesap.tasarruf.yillikUretimKwh).toLocaleString('tr-TR')}{' '}
                    kWh üretir ≈{' '}
                    <strong>{formatPrice(teklif.hesap.tasarruf.yillikTasarrufTL)}</strong>{' '}
                    fatura tasarrufu.
                  </p>
                  {teklif.notlar.map((n) => (
                    <p key={n} className="mt-1 text-xs text-text-secondary">
                      {n}
                    </p>
                  ))}
                </div>
              )}

              <div className="border-t border-border px-5 py-5 sm:px-6">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-text-secondary">
                    Toplam (KDV dahil)
                  </span>
                  <span className="text-2xl font-bold text-primary sm:text-3xl">
                    {formatPrice(teklif.toplamTL)}
                  </span>
                </div>

                {sepetMesaj && (
                  <div
                    role="alert"
                    className={`mt-4 rounded-lg px-4 py-3 text-sm font-semibold ${
                      sepetMesaj.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}
                  >
                    {sepetMesaj.ok ? (
                      <>
                        Sistem sepete eklendi.{' '}
                        <Link to="/sepet" className="underline underline-offset-2">
                          Sepete git →
                        </Link>
                        {sepetMesaj.eklenemeyen.length > 0 && (
                          <span className="mt-1 block font-medium text-primary">
                            Eklenemeyen: {sepetMesaj.eklenemeyen.join(', ')}
                          </span>
                        )}
                      </>
                    ) : (
                      sepetMesaj.mesaj
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={sepeteEkle}
                    className="btn-primary w-full text-base sm:flex-1"
                  >
                    🛒 Sistemi sepete ekle
                  </button>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary w-full text-base sm:flex-1"
                  >
                    WhatsApp ile devam et
                  </a>
                  <EmailTeklifButonu ozet={leadOzet} />
                </div>
              </div>
            </div>

            {/* ---------------- Uyarı + ücretsiz doğrulama ---------------- */}
            <div
              className={`mt-5 rounded-2xl border p-5 sm:p-6 ${
                buyukSistem
                  ? 'border-2 border-warning bg-warning/10'
                  : 'border-border bg-surface'
              }`}
            >
              <p className="text-sm leading-relaxed text-primary">
                ⚠️ Bu hesaplama, verdiğiniz bilgilere dayalı bir{' '}
                <strong>ön simülasyondur</strong>. Çatı yönü, gölgelenme, kablo mesafesi
                ve kurulum koşulları sonucu etkileyebilir. Kesin sistem tasarımı için
                sipariş öncesi <strong>ücretsiz proje doğrulaması</strong> alın.
                {buyukSistem && (
                  <span className="mt-1 block font-semibold">
                    Sisteminiz 10 kW'ın üzerinde — bu ölçekte uzman doğrulaması özellikle
                    önerilir.
                  </span>
                )}
              </p>
              <DogrulamaFormu ozet={leadOzet} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// "Teklifi e-posta ile al" — lead (tip=pdf) kaydı; PDF üretimi sonraki faz.
// ---------------------------------------------------------------------------

function EmailTeklifButonu({ ozet }: { ozet: unknown }) {
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState('');
  const [telefon, setTelefon] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sonuc, setSonuc] = useState<{ ok: boolean; mesaj: string } | null>(null);

  async function gonder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSonuc(null);
    try {
      await sendLead({ tip: 'pdf', ad, telefon, email, ozet });
      setSonuc({
        ok: true,
        mesaj: 'Talebiniz alındı — teklifiniz en kısa sürede e-posta ile iletilecek.',
      });
    } catch (err) {
      setSonuc({
        ok: false,
        mesaj:
          err instanceof Error ? err.message : 'Kayıt başarısız. Lütfen tekrar deneyin.',
      });
    } finally {
      setBusy(false);
    }
  }

  if (!acik) {
    return (
      <button
        type="button"
        onClick={() => setAcik(true)}
        className="btn-secondary w-full text-base sm:flex-1"
      >
        ✉️ Teklifi e-posta ile al
      </button>
    );
  }

  return (
    <form
      onSubmit={gonder}
      className="w-full rounded-xl border border-border bg-surface p-4 sm:flex-1"
    >
      {sonuc?.ok ? (
        <p role="alert" className="text-sm font-semibold text-success">
          {sonuc.mesaj}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2">
            <input
              type="text"
              required
              minLength={2}
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Ad Soyad"
              aria-label="Ad Soyad"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <input
              type="tel"
              required
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              placeholder="Telefon (05xx xxx xx xx)"
              aria-label="Telefon"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta"
              aria-label="E-posta"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          {sonuc && !sonuc.ok && (
            <p role="alert" className="mt-2 text-xs font-semibold text-danger">
              {sonuc.mesaj}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="btn-primary mt-2 w-full text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Gönderiliyor…' : 'Teklifi gönder'}
          </button>
        </>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Ücretsiz proje doğrulaması formu — lead (tip=dogrulama)
// ---------------------------------------------------------------------------

function DogrulamaFormu({ ozet }: { ozet: unknown }) {
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState('');
  const [telefon, setTelefon] = useState('');
  const [busy, setBusy] = useState(false);
  const [sonuc, setSonuc] = useState<{ ok: boolean; mesaj: string } | null>(null);

  async function gonder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setSonuc(null);
    try {
      await sendLead({ tip: 'dogrulama', ad, telefon, ozet });
      setSonuc({
        ok: true,
        mesaj: '✅ Talebiniz alındı — uzmanımız en geç 1 iş günü içinde arayacak.',
      });
    } catch (err) {
      setSonuc({
        ok: false,
        mesaj:
          err instanceof Error ? err.message : 'Kayıt başarısız. Lütfen tekrar deneyin.',
      });
    } finally {
      setBusy(false);
    }
  }

  if (sonuc?.ok) {
    return (
      <p role="alert" className="mt-4 text-sm font-bold text-success">
        {sonuc.mesaj}
      </p>
    );
  }

  if (!acik) {
    return (
      <button type="button" onClick={() => setAcik(true)} className="btn-primary mt-4">
        📞 Ücretsiz proje doğrulaması iste
      </button>
    );
  }

  return (
    <form onSubmit={gonder} className="mt-4 flex max-w-xl flex-col gap-2 sm:flex-row">
      <input
        type="text"
        required
        minLength={2}
        value={ad}
        onChange={(e) => setAd(e.target.value)}
        placeholder="Ad Soyad"
        aria-label="Ad Soyad"
        className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <input
        type="tel"
        required
        value={telefon}
        onChange={(e) => setTelefon(e.target.value)}
        placeholder="Telefon (05xx xxx xx xx)"
        aria-label="Telefon"
        className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      <div className="flex flex-col gap-1">
        <button
          type="submit"
          disabled={busy}
          className="btn-primary whitespace-nowrap text-sm disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? 'Gönderiliyor…' : 'Ara beni'}
        </button>
        {sonuc && !sonuc.ok && (
          <p role="alert" className="text-xs font-semibold text-danger">
            {sonuc.mesaj}
          </p>
        )}
      </div>
    </form>
  );
}
