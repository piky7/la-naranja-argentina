const fs = require("fs");

const inputFile = "flashscore-raw.json";
const outputFile = "flashscore-normalized.json";
const playersFile = "src/data/players.js";

const teamMap = {
  LAN: "lanus",
  NAS: "gimnasia",
  PEN: "penarol",
  ARG: "argentino",
  ATE: "atenas",
  BOC: "boca",
  FER: "ferro",
  IND: "independiente-oliva",
  INS: "instituto",
  LAU: "la-union",
  OBE: "obera",
  OLI: "olimpico",
  PLA: "platense",
  QUI: "quimsa",
  RAC: "racing-chivilcoy",
  REG: "regatas",
  SLO: "san-lorenzo",
  SMA: "san-martin",
};

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadPlayers() {
  if (!fs.existsSync(playersFile)) {
    throw new Error(
      `No existe ${playersFile}.`
    );
  }

  const source =
    fs.readFileSync(
      playersFile,
      "utf8"
    );

  const players = [];

  /*
    Extraemos automáticamente:

    id
    name
    teamId

    desde players.js.

    No necesitamos importar el archivo
    porque players.js utiliza sintaxis ES Module.
  */

  const playerRegex =
    /\{\s*id:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?teamId:\s*"([^"]+)"/g;

  let match;

  while (
    (match = playerRegex.exec(source)) !== null
  ) {
    players.push({
      id: match[1],
      name: match[2],
      teamId: match[3],
    });
  }

  if (players.length === 0) {
    throw new Error(
      "No se pudieron leer jugadores desde players.js."
    );
  }

  return players;
}

function findPlayerId(
  flashscoreName,
  teamId,
  players
) {
  const normalizedName =
    normalizeText(
      flashscoreName
    );

  const words =
    normalizedName.split(" ");

  if (words.length === 0) {
    return null;
  }

  /*
    Flashscore normalmente muestra:

    "Pérez A."
    "Chacon M."
    "Basualdo I."
    "Thornton A."

    Es decir:

    APELLIDO + INICIAL

    Pero también puede aparecer:

    "Giorgetti Franco ."

    Por eso hacemos varias comprobaciones.
  */

  const firstWord =
    words[0];

  const remainingWords =
    words.slice(1);

  const candidates =
    players.filter(
      (player) =>
        player.teamId === teamId
    );

  /*
    1. Coincidencia directa del nombre completo.
  */

  const exact =
    candidates.find(
      (player) =>
        normalizeText(
          player.name
        ) === normalizedName
    );

  if (exact) {
    return exact.id;
  }

  /*
    2. Buscamos el primer apellido/palabra
       de Flashscore dentro del nombre real.
  */

  const surnameCandidates =
    candidates.filter(
      (player) => {
        const playerWords =
          normalizeText(
            player.name
          ).split(" ");

        return playerWords.includes(
          firstWord
        );
      }
    );

  /*
    3. Si Flashscore tiene una inicial,
       buscamos esa inicial entre las palabras
       del nombre real.
  */

  if (
    surnameCandidates.length === 1
  ) {
    return surnameCandidates[0].id;
  }

  if (
    surnameCandidates.length > 1
  ) {
    for (
      const candidate of surnameCandidates
    ) {
      const candidateWords =
        normalizeText(
          candidate.name
        ).split(" ");

      const initialsMatch =
        remainingWords.some(
          (word) => {
            if (!word) {
              return false;
            }

            return candidateWords.some(
              (candidateWord) =>
                candidateWord.startsWith(
                  word.charAt(0)
                )
            );
          }
        );

      if (initialsMatch) {
        return candidate.id;
      }
    }
  }

  /*
    4. Caso especial como:

       "Giorgetti Franco ."

       El apellido es la primera palabra
       y el nombre aparece después.

       Buscamos una coincidencia de alguna
       palabra adicional.
  */

  for (
    const candidate of candidates
  ) {
    const candidateWords =
      normalizeText(
        candidate.name
      ).split(" ");

    const surnameMatch =
      candidateWords.includes(
        firstWord
      );

    if (!surnameMatch) {
      continue;
    }

    const extraMatch =
      remainingWords.some(
        (word) =>
          word.length > 2 &&
          candidateWords.includes(
            word
          )
      );

    if (extraMatch) {
      return candidate.id;
    }
  }

  return null;
}

