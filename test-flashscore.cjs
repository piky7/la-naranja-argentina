const url =
  "https://global.flashscore.ninja/204/x/feed/df_psn_1_xQfNLYW1";

async function testFlashscore() {
  try {
    console.log("Consultando Flashscore...");
    console.log("");

    const response = await fetch(url, {
      headers: {
        "x-fsign": "SW9D1eZo",
        "Referer": "https://www.flashscore.com.ar/",
        "Origin": "https://www.flashscore.com.ar/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      },
    });

    console.log("Status:", response.status);
    console.log("OK:", response.ok);
    console.log("");

    const text = await response.text();

    console.log("Cantidad de caracteres:", text.length);
    console.log("");

    console.log("Primeros 3000 caracteres:");
    console.log("----------------------------------------");
    console.log(text.slice(0, 3000));
    console.log("----------------------------------------");
  } catch (error) {
    console.error("ERROR:");
    console.error(error);
  }
}

testFlashscore();