import { useRef, useState } from "react";
import { Download, X } from "lucide-react";
import ProdeCrest from "./ProdeCrest";
import "./ProdeWeeklyAwards.css";

const medalColors = { 1: "#f8c85b", 2: "#cbd7e6", 3: "#d59c73" };
const safeColor = color => /^#[0-9a-f]{6}$/i.test(color || "") ? color : "#7de83d";

function fitText(ctx, text, maxWidth, size, minSize = 32) {
  let current = size;
  while (current > minSize) {
    ctx.font = `900 ${current}px system-ui, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    current -= 2;
  }
  return current;
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawCrest(ctx, element, x, y, size) {
  const svg = element?.querySelector("svg");
  if (!svg) return false;
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "288");
  clone.setAttribute("height", "330");
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    ctx.drawImage(img, x, y, size * 0.873, size);
    return true;
  } catch {
    return false;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createAwardImage({ league, week, player, crestElement }) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la imagen");
  const rank = player.position;
  const accent = medalColors[rank] || medalColors[1];
  const background = ctx.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, "#071729");
  background.addColorStop(0.55, "#10263b");
  background.addColorStop(1, "#050b17");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 9;
  ctx.strokeRect(35, 35, 1010, 1280);
  ctx.globalAlpha = 0.13;
  for (let i = -800; i < 1500; i += 100) {
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i + 38, 0); ctx.lineTo(i + 750, 1350); ctx.lineTo(i + 712, 1350);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  try {
    const logo = await loadImage("/logo-lna.png");
    ctx.drawImage(logo, 440, 78, 200, 200);
  } catch {
    ctx.fillStyle = "#ff8f28";
    ctx.font = "900 88px system-ui, sans-serif";
    ctx.fillText("LNA", 540, 203);
  }
  ctx.fillStyle = "#84f345";
  ctx.font = "900 43px system-ui, sans-serif";
  ctx.fillText("PRODE LNA", 540, 340);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 66px system-ui, sans-serif";
  ctx.fillText("RECONOCIMIENTO", 540, 435);
  ctx.fillStyle = accent;
  ctx.font = "900 42px system-ui, sans-serif";
  ctx.fillText(`SEMANA ${week.number}`, 540, 500);
  ctx.fillStyle = accent;
  ctx.font = "900 130px system-ui, sans-serif";
  ctx.fillText(`${rank}°`, 540, 665);
  ctx.font = "900 43px system-ui, sans-serif";
  ctx.fillText("PUESTO", 540, 730);
  const crestDrawn = await drawCrest(ctx, crestElement, 425, 774, 265);
  if (!crestDrawn) {
    ctx.beginPath(); ctx.arc(540, 910, 100, 0, Math.PI * 2);
    ctx.fillStyle = safeColor(player.crestPrimary); ctx.fill();
    ctx.fillStyle = "#102338"; ctx.font = "900 68px system-ui, sans-serif";
    ctx.fillText(String(player.username || "?").charAt(0).toUpperCase(), 540, 933);
  }
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${fitText(ctx, player.username || "Jugador", 875, 64, 30)}px system-ui, sans-serif`;
  ctx.fillText(player.username || "Jugador", 540, 1110);
  ctx.fillStyle = "#84f345";
  ctx.font = "900 56px system-ui, sans-serif";
  ctx.fillText(`${player.points} PTS`, 540, 1190);
  ctx.fillStyle = "#c8d5e4";
  ctx.font = `700 ${fitText(ctx, league.name, 880, 34, 24)}px system-ui, sans-serif`;
  ctx.fillText(league.name, 540, 1260);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("No se pudo generar el PNG");
  return blob;
}

export default function ProdeWeeklyAwards({ award, userId, onClose, variant = "league" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const crestRefs = useRef({});
  if (!award) return null;
  const { week, league } = award;
  // Los empates conservan el puesto denso oficial y comparten reconocimiento.
  const podium = (week.ranking || []).filter(p => p.position >= 1 && p.position <= 3);
  const mine = podium.find(p => p.userId === userId);
  const myStanding = (week.ranking || []).find(p => p.userId === userId);
  const ordered = [...podium].sort((a, b) => a.position - b.position || b.points - a.points);
  const display = [...ordered].sort((a, b) => {
    const order = rank => rank === 1 ? 1 : rank === 2 ? 0 : 2;
    return order(a.position) - order(b.position);
  });

  const download = async () => {
    if (!mine || busy) return;
    setBusy(true);
    setError("");
    try {
      const blob = await createAwardImage({
        league, week, player: mine, crestElement: crestRefs.current[mine.userId],
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `LNA-Prode-${variant === "global" ? "Ranking-Global" : String(league.name).replace(/[^a-z0-9-]/gi, "-")}-semana-${week.number}-puesto-${mine.position}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      setError(e?.message || "No se pudo generar la imagen");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="prode-award-backdrop" onClick={onClose}>
      <section className="prode-award-modal" role="dialog" aria-modal="true" aria-label={`Podio de la semana ${week.number}`} onClick={e => e.stopPropagation()}>
        <button className="prode-award-close" type="button" onClick={onClose} aria-label="Cerrar reconocimiento"><X size={21}/></button>
        <div className="prode-award-brand"><strong>🏀 LNA</strong><span>PRODE</span></div>
        <h2>{variant === "global" ? <>¡LOS MEJORES <span>DE LA SEMANA!</span></> : <>¡SEMANA <span>FINALIZADA!</span></>}</h2>
        <p className="prode-award-lead">{variant === "global" ? "Ranking global de todos los usuarios de Prode LNA" : `Felicitaciones a los mejores de la semana ${week.number}`}</p>
        <div className="prode-award-podium">
          {display.map(player => <div key={player.userId} className={`prode-award-place place-${player.position}`} style={{ "--award-color": medalColors[player.position] }}>
            <span className="prode-award-rank">{player.position}°</span>
            <div className="prode-award-crest" ref={node => { crestRefs.current[player.userId] = node; }}>
              <ProdeCrest name={player.username} primary={player.crestPrimary} secondary={player.crestSecondary} textColor={player.crestText} style={player.crestStyle} font={player.crestFont} symbol={player.crestSymbol} size={82}/>
            </div>
            <strong className="prode-award-name">{player.username}</strong>
            <strong className="prode-award-score">{player.points} <small>PTS</small></strong>
          </div>)}
        </div>
        <p className="prode-award-league">{variant === "global" ? "PRODE LNA · RANKING GLOBAL" : league.name} · Semana {week.number}</p>
        {!mine && myStanding && myStanding.position != null && <div className="prode-award-my-position" aria-live="polite">
          <span>TU RESULTADO ESTA SEMANA</span>
          <strong>{myStanding.position}° <small>PUESTO</small></strong>
          <b>{myStanding.points ?? 0} <small>PTS</small></b>
        </div>}
        {mine ? <>
          <p className="prode-award-message">¡Felicitaciones! Conseguí tu reconocimiento personalizado para compartirlo.</p>
          <button className="prode-award-download" type="button" disabled={busy} onClick={download}><Download size={20}/>{busy ? "Preparando imagen…" : "Descargar reconocimiento"}</button>
        </> : <p className="prode-award-message">¡Felicitaciones al podio! Los premiados pueden descargar su reconocimiento personal.</p>}
        {error && <p className="prode-award-error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
