import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';

/** Región donde viven las Cloud Functions (debe coincidir con functions/src/index.ts). */
export const FUNCTIONS_REGION = 'us-central1';

let appPromise: Promise<FirebaseApp> | null = null;

/**
 * En producción, Firebase Hosting sirve la config del proyecto en /__/firebase/init.json.
 * Así no hay que pegar claves en el repo. En local se puede usar VITE_FIREBASE_CONFIG.
 */
async function cargarOpciones(): Promise<FirebaseOptions> {
  const local = import.meta.env.VITE_FIREBASE_CONFIG;
  if (local) return JSON.parse(local) as FirebaseOptions;

  const res = await fetch('/__/firebase/init.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar la configuración de Firebase.');
  return (await res.json()) as FirebaseOptions;
}

export function getFirebaseApp(): Promise<FirebaseApp> {
  if (!appPromise) {
    appPromise = cargarOpciones()
      .then((opciones) => initializeApp(opciones))
      .catch((error: unknown) => {
        appPromise = null; // permite reintentar
        throw error;
      });
  }
  return appPromise;
}
