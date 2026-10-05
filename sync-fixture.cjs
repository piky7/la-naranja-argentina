const fs = require("fs");

const inputFile = "lnb-events.json";
const outputFile =
  "src/data/flashscoreSchedule.js";

const TIME_ZONE =
  "America/Argentina/Buenos_Aires";

/*
========================================
CONFIGURACIÓN
========================================
*/

// Si un partido existente desaparece de Flashscore
// y su fecha está dentro de este rango,
// lo consideramos aplazado.
const POSTPONED_LOOKAHEAD_DAYS = 14;

/*
========================================
FECHA ARGENTINA
========================================
*/

function getArgentinaDate() {
  const now = new Date();

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(now);

  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return `${values.year}-${values.month}-${values.day}`;
}

/*
========================================
CONVERTIR TIMESTAMP
========================================
*/

function getArgentinaDateTime(timestamp) {
  if (
    !timestamp ||
    !Number.isFinite(timestamp)
  ) {
    return {
      date: null,
      time: null,
    };
  }

  const date =
    new Date(timestamp * 1000);

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }
    ).formatToParts(date);

  const values = {};

  parts.forEach((part) => {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  });

  return {
    date:
      `${values.year}-${values.month}-${values.day}`,

    time:
      `${values.hour}:${values.minute}`,
  };
}

/*
========================================
COMPARAR FECHAS
========================================
*/

function isDateWithinPostponedWindow(dateString) {
  if (!dateString) {
    return false;
  }

  const today =
    new Date(
      `${getArgentinaDate()}T00:00:00`
    );

  const matchDate =
    new Date(
      `${dateString}T00:00:00`
    );

  if (
    Number.isNaN(
      matchDate.getTime()
    )
  ) {
    return false;
  }

  const difference =
    matchDate.getTime() -
    today.getTime();

  const days =
    difference /
    (1000 * 60 * 60 * 24);

  return (
    days >= -1 &&
    days <=
      POSTPONED_LOOKAHEAD_DAYS
  );
}

/*
========================================
CARGAR SCHEDULE EXISTENTE
========================================
*/

