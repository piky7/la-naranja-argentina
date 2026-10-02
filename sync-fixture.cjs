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

function main() {
  console.log("========================================");
  console.log("SINCRONIZADOR DE HORARIOS LNB");
  console.log("========================================");
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

  const schedule = {};

  let synchronized = 0;

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

      schedule[key] = {
        date: dateTime.date,
        time: dateTime.time,
        eventId:
          match.eventId,
      };

      if (
        dateTime.date &&
        dateTime.time
      ) {
        synchronized++;
      }
    }
  );

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

  console.log(
    `Partidos encontrados: ${data.matches.length}`
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

  Object.entries(schedule)
    .forEach(
      ([key, match]) => {
        console.log(
          `${key} → ${match.date ?? "sin fecha"} ${match.time ?? "VS"}`
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
  console.error("ERROR:");
  console.error("");
  console.error(error.message);
  console.error("");

  process.exit(1);
}