import { registerSW } from 'virtual:pwa-register';

const REVISAR_CADA_MS = 15 * 60 * 1000;

/**
 * Registra el service worker. Con registerType "autoUpdate", cuando se publica una
 * versión nueva se activa sola y la página se recarga con el código nuevo.
 */
export function iniciarPwa(): void {
  if (!('serviceWorker' in navigator)) return;

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      const revisar = () => {
        registro.update().catch(() => undefined);
      };
      window.setInterval(revisar, REVISAR_CADA_MS);
      // Al volver a la app (por ejemplo desde segundo plano) se busca versión nueva
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') revisar();
      });
    },
  });
}
