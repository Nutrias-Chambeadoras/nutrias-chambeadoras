import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { logger, setGlobalOptions } from 'firebase-functions/v2';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

initializeApp();

// Debe coincidir con FUNCTIONS_REGION en src/lib/firebase.ts
setGlobalOptions({ region: 'us-central1', maxInstances: 5 });

/** Todos los dispositivos suscritos reciben los avisos por este tema. */
const TEMA = 'todos';

function texto(valor: unknown, campo: string, max: number): string {
  if (typeof valor !== 'string') throw new HttpsError('invalid-argument', `Falta ${campo}.`);
  const limpio = valor.trim();
  if (!limpio) throw new HttpsError('invalid-argument', `Falta ${campo}.`);
  if (limpio.length > max) throw new HttpsError('invalid-argument', `${campo} supera ${max} caracteres.`);
  return limpio;
}

/** Público: anota el token del navegador en el tema de avisos. */
export const suscribir = onCall(async (req) => {
  const token = (req.data as { token?: unknown } | undefined)?.token;
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    throw new HttpsError('invalid-argument', 'Token inválido.');
  }
  const res = await getMessaging().subscribeToTopic([token], TEMA);
  if (res.failureCount > 0) {
    logger.warn('No se pudo suscribir un token', { error: res.errors[0]?.error?.code });
    throw new HttpsError('invalid-argument', 'No se pudo suscribir este dispositivo.');
  }
  return { ok: true };
});

/** Solo admins (documento admins/{uid}): manda un aviso a todos los suscritos. */
export const enviarAviso = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Tenés que iniciar sesión.');

  const db = getFirestore();
  const admin = await db.doc(`admins/${req.auth.uid}`).get();
  if (!admin.exists) throw new HttpsError('permission-denied', 'Tu cuenta no es admin.');

  const datos = (req.data ?? {}) as Record<string, unknown>;
  const titulo = texto(datos.titulo, 'el título', 80);
  const cuerpo = texto(datos.cuerpo, 'el mensaje', 240);
  // Solo rutas del propio sitio, para no mandar a nadie a otra página
  const url = typeof datos.url === 'string' && /^\/(?!\/)/.test(datos.url.trim()) ? datos.url.trim() : '/';

  const idMensaje = await getMessaging().send({
    topic: TEMA,
    data: { title: titulo, body: cuerpo, url },
    webpush: { headers: { Urgency: 'high', TTL: '86400' } },
  });

  await db.collection('avisos').add({
    titulo,
    cuerpo,
    url,
    idMensaje,
    uid: req.auth.uid,
    email: req.auth.token.email ?? null,
    creado: FieldValue.serverTimestamp(),
  });

  logger.info('Aviso enviado', { idMensaje, uid: req.auth.uid });
  return { ok: true, idMensaje };
});
