import { players } from "../data/players";
import { teamMatchColors } from "../data/teams";
import "./LiveStartingFive.css";

const shortName = name => String(name || "").trim().split(/\s+/).slice(0, 2).join(" ");
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const role = position => {
  const p = normalize(position);
  if (p.includes("ala pivot") || p.includes("ala pivote")) return "power";
  if (p.includes("pivot") || p.includes("pivote")) return "center";
  if (p.includes("base")) return "point";
  if (p.includes("escolta")) return "shooting";
  if (p.includes("alero")) return "small";
  return null;
};
const roles = ["point", "shooting", "small", "power", "center"];

function orderStartingFive(starters, teamId) {
  const roster = players.filter(player => player.teamId === teamId);
  const remaining = starters.map((starter, index) => {
    const matched = roster.find(player => starter.officialPlayerId != null && player.officialPlayerId != null && String(player.officialPlayerId) === String(starter.officialPlayerId))
      || roster.find(player => starter.number != null && String(player.number) === String(starter.number))
      || roster.find(player => normalize(player.name) === normalize(starter.name));
    return { ...starter, position: role(matched?.position), matchedPlayer: matched || null, index };
  });
  // Primero ubicar posiciones verificadas. No asignar una posición ficticia
  // cuando un jugador no tenga su puesto cargado en la base de LNA.
  const arranged = Array(5).fill(null);
  for (const position of roles) {
    const index = remaining.findIndex(player => player.position === position);
    if (index >= 0) arranged[roles.indexOf(position)] = remaining.splice(index, 1)[0];
  }
  remaining.forEach(player => { arranged[arranged.findIndex(slot => slot === null)] = player; });
  return arranged;
}

export default function LiveStartingFive({ live, homeTeam, awayTeam, onPlayerClick }) {
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
        {sides.map(side => <div key={side.key} className={`live-five-side live-five-${side.key}`} style={{ "--live-five-team-color": teamMatchColors[side.team?.id] || "#234768" }}>
          <div className="live-five-team">{side.team?.logo && <img src={side.team.logo} alt="" />}<strong>{side.team?.shortName || side.team?.name}</strong></div>
          <div className="live-five-players">{orderStartingFive(side.players, side.team?.id).map((player, index) => <button type="button" className={`live-five-player live-five-position-${index}`} key={player.officialPlayerId || index} title={`Ver jugador: ${player.name}`} disabled={!player.matchedPlayer} onClick={() => player.matchedPlayer && onPlayerClick?.({ ...player.matchedPlayer, team: side.team })}>
            <span className="live-five-number">#{player.number ?? "—"}</span>
            <span className="live-five-name">{shortName(player.name)}</span>
          </button>)}</div>
        </div>)}
      </div>
    ) : <p className="live-five-unavailable">Esperando la confirmación de los quintetos en la planilla oficial de la Liga Nacional.</p>}
    <p className="live-five-source">Fuente: planilla oficial LNB · Cinco inicial</p>
  </section>;
}
