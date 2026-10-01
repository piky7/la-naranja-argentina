const eventId = "xQfNLYW1";

const url =
  `https://global.flashscore.ninja/204/x/feed/general/?mid=${eventId}`;

async function main() {
  try {
    console.log("Consultando general de Flashscore...");
    console.log("");

    const response = await fetch(url, {
      headers: {
        "x-fsign": "SW9D1eZo",
        "Referer": "https://www.flashscore.com.ar/",
        "Origin": "https://www.flashscore.com.ar/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language":
          "es-AR,es;q=0.9,en;q=0.8",
      },
    });

    console.log("Status:", response.status);
    console.log("OK:", response.ok);
    console.log("");

    const text = await response.text();

    console.log(
      "Caracteres recibidos:",
      text.length
    );

    console.log("");
    console.log(
      "Primeros 5000 caracteres:"
    );
    console.log("--------------------------------");

    console.log(
      text.slice(0, 5000)
    );

    console.log("--------------------------------");
  } catch (error) {
    console.error("");
    console.error("ERROR:");
    console.error(error.message);
  }
}

main();