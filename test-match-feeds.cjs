const eventId = "xQfNLYW1";

const feeds = [
  {
    name: "DC",
    url: `https://global.flashscore.ninja/204/x/feed/dc_1_${eventId}`,
  },
  {
    name: "DF_DOS",
    url: `https://global.flashscore.ninja/204/x/feed/df_dos_1_${eventId}_`,
  },
];

async function getFeed(url) {
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

  const text = await response.text();

  return {
    status: response.status,
    ok: response.ok,
    text,
  };
}

async function main() {
  for (const feed of feeds) {
    console.log("");
    console.log("========================================");
    console.log(feed.name);
    console.log("========================================");
    console.log(feed.url);
    console.log("");

    try {
      const result = await getFeed(feed.url);

      console.log("Status:", result.status);
      console.log("OK:", result.ok);
      console.log("Caracteres:", result.text.length);
      console.log("");

      console.log("Primeros 3000 caracteres:");
      console.log("----------------------------------------");
      console.log(result.text.slice(0, 3000));
      console.log("----------------------------------------");
    } catch (error) {
      console.log("ERROR:");
      console.log(error.message);
    }
  }
}

main();