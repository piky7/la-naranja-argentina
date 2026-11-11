import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { teams } from "../src/data/teams.js";

test("Los 18 equipos tienen un director técnico vigente cargado",()=>{
  assert.equal(teams.length,18);
  for(const team of teams) assert.ok(team.coach, `Falta DT para ${team.name}`);
  assert.equal(teams.find(team=>team.id==="boca").coach,"Nicolás Casalánguida");
  assert.equal(teams.find(team=>team.id==="lanus").coach,"Silvio Santander");
  assert.equal(teams.find(team=>team.id==="san-martin").coach,"Diego Vadell");
});

test("Los popups de partidos y la ficha de equipo reutilizan el DT del registro central",()=>{
  const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const upcoming=read("src/components/UpcomingMatchModal.jsx");
  const finished=read("src/components/FinishedMatchModal.jsx");
  const team=read("src/pages/Equipo.jsx");
  assert.match(upcoming,/className="match-modal-coach">DT: \{selectedUpcomingHomeTeam\.coach\}/);
  assert.match(upcoming,/className="match-modal-coach">DT: \{selectedUpcomingAwayTeam\.coach\}/);
  assert.match(finished,/className="match-modal-coach">DT: \{selectedMatchHomeTeam\.coach\}/);
  assert.match(finished,/className="match-modal-coach">DT: \{selectedMatchAwayTeam\.coach\}/);
  assert.match(team,/Director técnico: <strong>\{team\.coach\}<\/strong>/);
});
