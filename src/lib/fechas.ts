/** Cálculos de fechas en hora de Paraguay, sin importar desde dónde se abra el sitio. */
import type { Corrimiento } from './config';

const TZ = 'America/Asuncion';

/** Feriados nacionales recurrentes (mes-día). Semana Santa corresponde a 2026. */
const FERIADOS = [
  '1-1', '3-1', '4-2', '4-3', '5-1', '5-14', '5-15', '6-12', '6-20', '8-15', '9-29', '12-8', '12-25',
];

const formato = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

interface Partes {
  year: number;
  month: number; // 0-11
  day: number;
  hour: number;
  minute: number;
}

export function partesParaguay(fecha: Date): Partes {
  const p: Record<string, string> = {};
  for (const x of formato.formatToParts(fecha)) if (x.type !== 'literal') p[x.type] = x.value;
  const hour = Number(p.hour) % 24; // algunos motores devuelven 24 a medianoche
  return { year: Number(p.year), month: Number(p.month) - 1, day: Number(p.day), hour, minute: Number(p.minute) };
}

/** Instante real de "año-mes-día hora:minuto" en hora de Paraguay. */
export function horaParaguay(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  const guess = Date.UTC(year, month, day, hour, minute, 0);
  const p = partesParaguay(new Date(guess));
  const offset = Date.UTC(p.year, p.month, p.day, p.hour, p.minute, 0) - guess;
  return new Date(guess - offset);
}

function noLaborable(y: number, m: number, d: number): boolean {
  const dia = new Date(Date.UTC(y, m, d)).getUTCDay();
  return dia === 0 || dia === 6 || FERIADOS.includes(`${m + 1}-${d}`);
}

function ajustarDia(y: number, m: number, d: number, corrimiento: Corrimiento) {
  const cur = new Date(Date.UTC(y, m, d));
  if (corrimiento !== 'none') {
    const paso = corrimiento === 'after' ? 1 : -1;
    while (noLaborable(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate())) {
      cur.setUTCDate(cur.getUTCDate() + paso);
    }
  }
  return { y: cur.getUTCFullYear(), m: cur.getUTCMonth(), d: cur.getUTCDate() };
}

const ultimoDia = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

/** Próximo cobro mensual a la hora indicada (hora de Paraguay). */
export function proximoCobro(dia: number, hora: number, corrimiento: Corrimiento, ahora = Date.now()): Date {
  const hoy = partesParaguay(new Date(ahora));
  for (let i = 0; i < 14; i++) {
    const base = hoy.month + i;
    const y = hoy.year + Math.floor(base / 12);
    const m = base % 12;
    const a = ajustarDia(y, m, Math.min(dia, ultimoDia(y, m)), corrimiento);
    const objetivo = horaParaguay(a.y, a.m, a.d, hora);
    if (objetivo.getTime() > ahora) return objetivo;
  }
  return new Date(ahora);
}

/** Próxima fecha anual (aguinaldo). mes: 0-11. */
export function proximaFechaAnual(mes: number, dia: number, hora: number, corrimiento: Corrimiento, ahora = Date.now()): Date {
  const hoy = partesParaguay(new Date(ahora));
  for (let i = 0; i <= 1; i++) {
    const y = hoy.year + i;
    const a = ajustarDia(y, mes, Math.min(dia, ultimoDia(y, mes)), corrimiento);
    const objetivo = horaParaguay(a.y, a.m, a.d, hora);
    if (objetivo.getTime() > ahora) return objetivo;
  }
  return new Date(ahora);
}

export interface Desglose {
  d: number;
  h: number;
  m: number;
  s: number;
}

export function desglosar(ms: number): Desglose {
  const t = Math.max(ms, 0);
  return {
    d: Math.floor(t / 86400000),
    h: Math.floor((t % 86400000) / 3600000),
    m: Math.floor((t % 3600000) / 60000),
    s: Math.floor((t % 60000) / 1000),
  };
}

/** "2026-11-03T03:24:00-03:00" -> "2026-11-03T03:24" en hora de Paraguay (para inputs datetime-local). */
export function isoAInputParaguay(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const p = partesParaguay(new Date(t));
  const dos = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${dos(p.month + 1)}-${dos(p.day)}T${dos(p.hour)}:${dos(p.minute)}`;
}

/** Paraguay usa UTC-3 todo el año desde octubre de 2024. */
export function inputParaguayAIso(valor: string): string {
  return valor ? `${valor}:00-03:00` : '';
}
