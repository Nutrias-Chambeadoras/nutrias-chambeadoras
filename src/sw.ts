/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

// Versión nueva: tomar el control enseguida (la página se recarga sola)
self.skipWaiting();
clientsClaim();

// JS, CSS e imágenes con hash: se sirven desde caché y se renuevan en cada versión
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// El HTML va siempre a la red primero; la caché solo se usa sin conexión
registerRoute(
  new NavigationRoute(new NetworkFirst({ cacheName: 'nc-paginas', networkTimeoutSeconds: 5 }), {
    denylist: [/^\/__\//],
  }),
);

// ----- Avisos push (Firebase Cloud Messaging) -----
interface Aviso {
  title?: string;
  body?: string;
  url?: string;
}

function leerAviso(event: PushEvent): Aviso {
  if (!event.data) return {};
  try {
    const payload = event.data.json() as { data?: Aviso; notification?: Aviso };
    return { ...payload.notification, ...payload.data };
  } catch {
    return { body: event.data.text() };
  }
}

self.addEventListener('push', (event) => {
  const aviso = leerAviso(event);
  event.waitUntil(
    self.registration.showNotification(aviso.title || 'Nutrias Chambeadoras', {
      body: aviso.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: aviso.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const pedido = (event.notification.data as { url?: string } | null)?.url ?? '/';
  const destino = new URL(pedido, self.location.origin);
  // Solo se abren páginas de este mismo sitio
  const url = destino.origin === self.location.origin ? destino.href : self.location.origin + '/';

  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const ventana of ventanas) {
        if (ventana.url === url) return ventana.focus();
      }
      return self.clients.openWindow(url);
    })(),
  );
});
