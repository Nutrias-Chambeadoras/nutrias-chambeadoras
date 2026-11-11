import { useEffect, useState } from 'react';
import { doc, getFirestore, onSnapshot } from 'firebase/firestore';
import { DEFAULT_CONFIG, mergeConfig, type SiteConfig } from './config';
import { getFirebaseApp } from './firebase';

export type EstadoCarga = 'cargando' | 'listo' | 'error';

/** Contenido del sitio en vivo desde Firestore. Los cambios del admin llegan sin recargar. */
export function useSiteConfig(): { config: SiteConfig; estado: EstadoCarga } {
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [estado, setEstado] = useState<EstadoCarga>('cargando');

  useEffect(() => {
    let cancelado = false;
    let desuscribir: (() => void) | undefined;

    // Si Firestore no responde (sin conexión, base inexistente), Firestore reintenta en
    // silencio. No dejamos el sitio esperando: seguimos con los textos por defecto.
    const espera = window.setTimeout(() => {
      setEstado((actual) => (actual === 'cargando' ? 'error' : actual));
    }, 4000);

    getFirebaseApp()
      .then((app) => {
        if (cancelado) return;
        desuscribir = onSnapshot(
          doc(getFirestore(app), 'site', 'config'),
          (snap) => {
            setConfig(mergeConfig(snap.data()));
            setEstado('listo');
          },
          () => setEstado('error'),
        );
      })
      .catch(() => {
        if (!cancelado) setEstado('error');
      });

    return () => {
      cancelado = true;
      window.clearTimeout(espera);
      desuscribir?.();
    };
  }, []);

  return { config, estado };
}

/** Fecha actual que se actualiza cada segundo. */
export function useAhora(intervaloMs = 1000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(Date.now()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}
