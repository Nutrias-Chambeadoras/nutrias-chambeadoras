# Nutrias Chambeadoras

PWA instalable con contador de intervención, sueldo y aguinaldo, panel admin y avisos push.

## Stack

- **App:** Vite + React + TypeScript (`src/`), PWA con `vite-plugin-pwa`.
- **Datos:** Firestore, documento `site/config`. Lo lee cualquiera y lo edita solo un admin.
- **Admin:** `/admin`, login con Google. Admin es quien tenga un documento `admins/{uid}`.
- **Avisos push:** Firebase Cloud Messaging. Las Cloud Functions `suscribir` y `enviarAviso` están en `functions/`.
- **Hosting:** Firebase Hosting. La config web se lee de `/__/firebase/init.json`, sin claves en el repo.

## Cómo se evita la versión vieja en caché

- `index.html`, `sw.js` y los JSON se sirven con `no-cache` (ver `firebase.json`).
- JS y CSS llevan hash en el nombre y se cachean un año: cada versión tiene archivos nuevos.
- El service worker pide el HTML a la red primero, se activa solo cuando hay versión nueva y recarga la página.
- El contenido no está en archivos: llega en vivo desde Firestore.

## Desarrollo local

Requiere Node 22 o superior.

```bash
npm install
npm --prefix functions install
npm run dev
```

En local no existe `/__/firebase/init.json`. Creá un `.env.local` (no se sube) con:

```
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","projectId":"prod-nutrias-chambeadoras","appId":"...","messagingSenderId":"..."}
VITE_FCM_VAPID_KEY=...
```

## Deploy

GitHub Actions (`.github/workflows/cd.yml`):

- **Push a `main`:** compila, chequea tipos y despliega.
- **Pull requests:** canal de preview que dura 7 días.
- **Autenticación:** Workload Identity Federation, sin llaves (ver `scripts/setup-gcp-wif.sh`).

Variables del repo:

| Variable | Valor |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `prod-nutrias-chambeadoras` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | ya cargada |
| `GCP_SERVICE_ACCOUNT` | ya cargada |
| `FCM_VAPID_KEY` | clave pública de Cloud Messaging |
| `FIREBASE_DEPLOY_ONLY` | `hosting` (por defecto) o `hosting,firestore,functions` |

## Puesta en marcha (una sola vez)

1. **App web:** en la consola de Firebase, Configuración del proyecto, que exista una app web registrada.
2. **Firestore:** crear la base de datos, si no existe.
3. **Login:** en Authentication, habilitar el proveedor Google.
4. **Plan Blaze:** necesario para Cloud Functions.
5. **Clave VAPID:** en Cloud Messaging, Certificados web push, generar el par de claves. La pública va en la variable `FCM_VAPID_KEY`.
6. **Permisos:** correr de nuevo `scripts/setup-gcp-wif.sh`, que suma los permisos para reglas y functions.
7. **Deploy completo:** poner `FIREBASE_DEPLOY_ONLY=hosting,firestore,functions` y hacer push.
8. **Primer admin:** entrar a `/admin` con Google. La página muestra tu UID. Crear en Firestore el documento `admins/<tu UID>` y recargar.
