import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const basePath = env.VITE_BASE_PATH?.replace(/^\/+|\/+$/g, '');
    return {
        base: basePath ? `/${basePath}/` : '/',
        plugins: [react()],
        server: {
            port: 5173,
            strictPort: true,
            proxy: {
                '/api': {
                    target: env.API_PROXY_TARGET || 'http://127.0.0.1:8080',
                    changeOrigin: true,
                },
            },
        },
        build: {
            sourcemap: false,
            rollupOptions: {
                input: { main: 'index.html', offline: 'offline.html' },
            },
        },
    };
});
