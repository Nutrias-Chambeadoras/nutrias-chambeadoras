---
inclusion: always
---

# Nutrias Chambeadoras: contexto del proyecto

PWA de humor para un grupo de trabajo afectado por la intervención de ueno bank (BCP, 03/11/2026 03:24 hora de Paraguay). Muestra cuánto tiempo llevamos intervenidos, el sueldo y el aguinaldo congelados, y manda avisos push. Todo el contenido se edita desde `/admin`.

## Stack

- **App:** Vite 8 + React 19 + TypeScript 5.9 (`src/`). PWA con `vite-plugin-pwa` 2 en modo `injectManifest`.
- **Datos:** Firestore, documento `site/config`. El modelo y los valores por defecto están en `src/lib/config.ts`.
- **Admin:** `/admin` (`src/pages/Admin.tsx`), login con Google. Admin es quien tenga el documento `admins/{uid}`.
- **Avisos push:** FCM. Las Cloud Functions `suscribir` y `enviarAviso` están en `functions/src/index.ts` (Node 22, región `us-central1`, tema `todos`).
- **Hosting:** Firebase Hosting, proyecto `prod-nutrias-chambeadoras` (número 188154185633).
- **Config web:** se lee en tiempo de ejecución de `/__/firebase/init.json`. No hay claves en el repo.

Las versiones están fijadas exactas en `package.json` y `functions/package.json`. No usar rangos.

## Archivos clave

| Archivo | Para qué |
| --- | --- |
| `src/lib/config.ts` | Tipo `SiteConfig`, `DEFAULT_CONFIG` (textos actuales) y `mergeConfig` |
| `src/lib/fechas.ts` | Cálculos en hora de Paraguay (`America/Asuncion`), feriados y próximo cobro o aguinaldo |
| `src/lib/useSiteConfig.ts` | Escucha `site/config` en vivo. Si Firestore no responde en 4 s, sigue con los valores por defecto |
| `src/lib/push.ts` | Activa los avisos y carga messaging y functions recién al tocar el botón |
| `src/sw.ts` | Service worker: precache, HTML con red primero, `push` y `notificationclick` |
| `firestore.rules` | `site` lo lee cualquiera y lo escribe solo un admin; `admins` cada uno ve el suyo; `avisos` lo leen los admins; el resto cerrado |
| `firebase.json` | Hosting (`dist`), rewrite SPA, encabezados de caché, Firestore y functions |
| `.github/workflows/cd.yml` | Build y chequeo de tipos, preview por PR y deploy a producción en `main` |
| `scripts/setup-gcp-wif.sh` | Workload Identity Federation y roles de la cuenta `github-deploy` |

## Caché (no romper)

El sitio viejo quedaba pegado en versiones viejas. Esto lo evita:

- `index.html`, `/`, `/admin`, JSON y webmanifest se sirven con `no-cache`.
- `sw.js` se sirve con `no-cache, no-store, must-revalidate`.
- `/assets/**` lleva hash y se cachea un año con `immutable`. Las imágenes, una semana.
- El SW no precachea HTML ni fotos. Navega con `NetworkFirst`, usa `skipWaiting` y `clientsClaim`, y `registerType: 'autoUpdate'` recarga la página sola.
- El contenido no está en archivos, viene de Firestore.

## Comandos

```bash
npm install && npm --prefix functions install
npm run dev          # local; necesita .env.local con VITE_FIREBASE_CONFIG (ver README)
npm run build        # typecheck (app + sw) y vite build
npm --prefix functions run build
```

- **Node:** en esta máquina está la v26. firebase-tools pide 20, 22 o 24, y en local solo tira advertencias. En CI y en Functions se usa Node 22.
- **npm en PowerShell:** usar `npm.cmd`. `npm.ps1` está bloqueado por la política de ejecución y no hay que cambiarla.
- **Sin sesión de Firebase en la máquina:** la CLI local no está logueada. El deploy lo hace CI sin llaves.

## Terminal de esta máquina (importante para el agente)

