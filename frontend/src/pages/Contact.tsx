import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { WHATSAPP_URL, WHATSAPP_DISPLAY } from '../config';

const SUBJECTS = [
  'Genel Bilgi',
  'Ürün Sorusu',
  'Sipariş / Kargo',
  'İade / Değişim',
  'Diğer',
];

type FormState = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const INITIAL_STATE: FormState = {
  name: '',
  email: '',
  phone: '',
  subject: SUBJECTS[0],
  message: '',
};

export default function Contact() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);

  function handleChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.alert('Mesajınız alındı. Hızlı yanıt için WhatsApp da kullanabilirsiniz.');
    setForm(INITIAL_STATE);
  }

  return (
    <div className="bg-white">
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
              İletişim
            </li>
          </ol>
        </nav>

        <header className="mt-6">
          <h1 className="text-3xl font-bold tracking-tight text-primary md:text-4xl">
            İletişim
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
            Sorularınız, ürün talepleriniz veya kurumsal alımlar için bize aşağıdaki
            kanallardan ulaşabilirsiniz. En hızlı yanıt için WhatsApp tavsiye edilir.
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12">
          <section aria-label="İletişim bilgileri" className="space-y-5">
            <ContactCard
              icon={<WhatsAppIcon />}
              title="WhatsApp"
              value={WHATSAPP_DISPLAY}
              href={WHATSAPP_URL}
              external
              accent
            />
            <ContactCard
              icon={<MailIcon />}
              title="E-posta"
              value="bilgi@gesmarketim.com"
              href="mailto:bilgi@gesmarketim.com"
            />
            <ContactCard
              icon={<PinIcon />}
              title="Adres"
              value="Manavgat · Antalya · Türkiye"
            />
            <ContactCard
              icon={<ClockIcon />}
              title="Çalışma Saatleri"
              value="Pzt-Cmt 09:00-18:00"
            />
          </section>

          <section aria-label="İletişim formu">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 rounded-2xl border border-border bg-surface p-6 sm:p-7"
            >
              <Field
                label="Ad Soyad"
                id="name"
                value={form.name}
                onChange={(v) => handleChange('name', v)}
                required
              />
              <Field
                label="E-posta"
                id="email"
                type="email"
                value={form.email}
                onChange={(v) => handleChange('email', v)}
                required
              />
              <Field
                label="Telefon"
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(v) => handleChange('phone', v)}
              />

              <div>
                <label
                  htmlFor="subject"
                  className="block text-sm font-semibold text-primary"
                >
                  Konu
                </label>
                <select
                  id="subject"
                  value={form.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-semibold text-primary"
                >
                  Mesaj
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
              </div>

              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                Gönder
              </button>

              <p className="text-xs leading-relaxed text-text-secondary">
                Formu göndererek{' '}
                <Link
                  to="/kvkk"
                  className="font-semibold text-primary underline decoration-accent decoration-2 underline-offset-2 hover:text-accent-dark"
                >
                  KVKK Aydınlatma Metni
                </Link>
                'ni okuyup kabul ettiğinizi beyan etmiş olursunuz.
              </p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
};

function Field({ label, id, value, onChange, type = 'text', required }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-primary">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-primary shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
    </div>
  );
}

type ContactCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string;
  href?: string;
  external?: boolean;
  accent?: boolean;
};

function ContactCard({ icon, title, value, href, external, accent }: ContactCardProps) {
  const valueClass = accent
    ? 'mt-1 block text-base font-bold text-primary group-hover:text-accent-dark sm:text-lg'
    : 'mt-1 block text-base font-semibold text-primary sm:text-lg';

  const inner = (
    <>
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          accent ? 'bg-accent text-primary' : 'bg-primary/5 text-primary'
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          {title}
        </p>
        <span className={valueClass}>{value}</span>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="group flex items-start gap-4 rounded-2xl border border-border bg-white p-5 shadow-card transition-colors hover:border-accent"
      >
        {inner}
      </a>
    );
  }

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-border bg-white p-5 shadow-card">
      {inner}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.74.45 3.39 1.31 4.86L2 22l5.34-1.4c1.42.78 3.02 1.19 4.7 1.19 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2Zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23a8.16 8.16 0 0 1-4.1-1.11l-.3-.18-3.05.8.81-2.98-.2-.31a8.264 8.264 0 0 1-1.26-4.4c.01-4.54 3.7-8.24 8.24-8.24Zm-3.51 5.21c-.18 0-.45.06-.69.31-.23.25-.93.91-.93 2.21 0 1.3.95 2.55 1.08 2.72.13.18 1.83 2.93 4.5 4 .63.27 1.13.43 1.51.55.64.2 1.22.17 1.67.1.51-.07 1.6-.65 1.81-1.27.21-.62.21-1.16.15-1.27-.06-.11-.21-.18-.45-.3-.24-.12-1.4-.69-1.61-.77-.21-.08-.37-.12-.52.12-.15.24-.6.77-.74.92-.13.15-.27.17-.51.05-.24-.12-1-.36-1.91-1.18-.71-.63-1.18-1.4-1.32-1.64-.13-.24-.01-.37.11-.5.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.31-.02-.43-.06-.12-.51-1.32-.74-1.79-.2-.41-.4-.41-.54-.42-.14 0-.3-.01-.46-.01Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" />
    </svg>
  );
}