function loadExistingSchedule() {
  if (!fs.existsSync(outputFile)) {
    return {};
  }

  const source =
    fs.readFileSync(
      outputFile,
      "utf8"
    );

  const match =
    source.match(
      /export const flashscoreSchedule\s*=\s*([\s\S]*);/
    );

  if (!match) {
    console.log(
      "No se pudo leer el schedule existente. Se creará uno nuevo."
    );

    return {};
  }

  try {
    return JSON.parse(match[1]);
  } catch (error) {
    console.log(
      "El schedule existente no pudo interpretarse. Se creará uno nuevo."
    );

    return {};
  }
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
    "SINCRONIZADOR DE HORARIOS LNB"
  );

  console.log(
    "========================================"
  );

  console.log("");

  if (!fs.existsSync(inputFile)) {
    throw new Error(
      `No existe ${inputFile}. Ejecutá primero discover-mids.cjs.`
    );
  }

  const data =
    JSON.parse(
      fs.readFileSync(
        inputFile,
        "utf8"
      )
    );

  if (!Array.isArray(data.matches)) {
    throw new Error(
      "lnb-events.json no contiene la lista de partidos."
    );
  }

  const schedule =
    loadExistingSchedule();

  const previousCount =
    Object.keys(schedule).length;

  console.log(
    `Partidos guardados anteriormente: ${previousCount}`
  );

  console.log("");

  let synchronized = 0;
  let added = 0;
  let updated = 0;
  let postponed = 0;

  /*
  ========================================
  PARTIDOS ACTUALES DE FLASHSCORE
  ========================================
  */

  const flashscoreKeys =
    new Set();

  data.matches.forEach(
    (match) => {
      if (
        !match.homeTeam ||
        !match.awayTeam
      ) {
        return;
      }

      const key =
        `${match.homeTeam}-${match.awayTeam}`;

      flashscoreKeys.add(key);
    }
  );

  /*
  ========================================
  SINCRONIZAR FLASHSCORE
  ========================================
  */

  data.matches.forEach(
    (match) => {
      if (
        !match.homeTeam ||
        !match.awayTeam
      ) {
        return;
      }

      const key =
        `${match.homeTeam}-${match.awayTeam}`;

      const existing =
        schedule[key];

      const status =
        match.status ||
        "scheduled";

      /*
      ======================================
      PARTIDO APLAZADO INFORMADO POR FLASHSCORE
      ======================================
      */

      if (
        status === "postponed"
      ) {
        const previous =
          existing
            ? JSON.stringify(existing)
            : null;

        const dateTime =
          getArgentinaDateTime(
            match.timestamp
          );

        schedule[key] = {
          date:
            existing?.date ??
            dateTime.date,

          time: null,

          eventId:
            match.eventId ??
            existing?.eventId ??
            null,

          status:
            "postponed",

          statusCode:
            match.statusCode ??
            null,
        };

        postponed++;

        if (
          previous !==
          JSON.stringify(
            schedule[key]
          )
        ) {
          updated++;
        }

        console.log(
          `[APLAZADO] ${match.homeName} vs ${match.awayName}`
        );

        console.log(
          `           MID: ${match.eventId}`
        );

        console.log(
          `           Código: ${
            match.statusCode ??
            "sin código"
          }`
        );

        console.log("");

        return;
      }

      /*
      ======================================
      FECHA / HORA NORMAL
      ======================================
      */

      const dateTime =
        getArgentinaDateTime(
          match.timestamp
        );

      /*
      ======================================
      PARTIDO NUEVO
      ======================================
      */

      if (!existing) {
        schedule[key] = {
          date:
            dateTime.date,

          time:
            dateTime.time,

          eventId:
            match.eventId,

          status,

          statusCode:
            match.statusCode ??
            null,
        };

        added++;

        if (
          dateTime.date &&
          dateTime.time
        ) {
          synchronized++;
        }

        return;
      }

      /*
      ======================================
      PARTIDO EXISTENTE
      ======================================
      */

      let changed = false;

      if (
        dateTime.date &&
        existing.date !==
          dateTime.date
      ) {
        existing.date =
          dateTime.date;

        changed = true;
      }

      if (
        dateTime.time &&
        existing.time !==
          dateTime.time
      ) {
        existing.time =
          dateTime.time;

        changed = true;
      }

      if (
        match.eventId &&
        existing.eventId !==
          match.eventId
      ) {
        existing.eventId =
          match.eventId;

        changed = true;
      }

      if (
        existing.status !==
        status
      ) {
        existing.status =
          status;

        changed = true;
      }

      if (
        existing.statusCode !==
        (match.statusCode ??
          null)
      ) {
        existing.statusCode =
          match.statusCode ??
          null;

        changed = true;
      }

      if (changed) {
        updated++;
      }

      if (
        existing.date &&
        existing.time
      ) {
        synchronized++;
      }
    }
  );

  /*
  ========================================
  DETECTAR PARTIDOS QUE DESAPARECIERON
  ========================================
  */

  Object.entries(schedule).forEach(
    ([key, existing]) => {
      /*
       * Si Flashscore todavía lo tiene,
       * ya fue procesado arriba.
       */

      if (
        flashscoreKeys.has(key)
      ) {
        return;
      }

      /*
       * Si ya estaba marcado como
       * aplazado, no hacemos nada.
       */

      if (
        existing.status ===
        "postponed"
      ) {
        return;
      }

      /*
       * Solo actuamos sobre partidos
       * próximos.
       */

      if (
        !isDateWithinPostponedWindow(
          existing.date
        )
      ) {
        return;
      }

      /*
       * Si no tiene fecha no podemos
       * determinar si corresponde.
       */

      if (!existing.date) {
        return;
      }

      console.log(
        `[APLAZADO DETECTADO] ${key}`
      );

      console.log(
        `                   Fecha anterior: ${existing.date}`
      );

      console.log(
        `                   Hora anterior: ${existing.time ?? "sin hora"}`
      );

      console.log(
        `                   MID anterior: ${existing.eventId ?? "sin MID"}`
      );

      console.log("");

      existing.time = null;

      existing.status =
        "postponed";

      existing.statusCode =
        existing.statusCode ??
        null;

      postponed++;
      updated++;
    }
  );

  /*
  ========================================
  GUARDAR
  ========================================
  */

  const output =
    `export const flashscoreSchedule = ${JSON.stringify(
      schedule,
      null,
      2
    )};\n`;

  fs.writeFileSync(
    outputFile,
    output,
    "utf8"
  );

  const finalCount =
    Object.keys(schedule).length;

  console.log(
    `Partidos encontrados en Flashscore: ${data.matches.length}`
  );

  console.log(
    `Partidos nuevos agregados: ${added}`
  );

  console.log(
    `Partidos existentes actualizados: ${updated}`
  );

  console.log(
    `Partidos aplazados detectados: ${postponed}`
  );

  console.log(
    `Partidos totales guardados: ${finalCount}`
  );

  console.log(
    `Partidos con fecha/hora: ${synchronized}`
  );

  console.log("");

  console.log(
    "========================================"
  );

  console.log(
    "HORARIOS SINCRONIZADOS"
  );

  console.log(
    "========================================"
  );

  console.log("");

  Object.entries(schedule).forEach(
    ([key, match]) => {
      if (
        match.status ===
        "postponed"
      ) {
        console.log(
          `${key} → APLAZADO`
        );

        return;
      }

      console.log(
        `${key} → ${
          match.date ??
          "sin fecha"
        } ${
          match.time ??
          "VS"
        }`
      );
    }
  );

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

  console.error("");

  console.error(
    error.message
  );

  console.error("");

  process.exit(1);
}