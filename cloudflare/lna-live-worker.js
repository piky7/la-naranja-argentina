var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var HEADERS = {
  "x-fsign": "SW9D1eZo",
  Referer: "https://www.flashscore.com.ar/",
  Origin: "https://www.flashscore.com.ar/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154.0.0.0 Safari/537.36",
  Accept: "*/*",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8"
};
var CLOCK_WRITE_INTERVAL_MS = 2 * 60 * 1e3;
var PUBLISHED_MATCHES_URL = "https://lanaranjaargentina.lnab.workers.dev/published-matches.json";
async function getPublishedMatches(env) {
  try {
    const response = await env.LNA_WEB.fetch(
      new Request(PUBLISHED_MATCHES_URL, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      })
    );
    if (!response.ok) {
      console.log(
        "Error publicaci\xF3n:",
        response.status,
        "URL:",
        response.url,
        "Content-Type:",
        response.headers.get("content-type"),
        "Body:",
        (await response.text()).slice(0, 300)
      );
      return null;
    }
    const data = await response.json();
    if (!data || typeof data.matches !== "object") {
      return null;
    }
    return data.matches;
  } catch (error) {
    console.log(
      "Error consultando partidos publicados:",
      error.message
    );
    return null;
  }
}
__name(getPublishedMatches, "getPublishedMatches");
function isMatchPublished(match, publishedMatches) {
  if (!publishedMatches || !match || match.status !== "finished") {
    return false;
  }
  const timestamp = Number(match.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return false;
  }
  const date = getArgentinaDate(timestamp);
  const key = `${date}-${match.homeTeam}-${match.awayTeam}`;
  const published = publishedMatches[key];
  return published?.status === "published" && published.hasStats === true && published.homeTeam === match.homeTeam && published.awayTeam === match.awayTeam && Number(published.homeScore) === Number(match.homeScore) && Number(published.awayScore) === Number(match.awayScore) && match.homeScore != null && match.awayScore != null;
}
__name(isMatchPublished, "isMatchPublished");
function getArgentinaDate(timestamp) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(timestamp * 1e3));
}
__name(getArgentinaDate, "getArgentinaDate");
function getTodayArgentina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(/* @__PURE__ */ new Date());
}
__name(getTodayArgentina, "getTodayArgentina");
function parseFeedFields(text) {
  const fields = {};
  const parts = text.split("\xAC");
  for (const part of parts) {
    const separator = part.indexOf("\xF7");
    if (separator === -1) continue;
    const key = part.slice(0, separator).replace(/^~/, "");
    const value = part.slice(separator + 1);
    if (!key) continue;
    if (!fields[key]) {
      fields[key] = [];
    }
    fields[key].push(value);
  }
  return fields;
}
__name(parseFeedFields, "parseFeedFields");
function parseLiveGameInfo(text) {
  const fields = parseFeedFields(text);
  const homeValues = fields.DE || [];
  const awayValues = fields.DF || [];
  const homeScore = homeValues.length ? Number(homeValues[homeValues.length - 1]) : null;
  const awayScore = awayValues.length ? Number(awayValues[awayValues.length - 1]) : null;
  const period = fields.QT?.[fields.QT.length - 1] || fields.PS?.[fields.PS.length - 1] || fields.PE?.[fields.PE.length - 1] || null;
  const clock = fields.TM?.[fields.TM.length - 1] || fields.TS?.[fields.TS.length - 1] || fields.CL?.[fields.CL.length - 1] || null;
  let quarter = null;
  if (period) {
    const numericPeriod = Number(period);
    if (Number.isFinite(numericPeriod) && numericPeriod >= 1 && numericPeriod <= 4) {
      quarter = numericPeriod;
    }
  }
  const isHalftime = quarter === 2 && !clock;
  let minutesRemaining = null;
  if (clock) {
    const clockMatch = String(clock).match(
      /^(\d{1,2})(?::\d{2})?/
    );
    if (clockMatch) {
      minutesRemaining = Number(clockMatch[1]);
    }
  }
  return {
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    quarter,
    minutesRemaining,
    isHalftime
  };
}
__name(parseLiveGameInfo, "parseLiveGameInfo");

