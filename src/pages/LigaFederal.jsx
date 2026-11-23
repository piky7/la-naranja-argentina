import React from "react";
import "./LigaFederal.css";

const zones = [
  { name: "Buenos Aires", short: "BA", color: "#e56a24", teams: ["Racing de Olavarría","Estudiantes de Olavarría","Estudiantes de La Plata","Atenas de La Plata","Somisa de San Nicolás","Belgrano de San Nicolás","Colón de Chivilcoy","Defensores Unidos de Zárate","Los Andes de Villa Ramallo","Ciudad de Campana"] },
  { name: "Entre Ríos", short: "ER", color: "#2c9b70", teams: ["Sionista","Luis Luciano","Regatas","Peñarol","Atlético Tala","Ferro de San Salvador","Urquiza","Racing"] },
  { name: "Chaco", short: "CHA", color: "#e3a72f", teams: ["Don Bosco de Resistencia","Asociación Italiana de Charata","Hércules de Charata","Unión Progresista de Villa Ángela"] },
  { name: "Santa Fe", short: "SF", color: "#3c82bd", teams: ["Sanjustino","Almagro de Esperanza","Gimnasia de Santa Fe","Rivadavia Juniors de Santa Fe"] },
  { name: "Córdoba", short: "CBA", color: "#7b6bc5", teams: ["Complejo Deportivo de Justiniano Posse","Banda Norte de Río Cuarto","Sportivo 9 de Julio de Río Tercero","Sparta de Villa María","Matienzo de Córdoba","Unión Central de Villa María"] },
  { name: "Neuquén / Río Negro", short: "PAT", color: "#2b9fa4", teams: ["Deportivo Roca","Centro Español de Plottier"] },
];

const pending = [
  { name: "Córdoba", detail: "Quedan dos plazas por definir entre cuatro equipos.", teams: [] },
  { name: "Misiones", detail: "Semifinales provinciales: CAPRI, Mitre, Tokio y Oberá.", teams: ["CAPRI","Mitre","Tokio","Oberá"] },
  { name: "Neuquén", detail: "Playoffs de la zona ascenso.", teams: ["Biguá","Del Progreso","Unión de Allen","Centenario"] },
  { name: "Buenos Aires", detail: "Quedan plazas de repechaje por definir.", teams: [] },
];

function Shield({ name, color }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0,3).map(word => word[0]).join("").toUpperCase();
  return <svg className="federal-team-shield" viewBox="0 0 56 64" role="img" aria-label={"Identificador provisorio de " + name}>
    <path d="M5 4H51V36Q49 50 28 60Q7 50 5 36Z" fill="#0d1b29" stroke={color} strokeWidth="2.5"/>
    <path d="M10 9H46V35Q44 46 28 54Q12 46 10 35Z" fill={color} opacity=".22"/>
    <path d="M10 18H46V34H10Z" fill={color} opacity=".9"/>
    <text x="28" y="30" textAnchor="middle" fill="#fff" fontSize={initials.length>2?11:14} fontWeight="900" fontFamily="Arial,sans-serif">{initials}</text>
    <path d="M18 42H38" stroke="#fff" strokeOpacity=".65" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

const federalLogos = {
  "Centro Español de Plottier": "/federal-team-logos/centro-espanol-plottier.webp",
  "Racing de Olavarría": "/federal-team-logos/racing-olavarria.webp",
};

function TeamShield({ name, color }) {
  const [failed, setFailed] = React.useState(false);
  const src = federalLogos[name];
  if (src && !failed) return <img className="federal-team-shield" src={src} alt={"Escudo de " + name} loading="lazy" onError={() => setFailed(true)} />;
  return <Shield name={name} color={color}/>;
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
              <TeamShield name={team} color={zone.color}/>
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

    <section className="federal-info">
      <div><span>FORMATO DE CLASIFICACIÓN</span><h2>EL TORNEO FEDERAL</h2><p>Las plazas provinciales se calculan sobre el 40% de los participantes de los respectivos Prefederales. La competencia nacional está prevista para febrero-junio de 2027.</p></div>
      <div className="federal-info-note"><strong>RELEVAMIENTO PRELIMINAR · 23/11/2026</strong><p>Este listado no es una nómina oficial definitiva de la CAB. Se actualizará a medida que las federaciones provinciales confirmen plazas, repechajes y resultados.</p><small>Organismo: Confederación Argentina de Básquet (CAB).</small></div>
    </section>
    <footer className="federal-disclaimer">Los escudos oficiales se incorporan progresivamente a medida que se verifican sus fuentes. Los clubes sin archivo validado conservan un identificador gráfico provisorio.</footer>
  </main>;
}
