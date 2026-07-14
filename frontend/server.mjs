// GES MARKETİM — frontend statik sunucusu (sıfır bağımlılık).
//
// Railway'de frontend ayrı servis olarak (kök dizin: frontend/) deploy
// edildiğinde SPA'yı servis eder: dist/ altındaki dosyalar + bilinmeyen tüm
// yollar için index.html (client-side routing). `npm start` ile çalışır.
//
// API ayrı serviste; istekler VITE_API_URL ile oraya gider (CORS backend'de).

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const INDEX = path.join(DIST, 'index.html');
const PORT = Number(process.env.PORT ?? 4173);

if (!fs.existsSync(INDEX)) {
  console.error(
    '[frontend] dist/index.html yok — önce `npm run build` çalışmalı. Sunucu başlatılmıyor.',
  );
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

http
  .createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent(
        new URL(req.url ?? '/', 'http://localhost').pathname,
      );
      let file = path.normalize(path.join(DIST, urlPath));
      // Path traversal koruması: dist dışına çıkan istekleri reddet.
      if (file !== DIST && !file.startsWith(DIST + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
      }
      let stat = fs.existsSync(file) ? fs.statSync(file) : null;
      if (stat?.isDirectory()) {
        file = path.join(file, 'index.html');
        stat = fs.existsSync(file) ? fs.statSync(file) : null;
      }
      if (!stat) {
        // SPA fallback: bilinmeyen her yol index.html (client-side routing).
        file = INDEX;
      }
      const ext = path.extname(file).toLowerCase();
      // Vite asset'leri hash'li olduğundan güvenle kalıcı önbelleklenir.
      const immutable = urlPath.startsWith('/assets/');
      res.writeHead(200, {
        'Content-Type': TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': immutable
          ? 'public, max-age=31536000, immutable'
          : 'no-cache',
      });
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      console.error('[frontend] istek hatası', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
    }
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`[frontend] statik sunucu :${PORT} (dist: ${DIST})`);
  });
