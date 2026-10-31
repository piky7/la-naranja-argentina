import { Trophy, UsersRound, ChartNoAxesColumn, Flame, LockKeyhole, Medal, ChevronRight, Sparkles, UserRound, PlusCircle, Ticket, Globe2, ShieldCheck } from "lucide-react";
import "./Prode.css";

const Section = ({ icon: Icon, title, children, extra }) => (
  <section className="prode-panel">
    <div className="prode-panel-heading"><span className="prode-panel-icon"><Icon size={18} /></span><h2>{title}</h2>{extra}</div>
    {children}
  </section>
);

export default function Prode() {
  return (
    <main className="prode-page">
      <div className="prode-container">
        <header className="prode-hero">
          <div className="prode-hero-content">
            <span className="prode-eyebrow"><span className="prode-live-dot" /> LA NARANJA ARGENTINA · 2026/27</span>
            <h1>PRODE <span>LNA</span></h1>
            <p>Tu pasión también suma.</p>
            <div className="prode-hero-foot"><span><Trophy size={14}/> Competí</span><span><UsersRound size={14}/> Creá tu liga</span><span><Medal size={14}/> Subí en el ranking</span></div>
          </div>
          <div className="prode-hero-ball" aria-hidden="true"><span /></div>
        </header>

        <div className="prode-coming"><Sparkles size={18} /><div><strong>PRÓXIMAMENTE</strong><span>Estamos preparando el Prode de LNA. Los rankings y las ligas se habilitarán cuando esté listo.</span></div></div>

        <section className="prode-onboarding" aria-label="Acceso al Prode">
          <div className="prode-onboarding-intro">
            <span className="prode-onboarding-icon"><UserRound size={20}/></span>
            <div><strong>TU CUENTA PRODE</strong><p>Un solo usuario, una votación por partido y tus puntos en todas las clasificaciones.</p></div>
            <span className="prode-onboarding-tag"><LockKeyhole size={12}/> En preparación</span>
          </div>
          <div className="prode-onboarding-actions">
            <div className="prode-onboarding-action"><PlusCircle size={21}/><div><strong>Crear un Prode</strong><span>Armá tu grupo público o privado</span></div></div>
            <div className="prode-onboarding-action"><Ticket size={21}/><div><strong>Unirme a un Prode</strong><span>Ingresá con una invitación</span></div></div>
            <div className="prode-onboarding-action"><Globe2 size={21}/><div><strong>Ranking general</strong><span>Todos los participantes de LNA</span></div></div>
          </div>
          <p className="prode-onboarding-foot"><ShieldCheck size={14}/> Las cuentas y los grupos se habilitarán cuando esté lista la conexión segura. Tus votos actuales no se modifican.</p>
        </section>

        <div className="prode-grid">
          <Section icon={Trophy} title={<>Ranking <em>general</em></>} extra={<span className="prode-small-tag">Temporada 26/27</span>}>
            <div className="prode-podium" aria-label="Ranking general próximamente">
              <div className="prode-podium-item second"><span className="prode-podium-medal">2</span><div className="prode-podium-avatar">?</div><span>2° puesto</span><strong>— pts</strong></div>
              <div className="prode-podium-item first"><span className="prode-podium-medal">1</span><div className="prode-podium-avatar"><Trophy size={23}/></div><span>1° puesto</span><strong>— pts</strong></div>
              <div className="prode-podium-item third"><span className="prode-podium-medal">3</span><div className="prode-podium-avatar">?</div><span>3° puesto</span><strong>— pts</strong></div>
            </div>
            <div className="prode-panel-bottom"><span>La clasificación aparecerá al comenzar el Prode.</span><ChevronRight size={17}/></div>
          </Section>

          <Section icon={UsersRound} title={<>Mis <em>ligas</em></>}>
            <div className="prode-league-placeholder"><div className="prode-league-symbol"><UsersRound size={26}/></div><div><strong>Competí con tus amigos</strong><p>Creá ligas privadas, invitá participantes y compará tus pronósticos.</p></div></div>
            <div className="prode-disabled-action"><LockKeyhole size={15}/> Crear o unirse a una liga · Próximamente</div>
          </Section>

          <Section icon={ChartNoAxesColumn} title={<>Mis <em>estadísticas</em></>}>
            <div className="prode-stats-grid">
              <div><span>Pronósticos</span><strong>—</strong><small>Realizados</small></div>
              <div><span>Aciertos</span><strong>—</strong><small>Ganadores</small></div>
              <div><span>Puntos</span><strong>—</strong><small>Acumulados</small></div>
              <div><span>Posición</span><strong>—</strong><small>General</small></div>
            </div>
            <p className="prode-muted-note">Tus estadísticas estarán disponibles cuando inicies sesión y comience el Prode.</p>
          </Section>

          <Section icon={Flame} title={<>Líderes <em>de la semana</em></>} extra={<span className="prode-small-tag">Lun – Dom</span>}>
            <div className="prode-weekly-empty"><div className="prode-weekly-icon"><Flame size={23}/></div><strong>La próxima semana puede ser tuya</strong><p>Acá aparecerán los mejores participantes de cada semana.</p></div>
            <div className="prode-panel-bottom"><span>Ranking semanal próximamente</span><ChevronRight size={17}/></div>
          </Section>
        </div>
      </div>
    </main>
  );
}
