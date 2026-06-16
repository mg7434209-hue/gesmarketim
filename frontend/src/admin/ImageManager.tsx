import { useRef, useState } from 'react';
import { adminApi, AdminApiError } from './adminApi';
import { btnGhost, inputCls, labelCls } from './ui';

export type ManagedImage = { url: string; alt?: string; isPrimary?: boolean };

const MAX_FILE_MB = 8;

export default function ImageManager({
  value,
  onChange,
  uploadEnabled,
}: {
  value: ManagedImage[];
  onChange: (images: ManagedImage[]) => void;
  uploadEnabled: boolean;
}) {
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function normalizePrimary(list: ManagedImage[]): ManagedImage[] {
    if (list.length === 0) return list;
    if (list.some((i) => i.isPrimary)) {
      // keep only the first primary
      let seen = false;
      return list.map((i) => {
        if (i.isPrimary && !seen) {
          seen = true;
          return i;
        }
        return { ...i, isPrimary: false };
      });
    }
    return list.map((i, idx) => ({ ...i, isPrimary: idx === 0 }));
  }

  function addUrl() {
    const url = urlInput.trim();
    if (!url) return;
    if (value.some((i) => i.url === url)) {
      setError('Bu görsel zaten ekli.');
      return;
    }
    setError(null);
    onChange(normalizePrimary([...value, { url, isPrimary: value.length === 0 }]));
    setUrlInput('');
  }

  function removeAt(idx: number) {
    onChange(normalizePrimary(value.filter((_, i) => i !== idx)));
  }

  function setPrimary(idx: number) {
    onChange(value.map((i, n) => ({ ...i, isPrimary: n === idx })));
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`Görsel ${MAX_FILE_MB}MB'den küçük olmalı.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const dataUrl = await readAsDataUrl(file);
      const { url } = await adminApi.uploads.upload(dataUrl);
      onChange(normalizePrimary([...value, { url, isPrimary: value.length === 0 }]));
    } catch (err) {
      if (err instanceof AdminApiError) {
        setError(err.message);
      } else {
        setError('Yükleme başarısız.');
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className={labelCls}>Görseller</label>

      {value.length > 0 && (
        <ul className="mb-3 space-y-2">
          {value.map((img, idx) => (
            <li
              key={img.url + idx}
              className="flex items-center gap-3 rounded-lg border border-border bg-white p-2"
            >
              <img
                src={img.url}
                alt={img.alt ?? ''}
                className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.3';
                }}
              />
              <span className="min-w-0 flex-1 truncate text-xs text-text-secondary">{img.url}</span>
              <label className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                <input
                  type="radio"
                  name="primary-image"
                  checked={Boolean(img.isPrimary)}
                  onChange={() => setPrimary(idx)}
                  className="h-3.5 w-3.5 text-accent focus:ring-accent"
                />
                Kapak
              </label>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="rounded p-1 text-text-secondary hover:bg-surface disabled:opacity-30" aria-label="Yukarı">▲</button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === value.length - 1} className="rounded p-1 text-text-secondary hover:bg-surface disabled:opacity-30" aria-label="Aşağı">▼</button>
                <button type="button" onClick={() => removeAt(idx)} className="rounded p-1 text-danger hover:bg-danger/10" aria-label="Sil">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          className={inputCls}
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="Görsel URL'si yapıştır…"
        />
        <button type="button" className={btnGhost} onClick={addUrl}>Ekle</button>
      </div>

      {uploadEnabled && (
        <div className="mt-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          <button
            type="button"
            className={btnGhost + ' w-full'}
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Yükleniyor…' : '⬆ Dosyadan görsel yükle'}
          </button>
        </div>
      )}

      {!uploadEnabled && (
        <p className="mt-2 text-xs text-text-secondary">
          Dosya yükleme için Cloudinary anahtarlarını ayarla; şimdilik görsel URL'si yapıştırabilirsin.
        </p>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read_error'));
    reader.readAsDataURL(file);
  });
}
