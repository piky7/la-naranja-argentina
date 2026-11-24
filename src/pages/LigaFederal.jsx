import "./LigaFederal.css";

const zones = [
  { name: "Buenos Aires", short: "BA", color: "#e56a24", teams: ["Racing de Olavarría","Estudiantes de Olavarría","Estudiantes de La Plata","Atenas de La Plata","Somisa de San Nicolás","Belgrano de San Nicolás","Colón de Chivilcoy","Defensores Unidos de Zárate","Los Andes de Villa Ramallo","Ciudad de Campana"] },
  { name: "Entre Ríos", short: "ER", color: "#2c9b70", teams: ["Sionista","Luis Luciano","Regatas","Peñarol","Atlético Tala","Ferro de San Salvador","Urquiza","Racing"] },
  { name: "Chaco", short: "CHA", color: "#e3a72f", teams: ["Don Bosco de Resistencia","Asociación Italiana de Charata","Hércules de Charata","Unión Progresista de Villa Ángela"] },
  { name: "Santa Fe", short: "SF", color: "#3c82bd", teams: ["Sanjustino","Almagro de Esperanza","Gimnasia de Santa Fe","Rivadavia Juniors de Santa Fe"] },
  { name: "Córdoba", short: "CBA", color: "#7b6bc5", teams: ["Complejo Deportivo de Justiniano Posse","Banda Norte de Río Cuarto","Sportivo 9 de Julio de Río Tercero","Sparta de Villa María","Matienzo de Córdoba","Unión Central de Villa María"] },
  { name: "Neuquén / Río Negro", short: "PAT", color: "#2b9fa4", teams: ["Deportivo Roca","Centro Español de Plottier","Pérfora (Plaza Huincul)","Pacífico (Neuquén)"] },
];

const teamLogos = {
  "Don Bosco de Resistencia": "/federal-team-logos/don-bosco-resistencia.webp",
  "Asociación Italiana de Charata": "/federal-team-logos/italiana-charata.webp",
  "Hércules de Charata": "/federal-team-logos/hercules-charata.webp",
  "Unión Progresista de Villa Ángela": "/federal-team-logos/union-progresista-villa-angela.webp",
  "Racing de Olavarría": "/federal-team-logos/racing-olavarria.webp",
  "Estudiantes de Olavarría": "/federal-team-logos/estudiantes-olavarria.webp",
  "Estudiantes de La Plata": "/federal-team-logos/estudiantes-la-plata.webp",
  "Atenas de La Plata": "/federal-team-logos/atenas-la-plata.webp",
  "Somisa de San Nicolás": "/federal-team-logos/somisa-san-nicolas.webp",
  "Belgrano de San Nicolás": "/federal-team-logos/belgrano-san-nicolas.webp",
  "Colón de Chivilcoy": "/federal-team-logos/colon-chivilcoy.webp",
  "Defensores Unidos de Zárate": "/federal-team-logos/defensores-unidos-zarate.webp",
  "Los Andes de Villa Ramallo": "/federal-team-logos/los-andes-villa-ramallo.webp",
  "Ciudad de Campana": "/federal-team-logos/ciudad-campana.webp",
  "Sionista": "/federal-team-logos/sionista.webp",
  "Luis Luciano": "/federal-team-logos/luis-luciano.webp",
  "Regatas": "/federal-team-logos/regatas.webp",
  "Peñarol": "/federal-team-logos/penarol.webp",
  "Racing": "/federal-team-logos/racing-entre-rios.webp",
  "Urquiza": "/federal-team-logos/urquiza.webp",
  "Ferro de San Salvador": "/federal-team-logos/ferro-san-salvador.webp",
  "Atlético Tala": "/federal-team-logos/atletico-tala.webp",
  "Sanjustino": "/federal-team-logos/sanjustino.webp",
  "Almagro de Esperanza": "/federal-team-logos/almagro-esperanza.webp",
  "Gimnasia de Santa Fe": "/federal-team-logos/gimnasia-santa-fe.webp",
  "Rivadavia Juniors de Santa Fe": "/federal-team-logos/rivadavia-juniors.webp",
  "Complejo Deportivo de Justiniano Posse": "/federal-team-logos/complejo-justiniano-posse.webp",
  "Banda Norte de Río Cuarto": "/federal-team-logos/banda-norte.webp",
  "Sportivo 9 de Julio de Río Tercero": "/federal-team-logos/sportivo-9-julio.webp",
  "Sparta de Villa María": "/federal-team-logos/sparta-villa-maria.webp",
  "Matienzo de Córdoba": "/federal-team-logos/matienzo-cordoba.webp",
  "Unión Central de Villa María": "/federal-team-logos/union-central-villa-maria.webp",
  "Deportivo Roca": "/federal-team-logos/deportivo-roca.webp",
  "Centro Español de Plottier": "/federal-team-logos/centro-espanol-plottier.webp",
  "Pérfora (Plaza Huincul)": "/federal-team-logos/perfora.webp",
  "Pacífico (Neuquén)": "/federal-team-logos/pacifico.webp",
};

