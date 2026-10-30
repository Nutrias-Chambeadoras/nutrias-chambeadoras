/* =========================================================
   Nutrias Chambeadoras
   Contador de cobro + aguinaldo, feriados y avisos.
   Los feriados van incrustados para que el sitio funcione
   abriéndolo directo (file://), sin necesidad de servidor.
   ========================================================= */

// ----- Feriados de Paraguay (recurrentes por mes-día) -----
const FERIADOS = [
  { md: '1-1',   nombre: 'Año Nuevo',              desc: 'Arranca el año.' },
  { md: '3-1',   nombre: 'Día de los Héroes',      desc: 'Homenaje a los héroes de la patria.' },
  { md: '4-2',   nombre: 'Jueves Santo',           desc: 'Asueto de Semana Santa (2026).' },
  { md: '4-3',   nombre: 'Viernes Santo',          desc: 'Semana Santa (2026).' },
  { md: '5-1',   nombre: 'Día del Trabajador',     desc: 'Día de las y los trabajadores.' },
  { md: '5-14',  nombre: 'Día de la Independencia', desc: 'Primer día de la fiesta patria.' },
  { md: '5-15',  nombre: 'Día de la Independencia', desc: 'Independencia del Paraguay.' },
  { md: '6-12',  nombre: 'Paz del Chaco',          desc: 'Fin de la Guerra del Chaco.' },
  { md: '6-20',  nombre: 'Jura de la Constitución', desc: 'Feriado nacional nuevo desde 2026.' },
  { md: '8-15',  nombre: 'Fundación de Asunción',  desc: 'Aniversario de Asunción.' },
  { md: '9-29',  nombre: 'Victoria de Boquerón',   desc: 'Victoria en la Batalla de Boquerón.' },
  { md: '12-8',  nombre: 'Virgen de Caacupé',      desc: 'Día de la Virgen de Caacupé.' },
  { md: '12-25', nombre: 'Navidad',                desc: 'Feliz Navidad.' },
];

// Frases que rotan en el hero (inspiradas en el sitio original)
const FRASES_COBRO = [
  'Aguarda el salario con emoción.',
  'Ya falta menos para la plata.',
  'Paciencia, nutria chambeadora.',
  'Ni tan lejos, ni tan cerca.',
];

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

// ----- utilidades de fecha -----
const pad = (n) => String(n).padStart(2, '0');

// Zona horaria objetivo: todo el cálculo se hace en hora de Paraguay,
// así el contador marca las 21:00 de Asunción se abra desde donde se abra.
const TZ = 'America/Asuncion';

// Devuelve { year, month(0-11), day, hour, minute } del instante dado,
// expresado en hora de Paraguay.
function tzParts(date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const p = {};
  fmt.formatToParts(date).forEach((x) => { if (x.type !== 'literal') p[x.type] = x.value; });
  let hour = parseInt(p.hour, 10);
  if (hour === 24) hour = 0; // algunos motores devuelven 24 a medianoche
  return {
    year: +p.year, month: +p.month - 1, day: +p.day,
    hour, minute: +p.minute, second: +p.second,
  };
}

// Timestamp UTC (ms) del momento "year-month-day hour:00 hora de Paraguay".
// Resuelve el offset real de Asunción en esa fecha (contempla horario de verano).
function asuncionTime(year, month, day, hour = 0, minute = 0) {
  // Punto de partida: ese instante interpretado como si fuera UTC.
  const guess = Date.UTC(year, month, day, hour, minute, 0);
  // Cuánto se desvía la hora de Paraguay respecto de UTC en esa fecha.
  const parts = tzParts(new Date(guess));
  const asUTC = Date.UTC(parts.year, parts.month, parts.day, parts.hour, parts.minute, 0);
  const offset = asUTC - guess;      // ms que Paraguay va por delante de UTC
  return new Date(guess - offset);   // corrige para obtener el UTC correcto
}

// Trabajamos los días como objetos { y, m, d } en el calendario de Paraguay.
function isHolidayYMD(y, m, d) {
  return FERIADOS.some((f) => {
    const [fm, fd] = f.md.split('-').map(Number);
    return fm === m + 1 && fd === d;
  });
}
function isNonWorkingYMD(y, m, d) {
  const wd = new Date(Date.UTC(y, m, d)).getUTCDay();
  return wd === 0 || wd === 6 || isHolidayYMD(y, m, d);
}

// Ajusta un día (y,m,d) saltando feriados/findes según la preferencia.
function adjustDay(y, m, d, shift) {
  if (shift === 'none') return { y, m, d };
  const step = shift === 'after' ? 1 : -1;
  let cur = new Date(Date.UTC(y, m, d));
  while (isNonWorkingYMD(cur.getUTCFullYear(), cur.getUTCMonth(), cur.getUTCDate())) {
    cur.setUTCDate(cur.getUTCDate() + step);
  }
  return { y: cur.getUTCFullYear(), m: cur.getUTCMonth(), d: cur.getUTCDate() };
}
function lastDayOfMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

