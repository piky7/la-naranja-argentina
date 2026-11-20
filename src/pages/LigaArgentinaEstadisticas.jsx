import { useMemo, useState } from "react";
import fixture from "../../data/lab/labSchedule.json";
import rosters from "../../data/lab/labRosters.json";
import boxscores from "../../data/lab/labBoxscores.json";
import { labMatchColor, labCrest } from "./HomeLigaArgentina";
import "./LigaArgentina.css";
import "./Estadisticas.css";
import "../components/TeamRankings.css";
import "../components/TripleRankings.css";
import "./LigaArgentinaEstadisticas.css";

const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const fmt = value => Number(value || 0).toFixed(1).replace(".", ",");
const formatPersonName = value => String(value || "").toLocaleLowerCase("es").replace(/(^|[\s'’\-])([a-záéíóúüñ])/gu, (_, sep, letter) => sep + letter.toLocaleUpperCase("es"));
const teams = fixture.teams;
const teamFor = id => teams.find(team => Number(team.teamId) === Number(id));
const allPlayers = Object.values(rosters.teams || {}).flatMap(roster =>
  (roster.players || []).map(player => ({
    ...player,
    team: teamFor(player.teamId),
    averages: player.averages || {},
    triplesMade: number(player.threePointers?.made),
  }))
).filter(player => player.gamesPlayed > 0);

const teamColors = player => player.team ? labMatchColor(player.team) : "#315a7b";
const playerStats = ["points","rebounds","assists","valuation"];
const minutesInSeconds = value => { const parts=String(value||"").split(":").map(Number); return parts.length===3?parts[0]*3600+parts[1]*60+parts[2]:parts.length===2?parts[0]*60+parts[1]:number(value)*60; };

function calculateMvpCounts() {
  const counts = new Map();
  const seen = new Set();
  for (const [matchId, box] of Object.entries(boxscores || {})) {
    if (seen.has(matchId) || !Array.isArray(box.players) || !box.players.length) continue;
    seen.add(matchId);
    const eligible = box.players.filter(player => minutesInSeconds(player.minutes) > 0);
    if (!eligible.length || eligible.some(player => player.valuation == null || !Number.isFinite(Number(player.valuation)))) continue;
    const best = Math.max(...eligible.map(player => number(player.valuation)));
    eligible.filter(player => number(player.valuation) === best).forEach(player =>
      counts.set(Number(player.id), (counts.get(Number(player.id)) || 0) + 1)
    );
  }
  return counts;
}
const mvpCounts = calculateMvpCounts();

const teamRows = (() => {
  const map = new Map(teams.map(team => [Number(team.teamId), {
    team, games:0,wins:0,losses:0,points:0,pointsAgainst:0,homeWins:0,awayWins:0,
    rebounds:0,assists:0,collectiveGames:0
  }]));
  for (const match of fixture.matches) {
    if (match.homeScore == null || match.awayScore == null ||
      (number(match.homeScore) === 0 && number(match.awayScore) === 0)) continue;
    const home = map.get(Number(match.homeTeam.teamId)), away = map.get(Number(match.awayTeam.teamId));
    if (!home || !away) continue;
    const hs=number(match.homeScore), as=number(match.awayScore);
    home.games++; away.games++;
    home.points+=hs; home.pointsAgainst+=as; away.points+=as; away.pointsAgainst+=hs;
    if (hs>as) {home.wins++;away.losses++;home.homeWins++;}
    else if(as>hs) {away.wins++;home.losses++;away.awayWins++;}
    const comparison=boxscores[match.id]?.teamComparison;
    if (comparison?.home && comparison?.away) {
      home.rebounds+=number(comparison.home.rebounds); home.assists+=number(comparison.home.assists); home.collectiveGames++;
      away.rebounds+=number(comparison.away.rebounds); away.assists+=number(comparison.away.assists); away.collectiveGames++;
    }
  }
  return [...map.values()];
})();

const teamMetrics=[
  ["points","PTS","Puntos por partido"],["pointsAgainst","PTS REC","Puntos recibidos"],
  ["rebounds","REB","Rebotes"],["assists","AST","Asistencias"],
  ["homeWins","G. LOC","Ganados de local"],["awayWins","G. VIS","Ganados de visitante"]
];
const valueForTeam=(row,key)=>{
  if(key==="homeWins") return row.homeWins;
  if(key==="awayWins") return row.awayWins;
  if(key==="rebounds"||key==="assists") return row.collectiveGames ? row[key]/row.collectiveGames : null;
  return row.games ? row[key]/row.games : null;
};

function PlayerPodium({items,stat,label,onSelect}) {
  return <div className="triple-podium lab-stats-podium">
    {[1,0,2].map(index=>{
      const player=items[index];
      return <button type="button" key={index} className={`triple-podium-card triple-podium-${index+1}`}
        style={player?{"--podium-glow":`color-mix(in srgb, ${teamColors(player)} 32%, transparent)`}:undefined}
        disabled={!player} onClick={()=>player&&onSelect(player)}>
        <span className="triple-medal">{["🥇","🥈","🥉"][index]}</span>
        <strong className="triple-podium-value">{player?fmt(stat(player)):"—"}</strong>
        <small>{label}</small>
        <strong className="triple-podium-name">{formatPersonName(player?.name || "Sin datos")}</strong>
        {player?.team&&<img src={labCrest(player.team)} alt=""/>}
      </button>;
    })}
  </div>;
}

function LigaArgentinaEstadisticas(){
  const [mode,setMode]=useState("players");
  const [search,setSearch]=useState("");
  const [selectedTeam,setSelectedTeam]=useState("all");
  const [minGames,setMinGames]=useState("0");
  const [sortBy,setSortBy]=useState("points");
  const [sortDir,setSortDir]=useState("desc");
  const [scope,setScope]=useState("overall");
  const [teamMetric,setTeamMetric]=useState("points");
  const [teamDirection,setTeamDirection]=useState("best");
  const normalized=search.trim().toLocaleLowerCase("es");

  const playerRows=useMemo(()=>allPlayers.filter(player=>
    (!normalized||player.name.toLocaleLowerCase("es").includes(normalized)) &&
    (selectedTeam==="all"||String(player.teamId)===selectedTeam) &&
    player.gamesPlayed>=Number(minGames)
  ).sort((a,b)=>{
    const av=sortBy==="gamesPlayed"?number(a.gamesPlayed):number(a.averages?.[sortBy]),bv=sortBy==="gamesPlayed"?number(b.gamesPlayed):number(b.averages?.[sortBy]);
    return (sortDir==="desc"?bv-av:av-bv)||a.name.localeCompare(b.name,"es");
  }),[normalized,selectedTeam,minGames,sortBy,sortDir]);

  const leaders=useMemo(()=>[
    ["points","MÁXIMO ANOTADOR","PTS / PARTIDO"],
    ["rebounds","MÁXIMO REBOTEADOR","REB / PARTIDO"],
    ["assists","MÁXIMO ASISTIDOR","AST / PARTIDO"],
    ["valuation","MEJOR VALORACIÓN","VAL / PARTIDO"]
  ].map(([key,title,unit])=>({key,title,unit,player:[...allPlayers].sort((a,b)=>number(b.averages?.[key])-number(a.averages?.[key]))[0]})),[]);

  const triplePlayers=useMemo(()=>[...allPlayers].filter(p=>p.triplesMade>0)
    .sort((a,b)=>b.triplesMade-a.triplesMade||a.name.localeCompare(b.name,"es")).slice(0,20),[]);
  const mvpPlayers=useMemo(()=>allPlayers.map(p=>({...p,mvps:mvpCounts.get(Number(p.id))||0}))
    .filter(p=>p.mvps>0).sort((a,b)=>b.mvps-a.mvps||a.name.localeCompare(b.name,"es")).slice(0,20),[]);
  const orderedTeams=useMemo(()=>teamRows.map(row=>({...row,value:valueForTeam(row,teamMetric,scope)}))
    .filter(row=>scope==="overall"|| (scope==="home"?row.homeGames:row.awayGames)>0)
    .sort((a,b)=>{
      if(a.value==null)return 1;if(b.value==null)return -1;
      const lowerBetter=teamMetric==="pointsAgainst";
      const ascending=lowerBetter?teamDirection==="best":teamDirection!=="best";
      return (ascending?a.value-b.value:b.value-a.value)||a.team.name.localeCompare(b.team.name,"es");
    }),[scope,teamMetric,teamDirection]);
  const maxTeamValue=Math.max(1,...orderedTeams.map(r=>r.value||0));
  const toggleSort=key=>{if(sortBy===key)setSortDir(d=>d==="desc"?"asc":"desc");else{setSortBy(key);setSortDir("desc");}};
  const selectOptions=[["players","Jugadores"],["teams","Equipos"],["triples","Triples"],["mvp","MVP"]];

  return <main className="lab-page lab-statistics-page">
    <section className="lab-hero"><div className="lab-hero-inner"><img src="/tournament-logos/lab.svg" alt=""/><div><span className="lab-kicker">LIGA ARGENTINA · 2026/27</span><h1>ESTADÍS<strong>TICAS</strong></h1><p>Rendimiento individual y colectivo de la temporada, a partir de planillas oficiales.</p></div></div></section>
    <section className="lab-content lab-stats-content">
      <nav className="stats-mode-switch lab-stats-mode" aria-label="Tipo de estadísticas">
        {selectOptions.map(([key,label])=><button type="button" key={key} className={mode===key?"active":""} aria-pressed={mode===key} onClick={()=>{setMode(key);setSearch("");}}>{label}</button>)}
      </nav>

      {mode==="players"&&<>
        <div className="lab-stats-filters">
          <label className="lab-stats-search">BUSCAR JUGADOR<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar jugador..."/></label>
          <label>EQUIPO<select value={selectedTeam} onChange={e=>setSelectedTeam(e.target.value)}><option value="all">Todos los equipos</option>{teams.map(t=><option key={t.teamId} value={String(t.teamId)}>{t.name}</option>)}</select></label>
          <label>MÍN. PJ<select value={minGames} onChange={e=>setMinGames(e.target.value)}><option value="0">Todos</option><option value="2">2 partidos</option><option value="3">3 partidos</option><option value="5">5 partidos</option></select></label>
        </div>
        <div className="stats-leaders lab-stats-leaders">{leaders.map(({key,title,unit,player})=><button type="button" className="stats-leader-card lab-stats-leader" key={key} style={{"--stats-team-color":teamColors(player)}} onClick={()=>setSearch(player.name)}>
          <span className="stats-leader-title">{title}</span><div className="stats-leader-value"><strong>{fmt(player.averages?.[key])}</strong><span>{unit}</span></div>
          {player.team&&<img src={labCrest(player.team)} alt=""/>}<strong className="lab-stats-leader-name">{formatPersonName(player.name)}</strong>
        </button>)}</div>
        <div className="lab-stats-table-wrap"><table className="stats-table lab-player-ranking"><thead><tr>
          <th>JUGADOR</th><th>EQUIPO</th><th><button onClick={()=>toggleSort("gamesPlayed")}>PJ ↕</button></th>
          {playerStats.map(key=><th key={key}><button onClick={()=>toggleSort(key)}>{({points:"PTS",rebounds:"REB",assists:"AST",valuation:"VAL"})[key]} {sortBy===key?(sortDir==="desc"?"↓":"↑"):"↕"}</button></th>)}
        </tr></thead><tbody>{playerRows.slice(0,20).map((p,i)=><tr key={p.id} style={{"--stats-team-color":teamColors(p)}} onClick={()=>{}}>
          <td><span className="lab-stats-player-cell"><b className={i<3?"lab-stats-medal":""}>{i+1}</b><strong>{formatPersonName(p.name)}</strong></span></td>
          <td><img className="lab-stats-team-logo" src={labCrest(p.team)} alt={p.team?.name||""}/></td><td>{p.gamesPlayed}</td>
          {playerStats.map(key=><td key={key} className={sortBy===key?"stats-active-column":""}>{fmt(p.averages?.[key])}</td>)}
        </tr>)}</tbody></table>{!playerRows.length&&<p className="triple-empty">No hay jugadores con esos filtros.</p>}</div>
        <p className="triple-note">Promedios calculados sobre partidos con minutos disputados y planilla oficial importada. Se muestran los 20 mejores según el indicador seleccionado.</p>
      </>}

      {mode==="teams"&&<div className="team-ranking lab-team-ranking">
        <div className="team-ranking-scopes">{[["overall","General"],["home","Local"],["away","Visitante"]].map(([key,label])=><button type="button" key={key} className={scope===key?"active":""} onClick={()=>setScope(key)}>{label}</button>)}</div>
        <div className="team-ranking-metrics">{teamMetrics.map(([key,label])=><button type="button" key={key} className={teamMetric===key?"active":""} onClick={()=>setTeamMetric(key)}>{label}</button>)}</div>
        <div className="team-ranking-tools"><div className="team-ranking-heading"><span className="team-ranking-eyebrow">RANKING DE EQUIPOS · 2026/27</span><h2>{teamMetrics.find(m=>m[0]===teamMetric)?.[2]}</h2><p>{scope==="overall"?"Todos los partidos":scope==="home"?"Partidos como local":"Partidos como visitante"}</p></div>
          <div className="team-ranking-controls"><label>ORDENAR<select value={teamDirection} onChange={e=>setTeamDirection(e.target.value)}><option value="best">Mejor a peor</option><option value="worst">Peor a mejor</option></select></label></div></div>
        <div className="team-ranking-list"><div className="team-ranking-listhead"><span>POS. · EQUIPO</span><span>{teamMetrics.find(m=>m[0]===teamMetric)?.[1]} / PJ</span></div>
          {orderedTeams.map((row,i)=><div className="team-ranking-row" key={row.team.teamId} style={{"--ranking-team-color":labMatchColor(row.team)}}><span className="team-ranking-position">{i+1}.</span><img className="team-ranking-logo" src={labCrest(row.team)} alt=""/><span className="team-ranking-name">{row.team.name}<small>{row.games} PJ</small></span><span className="team-ranking-track"><span style={{width:`${row.value==null?0:Math.max(4,100*row.value/maxTeamValue)}%`}}/></span><strong className="team-ranking-value">{row.value==null?"—":fmt(row.value)}</strong></div>)}
        </div><p className="team-ranking-note">Puntos y victorias se calculan con resultados finales. Rebotes y asistencias utilizan únicamente partidos con comparativa colectiva oficial.</p>
      </div>}

      {mode==="triples"&&<section className="triple-ranking lab-triple-ranking">
        <div className="triple-heading"><span>LIGA ARGENTINA · 2026/27</span><h2>Ranking de triples</h2><p>Triples convertidos acumulados en partidos con planilla individual oficial.</p></div>
        <PlayerPodium items={triplePlayers.slice(0,3)} stat={p=>p.triplesMade} label="TRIPLES" onSelect={()=>{}}/>
        <div className="triple-table-head"><span>JUGADOR</span><span>TRIPLES</span></div><div className="triple-list">{triplePlayers.slice(3,20).map((p,i)=><div className="triple-row" key={p.id} style={{"--ranking-team-color":teamColors(p)}}><span className="triple-position">{i+4}</span><span className="triple-player-name">{formatPersonName(p.name)}<small>{p.team?.name||""}</small></span><img src={labCrest(p.team)} alt=""/><strong>{p.triplesMade}</strong></div>)}{!triplePlayers.length&&<p className="triple-empty">Todavía no hay triples oficiales disponibles.</p>}</div>
        <p className="triple-note">Se muestran hasta 20 jugadores ordenados por triples convertidos acumulados en las planillas oficiales importadas.</p>
      </section>}

      {mode==="mvp"&&<section className="triple-ranking lab-triple-ranking">
        <div className="triple-heading"><span>LIGA ARGENTINA · 2026/27</span><h2>Ranking de MVP</h2><p>Jugadores con más distinciones por valoración individual en los partidos importados.</p></div>
        <PlayerPodium items={mvpPlayers.slice(0,3)} stat={p=>p.mvps} label="MVP" onSelect={()=>{}}/>
        <div className="triple-table-head"><span>JUGADOR</span><span>MVP</span></div><div className="triple-list">{mvpPlayers.slice(3,20).map((p,i)=><div className="triple-row" key={p.id} style={{"--ranking-team-color":teamColors(p)}}><span className="triple-position">{i+4}</span><span className="triple-player-name">{p.name}<small>{p.team?.name||""}</small></span><img src={labCrest(p.team)} alt=""/><strong>{p.mvps}</strong></div>)}{!mvpPlayers.length&&<p className="triple-empty">Todavía no hay MVP calculables con planillas completas.</p>}</div>
        <p className="triple-note">El MVP se calcula por mayor valoración individual en cada boxscore oficial. En caso de empate, todos los jugadores empatados reciben una distinción.</p>
      </section>}
    </section>
  </main>;
}
export default LigaArgentinaEstadisticas;
