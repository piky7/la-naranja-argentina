import { Construction, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./TournamentComingSoon.css";

function TournamentComingSoon({ tournament, onBack }) {
  const navigate = useNavigate();
  const names = { lab: "Liga Argentina", federal: "La Liga Federal" };
  const name = names[tournament] || "Esta competencia";
  const logo = tournament === "lab" ? "/tournament-logos/lab.svg" : "/tournament-logos/federal.svg";
  const back = () => {
    onBack?.();
    navigate("/", { replace: true });
  };

  return (
    <main className="tournament-coming-soon">
      <section className="tournament-coming-card" aria-labelledby="tournament-coming-title">
        <img className={tournament === "federal" ? "federal-logo" : "lab-logo"} src={logo} alt={name} />
        <span className="tournament-coming-eyebrow">NUEVA COMPETENCIA</span>
        <h1 id="tournament-coming-title">ESTAMOS TRABAJANDO EN ESO</h1>
        <p>Estamos preparando la cobertura de <strong>{name}</strong> para que muy pronto puedas seguirla desde LNA.</p>
        <div className="tournament-coming-status"><Construction size={17} aria-hidden="true" /> EN DESARROLLO</div>
        <button type="button" onClick={back}><ArrowLeft size={17} aria-hidden="true" /> Volver a Liga Nacional</button>
      </section>
    </main>
  );
}

export default TournamentComingSoon;
