import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Service worker propio: precache + push en un solo archivo (src/sw.ts)
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // Cuando hay versión nueva se activa sola y la página se recarga
      registerType: 'autoUpdate',
      injectRegister: false,
      injectManifest: {
        // El HTML no se precachea: siempre se pide a la red (ver sw.ts).
        // Las fotos tampoco (pesan ~2 MB); el navegador las cachea por su cuenta.
        globPatterns: ['**/*.{js,css,woff2}', 'icons/*.png'],
      },
      manifest: {
        name: 'Nutrias Chambeadoras',
        short_name: 'Nutrias',
        description: 'Intervenidos, sueldo congelado y avisos para las nutrias chambeadoras.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0b0d11',
        theme_color: '#0b0d11',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
