// Camino al Título: cuatro rondas rápidas, sin historial, backend ni revanchas.
export const ROUNDS = ["OCTAVOS DE FINAL", "CUARTOS DE FINAL", "SEMIFINAL", "GRAN FINAL"];
export const ROUND_SHORT = ["OCTAVOS", "CUARTOS", "SEMIFINAL", "FINAL"];

// Cada partido combina escenarios diferentes de ataque, defensa y cierre.
// Las probabilidades son ficticias y se usan únicamente para el minijuego.
export const SCENARIOS = [
  [
    { id: "early-shot", title: "CONTRAATAQUE", description: "Recuperaste la pelota y tenés superioridad numérica.", options: [
      { id: "layup", title: "Bandeja en velocidad", detail: "Buscá el aro antes de que llegue la defensa", chance: .77, gain: 2, visual: "drive" },
      { id: "transition-three", title: "Triple en transición", detail: "Tiro abierto con algo más de riesgo", chance: .54, gain: 3, visual: "shot" },
      { id: "extra-pass", title: "Pase extra", detail: "Asegurá la posesión y encontrá el mejor tiro", chance: .72, gain: 2, visual: "pass" },
    ] },
    { id: "half-court", title: "ATAQUE POSICIONAL", description: "La defensa rival ya está formada. Elegí cómo romperla.", options: [
      { id: "pick-roll", title: "Pick and roll", detail: "Bloqueo y continuación al aro", chance: .71, gain: 2, visual: "screen" },
      { id: "corner", title: "Triple desde la esquina", detail: "Liberá a tu mejor tirador", chance: .53, gain: 3, visual: "shot" },
      { id: "post", title: "Juego al poste", detail: "Atacá cerca del aro con tu interno", chance: .76, gain: 2, visual: "drive" },
    ] },
    { id: "pressure", title: "DEFENSA EN ZONA", description: "El rival cerró la pintura y te invita a lanzar de afuera.", options: [
      { id: "skip-pass", title: "Invertir la pelota", detail: "Buscá un tiro tras el cambio de lado", chance: .69, gain: 2, visual: "pass" },
      { id: "zone-three", title: "Castigar con el triple", detail: "Intentá romper la zona desde lejos", chance: .55, gain: 3, visual: "shot" },
      { id: "baseline", title: "Cortar por línea de fondo", detail: "Entrá a la espalda de la defensa", chance: .74, gain: 2, visual: "drive" },
    ] },
    { id: "inbound", title: "SAQUE DE BANDA", description: "Quedan pocos segundos de posesión y sacás desde el lateral.", options: [
      { id: "lob", title: "Pase hacia el aro", detail: "Buscá una definición rápida", chance: .65, gain: 2, visual: "pass" },
      { id: "catch-shot", title: "Recibir y tirar de tres", detail: "Tiro inmediato desde el perímetro", chance: .50, gain: 3, visual: "shot" },
      { id: "cut", title: "Corte hacia la pintura", detail: "Ganale la espalda a tu marca", chance: .72, gain: 2, visual: "drive" },
    ] },
  ],
  [
    { id: "stop-drive", title: "DEFENDER LA PENETRACIÓN", description: "El base rival supera la primera línea de defensa.", options: [
      { id: "help", title: "Ayuda defensiva", detail: "Cerrá el aro y forzá un pase", chance: .72, visual: "block" },
      { id: "steal", title: "Intentar el robo", detail: "Riesgo alto de dejar el camino libre", chance: .55, visual: "steal" },
      { id: "contain", title: "Contener sin falta", detail: "Mantené tu posición hasta el final", chance: .67, visual: "block" },
    ] },
    { id: "rival-three", title: "TRIPLE DEL RIVAL", description: "El rival prepara una jugada de tres puntos.", options: [
      { id: "closeout", title: "Salir al tirador", detail: "Disputar el lanzamiento", chance: .70, visual: "block" },
      { id: "trap", title: "Doblar la marca", detail: "Buscar un error en el pase", chance: .60, visual: "steal" },
      { id: "switch", title: "Cambiar marcas", detail: "Evitar un tiro completamente solo", chance: .66, visual: "screen" },
    ] },
    { id: "last-defense", title: "JUGADA DE PIZARRÓN RIVAL", description: "El entrenador rival pide tiempo muerto y prepara una acción.", options: [
      { id: "zone", title: "Defender en zona", detail: "Proteger el área cercana al aro", chance: .64, visual: "block" },
      { id: "pressure-full", title: "Presionar el saque", detail: "Forzar una pérdida en la reposición", chance: .57, visual: "steal" },
      { id: "man", title: "Marcar hombre a hombre", detail: "Seguir los cortes y bloquear el tiro", chance: .71, visual: "screen" },
    ] },
    { id: "rebound", title: "REBOTE CLAVE", description: "El rival lanzó y la pelota queda suelta cerca del aro.", options: [
      { id: "boxout", title: "Bloquear al rival", detail: "Asegurá la posición para el rebote", chance: .75, visual: "rebound" },
      { id: "jump", title: "Saltar por el balón", detail: "Intentá ganarlo en el aire", chance: .62, visual: "rebound" },
      { id: "tip", title: "Palmear la pelota", detail: "Sacala de la zona de peligro", chance: .66, visual: "block" },
    ] },
  ],
  [
    { id: "final-shot", title: "ÚLTIMA POSESIÓN", description: "La pelota quema. Elegí quién toma el último tiro.", options: [
      { id: "drive", title: "Atacar el aro", detail: "Dos puntos y posibilidad de cierre fuerte", chance: .76, gain: 2, visual: "drive" },
      { id: "clutch-three", title: "Triple para la historia", detail: "Podés cambiar el partido con un lanzamiento", chance: .54, gain: 3, visual: "shot" },
      { id: "open", title: "Jugada de pases", detail: "Buscá un compañero libre", chance: .71, gain: 2, visual: "pass" },
    ] },
    { id: "foul-trouble", title: "BONUS DE FALTAS", description: "El rival está en penalización. Podés atacar el contacto.", options: [
      { id: "contact", title: "Buscar tiros libres", detail: "Forzá una infracción en el aro", chance: .80, gain: 2, visual: "foul" },
      { id: "jumper", title: "Tiro de media distancia", detail: "Lanzamiento equilibrado", chance: .69, gain: 2, visual: "shot" },
      { id: "kick", title: "Descarga al perímetro", detail: "Tres puntos con más riesgo", chance: .53, gain: 3, visual: "pass" },
    ] },
    { id: "desperate", title: "RELOJ EN CONTRA", description: "Quedan diez segundos. No hay margen para especular.", options: [
      { id: "fast-drive", title: "Penetración inmediata", detail: "Dos puntos con ejecución rápida", chance: .73, gain: 2, visual: "drive" },
      { id: "screen-shot", title: "Pantalla para un triple", detail: "Prepará un tiro de tres", chance: .55, gain: 3, visual: "screen" },
      { id: "alley", title: "Pase al corte", detail: "Intentá la asistencia definitiva", chance: .67, gain: 2, visual: "pass" },
    ] },
    { id: "last-possession", title: "ATAQUE BAJO PRESIÓN", description: "Toda la defensa está sobre la pelota.", options: [
      { id: "reverse", title: "Cambio de frente", detail: "Desmarcá a un compañero", chance: .72, gain: 2, visual: "pass" },
      { id: "isolation", title: "Uno contra uno", detail: "Confiá en tu jugador más decisivo", chance: .70, gain: 2, visual: "drive" },
      { id: "logo", title: "Triple lejano", detail: "Intentá sorprender desde muy lejos", chance: .43, gain: 3, visual: "shot" },
    ] },
  ],
];

