const headers = {
  "x-fsign": "SW9D1eZo",
  Referer: "https://www.flashscore.com.ar/",
  Origin: "https://www.flashscore.com.ar/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language":
    "es-AR,es;q=0.9,en;q=0.8",
};

const url =
  "https://www.flashscore.com.ar/basquetbol/argentina/lnb/archive/";

async function main() {
  console.log("========================================");
  console.log("DESCUBRIENDO LNB EN FLASHSCORE");
  console.log("========================================");
  console.log("");

  const response = await fetch(url, {
    headers,
  });

  console.log(
    `HTTP: ${response.status}`
  );

  const html =
    await response.text();

  console.log(
    `HTML recibido: ${html.length} caracteres`
  );

  console.log("");

  /*
   * Buscamos posibles IDs de torneo y temporada
   * dentro del HTML/configuración de Flashscore.
   */

  const patterns = [
    /tournament_id["':\s]+["']([^"']+)/gi,
    /season_id["':\s]+["']([^"']+)/gi,
    /tournamentId["':\s]+["']([^"']+)/gi,
    /seasonId["':\s]+["']([^"']+)/gi,
  ];

  const found = [];

  for (const pattern of patterns) {
    let match;

    while (
      (match = pattern.exec(html)) !== null
    ) {
      if (!found.includes(match[1])) {
        found.push(match[1]);
      }
    }
  }

  console.log(
    "IDs encontrados:"
  );

  if (found.length === 0) {
    console.log(
      "No se encontraron IDs con los patrones iniciales."
    );
  } else {
    found.forEach((id) => {
      console.log(`- ${id}`);
    });
  }

  console.log("");

  /*
   * También buscamos directamente fragmentos
   * relacionados con tournament / season.
   */

  const interesting =
    html.match(
      /.{0,100}(tournament_id|season_id|tournamentId|seasonId).{0,150}/gi
    );

  if (interesting) {
    console.log(
      "Fragmentos encontrados:"
    );

    interesting
      .slice(0, 20)
      .forEach((fragment) => {
        console.log("");
        console.log(fragment);
      });
  }

  console.log("");
  console.log("========================================");
  console.log("FIN");
  console.log("========================================");
}

main().catch((error) => {
  console.error("");
  console.error("ERROR:");
  console.error(error.message);
});