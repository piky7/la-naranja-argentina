import { useState } from "react";
import { BellRing, Send } from "lucide-react";

const API = "https://lna-prode-api.lnab.workers.dev";

export default function AdminNotifications({ user }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [href, setHref] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const send = async event => {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true); setFeedback("");
    try {
      const token = await user.getIdToken();
      const response = await fetch(API + "/api/prode/admin/notifications", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, href: href.trim() || null }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) throw Error(body.error || "No se pudo enviar el aviso.");
      setFeedback(`Notificación enviada a ${body.recipients} cuentas.`);
      setTitle(""); setMessage(""); setHref("");
    } catch (error) { setFeedback(error.message || "No se pudo enviar el aviso."); }
    finally { setBusy(false); }
  };

  return <section className="lna-admin-section lna-admin-notifications">
    <h2><BellRing size={19}/> Enviar notificación a la comunidad</h2>
    <p>El aviso aparecerá en la campanita de las cuentas registradas. Los usuarios que vuelvan más tarde también lo recibirán.</p>
    <form onSubmit={send}>
      <label>Título<input value={title} onChange={event => setTitle(event.target.value)} maxLength={90} minLength={2} required placeholder="Ej. Se viene una nueva jornada"/></label>
      <label>Mensaje<textarea value={message} onChange={event => setMessage(event.target.value)} maxLength={500} minLength={2} required rows={3} placeholder="Escribí el mensaje para los usuarios…"/></label>
      <label>Enlace interno (opcional)<input value={href} onChange={event => setHref(event.target.value)} maxLength={200} placeholder="Ej. /liga o /prode"/></label>
      <button type="submit" disabled={busy || title.trim().length < 2 || message.trim().length < 2}><Send size={16}/>{busy ? "Enviando…" : "Enviar a todos los usuarios"}</button>
    </form>
    {feedback && <p className="lna-admin-notification-feedback" role="status">{feedback}</p>}
  </section>;
}
