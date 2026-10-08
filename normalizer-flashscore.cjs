const fs = require("fs");

const inputFile = "flashscore-raw.json";
const outputFile = "flashscore-normalized.json";
const playersFile = "src/data/players.js";

/*
========================================
MAPA DE CÓDIGOS FLASHSCORE → LNA
========================================
*/

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
  UNI: "la-union",
  OBE: "obera",
  OLI: "olimpico",
  PLA: "platense",
  QUI: "quimsa",
  RAC: "racing-chivilcoy",
  REG: "regatas",
  SLO: "san-lorenzo",
  SMA: "san-martin",
  SAN: "san-martin",
};

/*
========================================
NORMALIZAR TEXTO
========================================
*/

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function createProvisionalPlayerId(name, teamId) {
  const normalizedName = normalizeText(name);

  if (!normalizedName) {
    return null;
  }

  return `flashscore-${teamId}-${normalizedName.replace(/\s+/g, "-")}`;
}


/*
========================================
CARGAR JUGADORES DE PLAYERS.JS
========================================
*/

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

/*
========================================
LEVENSHTEIN
========================================
*/

function levenshtein(a, b) {
  const matrix =
    Array.from(
      {
        length: a.length + 1,
      },
      () =>
        Array(
          b.length + 1
        ).fill(0)
    );

  for (
    let i = 0;
    i <= a.length;
    i++
  ) {
    matrix[i][0] = i;
  }

  for (
    let j = 0;
    j <= b.length;
    j++
  ) {
    matrix[0][j] = j;
  }

  for (
    let i = 1;
    i <= a.length;
    i++
  ) {
    for (
      let j = 1;
      j <= b.length;
      j++
    ) {
      const cost =
        a[i - 1] === b[j - 1]
          ? 0
          : 1;

      matrix[i][j] =
        Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] +
            cost
        );
    }
  }

  return matrix[a.length][b.length];
}

/*
========================================
BUSCAR JUGADOR
========================================
*/

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
    normalizedName
      .split(" ")
      .filter(Boolean);

  if (words.length === 0) {
    return null;
  }

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
  ----------------------------------------
  1. NOMBRE COMPLETO EXACTO
  ----------------------------------------
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
  ----------------------------------------
  2. APELLIDO EXACTO
  ----------------------------------------
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

  if (
    surnameCandidates.length === 1
  ) {
    return surnameCandidates[0].id;
  }

  /*
  ----------------------------------------
  3. APELLIDO + INICIAL
  ----------------------------------------
  */

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
  ----------------------------------------
  4. APELLIDO CON PEQUEÑA DIFERENCIA
  ----------------------------------------
  */

  const fuzzyCandidates =
    candidates
      .map(
        (candidate) => {
          const candidateWords =
            normalizeText(
              candidate.name
            ).split(" ");

          let bestDistance =
            Infinity;

          for (
            const candidateWord of candidateWords
          ) {
            const distance =
              levenshtein(
                firstWord,
                candidateWord
              );

            if (
              distance <
              bestDistance
            ) {
              bestDistance =
                distance;
            }
          }

          return {
            candidate,
            distance:
              bestDistance,
          };
        }
      )
      .sort(
        (a, b) =>
          a.distance -
          b.distance
      );

  if (
    fuzzyCandidates.length > 0
  ) {
    const best =
      fuzzyCandidates[0];

    if (
      best.distance <= 2
    ) {
      return best.candidate.id;
    }
  }

  /*
  ----------------------------------------
  5. CASOS ESPECIALES
  ----------------------------------------
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

/*
========================================
NORMALIZAR JUGADORES
========================================

IMPORTANTE:

El partido ya nos dice quién es LOCAL
y quién es VISITANTE.

Por eso usamos los equipos del partido
como fuente de verdad.

Esto evita que un código de Flashscore
mal interpretado pueda convertir:

LANÚS → GIMNASIA

o cualquier otro equipo incorrectamente.
*/

