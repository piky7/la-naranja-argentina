import ProdeHistoricalRanking from "../components/ProdeHistoricalRanking";
import { Trophy, UsersRound, Medal, Target, ChartNoAxesColumn, ShieldCheck } from "lucide-react";
import "./Prode.css";
import ProdeGoogleAccess from "../components/ProdeGoogleAccess";
import ProdeGroups from "../components/ProdeGroups";

export default function Prode() {
  return (
    <main className="prode-page prode-home-redesign">
      <div className="prode-container">
        <header className="prode-hero">
          <div className="prode-hero-content">
            <span className="prode-eyebrow"><span className="prode-live-dot" /> LA NARANJA ARGENTINA · 2026/27</span>
            <h1>PRODE <span>LNA</span></h1>
            <p>Tu pasión también suma.</p>
            <div className="prode-hero-foot"><span><Trophy size={14}/> Competí</span><span><UsersRound size={14}/> Creá tu liga</span><span><Medal size={14}/> Subí en el ranking</span></div>
          </div>
          <div className="prode-hero-ball" aria-hidden="true"><span /></div>
          <div className="prode-hero-account">
            <ProdeGoogleAccess />
          </div>
        </header>

        <section className="prode-friends-section" aria-label="Ligas de amigos">
          <div className="prode-friends-heading">
            <div className="prode-friends-heading-icon"><UsersRound size={25}/></div>
            <div><h2>LIGAS DE AMIGOS</h2><p>Competí con tus amigos en ligas privadas.</p></div>
          </div>
          <ProdeGroups />
        </section>

        <section className="prode-panel prode-general-section">
          <div className="prode-panel-heading"><span className="prode-panel-icon"><Trophy size={21}/></span><h2>RANKING <em>GENERAL</em></h2><span className="prode-small-tag">Histórico</span></div>
          <ProdeHistoricalRanking />
        </section>

        <section className="prode-how-section" aria-label="Cómo funciona Prode LNA">
          <div className="prode-how-heading"><ShieldCheck size={19}/><h2>CÓMO FUNCIONA</h2></div>
          <div className="prode-how-step"><Target size={20}/><div><strong>Pronosticá</strong><span>Elegí ganador y MVP desde cada partido.</span></div></div>
          <div className="prode-how-step"><ChartNoAxesColumn size={20}/><div><strong>Sumá puntos</strong><span>Tus aciertos suman en todas tus ligas.</span></div></div>
          <div className="prode-how-step"><Trophy size={20}/><div><strong>Competí</strong><span>Subí en los rankings semanales y generales.</span></div></div>
        </section>
      </div>
    </main>
  );
}
