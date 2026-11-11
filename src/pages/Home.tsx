import { BotonAvisos } from '../components/BotonAvisos';
import { BotonInstalar } from '../components/BotonInstalar';
import { Contador } from '../components/Contador';
import { ModalSeBusca } from '../components/ModalSeBusca';
import { DEFAULT_CONFIG, rutaImagen, type SiteConfig } from '../lib/config';
import { desglosar, proximaFechaAnual, proximoCobro } from '../lib/fechas';
import { useAhora, useSiteConfig } from '../lib/useSiteConfig';

function TituloIntervencion({ plantilla, dias }: { plantilla: string; dias: number }) {
  const texto = dias === 1 ? '1 día' : `${dias} días`;
  const [antes, despues] = plantilla.includes('{dias}') ? plantilla.split('{dias}', 2) : [`${plantilla} `, ''];
  return (
    <h1 className="stage-title">
      {antes}
      <span className="glow">{texto}</span>
      {despues}
    </h1>
  );
}

function Intervencion({ c, ahora }: { c: SiteConfig['intervencion']; ahora: number }) {
  const desde = Date.parse(c.desde);
  const inicio = Number.isNaN(desde) ? Date.parse(DEFAULT_CONFIG.intervencion.desde) : desde;
  const transcurrido = ahora - inicio;

  return (
    <section id="intervenidos" className="stage">
      <div className="stage-copy">
        <p className="eyebrow">
          <span className="live" /> Intervenidos
        </p>
        <TituloIntervencion plantilla={c.titulo} dias={desglosar(transcurrido).d} />
        <p className="stage-phrase">{c.frase}</p>
        <Contador ms={transcurrido} etiqueta="Tiempo intervenidos" />
      </div>
      <div className="stage-art">
        <div className="bars" aria-hidden="true" />
        {c.foto && <img src={rutaImagen(c.foto)} alt="Intervenido, tras las rejas" className="cutout" />}
        {c.sello && <span className="stamp">{c.sello}</span>}
      </div>
      <div className="tape" aria-hidden="true" />
    </section>
  );
}

interface TarjetaProps {
  id: string;
  alt?: boolean;
  eyebrow: string;
  foto: string;
  altFoto: string;
  badge: string;
  titulo: string;
  texto: string;
  objetivo: Date | null;
  ahora: number;
}

function Tarjeta({ id, alt, eyebrow, foto, altFoto, badge, titulo, texto, objetivo, ahora }: TarjetaProps) {
  const restante = objetivo ? objetivo.getTime() - ahora : 0;
  const dias = desglosar(restante).d;
  const pill = objetivo ? (dias === 0 ? '¡Es hoy!' : dias === 1 ? 'mañana' : `en ${dias} días`) : badge;

  return (
    <article id={id} className={`card${alt ? ' alt' : ''}`}>
      <div className="card-art">
        <img src={rutaImagen(foto)} alt={altFoto} />
        <span className="pill">{pill}</span>
      </div>
      <div className="card-body">
        <p className={`eyebrow${alt ? ' alt' : ''}`}>{eyebrow}</p>
        <h2 className="card-title">{titulo}</h2>
        <p className="card-text">{texto}</p>
        {objetivo && <Contador ms={restante} etiqueta={`Cuenta regresiva: ${eyebrow}`} />}
      </div>
    </article>
  );
}

export function Home() {
  const { config, estado } = useSiteConfig();
  const ahora = useAhora();
  const conFechas = config.modo === 'contadores';
  const { sueldo, aguinaldo } = config;

  const cobro = conFechas ? proximoCobro(sueldo.dia, sueldo.hora, sueldo.corrimiento, ahora) : null;
  const agui = conFechas ? proximaFechaAnual(aguinaldo.mes, aguinaldo.dia, sueldo.hora, sueldo.corrimiento, ahora) : null;

  return (
    <>
      <div className="aurora" />

      {config.urgente.visible && (
        <div className="urgente">
          <i aria-hidden="true" /> {config.urgente.texto}
        </div>
      )}
      {config.ticker.visible && (
        <div className="ticker" aria-label="Avisos">
          <div>
            {config.ticker.texto} · {config.ticker.texto}
          </div>
        </div>
      )}

      <header className="nav">
        <div className="brand">
          <img src="/img/nutria-chambeadora.jpg" alt="" className="brand-img" />
          <span>Nutrias Chambeadoras</span>
        </div>
        <div className="nav-acciones">
          <BotonInstalar />
          <BotonAvisos />
        </div>
      </header>

      <main>
        {config.bcp.visible && (
          <aside className="bcp-banner" aria-label="Aviso">
            {config.bcp.logo && <img src={rutaImagen(config.bcp.logo)} alt="" className="bcp-banner-logo" />}
            <div className="bcp-banner-text">
              <strong>{config.bcp.titulo}</strong>
              <span>{config.bcp.texto}</span>
            </div>
            {config.bcp.link && (
              <a className="bcp-banner-btn" href={config.bcp.link} target="_blank" rel="noopener noreferrer">
                {config.bcp.boton}
              </a>
            )}
          </aside>
        )}

        {config.intervencion.visible && <Intervencion c={config.intervencion} ahora={ahora} />}

        <div className="duo">
          <Tarjeta
            id="sueldo"
            eyebrow="Cuando cobramos"
            foto={sueldo.foto}
            altFoto="Nutria esperando el sueldo"
            badge={sueldo.badge}
            titulo={sueldo.titulo}
            texto={sueldo.texto}
            objetivo={cobro}
            ahora={ahora}
          />
          <Tarjeta
            id="aguinaldo"
            alt
            eyebrow="El aguinaldo"
            foto={aguinaldo.foto}
            altFoto="Nutria esperando el aguinaldo"
            badge={aguinaldo.badge}
            titulo={aguinaldo.titulo}
            texto={aguinaldo.texto}
            objetivo={agui}
            ahora={ahora}
          />
        </div>
      </main>

      <footer className="foot">
        <img src="/img/nutria-chambeadora.jpg" alt="" className="foot-img" />
        <p>Nutrias Chambeadoras</p>
        <span className="foot-mini">
          {config.footer.texto} · {new Date(ahora).getFullYear()}
        </span>
        {config.bcp.visible && config.bcp.link && (
          <a className="foot-link" href={config.bcp.link} target="_blank" rel="noopener noreferrer">
            Comunicado oficial del BCP
          </a>
        )}
      </footer>

      {estado !== 'cargando' && config.sebusca.visible && <ModalSeBusca titulo={config.sebusca.titulo} foto={config.sebusca.foto} />}
    </>
  );
}
