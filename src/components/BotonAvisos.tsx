import { useState } from 'react';
import { activarAvisos, estadoInicialPush, type EstadoPush } from '../lib/push';

const TEXTOS: Record<EstadoPush, string> = {
  'sin-soporte': 'Avisos no disponibles',
  'no-configurado': 'Avisos próximamente',
  'instalar-ios': 'Instalá la app para avisos',
  pendiente: 'Activar avisos',
  activo: 'Avisos activos',
  bloqueado: 'Avisos bloqueados',
};

const AYUDA: Partial<Record<EstadoPush, string>> = {
  'instalar-ios': 'En iPhone: tocá Compartir y después "Agregar a inicio". Abrí la app desde ahí y activá los avisos.',
  bloqueado: 'Los bloqueaste en este navegador. Habilitalos desde la configuración del sitio.',
  'sin-soporte': 'Este navegador no soporta avisos push.',
};

export function BotonAvisos() {
  const [estado, setEstado] = useState<EstadoPush>(estadoInicialPush);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const accionable = estado === 'pendiente' || estado === 'activo';

  async function alTocar() {
    if (!accionable) {
      setMensaje(AYUDA[estado] ?? '');
      return;
    }
    setOcupado(true);
    setMensaje('');
    try {
      const nuevo = await activarAvisos();
      setEstado(nuevo);
      if (nuevo === 'activo') setMensaje('Listo. Te avisamos cuando haya novedades.');
      else setMensaje(AYUDA[nuevo] ?? '');
    } catch {
      setMensaje('No se pudieron activar los avisos. Probá de nuevo en un rato.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="avisos">
      <button
        type="button"
        className={`btn-notif${estado === 'activo' ? ' on' : ''}`}
        onClick={alTocar}
        disabled={ocupado || estado === 'no-configurado'}
        aria-describedby={mensaje ? 'avisos-msg' : undefined}
      >
        <span className="dot" aria-hidden="true" /> {ocupado ? 'Activando…' : TEXTOS[estado]}
      </button>
      {mensaje && (
        <p id="avisos-msg" className="avisos-msg" role="status">
          {mensaje}
        </p>
      )}
    </div>
  );
}