function normalizePlayers(
  players,
  lnaPlayers,
  homeTeam,
  awayTeam
) {
  const normalized = [];
  const unmapped = [];

  players.forEach(
    (player) => {
      const mappedTeam =
        teamMap[player.teamCode] ||
        null;

      /*
      ------------------------------------
      EQUIPO DEL JUGADOR
      ------------------------------------

      Si el código corresponde al local
      o visitante, lo aceptamos.

      Si no coincide, intentamos usar
      la posición del jugador en el raw.
      */

      let teamId = null;

      if (
        mappedTeam === homeTeam ||
        mappedTeam === awayTeam
      ) {
        teamId =
          mappedTeam;
      }

      /*
      ------------------------------------
      FALLBACK SEGURO
      ------------------------------------

      Si el código no coincide con ninguno
      de los dos equipos del partido,
      NO inventamos un equipo.

      Lo dejamos sin mapear.
      */

      if (!teamId) {
        unmapped.push({
          name:
            player.name,

          teamCode:
            player.teamCode,

          teamId:
            mappedTeam,
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
  const provisionalId = createProvisionalPlayerId(
    player.name,
    teamId
  );

  if (!provisionalId) {
    unmapped.push({
      name: player.name,
      teamCode: player.teamCode,
      teamId,
    });

    return;
  }

  normalized.push({
    id: provisionalId,
    name: player.name,
    teamId,
    points: Number(player.points) || 0,
    rebounds: Number(player.rebounds) || 0,
    assists: Number(player.assists) || 0,
    minutes: player.minutes || null,
  });

  console.log(
    `Jugador provisional incorporado: ${player.name} (${teamId})`
  );

  return;
}


      normalized.push({
        id:
          playerId,

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

/*
========================================
MAIN
========================================
*/

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
  ========================================
  NOMBRES DE EQUIPOS
  ========================================
  */

  const teamNameMap = {
    "Peñarol":
      "penarol",

    "Gimnasia":
      "gimnasia",

    "Lanús":
      "lanus",

    "Lanus":
      "lanus",

    "Argentino":
      "argentino",

    "Atenas":
      "atenas",

    "Boca Juniors":
      "boca",

    "Boca":
      "boca",

    "Ferro":
      "ferro",

    "Independiente":
      "independiente-oliva",

    "Independiente de Oliva":
      "independiente-oliva",

    "Instituto":
      "instituto",

    "Instituto de Córdoba":
      "instituto",

    "La Unión":
      "la-union",

    "La Union":
      "la-union",

    "Oberá":
      "obera",

    "Obera":
      "obera",


"Oberá TC":
  "obera",

"Obera TC":
  "obera",

    "Olímpico":
      "olimpico",

    "Olimpico":
      "olimpico",

    "Platense":
      "platense",

    "Quimsa":
      "quimsa",

    "Racing":
      "racing-chivilcoy",

    "Racing de Chivilcoy":
      "racing-chivilcoy",

    "Regatas":
      "regatas",

    "San Lorenzo":
      "san-lorenzo",

    "San Martín":
      "san-martin",

    "San Martin":
      "san-martin",
  };

  /*
  ========================================
  EQUIPOS DEL PARTIDO
  ========================================
  */

  const homeTeam =
    teamNameMap[
      raw.homeTeam
    ] ||
    raw.homeTeam;

  const awayTeam =
    teamNameMap[
      raw.awayTeam
    ] ||
    raw.awayTeam;

  console.log(
    `Equipo local LNA: ${homeTeam}`
  );

  console.log(
    `Equipo visitante LNA: ${awayTeam}`
  );

  console.log("");

  /*
  ========================================
  NORMALIZAR JUGADORES
  ========================================
  */

  const result =
    normalizePlayers(
      raw.players,
      lnaPlayers,
      homeTeam,
      awayTeam
    );

  /*
  ========================================
  RESULTADO FINAL
  ========================================
  */

  const normalized = {
    matchId:
      `${homeTeam}-${awayTeam}`,

    eventId:
      raw.eventId ||
      null,

    homeTeam,

    awayTeam,

    homeScore:
      Number(raw.homeScore) ||
      0,

    awayScore:
      Number(raw.awayScore) ||
      0,

    status:
      raw.status ||
      "unknown",

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

  /*
  ========================================
  JUGADORES SIN MAPEAR
  ========================================
  */

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

/*
========================================
EJECUTAR
========================================
*/

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

  console.error("");

  process.exit(1);
}