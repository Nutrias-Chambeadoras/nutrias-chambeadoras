/** Todo el contenido editable del sitio. Vive en Firestore: site/config. */

export type Modo = 'congelado' | 'contadores';
export type Corrimiento = 'before' | 'after' | 'none';

export interface SiteConfig {
  urgente: { visible: boolean; texto: string };
  ticker: { visible: boolean; texto: string };
  bcp: { visible: boolean; titulo: string; texto: string; boton: string; link: string; logo: string };
  intervencion: {
    visible: boolean;
    /** ISO con offset, por ejemplo 2026-11-03T03:24:00-03:00 */
    desde: string;
    /** Usá {dias} donde va el número grande */
    titulo: string;
    frase: string;
    foto: string;
    sello: string;
  };
  /** congelado = sin fechas; contadores = cuenta regresiva a sueldo y aguinaldo */
  modo: Modo;
  sueldo: {
    titulo: string;
    texto: string;
    badge: string;
    foto: string;
    dia: number;
    hora: number;
    corrimiento: Corrimiento;
  };
  aguinaldo: { titulo: string; texto: string; badge: string; foto: string; mes: number; dia: number };
  sebusca: { visible: boolean; titulo: string; foto: string };
  footer: { texto: string };
}

const COMUNICADO_BCP =
  'https://www.bcp.gov.py/web/institucional/w/banco-central-inicia-el-procedimiento-de-resolucion-de-ueno-bank';

export const DEFAULT_CONFIG: SiteConfig = {
  urgente: { visible: true, texto: 'Última hora · Nutrias Chambeadoras' },
  ticker: {
    visible: true,
    texto: 'Sueldo congelado hasta nuevo aviso · Aguinaldo sin fecha · Las nutrias siguen chambeando · Aguantá, nutria',
  },
  bcp: {
    visible: true,
    titulo: 'Sitio en resolución del BCP',
    texto: 'El Banco Central del Paraguay inició el procedimiento de resolución de ueno bank.',
    boton: 'Ver comunicado',
    link: COMUNICADO_BCP,
    logo: '/img/bcp-logo.png',
  },
  intervencion: {
    visible: true,
    desde: '2026-11-03T03:24:00-03:00',
    titulo: 'Llevamos {dias} intervenidos',
    frase: 'Desde el martes 3 de noviembre de 2026, 03:24 (hora de Paraguay).',
    foto: '/img/miguel.png',
    sello: 'Intervenido',
  },
  modo: 'congelado',
  sueldo: {
    titulo: 'Cuando Ueno libere los fondos',
    texto: 'El sueldo no tiene fecha. Sigue congelado hasta nuevo aviso.',
    badge: '❄ congelado',
    foto: '/img/nutria-chambeadora.jpg',
    dia: 30,
    hora: 21,
    corrimiento: 'before',
  },
  aguinaldo: {
    titulo: 'Cuando Ueno libere los fondos',
    texto: 'El aguinaldo tampoco tiene fecha. Por ahora, solo recuerdos.',
    badge: '❄ congelado',
    foto: '/img/nutria-aguinaldo.jpg',
    mes: 11,
    dia: 18,
  },
  sebusca: { visible: true, titulo: 'CEO con orden de captura', foto: '/img/cesar.png' },
  footer: { texto: 'Aguantá, nutria' },
};

/**
 * Mezcla lo que venga de Firestore con los valores por defecto.
 * Si falta un campo o tiene otro tipo, se usa el valor por defecto.
 */
export function mergeConfig(raw: unknown): SiteConfig {
  const base = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>;
  if (!raw || typeof raw !== 'object') return base as unknown as SiteConfig;
  const datos = raw as Record<string, unknown>;

  for (const clave of Object.keys(base)) {
    const def = base[clave];
    const val = datos[clave];
    if (val === undefined || val === null) continue;

    if (typeof def === 'object' && def !== null) {
      if (typeof val !== 'object') continue;
      const seccion = { ...(def as Record<string, unknown>) };
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (k in seccion && typeof v === typeof seccion[k]) seccion[k] = v;
      }
      base[clave] = seccion;
    } else if (typeof val === typeof def) {
      base[clave] = val;
    }
  }
  return base as unknown as SiteConfig;
}

/** Normaliza rutas de imágenes para que funcionen también en /admin. */
export function rutaImagen(ruta: string): string {
  if (!ruta) return '';
  if (/^https?:\/\//.test(ruta) || ruta.startsWith('/')) return ruta;
  return `/${ruta}`;
}
