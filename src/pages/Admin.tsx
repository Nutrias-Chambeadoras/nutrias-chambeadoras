import { useEffect, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, getFirestore, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DEFAULT_CONFIG, mergeConfig, type SiteConfig } from '../lib/config';
import { inputParaguayAIso, isoAInputParaguay } from '../lib/fechas';
import { FUNCTIONS_REGION, getFirebaseApp } from '../lib/firebase';

type Sesion =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'anonimo' }
  | { tipo: 'sin-permiso'; usuario: User }
  | { tipo: 'admin'; usuario: User };

/* ---------- campos reutilizables ---------- */

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="adm-seccion">
      <legend>{titulo}</legend>
      {children}
    </fieldset>
  );
}

function Texto(props: { label: string; value: string; onChange: (v: string) => void; largo?: boolean; ayuda?: string }) {
  return (
    <label className="adm-campo">
      <span>{props.label}</span>
      {props.largo ? (
        <textarea rows={3} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
      ) : (
        <input type="text" value={props.value} onChange={(e) => props.onChange(e.target.value)} />
      )}
      {props.ayuda && <small>{props.ayuda}</small>}
    </label>
  );
}

function Numero(props: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="adm-campo">
      <span>{props.label}</span>
      <input
        type="number"
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) props.onChange(Math.min(props.max, Math.max(props.min, Math.round(n))));
        }}
      />
    </label>
  );
}

