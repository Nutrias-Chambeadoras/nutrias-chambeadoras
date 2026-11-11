import { desglosar } from '../lib/fechas';

const pad = (n: number) => String(n).padStart(2, '0');

interface Props {
  ms: number;
  etiqueta: string;
}

/** Días, horas, minutos y segundos en cuatro cajas. */
export function Contador({ ms, etiqueta }: Props) {
  const t = desglosar(ms);
  const unidades: Array<[number, string]> = [
    [t.d, 'días'],
    [t.h, 'horas'],
    [t.m, 'minutos'],
    [t.s, 'segundos'],
  ];
  return (
    <div className="count" role="timer" aria-label={etiqueta}>
      {unidades.map(([valor, nombre]) => (
        <div className="unit" key={nombre}>
          <span className="num">{pad(valor)}</span>
          <span className="lbl">{nombre}</span>
        </div>
      ))}
    </div>
  );
}