- La salida de `execute_pwsh` llega vacía o cortada muy seguido.
- Lo que funciona: escribir un `.cmd` o `.ps1` temporal, correrlo con `cmd /c "script > salida.txt 2>&1"` en segundo plano, esperar con `Start-Sleep` y leer el archivo.
- `read_file` a veces no ve archivos recién creados. Llamar antes a `list_directory`.
- A veces ningún comando arranca. Ahí hay que pedir al usuario que reinicie la terminal.
- Para probar en navegador: Edge headless (`msedge --headless=new --screenshot --virtual-time-budget=8000`).
  - Tiene un ancho mínimo de unos 500 px. Para ver celular, servir con `npx vite preview` y meter la página en iframes de 390 y 360 px.
  - Producción manda `X-Frame-Options: DENY`, así que eso solo anda en local.
- Los temporales empiezan con `_` y están en `.gitignore` (`_*.txt`, `_*.cmd`, `_*.ps1`).

## CI y variables del repo

- **Autenticación:** Workload Identity Federation (OIDC), sin llaves. Variables: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT` y `FIREBASE_PROJECT_ID`, todas cargadas.
- **`FCM_VAPID_KEY`:** clave pública VAPID. Falta cargarla. Sin ella, el botón dice "Avisos próximamente".
- **`FIREBASE_DEPLOY_ONLY`:** por defecto `hosting`. Para todo: `hosting,firestore,functions`.
- **Previews:** canal `pr-N` por cada PR, dura 7 días. El login de Google no anda en los previews porque la cuenta de deploy no puede agregar el dominio a Auth.
- **Cloudflare Workers Builds:** hay una integración externa conectada al repo que falla en los PR. No es parte de este pipeline.

## Estado (11/11/2026)

- **PR #1 `migracion-react-firebase`:** abierto, CI en verde. Preview: https://prod-nutrias-chambeadoras--pr-1-s2thib4o.web.app (vence el 18/11).
- **Commits en la rama:** `b3d06ea` (migración), `8d2eb23` (timeout de 4 s de Firestore) y el del cartel "Se busca" que se muestra de entrada.
- **Verificado:**
  - Build y tipos OK.
  - 9 pruebas de fechas OK.
  - Encabezados de caché OK en el preview.
  - Capturas en 1280, 390 y 360 px: se ve igual que el sitio viejo.
  - `init.json` existe, así que la app web está registrada.
- **Sin verificar:** login admin, guardar contenido, envío de push y deploy de reglas y functions. Faltan los pasos de abajo.

## Pasos pendientes del usuario (en orden)

1. Crear la base de Firestore. Hoy la API está desactivada (`SERVICE_DISABLED`).
2. Habilitar el proveedor Google en Authentication.
3. Pasar al plan Blaze, generar el par VAPID en Cloud Messaging y cargar `FCM_VAPID_KEY`.
4. Correr de nuevo `scripts/setup-gcp-wif.sh` para sumar los roles de reglas y functions. El set de roles todavía no se probó en un deploy real.
5. Poner `FIREBASE_DEPLOY_ONLY=hosting,firestore,functions` y mergear el PR.
6. Entrar a `/admin`, copiar el UID, crear `admins/<UID>` en Firestore y recargar.

## Decisiones y preferencias del usuario

- **Idioma:** español rioplatense, tono suelto y con humor.
- **Estética:** oscuro con naranja `#ff9f1c` y azul acero, tema cárcel e intervención (rejas, cinta amarilla y negra, sello "Intervenido"). Nada de diseño tipo diario.
- **Sueldo y aguinaldo:** congelados ("Cuando Ueno libere los fondos"). El modo `contadores` queda para cuando liberen los fondos. Hora de cobro 21:00 PY, día 30 (se adelanta si cae feriado o fin de semana), aguinaldo el 18/12.
- **Cartel "Se busca":** el usuario confirma que la orden de captura es real. Tiene que aparecer siempre primero, apenas carga la página, sin esperar a Firestore. Si el admin lo apaga, se cierra al llegar la config. Se apaga desde el admin.
- **Mobile primero:** probar siempre a 360 y 390 px.
- **Git:** cambios grandes por rama y PR, para probar en el preview antes de producción.
