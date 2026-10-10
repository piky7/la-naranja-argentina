
 // La Naranja Argentina — LIVE Worker
 // Cloudflare Cron consulta Flashscore.
 // GET /api/live entrega los datos guardados en KV.

const HEADERS = {
  "x-fsign": "SW9D1eZo",
  Referer: "https://www.flashscore.com.ar/",
  Origin: "https://www.flashscore.com.ar/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
};

const EVENTS_URL =
  "https://raw.githubusercontent.com/piky7/la-naranja-argentina/main/lnb-events.json";

const PUBLISHED_MATCHES_URL =
  "https://lanaranjaargentina.lnab.workers.dev/published-matches.json";

const CLOCK_WRITE_INTERVAL_MS = 2 * 60 * 1000;
const MATCH_WINDOW_BEFORE_MINUTES = 10;
const MATCH_WINDOW_AFTER_MINUTES = 240;

function argentinaDate(timestampMs = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(timestampMs));
}

function parseFields(text) {
  const fields = {};

  for (const part of text.split("\xAC")) {
    const pos = part.indexOf("\xF7");
    if (pos === -1) continue;

    const key = part.slice(0, pos).replace(/^~/, "");
    if (!key) continue;

    (fields[key] ||= []).push(part.slice(pos + 1));
  }

  return fields;
}

function last(fields, key) {
  return fields[key]?.at(-1) ?? null;
}

function scoreValue(value) {
  if (value == null || value === "") return null;

  const number = Number(value);

  return Number.isFinite(number) && number >= 0
    ? number
    : null;
}

function detectStatus(fields, timestamp, nowSeconds) {
  if (timestamp && nowSeconds < timestamp) {
    return "scheduled";
  }

  if (last(fields, "DI") === "-1") {
    return "finished";
  }

  return scoreValue(last(fields, "DE")) != null &&
    scoreValue(last(fields, "DF")) != null
    ? "live"
    : "unknown";
}

async function feed(endpoint) {
  const response = await fetch(
    `https://global.flashscore.ninja/204/x/feed/${endpoint}`,
    { headers: HEADERS }
  );

  if (!response.ok) {
    throw new Error(`Flashscore HTTP ${response.status}`);
  }

  return response.text();
}

async function quarterFromFeed(eventId) {
  try {
    const fields = parseFields(
      await feed(`df_su_1_${eventId}`)
    );

    const pairs = [
      ["BA", "BB"],
      ["BC", "BD"],
      ["BE", "BF"],
      ["BG", "BH"],
    ];

    let quarter = null;

    pairs.forEach(([home, away], index) => {
      if (
        scoreValue(last(fields, home)) != null &&
        scoreValue(last(fields, away)) != null
      ) {
        quarter = index + 1;
      }
    });

    return quarter;
  } catch (error) {
    console.log(
      `Parciales ${eventId}: ${error.message}`
    );

    return null;
  }
}

async function publishedMatches(env) {
  try {
    const response = await env.LNA_WEB.fetch(
      new Request(PUBLISHED_MATCHES_URL, {
        headers: { Accept: "application/json" },
      })
    );

    if (!response.ok) {
      console.log(
        `published-matches HTTP ${response.status}`
      );

      return null;
    }

    const json = await response.json();

    return json &&
      json.matches &&
      typeof json.matches === "object"
      ? json.matches
      : null;
  } catch (error) {
    console.log(
      `published-matches: ${error.message}`
    );

    return null;
  }
}

function isPublished(match, published) {
  if (!published || match.status !== "finished") {
    return false;
  }

  const key =
    `${argentinaDate(match.timestamp * 1000)}` +
    `-${match.homeTeam}-${match.awayTeam}`;

  const item = published[key];

  return item?.status === "published" &&
    item.hasStats === true &&
    item.homeTeam === match.homeTeam &&
    item.awayTeam === match.awayTeam &&
    Number(item.homeScore) === match.homeScore &&
    Number(item.awayScore) === match.awayScore;
}

function significantState(matches) {
  return JSON.stringify(
    [...matches]
      .map((match) => ({
        eventId: String(match.eventId),
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeName: match.homeName,
        awayName: match.awayName,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        quarter: match.quarter,
        isHalftime: Boolean(match.isHalftime),
        timestamp: match.timestamp,
        status: match.status,
        isLive: match.isLive,
      }))
      .sort((a, b) =>
        a.eventId.localeCompare(b.eventId)
      )
  );
}

function clockState(matches) {
  return JSON.stringify(
    [...matches]
      .map((match) => ({
        eventId: String(match.eventId),
        minutesRemaining:
          match.minutesRemaining ?? null,
      }))
      .sort((a, b) =>
        a.eventId.localeCompare(b.eventId)
      )
  );
}

