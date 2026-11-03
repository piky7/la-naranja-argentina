import { players } from "../src/data/players.js";

function fail(message) {
  console.error("Error en el plantel LNA: " + message);
  process.exitCode = 1;
}

if (!Array.isArray(players)) {
  fail("players no es un array");
} else {
  const ids = new Set();
  const officialIds = new Set();
  for (let i = 0; i < players.length; i++) {
    if (!(i in players) || !players[i]) {
      fail("posición vacía en players[" + i + "]");
      continue;
    }
    const player = players[i];
    if (!player.id || !player.name || !player.teamId) fail("jugador incompleto en índice " + i);
    if (ids.has(player.id)) fail("id interno repetido: " + player.id);
    ids.add(player.id);
    if (player.officialPlayerId != null) {
      if (officialIds.has(String(player.officialPlayerId))) fail("id oficial repetido: " + player.officialPlayerId);
      officialIds.add(String(player.officialPlayerId));
    }
  }
  if (!process.exitCode) console.log("Plantel verificado: " + players.length + " jugadores, sin huecos ni IDs duplicados.");
}
