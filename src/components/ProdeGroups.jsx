import { useEffect, useState } from "react";
import { PlusCircle, X, LockKeyhole, Globe2, ChevronRight, UsersRound, ArrowLeft, Copy, Ticket, Trophy, CalendarDays, Medal, Layers3, BarChart3, Settings2, Send } from "lucide-react";
import { watchProdeUser, signInProdeWithGoogle } from "../auth/prodeAuth";
import ProdeCrest from "./ProdeCrest";

const API = "https://lna-prode-api.lnab.workers.dev";
const formatWeekRange = startsAt => {
  const start = new Date(startsAt);
  if (!Number.isFinite(start.getTime())) return "";
  const end = new Date(start.getTime() + 6 * 86400000);
  const format = date => date.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${format(start)} – ${format(end)}`;
};
export default function ProdeGroups() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [newCrestPrimary, setNewCrestPrimary] = useState("#ff9a39");
  const [newCrestSecondary, setNewCrestSecondary] = useState("#10283c");
  const [editCrestPrimary, setEditCrestPrimary] = useState("#ff9a39");
  const [editCrestSecondary, setEditCrestSecondary] = useState("#10283c");
  const [crestEditing, setCrestEditing] = useState(false);
  const [crestSaving, setCrestSaving] = useState(false);
  const [crestMessage, setCrestMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [leagueRanking, setLeagueRanking] = useState(null);
  const [weeklyRanking, setWeeklyRanking] = useState(null);
  const [weeklyHistory, setWeeklyHistory] = useState([]);
  const [seasonArchives, setSeasonArchives] = useState([]);
  const [archiveError, setArchiveError] = useState("");
  const [closeCheck, setCloseCheck] = useState(null);
  const [closeCheckBusy, setCloseCheckBusy] = useState(false);
  const [closeCheckError, setCloseCheckError] = useState("");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [medalTable, setMedalTable] = useState(null);
  const [expandedMedal, setExpandedMedal] = useState(null);
  const [profileUserId, setProfileUserId] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);
  const [manageError, setManageError] = useState("");
  const [initialOpen, setInitialOpen] = useState(false);
  const [initialTarget, setInitialTarget] = useState("");
  const [initialAmount, setInitialAmount] = useState("0");
  const [initialBusy, setInitialBusy] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [rankingError, setRankingError] = useState("");
  const [groupTab, setGroupTab] = useState("weekly");
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [invite, setInvite] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    let active = true, stop;
    watchProdeUser(next => { if (active) setUser(next); }).then(fn => {
      if (active) stop = fn; else fn();
    }).catch(() => { if (active) setReady(true); });
    return () => { active = false; stop?.(); };
  }, []);

  const load = async (current) => {
    if (!current) { setGroups([]); setReady(true); return; }
    try {
      const token = await current.getIdToken();
      const res = await fetch(API + "/api/prode/groups/mine", { headers: { Authorization: "Bearer " + token } });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudieron cargar tus ligas");
      setGroups(data.groups || []);
      setError("");
    } catch (e) { setError(e.message || "Error de conexión"); }
    finally { setReady(true); }
  };
  useEffect(() => { setReady(false); load(user); }, [user]);
  useEffect(() => { const refresh = () => { if (selected) openGroup(selected); }; window.addEventListener("prode-profile-updated", refresh); return () => window.removeEventListener("prode-profile-updated", refresh); }, [selected, user]);
  useEffect(() => { const code = new URLSearchParams(window.location.search).get("invite"); if (code && /^[a-f0-9]{64}$/i.test(code)) { setJoinCode(code); setJoinOpen(true); } }, []);

  const checkSeasonClose = async () => {
    if (!user || !selected || closeCheckBusy) return;
    setCloseCheckBusy(true); setCloseCheckError(""); setCloseCheck(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch(API + "/api/prode/groups/" + encodeURIComponent(selected.id) + "/seasons/close-check", { headers: { Authorization: "Bearer " + token } });
      const data = await response.json();
      if (!response.ok || !data.ok) throw Error(data.error || "No se pudo comprobar el cierre");
      setCloseCheck(data);
    } catch (error) { setCloseCheckError(error.message || "Validación no disponible"); }
    finally { setCloseCheckBusy(false); }
  };
  const openGroup = async (group) => {
    if (!user) return;
    setSelected(group);
    setEditCrestPrimary(group.crestPrimary || "#ff9a39");
    setEditCrestSecondary(group.crestSecondary || "#10283c");
    setCrestEditing(false); setCrestMessage("");
    setGroupTab("weekly");
    setDetail(null);
    setLeagueRanking(null);
    setWeeklyRanking(null);
    setWeeklyHistory([]); setSelectedWeek("");
    setSeasonArchives([]); setArchiveError("");
    setCloseCheck(null); setCloseCheckError("");
    setMedalTable(null);
    setExpandedMedal(null);
    setProfileUserId(null);
    setManageOpen(false); setManageError("");
    setInitialOpen(false); setInitialTarget(""); setInitialAmount("0"); setInitialMessage("");
    setRankingError("");
    setDetailError("");
    setInvite(""); setInviteMessage("");
    setDetailBusy(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(API + "/api/prode/groups/" + encodeURIComponent(group.id), {
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudo abrir la liga");
      setDetail(data);
      setEditCrestPrimary(data.group?.crestPrimary || "#ff9a39");
      setEditCrestSecondary(data.group?.crestSecondary || "#10283c");
      try {
        const archiveResponse = await fetch(API + "/api/prode/groups/" + encodeURIComponent(group.id) + "/seasons", { headers: { Authorization: "Bearer " + token } });
        const archiveData = await archiveResponse.json();
        if (!archiveResponse.ok || !archiveData.ok) throw Error(archiveData.error || "Historial no disponible");
        setSeasonArchives(archiveData.seasons || []);
      } catch (archiveFailure) { setArchiveError(archiveFailure.message || "Historial no disponible"); }
      try {
        const rankingRes = await fetch(API + "/api/prode/groups/" + encodeURIComponent(group.id) + "/ranking", { headers: { Authorization: "Bearer " + token } });
        const rankingData = await rankingRes.json();
        if (!rankingRes.ok || !rankingData.ok) throw Error(rankingData.error || "Clasificación no disponible");
        setLeagueRanking(rankingData.ranking || []);
        setWeeklyRanking(rankingData.weeklyRanking || []);
        setWeeklyHistory(rankingData.weeklyHistory || []);
        setSelectedWeek(String((rankingData.weeklyHistory || []).at(-1)?.number || ""));
        setMedalTable(rankingData.medalTable || []);
      } catch (rankingFailure) { setRankingError(rankingFailure.message || "Clasificación no disponible"); }
    } catch (e) {
      setDetailError(e.message || "Error de conexión");
    } finally {
      setDetailBusy(false);
    }
  };

  const assignInitialPoints = async (event) => {
    event.preventDefault();
    if (!user || !selected || !initialTarget || initialBusy) return;
    setInitialBusy(true); setInitialMessage("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(API + "/api/prode/groups/" + selected.id + "/ranking", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ userId: initialTarget, points: Number(initialAmount) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudieron asignar los puntos");
      setInitialMessage("Se asignaron " + data.points + " puntos iniciales correctamente.");
      setInitialOpen(false);
      setInitialTarget(""); setInitialAmount("0");
      const updated = await fetch(API + "/api/prode/groups/" + selected.id + "/ranking", { headers: { Authorization: "Bearer " + token } });
      const ranking = await updated.json();
      if (updated.ok && ranking.ok) {
        setLeagueRanking(ranking.ranking || []);
        setWeeklyRanking(ranking.weeklyRanking || []);
        setWeeklyHistory(ranking.weeklyHistory || []);
        setMedalTable(ranking.medalTable || []);
      }
    } catch (e) { setInitialMessage(e.message || "Error al asignar puntos"); }
    finally { setInitialBusy(false); }
  };

  const manageLeague = async (action, member) => {
    if (!user || !selected || manageBusy) return;
    const isOwner = detail?.group?.role === "owner";
    let body = {};
    if (action === "members") {
      if (!isOwner || !member || !window.confirm("¿Quitar a " + member.username + " de la liga?")) return;
      body = { userId: member.userId };
    } else if (action === "delete") {
      if (!isOwner) return;
      const confirmName = window.prompt("Esta acción es irreversible. Escribí el nombre exacto de la liga para eliminarla:");
      if (confirmName !== detail.group.name) return;
      body = { confirmName };
    } else if (action === "leave") {
      if (isOwner || !window.confirm("¿Querés abandonar " + selected.name + "?")) return;
    }
    setManageBusy(true); setManageError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(API + "/api/prode/groups/" + selected.id + "/" + action, {
        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudo completar la acción");
      if (action === "leave" || action === "delete") {
        setSelected(null); setDetail(null); setManageOpen(false);
        await load(user);
      } else {
        await openGroup(selected);
        setManageOpen(true);
      }
    } catch (e) { setManageError(e.message || "Error de conexión"); }
    finally { setManageBusy(false); }
  };

  const saveLeagueCrest = async () => {
    if (!user || !selected || detail?.group?.role !== "owner" || crestSaving) return;
    setCrestSaving(true); setCrestMessage("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(API + "/api/prode/groups/" + selected.id + "/crest", {
        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ primary: editCrestPrimary, secondary: editCrestSecondary }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudieron guardar los colores");
      setGroups(previous => previous.map(group => group.id === selected.id ? { ...group, ...data } : group));
      setSelected(previous => ({ ...previous, ...data }));
      setDetail(previous => ({ ...previous, group: { ...previous.group, ...data } }));
      setCrestMessage("Colores del trofeo guardados");
      setCrestEditing(false);
    } catch (error) { setCrestMessage(error.message || "No se pudo guardar"); }
    finally { setCrestSaving(false); }
  };

  const generateInvite = async () => {
    if (!user || !selected || inviteBusy) return;
    setInviteBusy(true); setInviteMessage("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(API + "/api/prode/groups/" + selected.id + "/invite", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudo crear la invitación");
      setInvite(data.token);
      setInviteMessage("Enlace válido por 7 días. Compartilo con tus amigos.");
    } catch (e) { setInviteMessage(e.message || "Error de conexión"); }
    finally { setInviteBusy(false); }
  };

  const joinGroup = async (event) => {
    event.preventDefault();
    if (!user) { setInviteMessage("Primero iniciá sesión con Google para unirte."); return; }
    if (inviteBusy) return;
    setInviteBusy(true); setInviteMessage("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(API + "/api/prode/invitations/join", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ token: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudo ingresar");
      await load(user);
      setJoinOpen(false); setJoinCode("");
      setInviteMessage("");
      const group = { id: data.groupId, name: data.name };
      await openGroup(group);
    } catch (e) { setInviteMessage(e.message || "Error de conexión"); }
    finally { setInviteBusy(false); }
  };

  const loginForInvite = async () => {
    if (loginBusy) return;
    setLoginBusy(true); setInviteMessage("");
    try {
      const result = await signInProdeWithGoogle();
      const token = await result.user.getIdToken();
      const res = await fetch(API + "/api/prode/me", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.user) throw Error("No se pudo registrar el perfil Prode");
      setInviteMessage("Sesión iniciada. Ya podés unirte a la liga.");
    } catch (e) { setInviteMessage(e.message || "No se pudo iniciar sesión con Google"); }
    finally { setLoginBusy(false); }
  };

  const create = async (event) => {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true); setError("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(API + "/api/prode/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), visibility: "private", crestPrimary: newCrestPrimary, crestSecondary: newCrestSecondary }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudo crear la liga");
      setGroups(previous => [data.group, ...previous]);
      setOpen(false); setName(""); setDescription(""); setVisibility("private"); setNewCrestPrimary("#ff9a39"); setNewCrestSecondary("#10283c");
    } catch (e) { setError(e.message || "Error de conexión"); }
    finally { setBusy(false); }
  };

  return <div className="prode-groups">
    <div className="prode-friends-actions">
      <button className="prode-friends-create" type="button" disabled={!user} onClick={() => { setError(""); setVisibility("private"); setOpen(true); }}>
        <PlusCircle size={18}/> Crear liga
      </button>
      <button className="prode-friends-join" type="button" disabled={!user} onClick={() => { setInviteMessage(""); setJoinOpen(true); }}>
        <Ticket size={18}/> Unirme con código
      </button>
    </div>
    {!user && ready && <p className="prode-friends-notice">Iniciá sesión con Google desde el perfil superior para crear una liga o unirte a tus amigos.</p>}
    {ready && groups.length > 0 ? <div className="prode-my-groups">
      <strong>Mis ligas ({groups.length})</strong>
      {groups.map(group => <button type="button" key={group.id} className="prode-my-group prode-group-link" onClick={() => openGroup(group)}>
        <span className="prode-friend-league-badge"><ProdeCrest type="league" name={group.name} primary={group.crestPrimary} secondary={group.crestSecondary} size={76}/></span>
        <span className="prode-friend-league-info"><strong>{group.name}</strong><small><LockKeyhole size={12}/> Liga de amigos · Temporada {group.season || "2026/27"} · {group.role === "owner" ? "Administrador" : "Miembro"}</small></span>
        <span className="prode-friend-enter">Ver liga <ChevronRight size={17}/></span>
      </button>)}
    </div> : ready && user && <div className="prode-friends-notice">Todavía no tenés ligas de amigos. Creá una o ingresá con un código de invitación.</div>}
    {error && <p className="prode-group-error" role="alert">{error}</p>}
    {selected && <div className="prode-dialog-backdrop" onClick={() => setSelected(null)}>
      <section className="prode-dialog prode-group-detail prode-league-premium" style={{ "--league-accent": detail?.group?.crestPrimary || selected.crestPrimary || "#ff9a39" }} role="dialog" aria-modal="true" aria-label={"Liga " + selected.name} onClick={e => e.stopPropagation()}>
        <div className="prode-league-hero">
          <ProdeCrest type="league" name={selected.name} primary={detail?.group?.crestPrimary || selected.crestPrimary} secondary={detail?.group?.crestSecondary || selected.crestSecondary} size={83}/>
          <div className="prode-league-hero-info">
            <h3>{selected.name}</h3>
            <p>LIGA DE AMIGOS</p>
            <div className="prode-league-hero-meta">
              <span><LockKeyhole size={13}/> Privada</span>
              <span><CalendarDays size={13}/> {selected.season || "2026/27"}</span>
              <span><UsersRound size={13}/> {detail?.members?.length ?? "—"} participantes</span>
            </div>
          </div>
          <button type="button" className="prode-league-close" aria-label="Cerrar liga" onClick={() => setSelected(null)}><X size={20}/></button>
        </div>
        {selected.description && <p>{selected.description}</p>}
        {detailBusy && <p>Cargando participantes…</p>}
        {detailError && <p className="prode-group-error" role="alert">{detailError}</p>}
        {detail && <>
          <div className="prode-group-tabs" role="tablist" aria-label="Clasificaciones de la liga">
            <button type="button" role="tab" aria-selected={groupTab === "weekly"} className={groupTab === "weekly" ? "active" : ""} onClick={() => setGroupTab("weekly")}><BarChart3 size={16}/> Semanal</button>
            <button type="button" role="tab" aria-selected={groupTab === "general"} className={groupTab === "general" ? "active" : ""} onClick={() => setGroupTab("general")}><Trophy size={16}/> General</button>
            <button type="button" role="tab" aria-selected={groupTab === "medals"} className={groupTab === "medals" ? "active" : ""} onClick={() => setGroupTab("medals")}><Medal size={16}/> Medallero</button>
            <button type="button" role="tab" aria-selected={groupTab === "seasons"} className={groupTab === "seasons" ? "active" : ""} onClick={() => setGroupTab("seasons")}><Layers3 size={16}/> Temporadas</button>
          </div>
          {groupTab === "weekly" && weeklyHistory.length > 0 && <div className="prode-week-selector prode-week-premium">
            <CalendarDays size={21} aria-hidden="true"/>
            <div className="prode-week-premium-info">
              <label className="prode-week-select-label">
                <select aria-label="Elegir semana del ranking" value={selectedWeek || String(weeklyHistory.at(-1).number)} onChange={e => setSelectedWeek(e.target.value)}>
                  {[...weeklyHistory].reverse().map(w => <option key={w.number} value={w.number}>Semana {w.number}</option>)}
                </select>
                <ChevronRight size={16} aria-hidden="true"/>
              </label>
              <p className="prode-week-date-range">{formatWeekRange(weeklyHistory.find(w => String(w.number) === (selectedWeek || String(weeklyHistory.at(-1).number)))?.startsAt)}</p>
            </div>
            <span className={"prode-week-status " + (weeklyHistory.find(w => String(w.number) === (selectedWeek || String(weeklyHistory.at(-1).number)))?.finished ? "completed" : "live")}>
              {weeklyHistory.find(w => String(w.number) === (selectedWeek || String(weeklyHistory.at(-1).number)))?.finished ? "Finalizada" : "En juego"}
            </span>
          </div>}
          {groupTab === "seasons" ? <div className="prode-season-archive" role="tabpanel">
            <strong>Historial de temporadas</strong>
            {archiveError ? <p className="prode-group-error" role="alert">{archiveError}</p> : seasonArchives.length === 0 ? <p>La temporada 2026/27 sigue en juego. Cuando termine y se confirmen todos los resultados, acá aparecerán los campeones y las clasificaciones definitivas.</p> : seasonArchives.map(archive => <div className="prode-season-item" key={archive.season}>
              <strong>Temporada {archive.season}</strong>
              <span>🏆 {archive.champions.map(id => archive.ranking.find(row => row.userId === id)?.username || "Campeón").join(" · ")}</span>
              <small>{archive.ranking.length} participantes · Clasificación definitiva guardada</small>
            </div>)}
            {detail.group.role === "owner" && <div className="prode-close-check">
              <button type="button" onClick={checkSeasonClose} disabled={closeCheckBusy}>{closeCheckBusy ? "Comprobando…" : "Comprobar si la temporada puede cerrarse"}</button>
              {closeCheckError && <p className="prode-group-error" role="alert">{closeCheckError}</p>}
              {closeCheck && <div role="status">
                <strong>Temporada {closeCheck.season}: cierre bloqueado</strong>
                {closeCheck.fixture.available && <p>Fixture publicado: {closeCheck.fixture.total} partidos registrados · {closeCheck.fixture.pending} sin resultado confirmado. Estos datos pueden no incluir partidos aplazados.</p>}
                {closeCheck.blockers.map((reason,i) => <p key={i}>{reason}</p>)}
                <small>Esta comprobación no guarda ni modifica resultados.</small>
              </div>}
            </div>}
          </div> : groupTab === "medals" ? <div className="prode-group-ranking prode-medal-table" role="tabpanel">
            <div className="prode-ranking-head"><span>JUGADOR</span><span>🥇</span><span>🥈</span><span>🥉</span></div>
            {(medalTable || detail.members).map((member,index) => <div className="prode-medal-member" key={member.userId || index}>
              <div className="prode-ranking-row">
                <button type="button" className="prode-ranking-name prode-profile-trigger" onClick={() => setProfileUserId(member.userId)}><ProdeCrest name={member.username} primary={member.crestPrimary} secondary={member.crestSecondary} textColor={member.crestText} size={36} className="prode-member-crest"/><strong>{member.username}</strong></button>
                {["gold","silver","bronze"].map((type,i) => <button type="button" key={type} className="prode-medal-count" aria-expanded={expandedMedal === (member.userId || index) + ":" + type} aria-label={member.username + ": ver medallas de " + ["oro","plata","bronce"][i]} onClick={() => setExpandedMedal(current => current === (member.userId || index) + ":" + type ? null : (member.userId || index) + ":" + type)}>{member[type] ?? 0}</button>)}
              </div>
              {["gold","silver","bronze"].map((type,i) => expandedMedal === (member.userId || index) + ":" + type && <div className="prode-medal-history" key={type}>
                <strong>{["🥇 Oros","🥈 Platas","🥉 Bronces"][i]} de {member.username}</strong>
                {(member.history || []).filter(h => h.position === i+1).length ? (member.history || []).filter(h => h.position === i+1).map(h => <button type="button" key={h.week} onClick={() => { setSelectedWeek(String(h.week)); setGroupTab("weekly"); }}><span>Semana {h.week}</span><span>{h.points} PTS <ChevronRight size={14}/></span></button>) : <p>Todavía no consiguió medallas de este tipo.</p>}
              </div>)}
            </div>)} 
            {rankingError && <p className="prode-group-error" role="alert">{rankingError}</p>}
            <p className="prode-group-pending">Medallas acumuladas por semana finalizada. Se entregan solo si al menos 3 participantes pronosticaron esa semana. Los empates comparten medalla.</p>
          </div> : <div className="prode-group-ranking prode-ranking-premium" role="tabpanel">
            <h4>{groupTab === "weekly" ? "Clasificación semanal" : "Clasificación general"}</h4>
            <div className="prode-ranking-head"><span>POS.</span><span>JUGADOR</span><span>PTS</span><span>AC</span><span>ERR</span><span>MVP</span></div>
            {((groupTab === "weekly" ? (weeklyHistory.find(w => String(w.number) === selectedWeek)?.ranking || weeklyRanking) : leagueRanking) || detail.members).map((member,index) => <div key={member.userId || index} className="prode-ranking-row">
              <span className={"prode-ranking-position " + (member.position && member.position <= 3 ? "podium-position" : "")}>{member.position ? member.position + "°" : "—"}</span>
              <button type="button" className="prode-ranking-name prode-profile-trigger" onClick={() => setProfileUserId(member.userId)}><ProdeCrest name={member.username} primary={member.crestPrimary} secondary={member.crestSecondary} textColor={member.crestText} size={42} className="prode-member-crest"/><strong>{member.username}</strong></button>
              <span className="prode-ranking-points"><strong>{member.points ?? 0}</strong><small>PTS</small></span>
              <span>{member.correct ?? 0}</span><span>{member.wrong ?? 0}</span><span>{member.mvpHits ?? 0}</span>
            </div>)}
            {rankingError && <p className="prode-group-error" role="alert">{rankingError}</p>}
            <p className="prode-group-pending">Los puntos se actualizan con los resultados oficiales. AC: aciertos · ERR: errores · MVP: MVP acertados.</p>
          </div>}
          {detail.group.role === "owner" && <div className="prode-league-crest-control">
            <button type="button" className="prode-initial-toggle" aria-expanded={crestEditing} onClick={() => { setCrestEditing(!crestEditing); setCrestMessage(""); }}>
              <Trophy size={17}/> Personalizar trofeo <ChevronRight size={15} className={crestEditing ? "expanded" : ""}/>
            </button>
            {crestEditing && <div className="prode-league-crest-form">
              <ProdeCrest type="league" name={selected.name} primary={editCrestPrimary} secondary={editCrestSecondary} size={87}/>
              <div className="prode-crest-colors">
                <label>Color principal<input type="color" value={editCrestPrimary} onChange={e => setEditCrestPrimary(e.target.value)}/></label>
                <label>Color secundario<input type="color" value={editCrestSecondary} onChange={e => setEditCrestSecondary(e.target.value)}/></label>
              </div>
              <button type="button" className="prode-crest-save" onClick={saveLeagueCrest} disabled={crestSaving}>{crestSaving ? "Guardando…" : "Guardar trofeo"}</button>
            </div>}
            {crestMessage && <p role="status">{crestMessage}</p>}
          </div>}
          <div className="prode-manage-control">
            <button type="button" className="prode-initial-toggle" aria-expanded={manageOpen} onClick={() => setManageOpen(!manageOpen)}><UsersRound size={15}/> Administrar liga <ChevronRight size={15} className={manageOpen ? "expanded" : ""}/></button>
            {manageOpen && <div className="prode-manage-panel">
              {detail.group.role === "owner" ? <>
                <strong>Participantes</strong>
                {detail.members.filter(member => member.role !== "owner").map(member => <div className="prode-manage-member" key={member.userId}><span>{member.username}</span><button type="button" disabled={manageBusy} onClick={() => manageLeague("members",member)}>Quitar</button></div>)}
                {detail.members.length <= 1 && <p>Todavía no hay otros participantes.</p>}
                <button type="button" className="prode-manage-danger" disabled={manageBusy} onClick={() => manageLeague("delete")}>Eliminar liga</button>
              </> : <button type="button" className="prode-manage-danger" disabled={manageBusy} onClick={() => manageLeague("leave")}>Abandonar liga</button>}
              {manageError && <p className="prode-group-error" role="alert">{manageError}</p>}
            </div>}
          </div>
          {detail.group.role === "owner" && <div className="prode-initial-control">
            <button type="button" className="prode-initial-toggle" aria-expanded={initialOpen} onClick={() => { setInitialOpen(!initialOpen); setInitialMessage(""); }}><PlusCircle size={15}/> Puntos iniciales <ChevronRight size={15} className={initialOpen ? "expanded" : ""}/></button>
            {initialOpen && <form className="prode-initial-panel" onSubmit={assignInitialPoints}>
            <strong>Asignar puntos iniciales</strong>
            <p>Solo para integrantes nuevos, una única vez. Máximo: {Math.max(0,...(leagueRanking || []).map(m => m.points || 0))} PTS (líder actual).</p>
            <div className="prode-initial-fields">
              <select aria-label="Participante" required value={initialTarget} onChange={e => setInitialTarget(e.target.value)}>
                <option value="">Elegir participante</option>
                {(leagueRanking || []).filter(m => m.userId && m.joinedLate && m.initialPoints === null && !m.played && !m.mvpHits && m.userId !== "firebase:" + user?.uid).map(m => <option key={m.userId} value={m.userId}>{m.username}</option>)}
              </select>
              <input aria-label="Puntos iniciales" type="number" inputMode="numeric" min="0" max={Math.max(0,...(leagueRanking || []).map(m => m.points || 0))} step="1" required value={initialAmount} onChange={e => setInitialAmount(e.target.value)}/>
              <button type="submit" disabled={initialBusy || !initialTarget || initialAmount === "" || Number(initialAmount) < 0 || Number(initialAmount) > Math.max(0,...(leagueRanking || []).map(m => m.points || 0))}>{initialBusy ? "Guardando…" : "Asignar"}</button>
            </div>
            {initialMessage && <p role="status">{initialMessage}</p>}
          </form>}
          {!initialOpen && initialMessage && <p className="prode-initial-feedback" role="status">{initialMessage}</p>}
          </div>}
          {detail.group.role === "owner" && <div className="prode-group-subtitle"><UsersRound size={16}/> {detail.members.length} participantes</div>}
          {detail.group.role === "owner" && <div className="prode-invite-panel"><button type="button" className="prode-create-submit" disabled={inviteBusy} onClick={generateInvite}>{inviteBusy ? "Generando…" : "Generar invitación"}</button>{invite && <><p>Enlace para compartir:</p><div className="prode-invite-link"><input readOnly aria-label="Enlace de invitación" value={"https://lanaranjaargentina.com.ar/prode?invite=" + invite}/><button type="button" aria-label="Copiar enlace" onClick={async () => { try { await navigator.clipboard.writeText("https://lanaranjaargentina.com.ar/prode?invite=" + invite); setInviteMessage("Enlace copiado"); } catch { setInviteMessage("Seleccioná y copiá el enlace"); } }}><Copy size={18}/></button></div></>}{inviteMessage && <p role="status">{inviteMessage}</p>}</div>}
        </>}
        <button type="button" className="prode-group-back" onClick={() => setSelected(null)}><ArrowLeft size={16}/> Volver a mis ligas</button>
      </section>
    </div>}
    {selected && detail && profileUserId && (() => {
      const player = (leagueRanking || []).find(m => m.userId === profileUserId) || (weeklyRanking || []).find(m => m.userId === profileUserId) || detail.members.find(m => m.userId === profileUserId);
      const awards = (medalTable || []).find(m => m.userId === profileUserId);
      if (!player) return null;
      return <div className="prode-profile-backdrop" onClick={() => setProfileUserId(null)}>
        <section className="prode-profile-dialog" role="dialog" aria-modal="true" aria-label={"Perfil de " + player.username} onClick={e => e.stopPropagation()}>
          <button type="button" className="prode-profile-close" aria-label="Cerrar perfil" onClick={() => setProfileUserId(null)}><X size={19}/></button>
          <div className="prode-profile-identity"><ProdeCrest name={player.username} primary={player.crestPrimary} secondary={player.crestSecondary} textColor={player.crestText} size={54} className="prode-member-crest"/><div><h3>{player.username}</h3><small>{selected.name} · Temporada {selected.season || "2026/27"}</small></div></div>
          <div className="prode-profile-points"><strong>{player.points ?? 0}</strong><span>PUNTOS EN LA LIGA</span></div>
          <div className="prode-profile-stats">
            <div><strong>{player.played ?? 0}</strong><span>Jugados</span></div>
            <div><strong>{player.accuracy ?? 0}%</strong><span>Efectividad</span></div>
            <div><strong>{player.mvpHits ?? 0}</strong><span>MVP acertados</span></div>
            <div><strong>{player.correct ?? 0}</strong><span>Aciertos</span></div>
            <div><strong>{player.wrong ?? 0}</strong><span>Errores</span></div>
            <div><strong>{player.mvpVotes ?? 0}</strong><span>MVP votados</span></div>
          </div>
          <div className="prode-profile-best-week">
            <span>Mejor semana</span>
            <strong>{player.bestWeek ? `Semana ${player.bestWeek.number} · ${player.bestWeek.points} pts` : "Sin partidos puntuados"}</strong>
          </div>
          <div className="prode-profile-medals">
            <div><strong>🥇 {awards?.gold ?? 0}</strong><span>Oro</span></div>
            <div><strong>🥈 {awards?.silver ?? 0}</strong><span>Plata</span></div>
            <div><strong>🥉 {awards?.bronze ?? 0}</strong><span>Bronce</span></div>
          </div>
          <p>Estadísticas acumuladas en esta liga. Las medallas corresponden a semanas finalizadas.</p>
        </section>
      </div>;
    })()}
    {joinOpen && <div className="prode-dialog-backdrop" onClick={() => !inviteBusy && setJoinOpen(false)}><form className="prode-dialog" onClick={e => e.stopPropagation()} onSubmit={joinGroup}>
      <div className="prode-dialog-heading"><h3>Unirme a un Prode</h3><button type="button" aria-label="Cerrar" onClick={() => setJoinOpen(false)}><X size={20}/></button></div>
      <label>Código de invitación<input required autoCapitalize="none" autoCorrect="off" value={joinCode} onChange={e => setJoinCode((e.target.value.includes("invite=") ? e.target.value.split("invite=")[1].split("&")[0] : e.target.value).trim())} placeholder="Pegá el código o el enlace"/></label>
      <p>Pedile al administrador el enlace de invitación. Necesitás una cuenta Google para ingresar.</p>
      {!user && <button className="prode-create-submit" type="button" disabled={loginBusy} onClick={loginForInvite}>{loginBusy ? "Conectando…" : "Continuar con Google para unirme"}</button>}
      {inviteMessage && <p className="prode-group-error" role="alert">{inviteMessage}</p>}
      <button className="prode-create-submit" type="submit" disabled={inviteBusy || !user || !joinCode.trim()}>{inviteBusy ? "Ingresando…" : user ? "Unirme a la liga" : "Primero iniciá sesión"}</button>
    </form></div>}
    {open && <div className="prode-dialog-backdrop" onClick={() => !busy && setOpen(false)}>
      <form className="prode-dialog" onClick={e => e.stopPropagation()} onSubmit={create}>
        <div className="prode-dialog-heading"><h3>Crear un Prode</h3><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={20}/></button></div>
        <label>Nombre de la liga<input autoFocus required minLength={3} maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Amigos del básquet"/></label>
        <label>Descripción (opcional)<textarea maxLength={240} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Contanos de qué se trata"/></label>
        <p>Tu liga será privada. Solo podrán ingresar las personas con tu invitación.</p>
        <div className="prode-league-crest-form">
          <ProdeCrest type="league" name={name || "Mi liga"} primary={newCrestPrimary} secondary={newCrestSecondary} size={96}/>
          <div className="prode-crest-colors">
            <label>Color principal<input type="color" value={newCrestPrimary} onChange={e => setNewCrestPrimary(e.target.value)}/></label>
            <label>Color secundario<input type="color" value={newCrestSecondary} onChange={e => setNewCrestSecondary(e.target.value)}/></label>
          </div>
        </div>
        <p>La liga se crea con tu cuenta Google. Podrás invitar participantes al crearla; los rankings están disponibles dentro de cada liga.</p>
        {error && <p className="prode-group-error" role="alert">{error}</p>}
        <button className="prode-create-submit" type="submit" disabled={busy || name.trim().length < 3}>{busy ? "Creando…" : "Crear liga"}</button>
      </form>
    </div>}
  </div>;
}
