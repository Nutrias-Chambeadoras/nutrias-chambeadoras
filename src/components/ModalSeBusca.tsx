import { useEffect, useRef, useState } from 'react';
import { rutaImagen } from '../lib/config';

interface Props {
  titulo: string;
  foto: string;
}

/** Cartel "Se busca": aparece al entrar y se cierra con el botón, la X, Escape o tocando afuera. */
export function ModalSeBusca({ titulo, foto }: Props) {
  const [abierto, setAbierto] = useState(true);
  const [sinFoto, setSinFoto] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    botonRef.current?.focus();
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', alTeclear);
      anterior?.focus?.();
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wantedTitle"
      onClick={(e) => {
        if (e.target === e.currentTarget) setAbierto(false);
      }}
    >
      <div className="modal-card modal-wanted">
        <button type="button" className="modal-close" aria-label="Cerrar aviso" onClick={() => setAbierto(false)}>
          &times;
        </button>
        <div className="poster">
          <i className="nail n1" aria-hidden="true" />
          <i className="nail n2" aria-hidden="true" />
          <i className="nail n3" aria-hidden="true" />
          <i className="nail n4" aria-hidden="true" />
          <div className="poster-inner">
            <p className="poster-top">Orden de captura</p>
            <h2 className="poster-big">SE BUSCA</h2>
            <div className="poster-rule" aria-hidden="true">
              <span>&#9733;</span>
            </div>
            <div className="wanted-photo">
              {sinFoto || !foto ? (
                <span className="wanted-empty">Foto</span>
              ) : (
                <img src={rutaImagen(foto)} alt="Foto de la persona buscada" onError={() => setSinFoto(true)} />
              )}
            </div>
            <p id="wantedTitle" className="poster-sub">
              {titulo}
            </p>
            <div className="poster-rule" aria-hidden="true">
              <span>&#9733;</span>
            </div>
          </div>
        </div>
        <button ref={botonRef} type="button" className="modal-btn" onClick={() => setAbierto(false)}>
          Cerrar y ver el sitio
        </button>
      </div>
    </div>
  );
}
