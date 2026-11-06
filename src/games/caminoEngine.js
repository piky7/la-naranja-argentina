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
    { id: "fastbreak-trap", title: "SALIDA DE PRESIÓN", description: "El rival presiona toda la cancha y tenés que superar la primera línea.", options: [
      { id: "break-middle", title: "Salir por el centro", detail: "Rompé la presión con un pase interior", chance: .72, gain: 2, visual: "pass" },
      { id: "break-side", title: "Atacar por la banda", detail: "Un avance rápido aprovechando el espacio", chance: .69, gain: 2, visual: "drive" },
      { id: "break-three", title: "Triple a campo abierto", detail: "Aprovechá la defensa desordenada", chance: .52, gain: 3, visual: "shot" },
    ] },
    { id: "offensive-rebound", title: "SEGUNDA OPORTUNIDAD", description: "Capturaste un rebote ofensivo y tenés otra oportunidad.", options: [
      { id: "putback", title: "Volver a tirar", detail: "Definí rápido cerca del aro", chance: .78, gain: 2, visual: "rebound" },
      { id: "reset", title: "Rearmar la jugada", detail: "Sacá la pelota para un mejor lanzamiento", chance: .72, gain: 2, visual: "pass" },
      { id: "kickout-three", title: "Descargar para el triple", detail: "Buscá a un tirador desmarcado", chance: .56, gain: 3, visual: "shot" },
    ] },
    { id: "mismatch", title: "VENTAJA EN EL CAMBIO", description: "El rival cambió marcas y un interno quedó contra un jugador más bajo.", options: [
      { id: "feed-post", title: "Pasar al poste", detail: "Explotá la diferencia física", chance: .75, gain: 2, visual: "pass" },
      { id: "spin", title: "Giro hacia el aro", detail: "Atacar con decisión la pintura", chance: .67, gain: 2, visual: "drive" },
      { id: "open-arc", title: "Triple con espacio", detail: "Usá la ayuda defensiva para liberar el perímetro", chance: .54, gain: 3, visual: "shot" },
    ] },
    { id: "shotclock", title: "POSESIÓN AGOTÁNDOSE", description: "El reloj de posesión está por terminar y necesitás generar un tiro.", options: [
      { id: "float", title: "Flotadora rápida", detail: "Definí antes del cierre defensivo", chance: .65, gain: 2, visual: "drive" },
      { id: "late-screen", title: "Pantalla de emergencia", detail: "Bloqueo para liberar un tiro", chance: .63, gain: 2, visual: "screen" },
      { id: "contested-three", title: "Triple forzado", detail: "Tiro lejano con marca encima", chance: .40, gain: 3, visual: "shot" },
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
    { id: "defend-pick", title: "PICK AND ROLL RIVAL", description: "El base rival llama a su interno para crear ventaja.", options: [
      { id: "hedge", title: "Mostrar y recuperar", detail: "Frenar al base sin perder al interno", chance: .65, visual: "screen" },
      { id: "drop", title: "Defensa hundida", detail: "Proteger el aro y conceder distancia", chance: .67, visual: "block" },
      { id: "trap-ball", title: "Atrapar al base", detail: "Buscar la pérdida con doble marca", chance: .58, visual: "steal" },
    ] },
    { id: "defend-inbound", title: "SAQUE BAJO PRESIÓN", description: "El rival necesita reponer desde la banda en una posesión clave.", options: [
      { id: "deny", title: "Negar el pase", detail: "Cerrá la línea de recepción", chance: .69, visual: "steal" },
      { id: "switch-all", title: "Cambiar todas las marcas", detail: "Seguir los cortes sin dejar huecos", chance: .73, visual: "screen" },
      { id: "sag", title: "Proteger el aro", detail: "Cuidar la penetración y el rebote", chance: .65, visual: "block" },
    ] },
    { id: "fastbreak-defense", title: "CONTRAATAQUE RIVAL", description: "Perdiste la pelota y dos rivales avanzan hacia tu aro.", options: [
      { id: "cut-pass", title: "Cerrar línea de pase", detail: "Obligar a que el atacante termine solo", chance: .64, visual: "steal" },
      { id: "protect-rim", title: "Retroceder al aro", detail: "Evitar una bandeja sencilla", chance: .72, visual: "block" },
      { id: "take-charge", title: "Buscar falta ofensiva", detail: "Plantarte y arriesgar el contacto", chance: .53, visual: "foul" },
    ] },
    { id: "hot-shooter", title: "TIRADOR ENCENDIDO", description: "El escolta rival viene anotando y vuelve a recibir con espacio.", options: [
      { id: "shadow", title: "Marcarlo pegado", detail: "Quitarle espacio para tirar", chance: .72, visual: "block" },
      { id: "double-wing", title: "Doble marca", detail: "Forzá una descarga comprometida", chance: .60, visual: "steal" },
      { id: "force-drive", title: "Obligarlo a penetrar", detail: "Sacarlo de su zona de confort", chance: .67, visual: "screen" },
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
    { id: "tie-game", title: "PARTIDO IGUALADO", description: "Están empatados. Tenés una posesión para marcar la diferencia.", options: [
      { id: "safe-paint", title: "Ir por dos", detail: "Elegí el tiro más cercano", chance: .74, gain: 2, visual: "drive" },
      { id: "tie-three", title: "Buscar el triple", detail: "Arriesgá para abrir diferencia", chance: .53, gain: 3, visual: "shot" },
      { id: "tie-play", title: "Jugada preparada", detail: "Mové la pelota antes de definir", chance: .71, gain: 2, visual: "pass" },
    ] },
    { id: "last-seconds", title: "DOS SEGUNDOS EN EL RELOJ", description: "Sacás desde la mitad de cancha. Apenas queda tiempo para lanzar.", options: [
      { id: "catch-release", title: "Recibir y lanzar", detail: "Tiro en un solo movimiento", chance: .56, gain: 2, visual: "shot" },
      { id: "corner-buzzer", title: "Triple de esquina", detail: "Buscá la heroicidad desde afuera", chance: .42, gain: 3, visual: "shot" },
      { id: "alley-oop", title: "Pase bombeado al aro", detail: "Intentá una definición aérea", chance: .59, gain: 2, visual: "pass" },
    ] },
    { id: "star-fouls", title: "TU FIGURA CON CUATRO FALTAS", description: "Tu mejor jugador está al límite de faltas y el partido se define.", options: [
      { id: "star-isolation", title: "Confiar en la figura", detail: "Dejale resolver el ataque", chance: .73, gain: 2, visual: "drive" },
      { id: "bench-unit", title: "Buscar al sexto hombre", detail: "Un tiro más seguro con menos protagonismo", chance: .69, gain: 2, visual: "pass" },
      { id: "star-corner", title: "Liberar a tu tirador", detail: "Creá un triple desde el costado", chance: .54, gain: 3, visual: "screen" },
    ] },
    { id: "fatigue", title: "ÚLTIMO ESFUERZO", description: "Tus jugadores están cansados. Necesitás elegir una definición.", options: [
      { id: "patient-paint", title: "Ataque al poste", detail: "Movimiento corto y tiro cercano", chance: .75, gain: 2, visual: "drive" },
      { id: "fresh-legs", title: "Buscar al suplente", detail: "Un tiro de media distancia con piernas frescas", chance: .68, gain: 2, visual: "shot" },
      { id: "deep-arc", title: "Triple largo", detail: "Apostar todo a un lanzamiento", chance: .42, gain: 3, visual: "shot" },
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

// Dificultad creciente; el rival tiene más opciones de anotar y el usuario ya
// no dispone de dos ataques "gratis" sin una respuesta ofensiva adversaria.
export const ROUND_DIFFICULTY = [
  { startingMin: -3, startingMax: 2, shotPenalty: 0, rivalCounter: .24, counterThree: .18, defenseBonus: 0 },
  { startingMin: -3, startingMax: 1, shotPenalty: .03, rivalCounter: .29, counterThree: .20, defenseBonus: .025 },
  { startingMin: -3, startingMax: 1, shotPenalty: .06, rivalCounter: .35, counterThree: .23, defenseBonus: .040 },
  { startingMin: -3, startingMax: 1, shotPenalty: .09, rivalCounter: .38, counterThree: .26, defenseBonus: .055 },
];

export function createMatch(round, teamId, opponentId, random = Math.random) {
  const difficulty = ROUND_DIFFICULTY[round] || ROUND_DIFFICULTY[ROUND_DIFFICULTY.length - 1];
  const homeScore = 73 + Math.floor(random() * 12);
  const lead = difficulty.startingMin + Math.floor(random() * (difficulty.startingMax - difficulty.startingMin + 1));
  const scenarioIds = SCENARIOS.map(group => Math.min(group.length - 1, Math.floor(random() * group.length)));
  return {
    round, teamId, opponentId, score: homeScore,
    opponentScore: homeScore - lead, moment: 0, clock: 58,
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
  const difficulty = ROUND_DIFFICULTY[match.round] || ROUND_DIFFICULTY[ROUND_DIFFICULTY.length - 1];
  const beforeScore = match.score, beforeOpponent = match.opponentScore;
  const success = random() < Math.max(.29, action.chance - difficulty.shotPenalty);
  const result = { ...match, log: [...match.log] };
  let message;
  if (match.moment === 1) {
    if (success) {
      message = action.visual === "steal"
        ? "¡Robo de pelota! Frenaste el ataque rival."
        : "¡Gran defensa! El rival no consigue convertir.";
    } else {
      const points = random() < (.23 + difficulty.defenseBonus) ? 3 : 2;
      result.opponentScore += points;
      message = "El rival rompe la defensa y suma " + points + " puntos.";
    }
  } else if (success) {
    result.score += action.gain;
    message = "¡Canasta! Sumaste " + action.gain + " puntos con " + action.title.toLowerCase() + ".";
  } else {
    message = action.gain === 3 ? "El lanzamiento de tres no entra." : "El intento no termina en canasta.";
  }
  // La respuesta rival después del primer ataque evita que el marcador
  // favorezca sistemáticamente dos posesiones propias contra solo una rival.
  if (match.moment === 0 && random() < difficulty.rivalCounter) {
    const counterPoints = random() < difficulty.counterThree ? 3 : 2;
    result.opponentScore += counterPoints;
    message += " El rival responde rápido con " + counterPoints + " puntos.";
  }
  if (match.moment === SCENARIOS.length - 1) {
    if (result.score === result.opponentScore) {
      const overtimeWin = random() < Math.max(.38, .55 - difficulty.shotPenalty);
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