async function collectMatches(previous, env) {
  const response = await fetch(EVENTS_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "LNA-Live-Worker",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Eventos HTTP ${response.status}`
    );
  }

  const events = await response.json();

  if (!Array.isArray(events.matches)) {
    throw new Error(
      "lnb-events.json: matches inválido"
    );
  }

  const today = argentinaDate();
  const now = Math.floor(Date.now() / 1000);

  const published = await publishedMatches(env);
  const candidates = new Map();

  for (const match of events.matches) {
    const timestamp = Number(match.timestamp);

    if (
      !match.eventId ||
      !Number.isFinite(timestamp) ||
      timestamp <= 0
    ) {
      continue;
    }

    if (argentinaDate(timestamp * 1000) !== today) {
      continue;
    }

    const minutesUntilStart =
      (timestamp - now) / 60;

    if (
      minutesUntilStart <= MATCH_WINDOW_BEFORE_MINUTES &&
      minutesUntilStart >= -MATCH_WINDOW_AFTER_MINUTES
    ) {
      candidates.set(
        String(match.eventId),
        match
      );
    }
  }

  for (const match of previous) {
    if (
      match.eventId &&
      !candidates.has(String(match.eventId))
    ) {
      candidates.set(
        String(match.eventId),
        match
      );
    }
  }

  const results = [];

  for (const match of candidates.values()) {
    const id = String(match.eventId);

    const old = previous.find(
      (entry) =>
        String(entry.eventId) === id
    );

    try {
      const fields = parseFields(
        await feed(`dc_1_${id}`)
      );

      const timestamp =
        Number(match.timestamp);

      const status = detectStatus(
        fields,
        timestamp,
        now
      );

      if (
        status === "scheduled" ||
        status === "unknown"
      ) {
        if (old) results.push(old);
        continue;
      }

      const homeScore =
        scoreValue(last(fields, "DE")) ??
        old?.homeScore ??
        null;

      const awayScore =
        scoreValue(last(fields, "DF")) ??
        old?.awayScore ??
        null;

      if (
        homeScore == null ||
        awayScore == null
      ) {
        if (old) results.push(old);
        continue;
      }

      const finished =
        status === "finished";

      const quarter = finished
        ? null
        : await quarterFromFeed(id);

      const rawMinute =
        Number(last(fields, "DI"));

      const minutesRemaining =
        !finished &&
        Number.isInteger(rawMinute) &&
        rawMinute >= 0 &&
        rawMinute <= 10
          ? rawMinute
          : null;

      // DI=-1 se considera finalizado.
      // No se infiere entretiempo por dos parciales.

      const updated = {
        eventId: id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeName: match.homeName,
        awayName: match.awayName,
        homeScore,
        awayScore,
        quarter,
        minutesRemaining,
        isHalftime: false,
        timestamp,
        status,
        isLive: status === "live",
      };

      if (!isPublished(updated, published)) {
        results.push(updated);
      }
    } catch (error) {
      console.log(
        `Partido ${id}: ${error.message}`
      );

      if (old) results.push(old);
    }
  }

  return results;
}

async function updateLive(env) {
  if (!env.LNA_LIVE) {
    throw new Error(
      "Falta binding KV LNA_LIVE"
    );
  }

  const today = argentinaDate();

  const stored = await env.LNA_LIVE.get(
    "live-matches"
  );

  let previousData = null;

  if (stored) {
    try {
      previousData = JSON.parse(stored);
    } catch (error) {
      console.log(
        `KV JSON anterior inválido: ${error.message}`
      );
    }
  }

  const previous =
    Array.isArray(previousData?.liveMatches)
      ? previousData.liveMatches
      : [];

  let matches;

  try {
    matches = await collectMatches(
      previous,
      env
    );
  } catch (error) {
    console.error(
      `Error actualizando LIVE: ${error.message}`
    );

    // No sobrescribir los datos anteriores.
    return;
  }

  const dateChanged =
    previousData?.date !== today;

  const importantChanged =
    significantState(previous) !==
    significantState(matches);

  const clockChanged =
    clockState(previous) !==
    clockState(matches);

  const lastWrite =
    Date.parse(previousData?.updatedAt || "") || 0;

  const clockDue =
    Date.now() - lastWrite >=
    CLOCK_WRITE_INTERVAL_MS;

  if (
    !dateChanged &&
    !importantChanged &&
    !(clockChanged && clockDue)
  ) {
    console.log(
      `Sin cambios LIVE. Partidos: ${matches.length}`
    );

    return;
  }

  await env.LNA_LIVE.put(
    "live-matches",
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      date: today,
      liveMatches: matches,
    })
  );

  console.log(
    `KV actualizado. Partidos: ${matches.length}`
  );
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(updateLive(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/live") {
      return new Response(
        "LNA Live Worker funcionando",
        { status: 200 }
      );
    }

    try {
      if (!env.LNA_LIVE) {
        throw new Error(
          "Falta binding KV LNA_LIVE"
        );
      }

      const data = await env.LNA_LIVE.get(
        "live-matches"
      );

      return new Response(
        data ||
          JSON.stringify({
            updatedAt: null,
            date: argentinaDate(),
            liveMatches: [],
          }),
        {
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        }
      );
    } catch (error) {
      console.error(
        `GET /api/live: ${error.message}`
      );

      return new Response(
        JSON.stringify({
          error: "LIVE no disponible",
          liveMatches: [],
        }),
        {
          status: 503,
          headers: {
            "Content-Type":
              "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        }
      );
    }
  },
};