// Próximo cobro: a las payHour:00 de Paraguay del día de pago (ajustado).
function nextPayDate(payDay, shift, payHour) {
  const now = tzParts(new Date());
  const nowTs = Date.now();
  for (let i = 0; i < 14; i++) {
    const base = now.month + i;
    const year = now.year + Math.floor(base / 12);
    const month = ((base % 12) + 12) % 12;
    const realDay = Math.min(payDay, lastDayOfMonth(year, month));
    const a = adjustDay(year, month, realDay, shift);
    const target = asuncionTime(a.y, a.m, a.d, payHour, 0);
    if (target.getTime() > nowTs) return target;
  }
  const a = adjustDay(now.year, now.month + 1, payDay, shift);
  return asuncionTime(a.y, a.m, a.d, payHour, 0);
}

// Próximo aguinaldo: a las payHour:00 de Paraguay del día (ajustado).
function nextAguinaldoDate(month, day, shift, payHour) {
  const now = tzParts(new Date());
  const nowTs = Date.now();
  for (let y = 0; y <= 1; y++) {
    const year = now.year + y;
    const realDay = Math.min(day, lastDayOfMonth(year, month));
    const a = adjustDay(year, month, realDay, shift);
    const target = asuncionTime(a.y, a.m, a.d, payHour, 0);
    if (target.getTime() > nowTs) return target;
  }
  const a = adjustDay(now.year + 1, month, day, shift);
  return asuncionTime(a.y, a.m, a.d, payHour, 0);
}

function fmtLargo(d) {
  const p = tzParts(d);
  const wd = new Date(Date.UTC(p.year, p.month, p.day)).getUTCDay();
  return `${DIAS[wd]} ${p.day} de ${MESES[p.month]}`;
}
// Días restantes contando por días de calendario de Paraguay.
function diasHasta(target) {
  const t = tzParts(target);
  const n = tzParts(new Date());
  const tMid = Date.UTC(t.year, t.month, t.day);
  const nMid = Date.UTC(n.year, n.month, n.day);
  return Math.round((tMid - nMid) / 86400000);
}

// ----- configuración fija -----
// payHour: hora de cobro en Paraguay (21 = 21:00). aguiDay: día del aguinaldo.
const config = { payDay: 30, payShift: 'before', payHour: 21, aguiMonth: 11, aguiDay: 18 };

let cobroTarget = null, aguiTarget = null, periodStart = null;

