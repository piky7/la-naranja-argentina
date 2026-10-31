import { useEffect, useState } from "react";
import { PlusCircle, X, LockKeyhole, Globe2 } from "lucide-react";
import { watchProdeUser } from "../auth/prodeAuth";

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
    <div className="prode-onboarding-action"><LockKeyhole size={21}/><div><strong>Unirme a un Prode</strong><span>Invitaciones próximamente</span></div></div>
    <div className="prode-onboarding-action"><Globe2 size={21}/><div><strong>Ranking general</strong><span>Todos los participantes de LNA · Próximamente</span></div></div>
    {ready && groups.length > 0 && <div className="prode-my-groups"><strong>Mis ligas ({groups.length})</strong>{groups.map(group => <div key={group.id} className="prode-my-group"><span>{group.name}</span><small>{group.visibility === "private" ? "Privada" : "Pública"} · {group.role === "owner" ? "Administrador" : "Miembro"}</small></div>)}</div>}
    {error && <p className="prode-group-error" role="alert">{error}</p>}
    {open && <div className="prode-dialog-backdrop" onClick={() => !busy && setOpen(false)}>
      <form className="prode-dialog" onClick={e => e.stopPropagation()} onSubmit={create}>
        <div className="prode-dialog-heading"><h3>Crear un Prode</h3><button type="button" aria-label="Cerrar" onClick={() => setOpen(false)}><X size={20}/></button></div>
        <label>Nombre de la liga<input autoFocus required minLength={3} maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Ej. Amigos del básquet"/></label>
        <label>Descripción (opcional)<textarea maxLength={240} rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Contanos de qué se trata"/></label>
        <label>Privacidad<select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="private">Privada</option><option value="public">Pública</option></select></label>
        <p>La liga se crea con tu cuenta Google. Las invitaciones y los rankings se habilitarán después.</p>
        {error && <p className="prode-group-error" role="alert">{error}</p>}
        <button className="prode-create-submit" type="submit" disabled={busy || name.trim().length < 3}>{busy ? "Creando…" : "Crear liga"}</button>
      </form>
    </div>}
  </div>;
}