function Interruptor(props: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="adm-switch">
      <input type="checkbox" checked={props.value} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/* ---------- formulario de contenido ---------- */

function Editor({ inicial, onGuardar }: { inicial: SiteConfig; onGuardar: (c: SiteConfig) => Promise<void> }) {
  const [c, setC] = useState<SiteConfig>(inicial);
  const [estado, setEstado] = useState<'' | 'guardando' | 'ok' | 'error'>('');

  function cambiar<K extends keyof SiteConfig>(seccion: K, valor: Partial<SiteConfig[K]> | SiteConfig[K]) {
    setC((prev) => {
      const actual = prev[seccion];
      const siguiente = typeof actual === 'object' && actual !== null ? { ...actual, ...(valor as object) } : valor;
      return { ...prev, [seccion]: siguiente as SiteConfig[K] };
    });
    setEstado('');
  }

  async function guardar() {
    setEstado('guardando');
    try {
      await onGuardar(c);
      setEstado('ok');
    } catch {
      setEstado('error');
    }
  }

  return (
    <form
      className="adm-form"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <Seccion titulo="Modo del sitio">
        <label className="adm-campo">
          <span>Sueldo y aguinaldo</span>
          <select value={c.modo} onChange={(e) => cambiar('modo', e.target.value as SiteConfig['modo'])}>
            <option value="congelado">Congelados (sin fecha)</option>
            <option value="contadores">Con cuenta regresiva</option>
          </select>
        </label>
      </Seccion>

      <Seccion titulo="Intervenidos">
        <Interruptor label="Mostrar sección" value={c.intervencion.visible} onChange={(v) => cambiar('intervencion', { visible: v })} />
        <label className="adm-campo">
          <span>Desde (hora de Paraguay)</span>
          <input
            type="datetime-local"
            value={isoAInputParaguay(c.intervencion.desde)}
            onChange={(e) => cambiar('intervencion', { desde: inputParaguayAIso(e.target.value) })}
          />
        </label>
        <Texto label="Título" ayuda="Usá {dias} donde va el número grande." value={c.intervencion.titulo} onChange={(v) => cambiar('intervencion', { titulo: v })} />
        <Texto label="Frase" largo value={c.intervencion.frase} onChange={(v) => cambiar('intervencion', { frase: v })} />
        <Texto label="Foto" ayuda="Ruta dentro de /img, por ejemplo /img/miguel.png" value={c.intervencion.foto} onChange={(v) => cambiar('intervencion', { foto: v })} />
        <Texto label="Sello" value={c.intervencion.sello} onChange={(v) => cambiar('intervencion', { sello: v })} />
      </Seccion>

      <Seccion titulo="Sueldo">
        <Texto label="Título" value={c.sueldo.titulo} onChange={(v) => cambiar('sueldo', { titulo: v })} />
        <Texto label="Texto" largo value={c.sueldo.texto} onChange={(v) => cambiar('sueldo', { texto: v })} />
        <Texto label="Etiqueta (modo congelado)" value={c.sueldo.badge} onChange={(v) => cambiar('sueldo', { badge: v })} />
        <Texto label="Foto" value={c.sueldo.foto} onChange={(v) => cambiar('sueldo', { foto: v })} />
        <div className="adm-fila">
          <Numero label="Día de cobro" min={1} max={31} value={c.sueldo.dia} onChange={(v) => cambiar('sueldo', { dia: v })} />
          <Numero label="Hora (Paraguay)" min={0} max={23} value={c.sueldo.hora} onChange={(v) => cambiar('sueldo', { hora: v })} />
        </div>
        <label className="adm-campo">
          <span>Si cae feriado o fin de semana</span>
          <select value={c.sueldo.corrimiento} onChange={(e) => cambiar('sueldo', { corrimiento: e.target.value as SiteConfig['sueldo']['corrimiento'] })}>
            <option value="before">Se adelanta al día hábil anterior</option>
            <option value="after">Se pasa al día hábil siguiente</option>
            <option value="none">Queda igual</option>
          </select>
        </label>
      </Seccion>

      <Seccion titulo="Aguinaldo">
        <Texto label="Título" value={c.aguinaldo.titulo} onChange={(v) => cambiar('aguinaldo', { titulo: v })} />
        <Texto label="Texto" largo value={c.aguinaldo.texto} onChange={(v) => cambiar('aguinaldo', { texto: v })} />
        <Texto label="Etiqueta (modo congelado)" value={c.aguinaldo.badge} onChange={(v) => cambiar('aguinaldo', { badge: v })} />
        <Texto label="Foto" value={c.aguinaldo.foto} onChange={(v) => cambiar('aguinaldo', { foto: v })} />
        <div className="adm-fila">
          <label className="adm-campo">
            <span>Mes</span>
            <select value={c.aguinaldo.mes} onChange={(e) => cambiar('aguinaldo', { mes: Number(e.target.value) })}>
              {MESES.map((m, i) => (
                <option key={m} value={i}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <Numero label="Día" min={1} max={31} value={c.aguinaldo.dia} onChange={(v) => cambiar('aguinaldo', { dia: v })} />
        </div>
      </Seccion>

      <Seccion titulo="Barra de última hora y cinta">
        <Interruptor label="Mostrar barra roja" value={c.urgente.visible} onChange={(v) => cambiar('urgente', { visible: v })} />
        <Texto label="Texto de la barra" value={c.urgente.texto} onChange={(v) => cambiar('urgente', { texto: v })} />
        <Interruptor label="Mostrar cinta de avisos" value={c.ticker.visible} onChange={(v) => cambiar('ticker', { visible: v })} />
        <Texto label="Texto de la cinta" largo value={c.ticker.texto} onChange={(v) => cambiar('ticker', { texto: v })} />
      </Seccion>

      <Seccion titulo="Aviso del BCP">
        <Interruptor label="Mostrar aviso" value={c.bcp.visible} onChange={(v) => cambiar('bcp', { visible: v })} />
        <Texto label="Título" value={c.bcp.titulo} onChange={(v) => cambiar('bcp', { titulo: v })} />
        <Texto label="Texto" largo value={c.bcp.texto} onChange={(v) => cambiar('bcp', { texto: v })} />
        <Texto label="Texto del botón" value={c.bcp.boton} onChange={(v) => cambiar('bcp', { boton: v })} />
        <Texto label="Link" value={c.bcp.link} onChange={(v) => cambiar('bcp', { link: v })} />
      </Seccion>

      <Seccion titulo="Cartel Se busca">
        <Interruptor label="Mostrar al entrar" value={c.sebusca.visible} onChange={(v) => cambiar('sebusca', { visible: v })} />
        <Texto label="Texto" value={c.sebusca.titulo} onChange={(v) => cambiar('sebusca', { titulo: v })} />
        <Texto label="Foto" value={c.sebusca.foto} onChange={(v) => cambiar('sebusca', { foto: v })} />
      </Seccion>

      <Seccion titulo="Pie de página">
        <Texto label="Texto" value={c.footer.texto} onChange={(v) => cambiar('footer', { texto: v })} />
      </Seccion>

      <div className="adm-acciones">
        <button type="submit" className="modal-btn" disabled={estado === 'guardando'}>
          {estado === 'guardando' ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          className="btn-notif"
          onClick={() => {
            if (window.confirm('¿Volver a los textos originales? Igual tenés que tocar Guardar.')) setC(DEFAULT_CONFIG);
          }}
        >
          Valores originales
        </button>
        <span role="status" className="adm-estado">
          {estado === 'ok' && 'Guardado. El sitio ya se actualizó.'}
          {estado === 'error' && 'No se pudo guardar. Revisá que tu cuenta sea admin.'}
        </span>
      </div>
    </form>
  );
}

/* ---------- envío de avisos ---------- */

interface AvisoEnviado {
  id: string;
  titulo: string;
  cuerpo: string;
  creado?: { toDate: () => Date };
}

function EnviarAviso() {
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [url, setUrl] = useState('/');
  const [estado, setEstado] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [historial, setHistorial] = useState<AvisoEnviado[]>([]);

  async function cargarHistorial() {
    const app = await getFirebaseApp();
    const snap = await getDocs(query(collection(getFirestore(app), 'avisos'), orderBy('creado', 'desc'), limit(10)));
    setHistorial(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AvisoEnviado, 'id'>) })));
  }

  useEffect(() => {
    cargarHistorial().catch(() => undefined);
  }, []);

  async function enviar() {
    if (!window.confirm(`¿Mandar "${titulo}" a todas las personas suscritas?`)) return;
    setEnviando(true);
    setEstado('');
    try {
      const app = await getFirebaseApp();
      const fn = httpsCallable<{ titulo: string; cuerpo: string; url: string }, { ok: boolean }>(
        getFunctions(app, FUNCTIONS_REGION),
        'enviarAviso',
      );
      await fn({ titulo, cuerpo, url });
      setEstado('Aviso enviado.');
      setTitulo('');
      setCuerpo('');
      await cargarHistorial();
    } catch (error) {
      setEstado(error instanceof Error ? `No se pudo enviar: ${error.message}` : 'No se pudo enviar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      className="adm-form"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      <Seccion titulo="Mandar aviso push">
        <Texto label="Título (máx. 80)" value={titulo} onChange={(v) => setTitulo(v.slice(0, 80))} />
        <Texto label="Mensaje (máx. 240)" largo value={cuerpo} onChange={(v) => setCuerpo(v.slice(0, 240))} />
        <Texto label="Abrir al tocar" ayuda="Ruta del sitio, por ejemplo /" value={url} onChange={setUrl} />
        <div className="adm-acciones">
          <button type="submit" className="modal-btn" disabled={enviando || !titulo.trim() || !cuerpo.trim()}>
            {enviando ? 'Enviando…' : 'Enviar a todos'}
          </button>
          <span role="status" className="adm-estado">
            {estado}
          </span>
        </div>
      </Seccion>

      {historial.length > 0 && (
        <Seccion titulo="Últimos avisos">
          <ul className="adm-historial">
            {historial.map((a) => (
              <li key={a.id}>
                <strong>{a.titulo}</strong> · {a.cuerpo}
                {a.creado && <small> · {a.creado.toDate().toLocaleString('es-PY')}</small>}
              </li>
            ))}
          </ul>
        </Seccion>
      )}
    </form>
  );
}

/* ---------- página ---------- */

export function Admin() {
  const [sesion, setSesion] = useState<Sesion>({ tipo: 'cargando' });
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [pestana, setPestana] = useState<'contenido' | 'avisos'>('contenido');

  useEffect(() => {
    let desuscribir: (() => void) | undefined;
    getFirebaseApp()
      .then((app) => {
        const db = getFirestore(app);
        desuscribir = onAuthStateChanged(getAuth(app), async (usuario) => {
          if (!usuario) {
            setSesion({ tipo: 'anonimo' });
            return;
          }
          try {
            const esAdmin = (await getDoc(doc(db, 'admins', usuario.uid))).exists();
            if (!esAdmin) {
              setSesion({ tipo: 'sin-permiso', usuario });
              return;
            }
            const snap = await getDoc(doc(db, 'site', 'config'));
            setConfig(mergeConfig(snap.data()));
            setSesion({ tipo: 'admin', usuario });
          } catch {
            setSesion({ tipo: 'sin-permiso', usuario });
          }
        });
      })
      .catch(() => setSesion({ tipo: 'error', mensaje: 'No se pudo conectar con Firebase.' }));
    return () => desuscribir?.();
  }, []);

  async function entrar() {
    const app = await getFirebaseApp();
    await signInWithPopup(getAuth(app), new GoogleAuthProvider());
  }

  async function salir() {
    const app = await getFirebaseApp();
    await signOut(getAuth(app));
  }

  async function guardar(c: SiteConfig) {
    const app = await getFirebaseApp();
    await setDoc(doc(getFirestore(app), 'site', 'config'), c);
    setConfig(c);
  }

  return (
    <div className="adm">
      <header className="nav">
        <div className="brand">
          <img src="/img/nutria-chambeadora.jpg" alt="" className="brand-img" />
          <span>Panel de las nutrias</span>
        </div>
        <div className="nav-acciones">
          <a className="btn-notif" href="/">
            Ver sitio
          </a>
          {(sesion.tipo === 'admin' || sesion.tipo === 'sin-permiso') && (
            <button type="button" className="btn-notif" onClick={() => void salir()}>
              Salir
            </button>
          )}
        </div>
      </header>

      <main>
        {sesion.tipo === 'cargando' && <p className="adm-aviso">Cargando…</p>}
        {sesion.tipo === 'error' && <p className="adm-aviso">{sesion.mensaje}</p>}

        {sesion.tipo === 'anonimo' && (
          <div className="adm-aviso">
            <p>Entrá con la cuenta de Google de admin.</p>
            <button type="button" className="modal-btn" onClick={() => void entrar()}>
              Entrar con Google
            </button>
          </div>
        )}

        {sesion.tipo === 'sin-permiso' && (
          <div className="adm-aviso">
            <p>
              La cuenta <strong>{sesion.usuario.email}</strong> todavía no es admin.
            </p>
            <p>
              En la consola de Firebase, creá en Firestore el documento <code>admins/{sesion.usuario.uid}</code> (puede
              estar vacío) y recargá esta página.
            </p>
          </div>
        )}

        {sesion.tipo === 'admin' && config && (
          <>
            <div className="adm-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={pestana === 'contenido'} onClick={() => setPestana('contenido')}>
                Contenido
              </button>
              <button type="button" role="tab" aria-selected={pestana === 'avisos'} onClick={() => setPestana('avisos')}>
                Avisos push
              </button>
            </div>
            {pestana === 'contenido' ? <Editor inicial={config} onGuardar={guardar} /> : <EnviarAviso />}
          </>
        )}
      </main>
    </div>
  );
}
