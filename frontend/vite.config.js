import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(function (_a) {
    var _b;
    var mode = _a.mode;
    var env = loadEnv(mode, process.cwd(), '');
    var apiUrl = (_b = env.VITE_API_URL) !== null && _b !== void 0 ? _b : 'http://localhost:3000';
    return {
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                '/api': {
                    target: apiUrl,
                    changeOrigin: true,
                },
            },
        },
        build: {
            outDir: 'dist',
            // Kaynak haritaları production'a gönderme: kaynak kodu ifşa eder ve
            // deploy artefaktını şişirir. Geliştirmede Vite zaten inline üretir.
            sourcemap: mode !== 'production',
        },
    };
});
