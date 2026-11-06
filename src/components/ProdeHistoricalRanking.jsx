import { useEffect, useState } from "react";
import { Trophy, X, ListOrdered } from "lucide-react";
import ProdeCrest from "./ProdeCrest";
import ProdeCareerDetails from "./ProdeCareerDetails";
import { watchProdeUser } from "../auth/prodeAuth";
import { fetchProdeRead, invalidateProdeReads } from "../utils/prodeRequestCache";

export default function ProdeHistoricalRanking({ weekly = false, onReady }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [fullData, setFullData] = useState(null);
  const [fullBusy, setFullBusy] = useState(false);
  const [fullError, setFullError] = useState("");
  const [profileMember, setProfileMember] = useState(null);
  const [retryCounter, setRetryCounter] = useState(0);
  useEffect(() => {
    let active = true, unsubscribe;
    watchProdeUser(next => { if (active) { setUser(next); setAuthReady(true); } }).then(stop => {
      if (active) unsubscribe = stop; else stop?.();
    }).catch(() => { if (active) setAuthReady(true); });
    return () => { active = false; unsubscribe?.(); };
  }, []);
  useEffect(() => {
    let active = true;
    if (!authReady) return;
    setData(null);
    const load = async () => {
      try {
        const json = await fetchProdeRead(weekly ? "/api/prode/ranking/weekly" : "/api/prode/ranking/historical", user);
        if (active) { setData(json); setError(""); }
      } catch {
        if (active) { setData(null); setError("No se pudo cargar el ranking."); }
      }
    };
    load();
    const refreshProfile = () => { invalidateProdeReads(); void load(); };
    const refreshPage = () => { void load(); };
    window.addEventListener("prode-profile-updated",refreshProfile);
    window.addEventListener("prode-page-reopened",refreshPage);
    return () => { active = false; window.removeEventListener("prode-profile-updated",refreshProfile); window.removeEventListener("prode-page-reopened",refreshPage); };
  }, [weekly, user, authReady, retryCounter]);
  useEffect(() => { if (authReady && (data || error)) onReady?.(true); }, [authReady, data, error, onReady]);
  const openTable = async () => {
    if (weekly || tableOpen) return;
    setTableOpen(true);
    setFullBusy(true);
    setFullError("");
    try {
      const json = await fetchProdeRead("/api/prode/ranking/historical?full=1", user, { ttlMs: 20000 });
      setFullData(json);
    } catch (cause) {
      setFullError(cause.message || "No se pudo cargar la tabla");
    } finally {
      setFullBusy(false);
    }
  };
  const openCareer = entry => { if (entry?.userId) setProfileMember(entry); };
  const leaders = (data?.ranking || []).filter(entry => entry.position != null);
  const podium = [leaders[1], leaders[0], leaders[2]];
  const weekLabel = data?.weekStartsAt ? (() => {
    const start = new Date(data.weekStartsAt);
    const end = new Date(start.getTime() + 6*86400000);
    const fmt = d => d.toLocaleDateString("es-AR",{day:"numeric",month:"short",timeZone:"UTC"});
    return fmt(start) + " – " + fmt(end);
  })() : "Lunes a domingo";
  return <>
    {!data && <div className="prode-ranking-initial-state" role="status" aria-live="polite">
      {error ? <><span>{error}</span><button type="button" onClick={() => { invalidateProdeReads(); setRetryCounter(value => value + 1); }}>Reintentar</button></> :
        <><span className="prode-ranking-initial-spinner" aria-hidden="true"/><span>Cargando {weekly ? "ranking semanal" : "ranking general"}…</span></>}
    </div>}
    {data && <div className={"prode-podium" + (!weekly ? " prode-podium-tappable" : "")} aria-label={weekly ? "Tres mejores de la semana" : "Tres mejores del ranking histórico"} role={!weekly ? "button" : undefined} tabIndex={!weekly ? 0 : undefined} onClick={!weekly ? openTable : undefined} onKeyDown={!weekly ? event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); openTable(); } } : undefined}>
      {podium.map((entry, index) => <div key={index} className={"prode-podium-item " + ["second","first","third"][index]}>
        <span className="prode-podium-medal">{[2,1,3][index]}</span>
        <button type="button" className="prode-podium-player-trigger" disabled={!entry?.userId} aria-label={entry ? "Ver Mi Carrera de " + entry.username : "Sin jugador"} onClick={event => { event.stopPropagation(); openCareer(entry); }}>
          <div className="prode-podium-avatar prode-podium-vector">{entry ? <ProdeCrest name={entry.username} primary={entry.crestPrimary} secondary={entry.crestSecondary} textColor={entry.crestText} style={entry.crestStyle} font={entry.crestFont} symbol={entry.crestSymbol} size={index === 1 ? 64 : 54}/> : <Trophy size={23}/>}</div>
          <span>{entry?.username || "Sin participante"}</span>
        </button>
        <strong>{entry ? entry.points + " pts" : "— pts"}</strong>
      </div>)}
    </div>}
    <div className="prode-panel-bottom"><span>{error || (!authReady || !data ? "Cargando clasificación…" : !user ? "Tu posición: iniciá sesión en Prode" : data.myPosition != null ? "Tu posición: " + data.myPosition + "°" : "Tu posición: sin posición")}</span>{!weekly && <button className="prode-ranking-view-all" type="button" onClick={openTable}><ListOrdered size={15}/> Ver tabla completa</button>}</div>
    {profileMember && <div className="prode-career-standalone" onClick={() => setProfileMember(null)}>
      <section className="prode-career-dialog" role="dialog" aria-modal="true" aria-label={"Mi Carrera de " + profileMember.username} onClick={event => event.stopPropagation()}>
        <div className="prode-career-dialog-head"><ProdeCrest name={profileMember.username} primary={profileMember.crestPrimary} secondary={profileMember.crestSecondary} textColor={profileMember.crestText} style={profileMember.crestStyle} font={profileMember.crestFont} symbol={profileMember.crestSymbol} size={54}/><div><small>MI CARRERA · LNA</small><strong>{profileMember.username}</strong></div><button type="button" aria-label="Cerrar Mi Carrera" onClick={() => setProfileMember(null)}><X size={20}/></button></div>
        <ProdeCareerDetails memberId={profileMember.userId} user={user}/>
      </section>
    </div>}
    {!weekly && tableOpen && <div className="prode-global-table-backdrop" onClick={() => setTableOpen(false)}>
      <section className="prode-global-table-dialog" role="dialog" aria-modal="true" aria-label="Clasificación general de Prode LNA" onClick={event => event.stopPropagation()}>
        <div className="prode-global-table-header"><div><small>PRODE LNA · 2026/27</small><h3>RANKING <em>GENERAL</em></h3><p>Clasificación histórica de todos los participantes</p></div><button type="button" aria-label="Cerrar clasificación" onClick={() => setTableOpen(false)}><X size={21}/></button></div>
        <div className="prode-global-table-meta">{fullData && <span>{fullData.total} participantes</span>}<span>PTS acumulados</span></div>
        <div className="prode-global-table-head"><span>POS.</span><span>JUGADOR</span><span>PTS</span></div>
        <div className="prode-global-table-list">
          {fullBusy && <p className="prode-global-table-message" role="status">Cargando clasificación completa…</p>}
          {!fullBusy && fullError && <div className="prode-global-table-message" role="alert"><p>{fullError}</p><button type="button" onClick={() => { setTableOpen(false); setFullData(null); }}>Cerrar</button></div>}
          {!fullBusy && !fullError && (fullData?.ranking || []).map((member, index) => <div className={"prode-global-table-row" + (member.isMe ? " is-me" : "")} key={index}>
            <span className={"prode-global-table-position" + (member.position <= 3 ? " is-medal" : "")}>{member.position <= 3 ? ["🥇","🥈","🥉"][member.position - 1] : member.position + "°"}</span>
            <button type="button" className="prode-global-table-person prode-global-player-trigger" disabled={!member.userId} onClick={() => openCareer(member)}><ProdeCrest name={member.username} primary={member.crestPrimary} secondary={member.crestSecondary} textColor={member.crestText} style={member.crestStyle} font={member.crestFont} symbol={member.crestSymbol} size={40}/><span><strong>{member.username}</strong>{member.isMe && <small>Tu posición</small>}</span></button>
            <strong className="prode-global-table-points">{member.points}</strong>
          </div>)}
          {!fullBusy && !fullError && fullData && !fullData.ranking?.length && <p className="prode-global-table-message">Todavía no hay participantes con puntos.</p>}
        </div>
      </section>
    </div>}
  </>;
}
