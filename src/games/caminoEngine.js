// Camino al Título: simulación local; no hay guardado, llamadas de juego ni revancha.
export const ROUNDS = ["CUARTOS DE FINAL", "SEMIFINAL", "GRAN FINAL"];
export const ACTIONS = [
  [
    { id: "inside", title: "Atacar la pintura", detail: "Dos puntos seguros, pero defendidos", chance: .72, gain: 2, time: 10 },
    { id: "three", title: "Buscar el triple", detail: "Más riesgo, más recompensa", chance: .48, gain: 3, time: 8 },
    { id: "system", title: "Jugada preparada", detail: "Un tiro bien trabajado", chance: .65, gain: 2, time: 16 },
  ],
  [
    { id: "press", title: "Presión a toda cancha", detail: "Buscar el robo, arriesgando una falta", chance: .54, time: 11 },
    { id: "switch", title: "Cambios defensivos", detail: "Reducir espacios y cerrar el aro", chance: .68, time: 15 },
    { id: "zone", title: "Defender en zona", detail: "Proteger la pintura, conceder el tiro exterior", chance: .61, time: 13 },
  ],
  [
    { id: "quick", title: "Finalizar rápido", detail: "Más posesiones, más riesgo", chance: .63, gain: 2, time: 6 },
    { id: "hero", title: "Triple decisivo", detail: "Apostar por el tiro grande", chance: .49, gain: 3, time: 9 },
    { id: "patient", title: "Buscar el tiro libre", detail: "Provocar contacto y sumar desde la línea", chance: .74, gain: 2, time: 10 },
  ],
];

export function randomOpponentIds(teamId, allIds, random = Math.random) {
  const pool = allIds.filter(id => id !== teamId);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3);
}

export function createMatch(round, teamId, opponentId, random = Math.random) {
  const homeScore = 72 + Math.floor(random() * 12);
  const lead = Math.floor(random() * 7) - 3;
  return {
    round, teamId, opponentId, score: homeScore,
    opponentScore: homeScore + lead, moment: 0, clock: 58,
    log: [], done: false, won: false,
  };
}

export function playAction(match, actionId, random = Math.random) {
  if (match.done || match.moment > 2) return match;
  const action = ACTIONS[match.moment].find(option => option.id === actionId);
  if (!action) return match;
  const success = random() < Math.max(.32, action.chance - match.round * .035);
  const result = { ...match, log: [...match.log] };
  let message;
  if (match.moment === 0) {
    if (success) {
      result.score += action.gain;
      message = "¡Canasta! Sumaste " + action.gain + " puntos.";
    } else {
      message = action.id === "three" ? "El triple no entra. Rebote del rival." : "La defensa rival aguanta el ataque.";
    }
  } else if (match.moment === 1) {
    if (success) {
      message = "¡Gran defensa! Recuperaste la posesión.";
    } else {
      const points = random() < .24 ? 3 : 2;
      result.opponentScore += points;
      message = "El rival encuentra el aro y suma " + points + " puntos.";
    }
  } else {
    if (success) {
      result.score += action.gain;
      message = "¡Adentro! Anotaste " + action.gain + " puntos en el cierre.";
    } else {
      message = "El lanzamiento final no entra.";
    }
    // Una sola resolución final; no hay pantalla de revancha ni repetición.
    if (result.score === result.opponentScore) {
      const overtimeWin = random() < .5;
      if (overtimeWin) result.score += 2;
      else result.opponentScore += 2;
      message += overtimeWin
        ? " ¡En la última del suplementario anotás y ganás!"
        : " El rival define el suplementario y se lleva el partido.";
    }
    result.done = true;
    result.won = result.score > result.opponentScore;
  }
  result.log.push({ action: action.title, success, message });
  result.moment += 1;
  result.clock = [31, 10, 0][Math.min(match.moment, 2)];
  return result;
}
