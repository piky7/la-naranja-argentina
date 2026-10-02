const fs = require("fs");

const inputFile = "lnb-events.json";
const outputFile =
  "src/data/flashscoreSchedule.js";

const TIME_ZONE =
  "America/Argentina/Buenos_Aires";

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
CARGAR SCHEDULE EXISTENTE
========================================
*/

function loadExistingSchedule() {
  if (
    !fs.existsSync(outputFile)
  ) {
    return {};
  }

  const source =
    fs.readFileSync(
      outputFile,
      "utf8"
    );

  /*
    Busca:

    export const flashscoreSchedule = {...};
  */

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
    return JSON.parse(
      match[1]
    );
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

  /*
  ----------------------------------------
  VALIDAR INPUT
  ----------------------------------------
  */

  if (
    !fs.existsSync(inputFile)
  ) {
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

  if (
    !Array.isArray(
      data.matches
    )
  ) {
    throw new Error(
      "lnb-events.json no contiene la lista de partidos."
    );
  }

  /*
  ----------------------------------------
  CARGAR DATOS ANTERIORES
  ----------------------------------------
  */

  const schedule =
    loadExistingSchedule();

  const previousCount =
    Object.keys(
      schedule
    ).length;

  console.log(
    `Partidos guardados anteriormente: ${previousCount}`
  );

  console.log("");

  /*
  ----------------------------------------
  SINCRONIZAR DATOS NUEVOS
  ----------------------------------------
  */

  let synchronized = 0;
  let added = 0;
  let updated = 0;

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

      const dateTime =
        getArgentinaDateTime(
          match.timestamp
        );

      const existing =
        schedule[key];

      /*
      ------------------------------------
      PARTIDO NUEVO
      ------------------------------------
      */

      if (!existing) {
        schedule[key] = {
          date:
            dateTime.date,

          time:
            dateTime.time,

          eventId:
            match.eventId,
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
      ------------------------------------
      PARTIDO EXISTENTE
      ------------------------------------

      Actualizamos únicamente los datos
      que Flashscore haya proporcionado.

      Si Flashscore deja de mandar fecha,
      hora o MID, conservamos el dato viejo.
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
  ----------------------------------------
  GUARDAR
  ----------------------------------------
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

  /*
  ----------------------------------------
  RESUMEN
  ----------------------------------------
  */

  const finalCount =
    Object.keys(
      schedule
    ).length;

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

  Object.entries(
    schedule
  ).forEach(
    ([key, match]) => {
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