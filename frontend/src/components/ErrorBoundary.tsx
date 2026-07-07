import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean };

// Uygulama genelinde beklenmeyen bir render hatası tüm mağazayı beyaz ekrana
// düşürmesin: kullanıcıya Türkçe bir kurtarma ekranı göster.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
        <h1 className="text-2xl font-bold text-primary">Bir şeyler ters gitti</h1>
        <p className="mt-2 max-w-md text-sm text-text-secondary">
          Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi deneyin; sorun sürerse
          WhatsApp üzerinden bize ulaşabilirsiniz.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-primary shadow-sm hover:bg-accent-dark"
        >
          Sayfayı Yenile
        </button>
      </div>
    );
  }
}
