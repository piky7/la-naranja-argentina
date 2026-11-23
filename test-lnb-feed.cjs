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

const tournamentId = "tjTLs3Kk";
const seasonId = "190";

const urls = [
  `https://global.flashscore.ninja/204/x/feed/tr_1_${tournamentId}_${seasonId}`,
  `https://global.flashscore.ninja/204/x/feed/tr_1_${tournamentId}`,
];

async function test(url) {
  console.log("");
  console.log("========================================");
  console.log("PROBANDO");
  console.log(url);
  console.log("========================================");

  try {
    const response = await fetch(url, {
      headers,
    });

    console.log(
      `HTTP: ${response.status}`
    );

    const text =
      await response.text();

    console.log(
      `Caracteres: ${text.length}`
    );

    console.log("");

    console.log(
      text.slice(0, 3000)
    );
  } catch (error) {
    console.error(
      `ERROR: ${error.message}`
    );
  }
}

async function main() {
  console.log("========================================");
  console.log("TEST FEED LNB 2026/27");
  console.log("========================================");

  for (const url of urls) {
    await test(url);
  }

  console.log("");
  console.log("========================================");
  console.log("FIN");
  console.log("========================================");
}

main();