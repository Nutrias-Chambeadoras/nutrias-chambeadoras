import { FUNCTIONS_REGION, getFirebaseApp } from './firebase';

const CLAVE_TOKEN = 'nc-push-token';

export type EstadoPush = 'sin-soporte' | 'no-configurado' | 'instalar-ios' | 'pendiente' | 'activo' | 'bloqueado';

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const esStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function estadoInicialPush(): EstadoPush {
  if (!import.meta.env.VITE_FCM_VAPID_KEY) return 'no-configurado';
  // En iPhone/iPad las push solo funcionan con la app instalada en la pantalla de inicio
  if (esIOS() && !esStandalone()) return 'instalar-ios';
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'sin-soporte';
  }
  if (Notification.permission === 'denied') return 'bloqueado';
  if (Notification.permission === 'granted' && localStorage.getItem(CLAVE_TOKEN)) return 'activo';
  return 'pendiente';
}

/** Pide permiso, obtiene el token de FCM y lo suscribe al tema de avisos. */
export async function activarAvisos(): Promise<EstadoPush> {
  const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
  if (!vapidKey) return 'no-configurado';

  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return permiso === 'denied' ? 'bloqueado' : 'pendiente';

  // Messaging y Functions se descargan recién acá, no en la carga del sitio
  const [{ getMessaging, getToken, isSupported }, { getFunctions, httpsCallable }] = await Promise.all([
    import('firebase/messaging'),
    import('firebase/functions'),
  ]);
  if (!(await isSupported())) return 'sin-soporte';

  const app = await getFirebaseApp();
  const registro = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey, serviceWorkerRegistration: registro });

  const suscribir = httpsCallable<{ token: string }, { ok: boolean }>(
    getFunctions(app, FUNCTIONS_REGION),
    'suscribir',
  );
  await suscribir({ token });

  localStorage.setItem(CLAVE_TOKEN, token);
  return 'activo';
}
