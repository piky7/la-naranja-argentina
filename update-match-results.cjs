const fs = require("fs");

const eventsFile = "lnb-events.json";
const outputFile = "src/data/matchResults.js";

function formatDate(timestamp) {
  if (!timestamp) {
    return null;
  }

  const date = new Date(
    timestamp * 1000
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
}

function main() {
  console.log("");
  console.log("========================================");
  console.log("ACTUALIZADOR AUTOMÁTICO DE RESULTADOS");
  console.log("========================================");
  console.log("");

  if (!fs.existsSync(eventsFile)) {
    throw new Error(
      `No existe ${eventsFile}.`
    );
  }

  const data = JSON.parse(
    fs.readFileSync(
      eventsFile,
      "utf8"
    )
  );

  if (!Array.isArray(data.finished)) {
    throw new Error(
      "lnb-events.json no contiene partidos terminados."
    );
  }

  const results = {};

  data.finished.forEach((match) => {
    const date =
      match.date ||
      formatDate(match.timestamp);

    if (!date) {
      console.log(
        `⚠ No se pudo determinar la fecha de ${match.eventId}`
      );

      return;
    }

    if (
      !match.homeTeam ||
      !match.awayTeam
    ) {
      return;
    }

    const key =
      `${date}-${match.homeTeam}-${match.awayTeam}`;

    results[key] = {
      status: "finished",
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      time: null,
      venue: null,
      tv: [],
    };
  });

  const lines = [
    "export const matchResults = {",
  ];

  Object.entries(results).forEach(
    ([key, result]) => {
      lines.push(
        `  "${key}": {`
      );

      lines.push(
        `    status: "${result.status}",`
      );

      lines.push(
        `    homeScore: ${result.homeScore},`
      );

      lines.push(
        `    awayScore: ${result.awayScore},`
      );

      lines.push(
        `    time: ${result.time === null ? "null" : `"${result.time}"`},`
      );

      lines.push(
        `    venue: ${result.venue === null ? "null" : `"${result.venue}"`},`
      );

      lines.push(
        `    tv: ${JSON.stringify(result.tv)},`
      );

      lines.push(
        "  },"
      );
    }
  );

  lines.push("};");
  lines.push("");

  fs.writeFileSync(
    outputFile,
    lines.join("\n"),
    "utf8"
  );

  console.log(
    `Resultados actualizados: ${Object.keys(results).length}`
  );

  console.log("");

  Object.entries(results).forEach(
    ([key, result]) => {
      console.log(
        `${key} → ${result.homeScore}-${result.awayScore}`
      );
    }
  );

  console.log("");

  console.log(
    `Archivo actualizado: ${outputFile}`
  );

  console.log("");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("========================================");
  console.error("ERROR");
  console.error("========================================");
  console.error("");
  console.error(error.message);
  console.error("");

  process.exit(1);
}