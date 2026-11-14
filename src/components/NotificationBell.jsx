import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ExternalLink, Trash2, X } from "lucide-react";
import { matches } from "../data/matches";
import { requestPrediction } from "../auth/prodeBallot";
import "./NotificationBell.css";

const API = "https://lna-prode-api.lnab.workers.dev";

function argentinaToday() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export default function NotificationBell({ user }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [pendingMatches, setPendingMatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inboxFetchedAt = useRef(0);

  const loadInbox = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(API + "/api/prode/notifications", {
        headers: { Authorization: "Bearer " + token }, cache: "no-store",
      });
      const body = await response.json();
      if (response.ok && body.ok) { setItems(Array.isArray(body.notifications) ? body.notifications : []); inboxFetchedAt.current = Date.now(); }
    } catch { /* La campana no debe afectar la navegación si el servicio no responde. */ }
    finally { setLoading(false); }
  }, [user]);

  const refreshPending = useCallback(async () => {
    if (!user) return;
    const today = argentinaToday();
    const todaysGames = matches.filter(match => match.date === today && match.status !== "finished" && match.status !== "postponed");
    const checks = await Promise.all(todaysGames.map(async match => {
      const gameId = `${match.date}-${match.homeTeam}-${match.awayTeam}`;
      const [winner, mvp] = await Promise.allSettled([
        requestPrediction("winner", gameId),
        requestPrediction("mvp", gameId),
      ]);
      const winnerPending = winner.status === "fulfilled" && winner.value.open && !winner.value.voted;
      const mvpPending = mvp.status === "fulfilled" && mvp.value.open && !mvp.value.voted;
      if (winner.status === "rejected" && mvp.status === "rejected") return null;
      return winnerPending || mvpPending ? { id: gameId, title: "Pronósticos pendientes", message: "Todavía tenés partidos de hoy sin completar. Entrá a la Liga para votar.", href: "/liga", automatic: true } : null;
    }));
    setPendingMatches(checks.filter(Boolean));
  }, [user]);

  useEffect(() => {
    if (!user) { setItems([]); setPendingMatches([]); setOpen(false); return; }
    inboxFetchedAt.current = 0;
    // Cargar la bandeja y los recordatorios al iniciar sesión, para que
    // el indicador aparezca sin tener que abrir manualmente la campanita.
    loadInbox();
    refreshPending();
    const refresh = () => {
      if (document.visibilityState === "visible") {
        loadInbox();
        refreshPending();
      }
    };
    window.addEventListener("lna-vote-updated", refresh);
    window.addEventListener("career-auth-updated", refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("lna-vote-updated", refresh);
      window.removeEventListener("career-auth-updated", refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [user?.uid, loadInbox, refreshPending]);

  // Actualizar al abrir la bandeja, no cada minuto en segundo plano.
  useEffect(() => {
    if (open && user) {
      if (Date.now() - inboxFetchedAt.current > 30000) loadInbox();
      refreshPending();
    }
  }, [open, user, loadInbox, refreshPending]);

  const unread = useMemo(() => items.filter(item => !item.readAt).length + (pendingMatches.length ? 1 : 0), [items, pendingMatches]);

  const openAnnouncement = async item => {
    const isInternalHref = typeof item.href === "string" && item.href.startsWith("/") && !item.href.startsWith("//");
    if (item.href && !isInternalHref && /^https:\/\//i.test(item.href)) {
      // Abrir en el mismo gesto del usuario para evitar bloqueos de ventanas emergentes en iOS.
      window.open(item.href, "_blank", "noopener,noreferrer");
    }
    try {
      const token = await user.getIdToken();
      await fetch(API + "/api/prode/notifications/" + encodeURIComponent(item.id) + "/read", {
        method: "POST", headers: { Authorization: "Bearer " + token },
      });
    } catch { /* Se puede abrir el destino aunque falle el marcado de lectura. */ }
    setItems(current => current.map(entry => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    setOpen(false);
    if (isInternalHref) navigate(item.href);
  };

  const deleteAnnouncement = async (event, item) => {
    event.stopPropagation();
    if (item.type !== "announcement") return;
    try {
      const token = await user.getIdToken();
      const response = await fetch(API + "/api/prode/notifications/" + encodeURIComponent(item.id), {
        method: "DELETE", headers: { Authorization: "Bearer " + token },
      });
      const body = await response.json();
      if (response.ok && body.ok) setItems(current => current.filter(entry => entry.id !== item.id));
    } catch { /* Si falla, el aviso permanece en la bandeja para poder reintentar. */ }
  };

  const markAllRead = async () => {
    const unreadItems = items.filter(item => !item.readAt);
    if (!unreadItems.length) return;
    try {
      const token = await user.getIdToken();
      await Promise.all(unreadItems.map(item => fetch(API + "/api/prode/notifications/" + encodeURIComponent(item.id) + "/read", {
        method: "POST", headers: { Authorization: "Bearer " + token },
      })));
      setItems(current => current.map(item => ({ ...item, readAt: item.readAt || new Date().toISOString() })));
    } catch { /* Mantener el estado local sin cerrar la bandeja. */ }
  };

  if (!user) return null;
  return <div className="lna-notification-wrap">
    <button type="button" className={"lna-notification-trigger" + (open ? " is-open" : "")} onClick={() => setOpen(value => !value)} aria-label={unread ? `Notificaciones: ${unread} sin leer` : "Notificaciones"} aria-expanded={open}>
      <Bell size={21} strokeWidth={2.2}/>
      {unread > 0 && <span className="lna-notification-count">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <>
      <button type="button" className="lna-notification-dismiss" aria-label="Cerrar notificaciones" onClick={() => setOpen(false)}/>
      <section className="lna-notification-panel" aria-label="Centro de notificaciones">
        <header><div><span>LNA</span><strong>Notificaciones</strong></div><button type="button" onClick={() => setOpen(false)} aria-label="Cerrar"><X size={18}/></button></header>
        <div className="lna-notification-list">
          {pendingMatches.length > 0 && <button type="button" className="lna-notification-item is-unread" onClick={() => { setOpen(false); navigate("/liga"); }}>
            <span className="lna-notification-dot"/><span><strong>Pronósticos pendientes</strong><small>Todavía tenés {pendingMatches.length} {pendingMatches.length === 1 ? "partido" : "partidos"} de hoy sin completar. Entrá a la Liga para votar.</small><em>Recordatorio automático</em></span>
          </button>}
          {items.map(item => <div className={"lna-notification-item" + (!item.readAt ? " is-unread" : "")} key={item.id}>
            <button type="button" className="lna-notification-content" onClick={() => openAnnouncement(item)}>
              {!item.readAt && <span className="lna-notification-dot"/>}<span><strong>{item.title}</strong><small>{item.message}</small><em>{new Date(item.createdAt + (item.createdAt?.endsWith("Z") ? "" : "Z")).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}{item.href ? " · Ver más" : ""}</em></span>{item.href && <ExternalLink size={15}/>}
            </button>
            {item.type === "announcement" && <button type="button" className="lna-notification-delete" aria-label={"Eliminar notificación: " + item.title} title="Eliminar notificación" onClick={event => deleteAnnouncement(event, item)}><Trash2 size={16}/></button>}
          </div>)}
          {!loading && !pendingMatches.length && !items.length && <p className="lna-notification-empty"><Check size={20}/> No tenés notificaciones.</p>}
          {loading && !items.length && <p className="lna-notification-empty">Cargando notificaciones…</p>}
        </div>
        {items.some(item => !item.readAt) && <footer><button type="button" onClick={markAllRead}>Marcar todas como leídas</button></footer>}
      </section>
    </>}
  </div>;
}