function normalizePlayers(
  players,
  lnaPlayers
) {
  const normalized = [];
  const unmapped = [];

  players.forEach(
    (player) => {
      const teamId =
        teamMap[player.teamCode] ||
        null;

      if (!teamId) {
        unmapped.push({
          name: player.name,
          teamCode:
            player.teamCode,
          teamId: null,
        });

        return;
      }

      const playerId =
        findPlayerId(
          player.name,
          teamId,
          lnaPlayers
        );

      if (!playerId) {
        unmapped.push({
          name: player.name,
          teamCode:
            player.teamCode,
          teamId,
        });

        return;
      }

      normalized.push({
        id: playerId,

        name:
          player.name,

        teamId,

        points:
          Number(player.points) || 0,

        rebounds:
          Number(player.rebounds) || 0,

        assists:
          Number(player.assists) || 0,

        minutes:
          player.minutes || null,
      });
    }
  );

  return {
    normalized,
    unmapped,
  };
}

function main() {
  console.log(
    "========================================"
  );

  console.log(
    "NORMALIZADOR FLASHSCORE → LNA"
  );

  console.log(
    "========================================"
  );

  console.log("");

  if (!fs.existsSync(inputFile)) {
    throw new Error(
      `No existe ${inputFile}. Ejecutá primero auto-flashscore.cjs.`
    );
  }

  const raw =
    JSON.parse(
      fs.readFileSync(
        inputFile,
        "utf8"
      )
    );

  const lnaPlayers =
    loadPlayers();

  console.log(
    `Jugadores LNA cargados: ${lnaPlayers.length}`
  );

  console.log("");

  if (!raw.homeTeam) {
    throw new Error(
      "El partido no tiene homeTeam."
    );
  }

  if (!raw.awayTeam) {
    throw new Error(
      "El partido no tiene awayTeam."
    );
  }

  if (!Array.isArray(raw.players)) {
    throw new Error(
      "El partido no tiene jugadores."
    );
  }

  /*
    Convertimos los nombres de Flashscore
    a los IDs de LNA.

    En esta etapa el nombre del equipo
    todavía viene como nombre completo.
  */

  const teamNameMap = {
    "Peñarol": "penarol",
    "Gimnasia": "gimnasia",
    "Lanús": "lanus",
    "Argentino": "argentino",
    "Atenas": "atenas",
    "Boca Juniors": "boca",
    "Ferro": "ferro",
    "Independiente": "independiente-oliva",
    "Instituto": "instituto",
    "La Unión": "la-union",
    "Oberá": "obera",
    "Olímpico": "olimpico",
    "Platense": "platense",
    "Quimsa": "quimsa",
    "Racing": "racing-chivilcoy",
    "Regatas": "regatas",
    "San Lorenzo": "san-lorenzo",
    "San Martín": "san-martin",
  };

  const homeTeam =
    teamNameMap[
      raw.homeTeam
    ] || raw.homeTeam;

  const awayTeam =
    teamNameMap[
      raw.awayTeam
    ] || raw.awayTeam;

  const result =
    normalizePlayers(
      raw.players,
      lnaPlayers
    );

  const normalized = {
    matchId:
      `${homeTeam}-${awayTeam}`,

    eventId:
      raw.eventId || null,

    homeTeam,

    awayTeam,

    homeScore:
      Number(raw.homeScore) || 0,

    awayScore:
      Number(raw.awayScore) || 0,

    status:
      raw.status || "unknown",

    tv:
      Array.isArray(raw.tv)
        ? raw.tv
        : [],

    players:
      result.normalized,

    unmappedPlayers:
      result.unmapped,
  };

  fs.writeFileSync(
    outputFile,
    JSON.stringify(
      normalized,
      null,
      2
    ),
    "utf8"
  );

  console.log("");

  console.log(
    `Partido: ${normalized.homeTeam} - ${normalized.awayTeam}`
  );

  console.log(
    `Resultado: ${normalized.homeScore}-${normalized.awayScore}`
  );

  console.log(
    `Estado: ${normalized.status}`
  );

  console.log(
    `TV: ${normalized.tv.join(", ")}`
  );

  console.log("");

  console.log(
    `Jugadores encontrados: ${normalized.players.length}`
  );

  console.log(
    `Jugadores sin mapear: ${normalized.unmappedPlayers.length}`
  );

  if (
    normalized.unmappedPlayers.length > 0
  ) {
    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "JUGADORES SIN MAPEAR"
    );

    console.log(
      "========================================"
    );

    normalized.unmappedPlayers.forEach(
      (player) => {
        console.log(
          `${player.teamCode} | ${player.name} | ${player.teamId}`
        );
      }
    );
  }

  console.log("");

  console.log(
    `Archivo generado: ${outputFile}`
  );

  console.log("");
}

try {
  main();
} catch (error) {
  console.error("");

  console.error(
    "========================================"
  );

  console.error(
    "ERROR"
  );

  console.error(
    "========================================"
  );

  console.error(
    error.message
  );
}