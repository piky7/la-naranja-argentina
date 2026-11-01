import { useEffect, useState } from "react";
import { PlusCircle, X, LockKeyhole, Globe2, ChevronRight, UsersRound, ArrowLeft, Copy, Ticket, Trophy } from "lucide-react";
import { watchProdeUser, signInProdeWithGoogle } from "../auth/prodeAuth";

const API = "https://lna-prode-api.lnab.workers.dev";
export default function ProdeGroups() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [leagueRanking, setLeagueRanking] = useState(null);
  const [weeklyRanking, setWeeklyRanking] = useState(null);
  const [medalTable, setMedalTable] = useState(null);
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

  const openGroup = async (group) => {
    if (!user) return;
    setSelected(group);
    setGroupTab("weekly");
    setDetail(null);
    setLeagueRanking(null);
    setWeeklyRanking(null);
    setMedalTable(null);
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
      try {
        const rankingRes = await fetch(API + "/api/prode/groups/" + encodeURIComponent(group.id) + "/ranking", { headers: { Authorization: "Bearer " + token } });
        const rankingData = await rankingRes.json();
        if (!rankingRes.ok || !rankingData.ok) throw Error(rankingData.error || "Clasificación no disponible");
        setLeagueRanking(rankingData.ranking || []);
        setWeeklyRanking(rankingData.weeklyRanking || []);
        setMedalTable(rankingData.medalTable || []);
      } catch (rankingFailure) { setRankingError(rankingFailure.message || "Clasificación no disponible"); }
    } catch (e) {
      setDetailError(e.message || "Error de conexión");
    } finally {
      setDetailBusy(false);
    }
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
        body: JSON.stringify({ name: name.trim(), description: description.trim(), visibility }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudo crear la liga");
      setGroups(previous => [data.group, ...previous]);
      setOpen(false); setName(""); setDescription(""); setVisibility("private");
    } catch (e) { setError(e.message || "Error de conexión"); }
    finally { setBusy(false); }
  };

  return <div className="prode-groups">
    <button className="prode-onboarding-action prode-action-button" type="button" disabled={!user} onClick={() => { setError(""); setOpen(true); }}>
      <PlusCircle size={21}/><span><strong>Crear un Prode</strong><small>{user ? "Armá tu grupo público o privado" : "Iniciá sesión con Google"}</small></span>
    </button>
    <button className="prode-onboarding-action prode-action-button" type="button" disabled={!user} onClick={() => { setInviteMessage(""); setJoinOpen(true); }}><Ticket size={21}/><span><strong>Unirme a un Prode</strong><small>{user ? "Ingresá tu código de invitación" : "Iniciá sesión con Google"}</small></span></button>
    <div className="prode-onboarding-action"><Globe2 size={21}/><div><strong>Ranking general</strong><span>Todos los participantes de LNA · Histórico</span></div></div>
    {ready && groups.length > 0 && <div className="prode-my-groups"><strong>Mis ligas ({groups.length})</strong>{groups.map(group => <button type="button" key={group.id} className="prode-my-group prode-group-link" onClick={() => openGroup(group)}><span>{group.name}</span><small>{group.visibility === "private" ? "Privada" : "Pública"} · {group.role === "owner" ? "Administrador" : "Miembro"}</small><ChevronRight size={16}/></button>)}</div>}
    {error && <p className="prode-group-error" role="alert">{error}</p>}
    {selected && <div className="prode-dialog-backdrop" onClick={() => setSelected(null)}>
      <section className="prode-dialog prode-group-detail" role="dialog" aria-modal="true" aria-label={"Liga " + selected.name} onClick={e => e.stopPropagation()}>
        <div className="prode-dialog-heading">
          <h3>{selected.name}</h3>
          <button type="button" aria-label="Cerrar" onClick={() => setSelected(null)}><X size={20}/></button>
        </div>
        <div className="prode-group-meta"><span>{detail?.group?.visibility === "private" ? "🔒 Privada" : detail?.group?.visibility === "public" ? "🌐 Pública" : "Cargando privacidad…"}</span><span>Temporada {selected.season || "2026/27"}</span></div>
        {selected.description && <p>{selected.description}</p>}
        {detailBusy && <p>Cargando participantes…</p>}
        {detailError && <p className="prode-group-error" role="alert">{detailError}</p>}
        {detail && <>
          <div className="prode-group-tabs" role="tablist" aria-label="Clasificaciones de la liga">
            <button type="button" role="tab" aria-selected={groupTab === "weekly"} className={groupTab === "weekly" ? "active" : ""} onClick={() => setGroupTab("weekly")}><Trophy size={16}/> Ranking semanal</button>
            <button type="button" role="tab" aria-selected={groupTab === "general"} className={groupTab === "general" ? "active" : ""} onClick={() => setGroupTab("general")}><Trophy size={16}/> Tabla general</button>
            <button type="button" role="tab" aria-selected={groupTab === "medals"} className={groupTab === "medals" ? "active" : ""} onClick={() => setGroupTab("medals")}><Trophy size={16}/> Medallero</button>
          </div>
          {groupTab === "medals" ? <div className="prode-group-ranking prode-medal-table" role="tabpanel">
            <div className="prode-ranking-head"><span>JUGADOR</span><span>🥇</span><span>🥈</span><span>🥉</span></div>
            {(medalTable || detail.members).map((member,index) => <div className="prode-ranking-row" key={index}><span className="prode-ranking-name"><span className="prode-member-avatar">{member.username.slice(0,1).toUpperCase()}</span><strong>{member.username}</strong></span><span>{member.gold ?? 0}</span><span>{member.silver ?? 0}</span><span>{member.bronze ?? 0}</span></div>)}
            {rankingError && <p className="prode-group-error" role="alert">{rankingError}</p>}
            <p className="prode-group-pending">Medallas acumuladas por semana finalizada. Se entregan solo si al menos 3 participantes pronosticaron esa semana. Los empates comparten medalla.</p>
          </div> : <div className="prode-group-ranking" role="tabpanel">
            <div className="prode-ranking-head"><span>POS.</span><span>JUGADOR</span><span>PTS</span><span>AC</span><span>ERR</span><span>MVP</span></div>
            {((groupTab === "weekly" ? weeklyRanking : leagueRanking) || detail.members).map((member, index) => <div key={index} className="prode-ranking-row"><span className="prode-ranking-position">{member.position ? member.position + "°" : "—"}</span><span className="prode-ranking-name"><span className="prode-member-avatar">{member.username.slice(0,1).toUpperCase()}</span><strong>{member.username}</strong></span><span>{member.points ?? 0}</span><span>{member.correct ?? 0}</span><span>{member.wrong ?? 0}</span><span>{member.mvpHits ?? 0}</span></div>)}
            {rankingError && <p className="prode-group-error" role="alert">{rankingError}</p>}
            <p className="prode-group-pending">{groupTab === "weekly" ? "Puntos de los partidos iniciados esta semana (lunes a domingo)." : "Puntos acumulados desde el inicio de esta liga."} AC: aciertos · ERR: errores · MVP: MVP acertados.</p>
          </div>}
          {detail.group.role === "owner" && <div className="prode-group-subtitle"><UsersRound size={16}/> {detail.members.length} participantes</div>}
          {detail.group.role === "owner" && <div className="prode-invite-panel"><button type="button" className="prode-create-submit" disabled={inviteBusy} onClick={generateInvite}>{inviteBusy ? "Generando…" : "Generar invitación"}</button>{invite && <><p>Enlace para compartir:</p><div className="prode-invite-link"><input readOnly aria-label="Enlace de invitación" value={"https://lanaranjaargentina.com.ar/prode?invite=" + invite}/><button type="button" aria-label="Copiar enlace" onClick={async () => { try { await navigator.clipboard.writeText("https://lanaranjaargentina.com.ar/prode?invite=" + invite); setInviteMessage("Enlace copiado"); } catch { setInviteMessage("Seleccioná y copiá el enlace"); } }}><Copy size={18}/></button></div></>}{inviteMessage && <p role="status">{inviteMessage}</p>}</div>}
        </>}
        <button type="button" className="prode-group-back" onClick={() => setSelected(null)}><ArrowLeft size={16}/> Volver a mis ligas</button>
      </section>
    </div>}
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
        <label>Privacidad<select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="private">Privada</option><option value="public">Pública</option></select></label>
        <p>La liga se crea con tu cuenta Google. Podrás invitar participantes al crearla; los rankings se habilitarán más adelante.</p>
        {error && <p className="prode-group-error" role="alert">{error}</p>}
        <button className="prode-create-submit" type="submit" disabled={busy || name.trim().length < 3}>{busy ? "Creando…" : "Crear liga"}</button>
      </form>
    </div>}
  </div>;
}
