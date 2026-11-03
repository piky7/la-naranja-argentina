import { useEffect, useRef, useState } from "react";
import { PlusCircle, X, LockKeyhole, Globe2, ChevronRight, UsersRound, ArrowLeft, Copy, Ticket, Trophy, CalendarDays, Medal, Layers3, BarChart3, Settings2, Send, CircleCheck, CircleX, Star, Target, ChartNoAxesColumn, Award } from "lucide-react";
import { teams } from "../data/teams";
import { players } from "../data/players";
import { watchProdeUser, signInProdeWithGoogle } from "../auth/prodeAuth";
import { useLocation } from "react-router-dom";
import ProdeCrest from "./ProdeCrest";

const API = "https://lna-prode-api.lnab.workers.dev";
const inviteUrl = token => "https://lanaranjaargentina.com.ar/invitacion?token=" + encodeURIComponent(token);
const inviteText = (leagueName,token) => "🏀 ¡Te invito a jugar el Prode LNA!\n\n🏆 Liga de amigos: " + leagueName + "\nPronosticá ganador y MVP, sumá puntos y competí conmigo.\n\n👉 Sumate desde acá:\n" + inviteUrl(token);
const parseInviteCode = value => {
  const trimmed = value.trim();
  try {
    const address = new URL(trimmed);
    return address.searchParams.get("token") || address.searchParams.get("invite") || trimmed;
  } catch {
    return trimmed.includes("invite=") ? trimmed.split("invite=")[1].split("&")[0]
      : trimmed.includes("token=") ? trimmed.split("token=")[1].split("&")[0] : trimmed;
  }
};
const teamLabel = id => teams.find(t => t.id === id)?.shortName || teams.find(t => t.id === id)?.name || (id || "—");
const teamLogo = id => teams.find(t => t.id === id)?.logo;
const mvpLabel = id => players.find(p => p.id === id)?.name || (id ? String(id).replace(/-/g, " ") : "No votó");
const memberAccent = color => /^#[0-9a-fA-F]{6}$/.test(color || "") ? color : "#3f718c";
const formatWeekRange = startsAt => {
  const start = new Date(startsAt);
  if (!Number.isFinite(start.getTime())) return "";
  const end = new Date(start.getTime() + 6 * 86400000);
  const format = date => date.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
  return `${format(start)} – ${format(end)}`;
};
export default function ProdeGroups({ onReady }) {
  const location = useLocation();
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
  const [authReady, setAuthReady] = useState(false);
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
  const [historicalProfile, setHistoricalProfile] = useState(null);
  const [historicalBusy, setHistoricalBusy] = useState(false);
  const [historicalError, setHistoricalError] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);
  const [manageError, setManageError] = useState("");
  const [leagueNameDraft, setLeagueNameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameMessage, setRenameMessage] = useState("");
  const [initialOpen, setInitialOpen] = useState(false);
  const [initialTarget, setInitialTarget] = useState("");
  const [initialAmount, setInitialAmount] = useState("0");
  const [initialBusy, setInitialBusy] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [rankingError, setRankingError] = useState("");
  const [rankingBusy, setRankingBusy] = useState(false);
  const [refreshingLeague, setRefreshingLeague] = useState(false);
  const [refreshWarning, setRefreshWarning] = useState("");
  const leagueCache = useRef(new Map());
  const leagueRequest = useRef(0);
  const [groupTab, setGroupTab] = useState("weekly");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [matchesByWeek, setMatchesByWeek] = useState({});
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [invite, setInvite] = useState("");
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinPreview, setJoinPreview] = useState(null);
  const [joinPreviewBusy, setJoinPreviewBusy] = useState(false);
  const [joinPreviewError, setJoinPreviewError] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    let active = true, stop;
    watchProdeUser(next => { if (active) { setUser(next); setAuthReady(true); } }).then(fn => {
      if (active) stop = fn; else fn();
    }).catch(() => { if (active) { setAuthReady(true); setReady(true); } });
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
  useEffect(() => { if (!authReady) return; setReady(false); load(user); }, [user, authReady]);
  useEffect(() => { if (authReady && ready) onReady?.(true); }, [authReady, ready, onReady]);
  useEffect(() => { const refresh = () => { if (authReady) load(user); }; window.addEventListener("prode-page-reopened", refresh); return () => window.removeEventListener("prode-page-reopened", refresh); }, [authReady, user]);
  useEffect(() => { const refresh = () => { if (selected) openGroup(selected); }; window.addEventListener("prode-profile-updated", refresh); return () => window.removeEventListener("prode-profile-updated", refresh); }, [selected, user]);
  useEffect(() => { if (location.pathname !== "/prode") return; const params = new URLSearchParams(location.search); const code = params.get("invite") || params.get("token"); if (code && /^[a-f0-9]{64}$/i.test(code)) { setJoinCode(code); setJoinOpen(true); } }, [location.pathname, location.search]);
  useEffect(() => {
    if (!joinOpen || !/^[a-f0-9]{64}$/i.test(joinCode)) {
      setJoinPreview(null); setJoinPreviewBusy(false); setJoinPreviewError("");
      return;
    }
    const controller = new AbortController();
    setJoinPreview(null); setJoinPreviewBusy(true); setJoinPreviewError("");
    fetch(API + "/api/prode/invitations/preview?token=" + encodeURIComponent(joinCode), { signal:controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok || !data.ok) throw Error(data.error || "Invitación no disponible");
        setJoinPreview(data.league);
      })
      .catch(error => { if (!controller.signal.aborted) setJoinPreviewError(error.message || "No se pudo verificar la invitación"); })
      .finally(() => { if (!controller.signal.aborted) setJoinPreviewBusy(false); });
    return () => controller.abort();
  }, [joinOpen, joinCode]);

  useEffect(() => {
    if (!profileUserId || !selected?.id || !user) {
      setHistoricalProfile(null); setHistoricalBusy(false); setHistoricalError("");
      return;
    }
    let active = true;
    setHistoricalProfile(null); setHistoricalBusy(true); setHistoricalError("");
    const loadHistorical = async () => {
      try {
        const token = await user.getIdToken();
        const query = new URLSearchParams({ groupId: selected.id, memberId: profileUserId });
        const response = await fetch(API + "/api/prode/ranking/historical?" + query, {
          headers: { Authorization: "Bearer " + token }
        });
        const data = await response.json();
        if (!response.ok || !data.ok) throw Error(data.error || "Ranking no disponible");
        if (active) setHistoricalProfile(data.memberProfile);
      } catch (error) {
        if (active) setHistoricalError(error.message || "Datos no disponibles");
      } finally {
        if (active) setHistoricalBusy(false);
      }
    };
    loadHistorical();
    return () => { active = false; };
  }, [profileUserId, selected?.id, user]);

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
  const closeGroup = () => {
    leagueRequest.current += 1;
    setSelected(null);
    setRefreshingLeague(false);
  };
  const openGroup = async (group) => {
    if (!user) return;
    const requestId = ++leagueRequest.current;
    const key = user.uid + ":" + group.id;
    const cached = leagueCache.current.get(key);
    const isCurrent = () => leagueRequest.current === requestId;
    setSelected(group);
    setEditCrestPrimary(cached?.detail.group?.crestPrimary || group.crestPrimary || "#ff9a39");
    setEditCrestSecondary(cached?.detail.group?.crestSecondary || group.crestSecondary || "#10283c");
    setCrestEditing(false); setCrestMessage("");
    setGroupTab("weekly");
    setSettingsOpen(false); setSelectedMatch(null); setShowAllMatches(false);
    setDetail(cached?.detail || null);
    setLeagueRanking(cached?.ranking.ranking || null);
    setWeeklyRanking(cached?.ranking.weeklyRanking || null);
    setWeeklyHistory(cached?.ranking.weeklyHistory || []);
    setSelectedWeek(String(cached?.ranking.weeklyHistory?.at(-1)?.number || ""));
    setMatchesByWeek(cached?.ranking.matchesByWeek || {});
    setMedalTable(cached?.ranking.medalTable || null);
    setSeasonArchives(cached?.archives || []); setArchiveError("");
    setCloseCheck(null); setCloseCheckError("");
    setExpandedMedal(null); setProfileUserId(null);
    setManageOpen(false); setManageError("");
    setLeagueNameDraft(group.name || ""); setRenameMessage("");
    setInitialOpen(false); setInitialTarget(""); setInitialAmount("0"); setInitialMessage("");
    setRankingError(""); setDetailError(""); setRefreshWarning("");
    setInvite(""); setInviteMessage("");
    setDetailBusy(!cached);
    setRankingBusy(!cached);
    setRefreshingLeague(Boolean(cached));
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: "Bearer " + token };
      const base = API + "/api/prode/groups/" + encodeURIComponent(group.id);
      const requestData = async (url) => {
        const response = await fetch(url, { headers, cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !data.ok) throw Error(data.error || "Datos no disponibles");
        return data;
      };
      const [detailResult, rankingResult, archiveResult] = await Promise.allSettled([
        requestData(base), requestData(base + "/ranking"), requestData(base + "/seasons"),
      ]);
      if (!isCurrent()) return;
      if (detailResult.status === "fulfilled" && rankingResult.status === "fulfilled") {
        const nextDetail = detailResult.value;
        const rankingData = rankingResult.value;
        const archives = archiveResult.status === "fulfilled" ? archiveResult.value.seasons || [] : cached?.archives || [];
        leagueCache.current.set(key, { detail: nextDetail, ranking: rankingData, archives });
        setDetail(nextDetail);
        setLeagueRanking(rankingData.ranking || []);
        setWeeklyRanking(rankingData.weeklyRanking || []);
        setWeeklyHistory(rankingData.weeklyHistory || []);
        setMatchesByWeek(rankingData.matchesByWeek || {});
        setMedalTable(rankingData.medalTable || []);
        if (!cached) setSelectedWeek(String((rankingData.weeklyHistory || []).at(-1)?.number || ""));
        setEditCrestPrimary(nextDetail.group?.crestPrimary || "#ff9a39");
        setEditCrestSecondary(nextDetail.group?.crestSecondary || "#10283c");
        setArchiveError(archiveResult.status === "rejected" ? "Historial no disponible" : "");
        setSeasonArchives(archives);
      } else {
        const failure = detailResult.status === "rejected" ? detailResult.reason : rankingResult.reason;
        if (cached) setRefreshWarning("No se pudo actualizar la liga. Se muestran los últimos datos cargados.");
        else if (detailResult.status === "rejected") setDetailError(failure?.message || "No se pudo abrir la liga");
        else { setDetail(detailResult.value); setRankingError(failure?.message || "Clasificación no disponible"); }
      }
    } catch (failure) {
      if (!isCurrent()) return;
      if (cached) setRefreshWarning("Sin conexión. Se muestran los últimos datos cargados.");
      else setDetailError(failure?.message || "Error de conexión");
    } finally {
      if (isCurrent()) {
        setDetailBusy(false);
        setRankingBusy(false);
        setRefreshingLeague(false);
      }
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
        setMatchesByWeek(ranking.matchesByWeek || {});
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
        closeGroup(); setDetail(null); setManageOpen(false);
        await load(user);
      } else {
        await openGroup(selected);
        setManageOpen(true);
      }
    } catch (e) { setManageError(e.message || "Error de conexión"); }
    finally { setManageBusy(false); }
  };

  const renameLeague = async event => {
    event.preventDefault();
    if (!user || !selected || renameBusy || detail?.group?.role !== "owner") return;
    const nextName = leagueNameDraft.trim().replace(/\s+/g, " ");
    if (nextName.length < 3 || nextName.length > 60) {
      setRenameMessage("El nombre debe tener entre 3 y 60 caracteres.");
      return;
    }
    if (nextName === detail.group.name) {
      setRenameMessage("El nombre no cambió.");
      return;
    }
    setRenameBusy(true); setRenameMessage("");
    try {
      const token = await user.getIdToken();
      const res = await fetch(API + "/api/prode/groups/" + encodeURIComponent(selected.id) + "/rename", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.error || "No se pudo cambiar el nombre.");
      setGroups(prev => prev.map(group => group.id === selected.id ? { ...group, name: data.name } : group));
      setSelected(prev => prev && prev.id === selected.id ? { ...prev, name: data.name } : prev);
      setDetail(prev => prev ? { ...prev, group: { ...prev.group, name: data.name } } : prev);
      setLeagueNameDraft(data.name);
      setRenameMessage("Nombre de la liga actualizado correctamente.");
    } catch (error) {
      setRenameMessage(error.message || "No se pudo guardar el nombre.");
    } finally {
      setRenameBusy(false);
    }
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
        <span className="prode-friend-league-info"><strong>{group.name}</strong><small><LockKeyhole size={12}/> {group.season || "2026/27"} · {group.role === "owner" ? "Administrador" : "Miembro"}</small></span>
        <span className="prode-friend-enter">Ver liga <ChevronRight size={17}/></span>
      </button>)}
    </div> : ready && user && <div className="prode-friends-notice">Todavía no tenés ligas de amigos. Creá una o ingresá con un código de invitación.</div>}
    {error && <p className="prode-group-error" role="alert">{error}</p>}
    {selected && (detailBusy || rankingBusy) && <div className="prode-dialog-backdrop" onClick={() => closeGroup()}>
      <section className="prode-dialog prode-group-detail prode-league-premium prode-league-loading" role="dialog" aria-modal="true" aria-label={"Cargando liga " + selected.name} onClick={e => e.stopPropagation()}>
        <button type="button" className="prode-league-close" aria-label="Cerrar liga" onClick={() => closeGroup()}><X size={20}/></button>
        <ProdeCrest type="league" name={selected.name} primary={selected.crestPrimary} secondary={selected.crestSecondary} size={93}/>
        <h3>{selected.name}</h3>
        <div className="prode-league-loading-spinner" aria-hidden="true"/>
        <strong role="status" aria-live="polite">Preparando tu liga…</strong>
        <p>Cargando participantes, posiciones y pronósticos</p>
      </section>
    </div>}
    {selected && !detailBusy && !rankingBusy && <div className="prode-dialog-backdrop" onClick={() => closeGroup()}>
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
          <button type="button" className="prode-league-settings-button" aria-label="Configuración de la liga" aria-expanded={settingsOpen} onClick={() => setSettingsOpen(v => !v)}><Settings2 size={20}/></button>
          <button type="button" className="prode-league-close" aria-label="Cerrar liga" onClick={() => closeGroup()}><X size={20}/></button>
        </div>
        {selected.description && <p>{selected.description}</p>}
        {detailBusy && <p>Cargando participantes…</p>}
        {detailError && <p className="prode-group-error" role="alert">{detailError}</p>}
        {refreshingLeague && <p className="prode-league-refresh" role="status">Actualizando datos…</p>}
        {refreshWarning && <p className="prode-league-refresh-warning" role="status">{refreshWarning}</p>}
        {detail && <>
          {settingsOpen && <div className="prode-league-settings-open">
          <div className="prode-league-admin">
            <h4><Settings2 size={17}/> Administración</h4>
            <div className="prode-league-admin-actions">
          <div className="prode-manage-control">
            <button type="button" className="prode-initial-toggle" aria-expanded={manageOpen} onClick={() => setManageOpen(!manageOpen)}><UsersRound size={15}/> Administrar liga <ChevronRight size={15} className={manageOpen ? "expanded" : ""}/></button>
            {manageOpen && <div className="prode-manage-panel">
              {detail.group.role === "owner" ? <>
                <form className="prode-rename-form" onSubmit={renameLeague}>
                  <label htmlFor="prode-league-rename">Nombre de la liga</label>
                  <div className="prode-rename-fields">
                    <input id="prode-league-rename" type="text" maxLength={60} minLength={3} required value={leagueNameDraft} onChange={event => { setLeagueNameDraft(event.target.value); setRenameMessage(""); }} disabled={renameBusy} />
                    <button type="submit" disabled={renameBusy || leagueNameDraft.trim().length < 3 || leagueNameDraft.trim() === detail.group.name}>{renameBusy ? "Guardando…" : "Guardar"}</button>
                  </div>
                  {renameMessage && <p role="status" className="prode-rename-message">{renameMessage}</p>}
                </form>
                <strong>Participantes</strong>
                {detail.members.filter(member => member.role !== "owner").map(member => <div className="prode-manage-member" key={member.userId}><span>{member.username}</span><button type="button" disabled={manageBusy} onClick={() => manageLeague("members",member)}>Quitar</button></div>)}
                {detail.members.length <= 1 && <p>Todavía no hay otros participantes.</p>}
                <button type="button" className="prode-manage-danger" disabled={manageBusy} onClick={() => manageLeague("delete")}>Eliminar liga</button>
              </> : <button type="button" className="prode-manage-danger" disabled={manageBusy} onClick={() => manageLeague("leave")}>Abandonar liga</button>}
              {manageError && <p className="prode-group-error" role="alert">{manageError}</p>}
            </div>}
          </div>
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
            </div>
          {detail.group.role === "owner" && <div className="prode-invite-panel">
            <button type="button" className="prode-create-submit prode-invite-primary" disabled={inviteBusy} onClick={generateInvite}><Send size={18}/>{inviteBusy ? "Generando…" : "Generar invitación"}</button>
            {invite && <>
              <p>Invitación para <strong>{selected.name}</strong> · válida por 7 días.</p>
              <div className="prode-invite-link">
                <input readOnly aria-label="Enlace de invitación" value={inviteUrl(invite)}/>
                <button type="button" aria-label="Copiar mensaje de invitación" title="Copiar invitación" onClick={async () => {
                  try { await navigator.clipboard.writeText(inviteText(selected.name, invite)); setInviteMessage("Mensaje de invitación copiado. Pegalo en WhatsApp."); }
                  catch { setInviteMessage("Seleccioná el enlace para copiarlo."); }
                }}><Copy size={18}/></button>
              </div>
              <button type="button" className="prode-invite-share" onClick={async () => {
                const text = inviteText(selected.name,invite);
                if (navigator.share) {
                  try { await navigator.share({text}); } catch (error) { if (error?.name !== "AbortError") setInviteMessage("No se pudo compartir. Podés copiar la invitación."); }
                } else {
                  try { await navigator.clipboard.writeText(text); setInviteMessage("Mensaje copiado. Pegalo en WhatsApp."); }
                  catch { setInviteMessage("No se pudo copiar automáticamente."); }
                }
              }}><Send size={16}/> Compartir invitación</button>
            </>}
            {inviteMessage && <p role="status">{inviteMessage}</p>}
          </div>}
          </div>

          </div>}
          <div className="prode-group-tabs" role="tablist" aria-label="Clasificaciones de la liga">
            <button type="button" role="tab" aria-selected={groupTab === "weekly"} className={groupTab === "weekly" ? "active" : ""} onClick={() => setGroupTab("weekly")}><BarChart3 size={16}/> Semanal</button>
            <button type="button" role="tab" aria-selected={groupTab === "general"} className={groupTab === "general" ? "active" : ""} onClick={() => setGroupTab("general")}><Trophy size={16}/> General</button>
            <button type="button" role="tab" aria-selected={groupTab === "medals"} className={groupTab === "medals" ? "active" : ""} onClick={() => setGroupTab("medals")}><Medal size={16}/> Medallero</button>
            <button type="button" role="tab" aria-selected={groupTab === "seasons"} className={groupTab === "seasons" ? "active" : ""} onClick={() => setGroupTab("seasons")}><Layers3 size={16}/> Temporadas</button>
          </div>
          {groupTab === "weekly" && rankingBusy && <div className="prode-week-selector prode-week-premium prode-week-loading" role="status" aria-live="polite"><CalendarDays size={17}/><span>Cargando semana…</span></div>}
          {groupTab === "weekly" && weeklyHistory.length > 0 && <div className="prode-week-selector prode-week-premium">
            <CalendarDays size={21} aria-hidden="true"/>
            <div className="prode-week-premium-info">
              <label className="prode-week-select-label">
                <select aria-label="Elegir semana del ranking" value={selectedWeek || String(weeklyHistory.at(-1).number)} onChange={e => { setSelectedWeek(e.target.value); setShowAllMatches(false); }}>
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
            {(medalTable || detail.members).map((entry,index) => {
              // Usar la misma identidad visual que General; el medallero solo aporta medallas.
              const savedCrest = (leagueRanking || []).find(player => player.userId === entry.userId)
                || detail.members.find(player => player.userId === entry.userId);
              const member = savedCrest ? { ...entry, crestPrimary: savedCrest.crestPrimary, crestSecondary: savedCrest.crestSecondary, crestText: savedCrest.crestText } : entry;
              return <div className="prode-medal-member" key={member.userId || index}>
              <div className="prode-ranking-row" style={{ "--member-accent": memberAccent(member.crestPrimary) }}>
                <button type="button" className="prode-ranking-name prode-profile-trigger" onClick={() => setProfileUserId(member.userId)}><ProdeCrest name={member.username} primary={member.crestPrimary} secondary={member.crestSecondary} textColor={member.crestText} style={member.crestStyle} font={member.crestFont} symbol={member.crestSymbol} size={36} className="prode-member-crest"/><strong>{member.username}</strong></button>
                {["gold","silver","bronze"].map((type,i) => <button type="button" key={type} className="prode-medal-count" aria-expanded={expandedMedal === (member.userId || index) + ":" + type} aria-label={member.username + ": ver medallas de " + ["oro","plata","bronce"][i]} onClick={() => setExpandedMedal(current => current === (member.userId || index) + ":" + type ? null : (member.userId || index) + ":" + type)}>{member[type] ?? 0}</button>)}
              </div>
              {["gold","silver","bronze"].map((type,i) => expandedMedal === (member.userId || index) + ":" + type && <div className="prode-medal-history" key={type}>
                <strong>{["🥇 Oros","🥈 Platas","🥉 Bronces"][i]} de {member.username}</strong>
                {(member.history || []).filter(h => h.position === i+1).length ? (member.history || []).filter(h => h.position === i+1).map(h => <button type="button" key={h.week} onClick={() => { setSelectedWeek(String(h.week)); setGroupTab("weekly"); }}><span>Semana {h.week}</span><span>{h.points} PTS <ChevronRight size={14}/></span></button>) : <p>Todavía no consiguió medallas de este tipo.</p>}
              </div>)}
            </div>;
            })} 
            {rankingError && <p className="prode-group-error" role="alert">{rankingError}</p>}
            <p className="prode-group-pending">Medallas acumuladas por semana finalizada. Se entregan solo si al menos 3 participantes pronosticaron esa semana. Los empates comparten medalla.</p>
          </div> : <div className={"prode-group-ranking prode-ranking-premium" + (groupTab === "weekly" ? " prode-weekly-ranking" : " prode-general-ranking")} role="tabpanel">
            <h4>{groupTab === "weekly" ? "Clasificación semanal" : "Clasificación general"}</h4>
            <div className="prode-ranking-head"><span>POS.</span><span>JUGADOR</span><span>PTS</span><span>AC</span><span>ERR</span><span>MVP</span></div>
            {rankingBusy ? <div className="prode-ranking-loading" role="status" aria-live="polite">Calculando posiciones y puntos de la liga…</div> : rankingError ? null : (groupTab === "weekly" ? (weeklyHistory.find(w => String(w.number) === selectedWeek)?.ranking || weeklyRanking || []) : (leagueRanking || [])).map((member,index) => <div key={member.userId || index} style={{ "--member-accent": memberAccent(member.crestPrimary) }} className="prode-ranking-row">
              <span className={"prode-ranking-position" + (groupTab === "weekly" ? " weekly-position" : "") + (member.position && member.position <= 3 && groupTab !== "weekly" ? " podium-position rank-" + member.position : "")} aria-label={member.position ? member.position + "° puesto" : "Sin posición"}>{member.position ? groupTab === "weekly" && member.position <= 3 ? ["🥇","🥈","🥉"][member.position - 1] : member.position + "°" : "—"}</span>
              <button type="button" className="prode-ranking-name prode-profile-trigger" onClick={() => setProfileUserId(member.userId)}><ProdeCrest name={member.username} primary={member.crestPrimary} secondary={member.crestSecondary} textColor={member.crestText} style={member.crestStyle} font={member.crestFont} symbol={member.crestSymbol} size={42} className="prode-member-crest"/><strong>{member.username}</strong></button>
              <span className="prode-ranking-points"><strong>{member.points ?? 0}</strong><small>PTS</small></span>
              <span>{member.correct ?? 0}</span><span>{member.wrong ?? 0}</span><span>{member.mvpHits ?? 0}</span>
            </div>)}
            {rankingError && <p className="prode-group-error" role="alert">{rankingError}</p>}
            {!rankingBusy && !rankingError && <p className="prode-group-pending">Los puntos se actualizan con los resultados oficiales. AC: aciertos · ERR: errores · MVP: MVP acertados.</p>}
          </div>}
          {groupTab === "weekly" && (() => {
            const week = String(selectedWeek || weeklyHistory.at(-1)?.number || 1);
            const games = matchesByWeek[week] || [];
            const visible = showAllMatches ? games : games.slice(0, 5);
            const myId = user ? "firebase:" + user.uid : null;
            return <section className="prode-played-section" aria-label="Pronósticos jugados de la semana">
              <div className="prode-played-heading"><h4>PRONÓSTICOS JUGADOS</h4><span>{games.length} partidos</span></div>
              {rankingBusy ? <p className="prode-played-empty">Consultando los resultados de la semana…</p> : games.length === 0 ? <p className="prode-played-empty">Todavía no hay partidos finalizados para esta semana.</p> : <>
                <div className="prode-played-grid">
                  {visible.map(game => {
                    const mine = game.participants.find(p => p.userId === myId);
                    const date = new Date(game.startsAt).toLocaleDateString("es-AR", {timeZone:"America/Argentina/Buenos_Aires",day:"numeric",month:"numeric"});
                    return <button type="button" className="prode-played-card" key={game.id} onClick={() => setSelectedMatch(game)} aria-label={teamLabel(game.homeTeam) + " contra " + teamLabel(game.awayTeam) + ". Ver los votos y puntos de los participantes"}>
                      <small>{date}</small>
                      <span className="prode-played-logos">
                        {teamLogo(game.homeTeam) ? <img alt={teamLabel(game.homeTeam)} src={teamLogo(game.homeTeam)}/> : <span>{teamLabel(game.homeTeam).slice(0,3)}</span>}
                        {teamLogo(game.awayTeam) ? <img alt={teamLabel(game.awayTeam)} src={teamLogo(game.awayTeam)}/> : <span>{teamLabel(game.awayTeam).slice(0,3)}</span>}
                      </span>
                      <strong>{game.homeScore}–{game.awayScore}</strong>
                      <span className={"prode-played-points" + (mine?.points > 0 ? " scored" : "")}>+{mine?.points || 0} pts</span>
                      <span className="prode-played-indicators">
                        <span className={mine?.winnerPick ? mine.winnerCorrect ? "good" : "bad" : "neutral"}>{mine?.winnerPick ? mine.winnerCorrect ? "✓" : "×" : "–"} G</span>
                        <span className={mine?.mvpPick ? mine.mvpCorrect ? "good" : "bad" : "neutral"}>{mine?.mvpPick ? mine.mvpCorrect ? "✓" : "×" : "–"} M</span>
                      </span>
                    </button>;
                  })}
                </div>
                {games.length > 5 && <button type="button" className="prode-played-more" onClick={() => setShowAllMatches(v => !v)}>{showAllMatches ? "Mostrar menos" : "Ver todos los partidos (" + games.length + ")"}</button>}
              </>}
            </section>;
          })()}
          {detail.group.role === "owner" && <div className="prode-group-subtitle"><UsersRound size={16}/> {detail.members.length} participantes</div>}
        </>}
        <button type="button" className="prode-group-back" onClick={() => closeGroup()}><ArrowLeft size={16}/> Volver a mis ligas</button>
      </section>
    </div>}
    {selected && selectedMatch && <div className="prode-match-backdrop" onClick={() => setSelectedMatch(null)}>
      <section className="prode-match-dialog" role="dialog" aria-modal="true" aria-label="Pronósticos del partido terminado" onClick={event => event.stopPropagation()}>
        <button type="button" className="prode-match-close" aria-label="Cerrar detalle del partido" onClick={() => setSelectedMatch(null)}><X size={19}/></button>
        <div className="prode-match-detail-header">
          <small>RESULTADO FINAL · {new Date(selectedMatch.startsAt).toLocaleDateString("es-AR",{timeZone:"America/Argentina/Buenos_Aires",day:"numeric",month:"short"})}</small>
          <div className="prode-match-result">
            <div>{teamLogo(selectedMatch.homeTeam) && <img src={teamLogo(selectedMatch.homeTeam)} alt=""/>}<strong>{teamLabel(selectedMatch.homeTeam)}</strong></div>
            <span>{selectedMatch.homeScore} – {selectedMatch.awayScore}</span>
            <div>{teamLogo(selectedMatch.awayTeam) && <img src={teamLogo(selectedMatch.awayTeam)} alt=""/>}<strong>{teamLabel(selectedMatch.awayTeam)}</strong></div>
          </div>
          <p>Ganador: <strong>{teamLabel(selectedMatch.winner)}</strong> · MVP oficial: <strong>{selectedMatch.mvpWinners?.length ? selectedMatch.mvpWinners.map(mvpLabel).join(" / ") : "Pendiente de valoración"}</strong></p>
        </div>
        <h4>VOTOS Y PUNTOS DE LA LIGA</h4>
        <div className="prode-match-members">
          {selectedMatch.participants.map(member => <div className={"prode-match-member" + (member.userId === "firebase:" + user?.uid ? " mine" : "")} key={member.userId}>
            <div className="prode-match-member-top">
              <ProdeCrest name={member.username} primary={member.crestPrimary} secondary={member.crestSecondary} textColor={member.crestText} style={member.crestStyle} font={member.crestFont} symbol={member.crestSymbol} size={37}/>
              <strong>{member.username}</strong>
              <span>+{member.points} pts</span>
            </div>
            <div className="prode-match-member-votes">
              <div><span>Ganador</span><strong>{member.winnerPick ? teamLabel(member.winnerPick) : "No votó"}</strong><small className={member.winnerPick ? member.winnerCorrect ? "good" : "bad" : ""}>{member.winnerPick ? (member.winnerCorrect ? "✓" : "×") : "–"} +{member.winnerPoints} pts</small></div>
              <div><span>MVP</span><strong>{mvpLabel(member.mvpPick)}</strong><small className={member.mvpPick ? member.mvpCorrect ? "good" : "bad" : ""}>{member.mvpPick ? (member.mvpCorrect ? "✓" : "×") : "–"} +{member.mvpPoints} pts</small></div>
            </div>
            {member.streakPoints > 0 && <div className="prode-match-bonus">Racha de 5 aciertos: +{member.streakPoints} pts</div>}
          </div>)}
        </div>
      </section>
    </div>}
    {selected && detail && profileUserId && (() => {
      const player = (leagueRanking || []).find(m => m.userId === profileUserId) || (weeklyRanking || []).find(m => m.userId === profileUserId) || detail.members.find(m => m.userId === profileUserId);
      const awards = (medalTable || []).find(m => m.userId === profileUserId);
      if (!player) return null;
      const crestPrimary = detail.group?.crestPrimary || selected.crestPrimary || "#ff9a39";
      const crestSecondary = detail.group?.crestSecondary || selected.crestSecondary || "#10283c";
      const historicalPoints = historicalBusy ? "…" : historicalProfile?.points ?? "—";
      const globalPosition = historicalBusy ? "…" : historicalProfile?.position != null ? "#" + historicalProfile.position : "—";
      return <div className="prode-profile-backdrop" onClick={() => setProfileUserId(null)}>
        <section className="prode-profile-dialog prode-profile-premium" style={{ "--profile-accent": crestPrimary, "--profile-secondary": crestSecondary }} role="dialog" aria-modal="true" aria-label={"Perfil de " + player.username} onClick={e => e.stopPropagation()}>
          <button type="button" className="prode-profile-close" aria-label="Cerrar perfil" onClick={() => setProfileUserId(null)}><X size={20}/></button>
          <div className="prode-profile-identity">
            <ProdeCrest name={player.username} primary={player.crestPrimary} secondary={player.crestSecondary} textColor={player.crestText} style={player.crestStyle} size={75} className="prode-member-crest"/>
            <div className="prode-profile-identity-copy">
              <h3>{player.username}</h3>
              <small>{selected.name} · Temporada {selected.season || "2026/27"}</small>
              <div className="prode-profile-badges">
                <span><Trophy size={14}/>{globalPosition} Ranking general</span>
                <span><Star size={14}/>{historicalPoints} pts históricos</span>
              </div>
            </div>
          </div>
          <div className="prode-profile-summary">
            <div><strong>{player.points ?? 0}</strong><span>PTS EN LA LIGA</span></div>
            <div><strong>{historicalPoints}</strong><span>PTS HISTÓRICOS</span></div>
            <div><strong>{globalPosition}</strong><span>PUESTO GENERAL</span></div>
          </div>
          {historicalError && <p className="prode-profile-history-notice" role="status">No pudimos consultar los puntos históricos en este momento.</p>}
          {!historicalBusy && !historicalError && !historicalProfile && <p className="prode-profile-history-notice">Sin Mi Carrera vinculada o sin datos históricos disponibles.</p>}
          <h4 className="prode-profile-section-title">ESTADÍSTICAS EN ESTA LIGA</h4>
          <div className="prode-profile-stats">
            <div><span className="prode-profile-stat-icon"><ChartNoAxesColumn size={20}/></span><strong>{player.played ?? 0}</strong><span>Jugados</span></div>
            <div><span className="prode-profile-stat-icon"><Target size={20}/></span><strong>{player.accuracy ?? 0}%</strong><span>Efectividad</span></div>
            <div><span className="prode-profile-stat-icon"><Trophy size={20}/></span><strong>{player.mvpHits ?? 0}</strong><span>MVP acertados</span></div>
            <div><span className="prode-profile-stat-icon good"><CircleCheck size={20}/></span><strong>{player.correct ?? 0}</strong><span>Aciertos</span></div>
            <div><span className="prode-profile-stat-icon bad"><CircleX size={20}/></span><strong>{player.wrong ?? 0}</strong><span>Errores</span></div>
            <div><span className="prode-profile-stat-icon"><Target size={20}/></span><strong>{player.mvpVotes ?? 0}</strong><span>MVP votados</span></div>
          </div>
          <div className="prode-profile-best-week"><span><CalendarDays size={17}/> Mejor semana</span><strong>{player.bestWeek ? `Semana ${player.bestWeek.number} · ${player.bestWeek.points} pts` : "Sin partidos puntuados"}</strong></div>
          <div className="prode-profile-streak" aria-label={`Racha actual de ${player.currentStreak ?? 0} aciertos consecutivos de ganador`}>
            <div className="prode-profile-streak-heading">
              <span><span aria-hidden="true">🔥</span> Racha de aciertos</span>
              <strong>{Math.min(5, player.currentStreak ?? 0)}/5</strong>
            </div>
            <div className="prode-profile-streak-progress" aria-hidden="true">
              {[0,1,2,3,4].map(i => <span key={i} className={i < (player.currentStreak ?? 0) ? "is-complete" : ""}/>)}
            </div>
            <small>{(player.currentStreak ?? 0) >= 5 ? `¡Bonus de +45 pts alcanzado! Racha actual: ${player.currentStreak} aciertos.` : `A ${5 - (player.currentStreak ?? 0)} acierto${5 - (player.currentStreak ?? 0) === 1 ? "" : "s"} consecutivo${5 - (player.currentStreak ?? 0) === 1 ? "" : "s"} de sumar +45 pts.`}</small>
          </div>
          <div className="prode-profile-medals">
            <div><span className="prode-profile-medal-symbol">🥇</span><strong>{awards?.gold ?? 0}</strong><span>Oro</span></div>
            <div><span className="prode-profile-medal-symbol">🥈</span><strong>{awards?.silver ?? 0}</strong><span>Plata</span></div>
            <div><span className="prode-profile-medal-symbol">🥉</span><strong>{awards?.bronze ?? 0}</strong><span>Bronce</span></div>
          </div>
          <p>Estadísticas acumuladas en esta liga. Las medallas corresponden a semanas finalizadas.</p>
        </section>
      </div>;
    })()}
    {joinOpen && <div className="prode-dialog-backdrop" onClick={() => !inviteBusy && setJoinOpen(false)}><form className="prode-dialog prode-join-premium" style={joinPreview ? {"--join-accent":joinPreview.crestPrimary,"--join-secondary":joinPreview.crestSecondary} : undefined} onClick={e => e.stopPropagation()} onSubmit={joinGroup}>
      <div className="prode-dialog-heading"><h3>INVITACIÓN PRODE LNA</h3><button type="button" aria-label="Cerrar" onClick={() => setJoinOpen(false)}><X size={20}/></button></div>
      {joinPreview ? <div className="prode-join-league-card">
        <ProdeCrest type="league" name={joinPreview.name} primary={joinPreview.crestPrimary} secondary={joinPreview.crestSecondary} size={79}/>
        <div><span>LIGA DE AMIGOS</span><strong>{joinPreview.name}</strong><small>Temporada {joinPreview.season}</small></div>
      </div> : joinPreviewBusy ? <p className="prode-join-loading" role="status">Buscando los datos de tu liga…</p> : joinPreviewError ? <p className="prode-group-error" role="alert">{joinPreviewError}</p> : <p>Ingresá el código que te compartieron para descubrir la liga.</p>}
      <p className="prode-join-description">{joinPreview ? "¡Te invitaron a competir! Elegí al ganador y al MVP de cada partido y sumá puntos con tus amigos." : "Necesitás una cuenta Google para unirte al Prode."}</p>
      {joinPreview
        ? <div className="prode-join-verified"><span><CircleCheck size={16}/> Invitación verificada</span><button type="button" onClick={() => {setJoinCode("");setJoinPreview(null);setInviteMessage("");}}>Cambiar código</button></div>
        : <label>Código de invitación<input required autoCapitalize="none" autoCorrect="off" value={joinCode} onChange={e => setJoinCode(parseInviteCode(e.target.value))} placeholder="Pegá el código o enlace"/></label>}
      {!user && <button className="prode-create-submit" type="button" disabled={loginBusy} onClick={loginForInvite}>{loginBusy ? "Conectando…" : "Continuar con Google para unirme"}</button>}
      {inviteMessage && <p className="prode-group-error" role="alert">{inviteMessage}</p>}
      <button className="prode-create-submit prode-join-confirm" type="submit" disabled={inviteBusy || !user || !/^[a-f0-9]{64}$/i.test(joinCode) || joinPreviewBusy || Boolean(joinPreviewError)}>{inviteBusy ? "Ingresando…" : user ? joinPreview ? "Unirme a " + joinPreview.name : "Unirme a la liga" : "Primero iniciá sesión"}</button>
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