// ----- render -----
function renderCountdown(rootId, target) {
  const root = document.getElementById(rootId);
  const diff = Math.max(target.getTime() - Date.now(), 0);
  const map = {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
  root.querySelectorAll('.num').forEach((el) => { el.textContent = pad(map[el.dataset.u]); });
}
function setBar(id, start, target) {
  const total = target.getTime() - start.getTime();
  const done = Date.now() - start.getTime();
  const pct = total <= 0 ? 100 : Math.min(100, Math.max(0, (done / total) * 100));
  document.getElementById(id).style.width = pct.toFixed(1) + '%';
}

function fraseDelDia(dias) {
  if (dias <= 0) return '¡Hoy es día de salario! A revisar la cuenta.';
  if (dias === 1) return '¡Mañana es día de salario! Aguantá un toque.';
  return FRASES_COBRO[dias % FRASES_COBRO.length];
}
function fraseAgui(dias) {
  if (dias <= 0) return '¡Llegó el aguinaldo! Que dure más que el año pasado.';
  if (dias === 1) return '¡Mañana es el día del aguinaldo!';
  return `Ya falta menos para el medio sueldo de fin de año.`;
}
function badgeTxt(dias) {
  if (dias <= 0) return '¡Es hoy!';
  if (dias === 1) return 'mañana';
  return `en ${dias} días`;
}

function recompute() {
  recomputeTargets();
  tick();
}
function recomputeTargets() {
  cobroTarget = nextPayDate(config.payDay, config.payShift, config.payHour);
  aguiTarget = nextAguinaldoDate(config.aguiMonth, config.aguiDay, config.payShift, config.payHour);
  // referencia para la barra de progreso: 30 días antes del cobro
  periodStart = new Date(cobroTarget.getTime() - 30 * 86400000);

  const cd = diasHasta(cobroTarget);
  const ad = diasHasta(aguiTarget);

  setTituloFalta('cobroTitle', 'cobroDiasBig', cd, '¡Hoy es el día!');
  setTituloFalta('aguiTitle', 'aguiDiasBig', ad, '¡Llegó el aguinaldo!');
  document.getElementById('cobroHint').textContent = fraseDelDia(cd);
  document.getElementById('aguiHint').textContent = fraseAgui(ad);
  document.getElementById('cobroBadge').textContent = badgeTxt(cd);
  document.getElementById('aguiBadge').textContent = badgeTxt(ad);
}
// Arma el título: "Falta X días" normalmente, o solo el mensaje cuando es hoy.
function setTituloFalta(titleId, numId, dias, mensajeHoy) {
  const title = document.getElementById(titleId);
  const pre = title.querySelector('.pre');
  const num = document.getElementById(numId);
  if (dias <= 0) {
    if (pre) pre.style.display = 'none';           // sacamos el "Falta "
    num.textContent = mensajeHoy;                   // mostramos solo el mensaje
  } else {
    if (pre) pre.style.display = '';                // volvemos a mostrar "Falta "
    num.textContent = dias === 1 ? '1 día' : `${dias} días`;
  }
}

function clampInt(v, min, max, def) { const n = parseInt(v, 10); return isNaN(n) ? def : Math.min(max, Math.max(min, n)); }

// ----- tick -----
function tick() {
  if (!cobroTarget || !aguiTarget) return;
  if (Date.now() > cobroTarget.getTime() || Date.now() > aguiTarget.getTime()) {
    recomputeTargets();
  }
  renderCountdown('cobroCountdown', cobroTarget);
  renderCountdown('aguiCountdown', aguiTarget);
  setBar('cobroBar', periodStart, cobroTarget);
  setBar('aguiBar', new Date(aguiTarget.getFullYear(), 0, 1), aguiTarget);
  maybeNotify();
}

// ----- notificaciones -----
const notifBtn = document.getElementById('notifBtn');
function supportsNotif() { return 'Notification' in window; }

function refreshNotifBtn() {
  if (!supportsNotif()) { notifBtn.textContent = 'sin soporte'; notifBtn.disabled = true; return; }
  if (Notification.permission === 'granted') {
    notifBtn.innerHTML = '<span class="dot"></span> Avisos activos';
    notifBtn.classList.add('on');
  } else if (Notification.permission === 'denied') {
    notifBtn.innerHTML = '<span class="dot"></span> Avisos bloqueados';
    notifBtn.classList.remove('on');
  } else {
    notifBtn.innerHTML = '<span class="dot"></span> Activar avisos';
    notifBtn.classList.remove('on');
  }
}

notifBtn.addEventListener('click', async () => {
  if (!supportsNotif()) { alert('Tu navegador no soporta notificaciones.'); return; }
  if (Notification.permission === 'granted') {
    notify('Todo listo', 'Te avisamos cuando se acerque el cobro o el aguinaldo.');
    return;
  }
  const perm = await Notification.requestPermission();
  refreshNotifBtn();
  if (perm === 'granted') notify('Avisos activados', 'Te avisamos unos días antes de cobrar.');
  else alert('Dale permiso de notificaciones para recibir avisos.');
});

function notify(title, body) {
  try {
    if (supportsNotif() && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'img/nutria-chambeadora.jpg', tag: 'nutrias', renotify: false });
    }
  } catch (e) {}
}

function maybeNotify() {
  if (!supportsNotif() || Notification.permission !== 'granted') return;
  const n = tzParts(new Date());
  const key = `${n.year}-${pad(n.month + 1)}-${pad(n.day)}`; // día de Paraguay
  let sent = {};
  try { sent = JSON.parse(localStorage.getItem('nc-notified') || '{}'); } catch (e) {}
  const cd = diasHasta(cobroTarget);
  const ad = diasHasta(aguiTarget);
  const checks = [
    { k: `c0-${key}`, c: cd === 0, t: '¡Hoy es día de salario!', b: 'Andá a revisar la cuenta.' },
    { k: `c1-${key}`, c: cd === 1, t: '¡Mañana cae el sueldo!',   b: 'Falta un día nomás.' },
    { k: `c3-${key}`, c: cd === 3, t: 'Faltan 3 días para cobrar', b: 'Ya falta poco.' },
    { k: `a0-${key}`, c: ad === 0, t: '¡Llegó el aguinaldo!',     b: 'A disfrutar el extra de fin de año.' },
    { k: `a7-${key}`, c: ad === 7, t: 'Una semana para el aguinaldo', b: 'Preparate.' },
  ];
  checks.forEach((x) => { if (x.c && !sent[x.k]) { notify(x.t, x.b); sent[x.k] = true; } });
  try { localStorage.setItem('nc-notified', JSON.stringify(sent)); } catch (e) {}
}

// ----- init -----
function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  refreshNotifBtn();
  recompute();
  setInterval(tick, 1000);
}
document.addEventListener('DOMContentLoaded', init);
