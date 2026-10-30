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
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const atMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function feriadoSet(year) {
  // devuelve un Set de 'YYYY-MM-DD' para ese año
  const s = new Set();
  FERIADOS.forEach((f) => {
    const [m, d] = f.md.split('-').map(Number);
    s.add(`${year}-${pad(m)}-${pad(d)}`);
  });
  return s;
}
function isHoliday(d) { return feriadoSet(d.getFullYear()).has(iso(d)); }
function isWeekend(d) { const g = d.getDay(); return g === 0 || g === 6; }
function isNonWorking(d) { return isWeekend(d) || isHoliday(d); }

function adjustPayDate(date, shift) {
  const d = atMidnight(date);
  if (shift === 'none') return d;
  const step = shift === 'after' ? 1 : -1;
  while (isNonWorking(d)) d.setDate(d.getDate() + step);
  return d;
}
function lastDayOfMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

function nextPayDate(payDay, shift) {
  const now = new Date();
  const today = atMidnight(now);
  for (let i = 0; i < 14; i++) {
    const base = now.getMonth() + i;
    const year = now.getFullYear() + Math.floor(base / 12);
    const month = ((base % 12) + 12) % 12;
    const realDay = Math.min(payDay, lastDayOfMonth(year, month));
    const adjusted = adjustPayDate(new Date(year, month, realDay), shift);
    if (adjusted.getTime() >= today.getTime()) return adjusted;
  }
  return adjustPayDate(new Date(now.getFullYear(), now.getMonth() + 1, payDay), shift);
}
function nextAguinaldoDate(month, day, shift) {
  const now = new Date();
  const today = atMidnight(now);
  for (let y = 0; y <= 1; y++) {
    const year = now.getFullYear() + y;
    const realDay = Math.min(day, lastDayOfMonth(year, month));
    const adjusted = adjustPayDate(new Date(year, month, realDay), shift);
    if (adjusted.getTime() >= today.getTime()) return adjusted;
  }
  return adjustPayDate(new Date(now.getFullYear() + 1, month, day), shift);
}

function fmtLargo(d) { return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; }
function diasHasta(target) { return Math.ceil((atMidnight(target) - atMidnight(new Date())) / 86400000); }

// ----- config persistida -----
const DEFAULTS = { payDay: 30, payShift: 'before', aguiMonth: 11, aguiDay: 16 };
function loadConfig() {
  try { const raw = localStorage.getItem('nc-config'); if (raw) return { ...DEFAULTS, ...JSON.parse(raw) }; } catch (e) {}
  return { ...DEFAULTS };
}
function saveConfig(c) { try { localStorage.setItem('nc-config', JSON.stringify(c)); } catch (e) {} }

let config = loadConfig();
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
  cobroTarget = nextPayDate(config.payDay, config.payShift);
  aguiTarget = nextAguinaldoDate(config.aguiMonth, config.aguiDay, config.payShift);
  periodStart = new Date(cobroTarget.getFullYear(), cobroTarget.getMonth() - 1, cobroTarget.getDate());

  const cd = diasHasta(cobroTarget);
  const ad = diasHasta(aguiTarget);

  document.getElementById('cobroDate').textContent = fmtLargo(cobroTarget);
  document.getElementById('aguiDate').textContent = fmtLargo(aguiTarget);
  document.getElementById('cobroDiasBig').textContent = cd <= 0 ? '¡hoy!' : cd === 1 ? '1 día' : `${cd} días`;
  document.getElementById('aguiDiasBig').textContent = ad <= 0 ? '¡hoy!' : ad === 1 ? '1 día' : `${ad} días`;
  document.getElementById('cobroHint').textContent = fraseDelDia(cd);
  document.getElementById('aguiHint').textContent = fraseAgui(ad);
  document.getElementById('cobroBadge').textContent = badgeTxt(cd);
  document.getElementById('aguiBadge').textContent = badgeTxt(ad);
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
  if (!supportsNotif()) { toast('Tu navegador no soporta notificaciones.'); return; }
  if (Notification.permission === 'granted') {
    notify('Todo listo', 'Te avisamos cuando se acerque el cobro o el aguinaldo.');
    return;
  }
  const perm = await Notification.requestPermission();
  refreshNotifBtn();
  if (perm === 'granted') notify('Avisos activados', 'Te avisamos unos días antes de cobrar.');
  else toast('Dale permiso de notificaciones para recibir avisos.');
});

function notify(title, body) {
  try {
    if (supportsNotif() && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'img/nutria-chambeadora.jpg', tag: 'nutrias', renotify: false });
    }
  } catch (e) {}
  toast(`${title} — ${body}`);
}

function maybeNotify() {
  if (!supportsNotif() || Notification.permission !== 'granted') return;
  const key = iso(new Date());
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

// ----- toast -----
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
}

// ----- init -----
function init() {
  document.getElementById('year').textContent = new Date().getFullYear();
  refreshNotifBtn();
  recompute();
  setInterval(tick, 1000);
}
document.addEventListener('DOMContentLoaded', init);