const pending = [
  { name: "Córdoba", detail: "Quedan dos plazas por definir entre cuatro equipos.", teams: [] },
  { name: "Misiones", detail: "Semifinales provinciales: CAPRI, Mitre, Tokio y Oberá.", teams: ["CAPRI","Mitre","Tokio","Oberá"] },
  { name: "Neuquén", detail: "Playoffs de la zona ascenso.", teams: ["Biguá","Del Progreso","Unión de Allen","Centenario"] },
  { name: "Buenos Aires", detail: "Quedan plazas de repechaje por definir.", teams: [] },
];

function Shield({ name, color }) {
  const logo = teamLogos[name];
  if (logo) return <img className="federal-team-logo" src={logo} alt={"Escudo de " + name} loading="lazy" decoding="async"/>
  const initials = name.split(/\s+/).filter(Boolean).slice(0,3).map(word => word[0]).join("").toUpperCase();
  return <svg className="federal-team-shield" viewBox="0 0 56 64" role="img" aria-label={"Identificador provisorio de " + name}>
    <path d="M5 4H51V36Q49 50 28 60Q7 50 5 36Z" fill="#0d1b29" stroke={color} strokeWidth="2.5"/>
    <path d="M10 9H46V35Q44 46 28 54Q12 46 10 35Z" fill={color} opacity=".22"/>
    <path d="M10 18H46V34H10Z" fill={color} opacity=".9"/>
    <text x="28" y="30" textAnchor="middle" fill="#fff" fontSize={initials.length>2?11:14} fontWeight="900" fontFamily="Arial,sans-serif">{initials}</text>
    <path d="M18 42H38" stroke="#fff" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

export default function LigaFederal() {
  const total = zones.reduce((sum, zone) => sum + zone.teams.length, 0);
  return <main className="federal-page">
    <section className="federal-hero">
      <div className="federal-hero-kicker"><span>LA NARANJA ARGENTINA</span><i/> TEMPORADA 2027</div>
      <h1>LIGA FEDERAL <em>2027</em></h1>
      <p>El camino al básquet nacional. Equipos clasificados y plazas en disputa.</p>
      <div className="federal-hero-stats">
        <div><strong>{total}</strong><span>CLASIFICADOS</span></div>
        <div><strong>{pending.length}</strong><span>ZONAS CON PLAZAS PENDIENTES</span></div>
        <div><strong>23 NOV</strong><span>ÚLTIMO RELEVAMIENTO</span></div>
      </div>
    </section>

    <section className="federal-status-legend" aria-label="Estados de clasificación">
      <span><i className="is-qualified"/> CLASIFICADO</span>
      <span><i className="is-pending"/> EN DISPUTA</span>
      <span><i className="is-eliminated"/> ELIMINADO</span>
    </section>

    <section id="federal-zones" className="federal-section">
      <div className="federal-section-title"><div><span>FASE PROVINCIAL</span><h2>CLASIFICADOS</h2></div><strong>{total} EQUIPOS</strong></div>
      <div className="federal-zones-grid">
        {zones.map(zone => <article className="federal-zone-card" key={zone.name} style={{"--zone-color":zone.color}}>
          <header><div className="federal-zone-mark">{zone.short}</div><div><h3>{zone.name}</h3><span>{zone.teams.length} CLASIFICADOS</span></div><b>✓</b></header>
          <div className="federal-team-list">
            {zone.teams.map((team,index) => <div className="federal-team-row" key={team}>
              <Shield name={team} color={zone.color}/>
              <span>{team}</span><small>{String(index+1).padStart(2,"0")}</small>
            </div>)}
          </div>
        </article>)}
      </div>
    </section>

    <section className="federal-section federal-pending-section">
      <div className="federal-section-title"><div><span>DEFINICIONES PENDIENTES</span><h2>PLAZAS EN DISPUTA</h2></div><strong>{pending.length} REGIONES</strong></div>
      <div className="federal-pending-grid">
        {pending.map(region => <article className="federal-pending-card" key={region.name}>
          <div><i/><h3>{region.name}</h3><span>EN DISPUTA</span></div>
          <p>{region.detail}</p>
          {region.teams.length>0 && <ul>{region.teams.map(team=><li key={team}>{team}</li>)}</ul>}
        </article>)}
      </div>
    </section>

    <section className="federal-section federal-calendar-section">
      <div className="federal-section-title"><div><span>CAMINO A LA LIGA FEDERAL 2027</span><h2>PRÓXIMOS PARTIDOS</h2></div><strong>CALENDARIO MANUAL</strong></div>
      <p className="federal-calendar-intro">Fechas de las series que todavía pueden modificar la lista de clasificados. Los horarios que no fueron confirmados por las organizaciones se muestran sin hora.</p>
      <div className="federal-calendar-grid">
        <article className="federal-calendar-card">
          <header><div><span>REPECHAJES · 4 PLAZAS</span><h3>BUENOS AIRES</h3></div><b>R16 / R8</b></header>
          <div className="federal-calendar-body">
            <strong className="federal-calendar-label">R16 · SEGUNDOS PARTIDOS</strong>
            <p>Viernes 28 de noviembre</p>
            <strong className="federal-calendar-label">RESULTADOS · JUEGO 1</strong>
            <ul>
              <li><b>Independiente de Tandil 70-64</b> Unión y Progreso</li>
              <li><b>Kimberley 89-64</b> Alumni de Orense</li>
              <li><b>Riberas del Paraná 85-69</b> Los Indios de Junín</li>
              <li><b>Defensores de Belgrano 66-60</b> Sacachispas</li>
              <li><b>Argentino de Pergamino 66-65</b> Náutico de San Pedro</li>
              <li><b>Porteño de Chacabuco 82-64</b> Náutico de Zárate</li>
            </ul>
            <p><b>29/11:</b> terceros partidos, si hacen falta.</p>
            <div className="federal-calendar-divider"/>
            <strong className="federal-calendar-label">R8 · DEFINICIÓN DE LAS 4 PLAZAS</strong>
            <p><b>4/12:</b> primeros partidos · <b>11/12:</b> segundos · <b>12/12:</b> terceros, si hacen falta.</p>
            <small>San Martín de Junín y Gimnasia de Pergamino esperan directamente en R8. Sus cruces serán ante los ganadores de Náutico SP/Argentino y Porteño/Náutico Zárate, respectivamente. Las otras dos llaves se completan con los ganadores de los cruces restantes.</small>
          </div>
        </article>

        <article className="federal-calendar-card">
          <header><div><span>REPECHAJES · 2 PLAZAS</span><h3>CÓRDOBA</h3></div><b>AL MEJOR DE 3</b></header>
          <div className="federal-calendar-body">
            <div className="federal-series">
              <strong>Unión de San Guillermo vs. Almafuerte</strong>
              <span className="federal-series-status">Unión de San Guillermo lidera 1-0 · marcador no consignado</span>
              <p><b>27/11:</b> Juego 2 en Las Varillas</p>
              <p><b>29/11:</b> Juego 3 en San Guillermo, si hace falta</p>
            </div>
            <div className="federal-calendar-divider"/>
            <div className="federal-series">
              <strong>El Tala vs. 9 de Julio de Morteros</strong>
              <span className="federal-series-status">El Tala lidera 1-0 · ganó 79-75</span>
              <p><b>27/11:</b> Juego 2 en Morteros</p>
              <p><b>29/11:</b> Juego 3 en San Francisco, si hace falta</p>
            </div>
            <small>El ganador de cada serie obtiene una plaza para la Liga Federal 2027.</small>
          </div>
        </article>

        <article className="federal-calendar-card">
          <header><div><span>SEMIFINALES · 2 PLAZAS</span><h3>MISIONES</h3></div><b>AL MEJOR DE 3</b></header>
          <div className="federal-calendar-body">
            <div className="federal-series">
              <strong>CAPRI vs. Bartolomé Mitre</strong>
              <span className="federal-series-status">CAPRI lidera 1-0 · ganó 85-39</span>
              <p><b>27/11:</b> Juego 2 en cancha de Mitre</p>
            </div>
            <div className="federal-calendar-divider"/>
            <div className="federal-series">
              <strong>Tokio vs. Oberá Tenis Club</strong>
              <span className="federal-series-status">Tokio lidera 1-0 · ganó 80-58</span>
              <p><b>27/11:</b> Juego 2 en Oberá</p>
            </div>
            <p><b>29/11:</b> terceros partidos, si hacen falta. Horarios a confirmar.</p>
            <small>Los ganadores de ambas semifinales consiguen las plazas misioneras para la Liga Federal 2027.</small>
          </div>
        </article>

        <article className="federal-calendar-card">
          <header><div><span>ZONA ASCENSO · 1 ASCENSO DIRECTO</span><h3>NEUQUÉN / RÍO NEGRO</h3></div><b>SEMIFINALES</b></header>
          <div className="federal-calendar-body">
            <div className="federal-series">
              <strong>Biguá vs. Centenario</strong>
              <span className="federal-series-status">Juego 1 disputado · 21/11</span>
              <p><b>24/11:</b> Juego 2 en Centenario</p>
              <p><b>28/11:</b> Juego 3 en Neuquén, si hace falta</p>
            </div>
            <div className="federal-calendar-divider"/>
            <div className="federal-series">
              <strong>Del Progreso vs. Unión de Allen</strong>
              <span className="federal-series-status">Juego 1 disputado · 21/11</span>
              <p><b>25/11:</b> Juego 2 en Allen</p>
              <p><b>28/11:</b> Juego 3 en General Roca, si hace falta</p>
            </div>
            <small>Los finalistas jugarán por el ascenso: el campeón sube directamente y el subcampeón tendrá una promoción ante el 7.º de la zona campeonato.</small>
          </div>
        </article>
      </div>
      <p className="federal-calendar-footnote">Información relevada al 23/11/2026. Este calendario es estático y no se actualiza automáticamente. Resultados y fechas podrán corregirse cuando LNA realice un nuevo relevamiento manual.</p>
    </section>

    <section className="federal-info">
      <div><span>FORMATO DE CLASIFICACIÓN</span><h2>EL TORNEO FEDERAL</h2><p>Las plazas provinciales se calculan sobre el 40% de los participantes de los respectivos Prefederales. La competencia nacional está prevista para febrero-junio de 2027.</p></div>
      <div className="federal-info-note"><strong>RELEVAMIENTO PRELIMINAR · 23/11/2026</strong><p>Este listado no es una nómina oficial definitiva de la CAB. Se actualizará a medida que las federaciones provinciales confirmen plazas, repechajes y resultados.</p><small>Organismo: Confederación Argentina de Básquet (CAB).</small></div>
    </section>
    <footer className="federal-disclaimer">Los escudos oficiales se muestran en los equipos cuyos archivos fueron incorporados; los demás identificadores son provisorios.</footer>
  </main>;
}