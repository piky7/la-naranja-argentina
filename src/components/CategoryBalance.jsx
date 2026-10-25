import { teams } from "../data/teams";
import "./CategoryBalance.css";

export default function CategoryBalance({ home, away, homeId, awayId, stats }) {
  const homeTeam = teams.find(team => team.id === homeId);
  const awayTeam = teams.find(team => team.id === awayId);
  let homeWins = 0;
  let awayWins = 0;
  for (const [, key, lowerIsBetter] of stats) {
    const h = home.values[key];
    const a = away.values[key];
    if (!Number.isFinite(h) || !Number.isFinite(a) || h === a) continue;
    if (lowerIsBetter ? h < a : h > a) homeWins++;
    else awayWins++;
  }
  const total = homeWins + awayWins;
  return (
    <div className="lna-category-balance" aria-label={`Categorías favorables: ${homeTeam?.shortName || homeId} ${homeWins}, ${awayTeam?.shortName || awayId} ${awayWins}`}>
      <div className="lna-category-side">
        {homeTeam?.logo && <img src={homeTeam.logo} alt="" />}
        <span>{homeTeam?.shortName || homeId}<small>{homeWins} {homeWins === 1 ? "categoría" : "categorías"}</small></span>
      </div>
      <div className="lna-category-middle">
        <div className="lna-category-count"><b>{homeWins}</b><span>VENTAJA ESTADÍSTICA</span><b>{awayWins}</b></div>
        <div className="lna-category-track">
          <span style={{ width: `${total ? homeWins / total * 100 : 50}%` }} />
        </div>
      </div>
      <div className="lna-category-side lna-category-side-away">
        <span>{awayTeam?.shortName || awayId}<small>{awayWins} {awayWins === 1 ? "categoría" : "categorías"}</small></span>
        {awayTeam?.logo && <img src={awayTeam.logo} alt="" />}
      </div>
    </div>
  );
}
