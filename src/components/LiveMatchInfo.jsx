import "./LiveMatchInfo.css";

export default function LiveMatchInfo({ live, homeName, awayName }) {
  if (!live) return null;
  const quarter = Number(live.quarter);
  const activeQuarter = Number.isInteger(quarter) && quarter >= 1 ? quarter : null;
  const scores = Array.isArray(live.quarterScores) ? live.quarterScores : null;
  const getScore = (entry, side) => {
    if (Array.isArray(entry)) return entry[side] ?? "—";
    if (entry && typeof entry === "object") return entry[side ? "away" : "home"] ?? entry[side ? "awayScore" : "homeScore"] ?? "—";
    return "—";
  };
  return (
    <div className="lna-live-info">
      {activeQuarter && <div className="lna-live-progress" aria-label={`Período ${activeQuarter}`}>
        {[1,2,3,4].map(n => <div key={n} className={n < activeQuarter ? "is-done" : n === activeQuarter ? "is-current" : ""}><span /><small>{n}C</small></div>)}
      </div>}
      {scores?.length > 0 && <div className="lna-live-periods">
        <div className="lna-live-periods-heading"><b>PARCIALES</b>{scores.map((_, i) => <span key={i}>{i < 4 ? `${i+1}C` : `OT${i-3}`}</span>)}</div>
        {[0,1].map(side => <div className="lna-live-periods-row" key={side}><strong>{side ? awayName : homeName}</strong>{scores.map((entry,i) => <span key={i}>{getScore(entry,side)}</span>)}</div>)}
      </div>}
    </div>
  );
}