// Compatibilidad de referencia para las pruebas y la UI.
export const ACTIONS = SCENARIOS.map(group => group.flatMap(scenario => scenario.options));

export function randomOpponentIds(teamId, allIds, random = Math.random) {
  const pool = allIds.filter(id => id !== teamId);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, ROUNDS.length);
}

export function createMatch(round, teamId, opponentId, random = Math.random) {
  const homeScore = 73 + Math.floor(random() * 12);
  const lead = Math.floor(random() * 7) - 3;
  const scenarioIds = SCENARIOS.map(group => Math.floor(random() * group.length));
  return {
    round, teamId, opponentId, score: homeScore,
    opponentScore: homeScore + lead, moment: 0, clock: 58,
    scenarioIds, log: [], done: false, won: false,
  };
}

export function getScenario(match) {
  if (!match || match.done || match.moment >= SCENARIOS.length) return null;
  return SCENARIOS[match.moment][match.scenarioIds[match.moment]];
}

export function playAction(match, actionId, random = Math.random) {
  if (!match || match.done || match.moment >= SCENARIOS.length) return match;
  const action = getScenario(match)?.options.find(option => option.id === actionId);
  if (!action) return match;
  const beforeScore = match.score, beforeOpponent = match.opponentScore;
  const success = random() < Math.max(.33, action.chance - match.round * .015);
  const result = { ...match, log: [...match.log] };
  let message;
  if (match.moment === 1) {
    if (success) {
      message = action.visual === "steal"
        ? "¡Robo de pelota! Frenaste el ataque rival."
        : "¡Gran defensa! El rival no consigue convertir.";
    } else {
      const points = random() < .24 ? 3 : 2;
      result.opponentScore += points;
      message = "El rival rompe la defensa y suma " + points + " puntos.";
    }
  } else if (success) {
    result.score += action.gain;
    message = "¡Canasta! Sumaste " + action.gain + " puntos con " + action.title.toLowerCase() + ".";
  } else {
    message = action.gain === 3 ? "El lanzamiento de tres no entra." : "El intento no termina en canasta.";
  }
  if (match.moment === SCENARIOS.length - 1) {
    if (result.score === result.opponentScore) {
      const overtimeWin = random() < .5;
      if (overtimeWin) result.score += 2;
      else result.opponentScore += 2;
      message += overtimeWin ? " ¡Ganaste en el suplementario!" : " El rival gana en el suplementario.";
    }
    result.done = true;
    result.won = result.score > result.opponentScore;
  }
  result.log.push({
    action: action.title, success, message, visual: action.visual,
    scored: result.score - beforeScore, conceded: result.opponentScore - beforeOpponent,
    score: result.score, opponentScore: result.opponentScore,
  });
  result.moment += 1;
  result.clock = [31, 10, 0][Math.min(match.moment, 2)];
  return result;
}