async function getQuarterInfo(eventId) {
  try {
    const text = await getFeed(
      `https://global.flashscore.ninja/204/x/feed/df_su_1_${eventId}`
    );

    const fields = parseFeedFields(text);

    const periods = [
      ["BA", "BB"],
      ["BC", "BD"],
      ["BE", "BF"],
      ["BG", "BH"]
    ];

    let lastPeriodWithScore = null;

    for (let index = 0; index < periods.length; index++) {
      const [homeKey, awayKey] = periods[index];

      if (
        fields[homeKey]?.length &&
        fields[awayKey]?.length
      ) {
        lastPeriodWithScore = index + 1;
      }
    }

    return lastPeriodWithScore;
  } catch (error) {
    console.log(
      `Error consultando parciales ${eventId}:`,
      error.message
    );

    return null;
  }
}

function detectStatus(text, timestamp) {
  const now = Math.floor(Date.now() / 1e3);
  if (timestamp && now < timestamp) {
    return "scheduled";
  }
  const fields = parseFeedFields(text);
  const statusValues = fields.DI || [];
  const statusCode = statusValues.length ? statusValues[statusValues.length - 1] : null;
  if (statusCode === "-1") {
    return "finished";
  }
  const homeValues = fields.DE || [];
  const awayValues = fields.DF || [];
  const homeScore = homeValues.length ? Number(homeValues[homeValues.length - 1]) : null;
  const awayScore = awayValues.length ? Number(awayValues[awayValues.length - 1]) : null;
  const hasHomeScore = Number.isFinite(homeScore);
  const hasAwayScore = Number.isFinite(awayScore);
  if (hasHomeScore && hasAwayScore) {
    return "live";
  }
  return "unknown";
}
__name(detectStatus, "detectStatus");
async function getFeed(url) {
  const response = await fetch(url, {
    headers: HEADERS
  });
  if (!response.ok) {
    throw new Error(
      `Flashscore respondi\xF3 con ${response.status}`
    );
  }
  return await response.text();
}
__name(getFeed, "getFeed");
async function getLiveMatches(previousLiveMatches = [], env) {
  const eventsUrl = "https://raw.githubusercontent.com/piky7/la-naranja-argentina/main/lnb-events.json";
  const response = await fetch(eventsUrl, {
    headers: {
      "User-Agent": "LNA-Live-Worker",
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`Error cargando eventos: ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data.matches)) {
    throw new Error("Formato inv\xE1lido de lnb-events.json");
  }
  const today = getTodayArgentina();
  const now = Math.floor(Date.now() / 1e3);
  const publishedMatches = await getPublishedMatches(env);
  const results = [];
  const processedEventIds = /* @__PURE__ */ new Set();
  const candidates = /* @__PURE__ */ new Map();
  for (const match of data.matches) {
    const timestamp = Number(match.timestamp);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      continue;
    }
    if (getArgentinaDate(timestamp) === today && (timestamp - now) / 60 <= 10 && (now - timestamp) / 60 <= 240) {
      candidates.set(String(match.eventId), match);
    }
  }
  for (const previous of previousLiveMatches) {
    const id = String(previous.eventId);
    if (!candidates.has(id)) {
      candidates.set(id, previous);
    }
  }
  for (const match of candidates.values()) {
    const eventId = String(match.eventId);
    if (processedEventIds.has(eventId)) {
      continue;
    }
    processedEventIds.add(eventId);
    const previous = previousLiveMatches.find(
      (item) => String(item.eventId) === eventId
    );
    try {
      const feed = await getFeed(
        `https://global.flashscore.ninja/204/x/feed/dc_1_${eventId}`
      );
   if (
  eventId === "8pJNcSqJ" ||
  eventId === "zXKFalF6"
) {
  const endpoints = [
    `df_su_1_${eventId}`,
    `df_st_1_${eventId}`,
    `dc_1_${eventId}`
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(
        `https://global.flashscore.ninja/204/x/feed/${endpoint}`,
        { headers: HEADERS }
      );

      const body = await response.text();

      console.log(
        "PRUEBA FEED:",
        JSON.stringify({
          endpoint,
          status: response.status,
          length: body.length,
          body: body.slice(0, 1200)
        })
      );
    } catch (error) {
      console.log("ERROR FEED:", endpoint, error.message);
    }
  }
}

if (eventId === "zXKFalF6") {
  console.log(
    "ESTADO RACING:",
    JSON.stringify({
      statusDetectado: detectStatus(feed, Number(match.timestamp)),
      statusAnterior: previous?.status ?? null,
      minutoFeed: parseFeedFields(feed).DI?.at(-1) ?? null,
      marcador: `${parseLiveGameInfo(feed).homeScore}-${parseLiveGameInfo(feed).awayScore}`
    })
  );
}
      const status = detectStatus(
        feed,
        Number(match.timestamp)
      );
      if (status === "scheduled") {
        if (previous) {
          results.push(previous);
        }
        continue;
      }
      if (status === "unknown") {
        if (previous) {
          results.push(previous);
        }
        continue;
      }
    
const liveInfo = parseLiveGameInfo(feed);

const feedFields = parseFeedFields(feed);
const minuteValue = Number(feedFields.DI?.at(-1));

const minutesPlayed =
  Number.isInteger(minuteValue) &&
  minuteValue >= 0 &&
  minuteValue <= 10
    ? minuteValue
    : null;

const detectedQuarter = await getQuarterInfo(eventId);

const isHalftime =
  feedFields.DI?.at(-1) === "-1" &&
  detectedQuarter === 2;

const correctedStatus = isHalftime ? "live" : status;
const isFinished = correctedStatus === "finished";

const homeScore =
  liveInfo.homeScore ?? previous?.homeScore ?? null;

const awayScore =
  liveInfo.awayScore ?? previous?.awayScore ?? null;

if (homeScore === null || awayScore === null) {
  if (previous) {
    results.push(previous);
  }
  continue;
}

const updatedMatch = {
  eventId: match.eventId,
  homeTeam: match.homeTeam,
  awayTeam: match.awayTeam,
  homeName: match.homeName,
  awayName: match.awayName,
  homeScore,
  awayScore,
  quarter:
    isFinished || isHalftime ? null : detectedQuarter,
  minutesRemaining:
    isFinished || isHalftime ? null : minutesPlayed,
  isHalftime,
  timestamp: Number(match.timestamp),
  status: correctedStatus,
  isLive: correctedStatus === "live"
};

if (isMatchPublished(updatedMatch, publishedMatches)) {
  console.log(
    `Partido finalizado y publicado: ${eventId}`
  );
  continue;
}

results.push(updatedMatch);
}catch (error) {
      console.log(
        `Error consultando partido ${eventId}:`,
        error.message
      );
      if (previous) {
        results.push(previous);
      }
    }
  }
  return results;
}
__name(getLiveMatches, "getLiveMatches");
function liveMatchStatesAreEqual(first, second) {
  if (!Array.isArray(first)) {
    return false;
  }
  if (!Array.isArray(second)) {
    return false;
  }
  if (first.length !== second.length) {
    return false;
  }
  const normalize = /* @__PURE__ */ __name((matches) => [...matches].map((match) => ({
    eventId: match.eventId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeName: match.homeName,
    awayName: match.awayName,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    quarter: match.quarter,
    isHalftime: match.isHalftime || false,
    timestamp: match.timestamp,
    status: match.status,
    isLive: match.isLive
  })).sort(
    (a, b) => String(a.eventId).localeCompare(
      String(b.eventId)
    )
  ), "normalize");
  return JSON.stringify(normalize(first)) === JSON.stringify(normalize(second));
}
__name(liveMatchStatesAreEqual, "liveMatchStatesAreEqual");
function liveMatchClocksAreDifferent(first, second) {
  if (!Array.isArray(first)) {
    return true;
  }
  if (!Array.isArray(second)) {
    return true;
  }
  if (first.length !== second.length) {
    return true;
  }
  const firstMap = new Map(
    first.map((match) => [
      String(match.eventId),
      match.minutesRemaining
    ])
  );
  for (const match of second) {
    const previousClock = firstMap.get(
      String(match.eventId)
    );
    if (previousClock !== match.minutesRemaining) {
      return true;
    }
  }
  return false;
}
__name(liveMatchClocksAreDifferent, "liveMatchClocksAreDifferent");
async function updateLive(env) {
  const today = getTodayArgentina();
  console.log(
    `Actualizaci\xF3n LIVE: ${today}`
  );
  let previousData = null;
  try {
    const storedData = await env.LNA_LIVE.get(
      "live-matches"
    );
    if (storedData) {
      previousData = JSON.parse(storedData);
    }
  } catch (error) {
    console.log(
      `Error leyendo LIVE anterior: ${error.message}`
    );
  }
  const previousLiveMatches = Array.isArray(previousData?.liveMatches) ? previousData.liveMatches : [];
  let liveMatches;
  try {
    liveMatches = await getLiveMatches(
      previousLiveMatches,
      env
    );
  } catch (error) {
    console.log(
      `Error actualizando LIVE: ${error.message}`
    );
    console.log(
      "Se conserva el LIVE anterior."
    );
    return;
  }
  if (!previousData || previousData.date !== today) {
    const output2 = {
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      date: today,
      liveMatches
    };
    await env.LNA_LIVE.put(
      "live-matches",
      JSON.stringify(output2)
    );
    console.log(
      `Primera actualizaci\xF3n LIVE guardada. Partidos LIVE: ${liveMatches.length}`
    );
    return;
  }
  const importantStateChanged = !liveMatchStatesAreEqual(
    previousLiveMatches,
    liveMatches
  );
  if (importantStateChanged) {
    const output2 = {
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      date: today,
      liveMatches
    };
    await env.LNA_LIVE.put(
      "live-matches",
      JSON.stringify(output2)
    );
    console.log(
      `Cambio importante LIVE. KV actualizado. Partidos LIVE: ${liveMatches.length}`
    );
    return;
  }
  const clockChanged = liveMatchClocksAreDifferent(
    previousLiveMatches,
    liveMatches
  );
  if (!clockChanged) {
    console.log(
      `Sin cambios LIVE. No se escribe en KV. Partidos LIVE: ${liveMatches.length}`
    );
    return;
  }
  const lastWriteTime = previousData.updatedAt ? new Date(
    previousData.updatedAt
  ).getTime() : 0;
  const now = Date.now();
  const timeSinceLastWrite = now - lastWriteTime;
  if (timeSinceLastWrite < CLOCK_WRITE_INTERVAL_MS) {
    console.log(
      `Solo cambi\xF3 el reloj. No se escribe todav\xEDa. Pr\xF3xima actualizaci\xF3n de reloj en ${Math.max(
        0,
        Math.ceil(
          (CLOCK_WRITE_INTERVAL_MS - timeSinceLastWrite) / 1e3
        )
      )} segundos.`
    );
    return;
  }
  const output = {
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    date: today,
    liveMatches
  };
  await env.LNA_LIVE.put(
    "live-matches",
    JSON.stringify(output)
  );
  console.log(
    `Actualizaci\xF3n peri\xF3dica del reloj. KV actualizado. Partidos LIVE: ${liveMatches.length}`
  );
}
__name(updateLive, "updateLive");
var worker_default = {
  async scheduled(event, env) {
    await updateLive(env);
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/live") {
      const data = await env.LNA_LIVE.get(
        "live-matches"
      );
      return new Response(
        data || JSON.stringify({
          updatedAt: null,
          date: getTodayArgentina(),
          liveMatches: []
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store"
          }
        }
      );
    }
    return new Response(
      "LNA Live Worker funcionando",
      {
        status: 200
      }
    );
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
