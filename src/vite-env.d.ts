/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** JSON con la config web de Firebase. Solo para desarrollo local. */
  readonly VITE_FIREBASE_CONFIG?: string;
  /** Clave pública VAPID de Cloud Messaging (no es secreta). */
  readonly VITE_FCM_VAPID_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
