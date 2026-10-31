import "./LiveStartingFive.css";

const shortName = name => String(name || "").trim().split(/\\s+/).slice(0, 2).join(" ");

export default function LiveStartingFive({ live, homeTeam, awayTeam }) {
  const quintetos = live?.quintetos;
  const sides = [
    { key: "home", team: homeTeam, players: quintetos?.home },
    { key: "away", team: awayTeam, players: quintetos?.away },
  ];
  return <section className="live-five" aria-label="Quintetos titulares">
    <h3>QUINTETOS INICIALES</h3>
    {sides.every(side => Array.isArray(side.players) && side.players.length === 5) ? (
      <div className="live-five-court">
        <svg className="live-five-lines" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">
          <rect x="8" y="8" width="984" height="424" rx="6" fill="none" stroke="currentColor" strokeWidth="4" />
          <path d="M500 8V432 M8 95H180V345H8 M992 95H820V345H992 M8 160H100V280H8 M992 160H900V280H992" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="500" cy="220" r="66" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M180 95A170 170 0 0 1 180 345 M820 95A170 170 0 0 0 820 345" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
        {sides.map(side => <div key={side.key} className={`live-five-side live-five-${side.key}`}>
          <div className="live-five-team">{side.team?.logo && <img src={side.team.logo} alt="" />}<strong>{side.team?.shortName || side.team?.name}</strong></div>
          <div className="live-five-players">{side.players.map((player, index) => <div className={`live-five-player live-five-position-${index}`} key={player.officialPlayerId || index} title={player.name}>
            <span className="live-five-number">#{player.number ?? "—"}</span>
            <span className="live-five-name">{shortName(player.name)}</span>
          </div>)}</div>
        </div>)}
      </div>
    ) : <p className="live-five-unavailable">Esperando la confirmación de los quintetos en la planilla oficial de la Liga Nacional.</p>}
    <p className="live-five-source">Fuente: planilla oficial LNB · Cinco inicial</p>
  </section>;
}
