const { extractTeamStats } = require("./scripts/official-team-stats.cjs");
const { parseOfficialFinal } = require("./scripts/parse-official-final.cjs");
const { extraerParcialesDesdeAcciones } = require("./scripts/extraer-parciales-acciones.cjs");

const fs = require("node:fs");
const cheerio = require("cheerio");

const URL_PARTIDO =
  process.argv[2] ||
  "https://www.laliganacional.com.ar/laliga/partido/v2mutwzkFpVB_zfttBUINRQ0TlDYJTLYTqAu6sF8Pq3SSU5pCs1H6x_g==/platense-vs-obera";

const OUTPUT = process.argv[3] || "liga-normalized.json";

// La planilla oficial puede publicar estos campos con distintos nombres
// dentro del objeto de la ficha. No deducir un cero si no están presentes.
function campoEstadistico(datos, keys, matcher) {
  for (const key of keys) {
    const value = datos[key];
    if (value != null && value !== "" && Number.isFinite(Number(value))) return Number(value);
  }
  const normalize = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/gi,"").toLowerCase();
  for (const [key, value] of Object.entries(datos)) {
    if (value == null || value === "" || !Number.isFinite(Number(value))) continue;
    if (matcher(normalize(key))) return Number(value);
  }
  return null;
}

function campoTabla($, fila, kind) {
  const table = $(fila).closest("table");
  const cells = $(fila).children("th,td");
  const headers = table.find("thead tr").last().children("th,td");
  if (!headers.length || headers.length !== cells.length) return null;
  const clean = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
  for (let i=0;i<headers.length;i++) {
    const heading = clean($(headers[i]).text());
    const isBlocks = kind === "blocks" && /^(tap|tapon|tapones|tapones com\.?|tapones cometidos|tapones realizados|tapones hechos|tap com\.?|blk|bloqueos?)$/.test(heading);
    const isFouls = kind === "fouls" && /^(faltas?|faltas? personales?|fp|pf)$/.test(heading);
    if (!isBlocks && !isFouls) continue;
    const text = $(cells[i]).text().trim();
    if (/^\d+$/.test(text)) return Number(text);
  }
  return null;
}

function normalizarNombreJugador(valor) {
  return String(valor || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ").trim().toLowerCase();
}

// La planilla de la Liga incluye una jugada por cada tapón cometido.
// Si la tabla estadística no trae el acumulado, reconstruirlo contando
// exclusivamente TAPON-COMETIDO del jugador en la ficha oficial.
function contarTaponesCometidosDesdeAcciones($, nombreJugador) {
  const nombre = normalizarNombreJugador(nombreJugador);
  if (!nombre) return null;
  let total = 0;
  let encontroAcciones = false;
  $("li.accion").each((_, elemento) => {
    const texto = $(elemento).text().replace(/\\s+/g, " ").trim();
    if (!/TAPON[-\\s]COMETIDO/i.test(texto)) return;
    encontroAcciones = true;
    const textoNormalizado = normalizarNombreJugador(texto);
    if (textoNormalizado.includes(nombre)) total++;
  });
  return encontroAcciones ? total : null;
}

function obtenerJugador($, fila) {
  const onclick = $(fila).attr("onclick") || "";

  // Leemos el objeto JSON sin ejecutar el onclick.
  const inicio = onclick.indexOf("{");
  if (inicio === -1) return null;

  let profundidad = 0;
  let fin = -1;
  let dentroDeCadena = false;
  let escapado = false;

  for (let i = inicio; i < onclick.length; i++) {
    const caracter = onclick[i];

    if (dentroDeCadena) {
      if (escapado) escapado = false;
      else if (caracter === "\\") escapado = true;
      else if (caracter === '"') dentroDeCadena = false;
    } else {
      if (caracter === '"') dentroDeCadena = true;
      else if (caracter === "{") profundidad++;
      else if (caracter === "}") {
        profundidad--;
        if (profundidad === 0) {
          fin = i + 1;
          break;
        }
      }
    }
  }

  if (fin === -1) return null;

  const datos = JSON.parse(onclick.slice(inicio, fin));
  const nombreDiagnostico = String(datos.NombreCompleto || datos.Nombre || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
  if (nombreDiagnostico.includes("bryan carabali")) {
    const tabla = $(fila).closest("table");
    const encabezados = tabla.find("thead tr").last().children("th,td").map((_, celda) => $(celda).text().trim()).get();
    const clavesTapones = Object.entries(datos).filter(([key]) => /tap|bloq/i.test(key));
    console.log("Diagnóstico fuente oficial tapones Bryan:", JSON.stringify({
      playerId: datos.IdJugador,
      rawBlockFields: clavesTapones,
      tableHeaders: encabezados,
      rowCells: $(fila).children("th,td").map((_, celda) => $(celda).text().trim()).get(),
    }));
  }

  return {
    officialPlayerId: datos.IdJugador,
    officialTeamId: datos.IdEquipo,
    name: datos.NombreCompleto || datos.Nombre,
    number: datos.Dorsal,
    points: datos.Puntos,
    rebounds: datos.RebotesTotales,
    assists: datos.Asistencias,
    minutes: datos.TiempoJuego,
    valuation: datos.Valoracion,
    starter: datos.CincoInicial,
    steals: datos.Recuperaciones,
    turnovers: datos.Perdidas,
    offensiveRebounds: datos.ReboteOfensivo,
    defensiveRebounds: datos.ReboteDefensivo,
    // Son acciones cometidas/hechas por el jugador, no recibidas por él.
    blocks: campoEstadistico(datos,
      ["Tapones","TaponesCometidos","TaponesRealizados","TaponesHechos","TaponesDados","TaponesColocados","Bloqueos"],
      key => /^(?:tapones?|bloqueos?)(?:com(?:etidos?)?|realizados?|hechos?|dados?|colocados?|favor)?$/.test(key)
        && !/recibidos?|contra/.test(key)) ?? campoTabla($,fila,"blocks") ??
        contarTaponesCometidosDesdeAcciones($, datos.NombreCompleto || datos.Nombre),
    fouls: campoEstadistico(datos,
      ["FaltasCometidas","FaltasPersonales","Faltas","FaltasRealizadas","FaltasJugador","PersonalFouls"],
      key => /^(?:faltas?|personalfouls)(?:personales?|cometidas?|realizadas?|jugador)?$/.test(key)
        && !/recibidas?|provocadas?|favor/.test(key)) ?? campoTabla($,fila,"fouls"),
    twoPointers: datos.TirosDos,
    threePointers: datos.TirosTres,
    freeThrows: datos.TirosLibres,
    plusMinus: datos.MasMenos,
  };
}

async function comprobarFinalMarcadorOficial(html, urlPartido) {
  const idEnc = html.match(/var\s+idEnc\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!idEnc) {
    console.log("Diagnóstico final: no se encontró idEnc para consultar el marcador oficial.");
    return null;
  }
  try {
    const url = new URL("/laliga/partido/Marcador/" + encodeURIComponent(idEnc), urlPartido);
    url.searchParams.set("handler", "Recargar");
    url.searchParams.set("key", "");
    const respuesta = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "*/*", Referer: urlPartido },
    });
    if (!respuesta.ok) {
      console.log("Diagnóstico final: marcador oficial HTTP " + respuesta.status);
      return null;
    }
    const marcador = await respuesta.text();
    const estado = marcador.match(/data-estado="([^"]*)"/)?.[1] || null;
    const finalizada = marcador.match(/data-finalizada="([^"]*)"/)?.[1] === "true";
    const puntos = [...marcador.matchAll(/class="marcador-box[^"]*">\s*(\d+)\s*</g)]
      .map(m => Number(m[1]));
    console.log("Diagnóstico marcador oficial:", JSON.stringify({ estado, finalizada, puntos }));
    if (!(finalizada || estado === "FINALIZADO") || puntos.length !== 2) return null;
    return { homeScore: puntos[0], awayScore: puntos[1] };
  } catch (error) {
    console.log("Diagnóstico final: marcador oficial no disponible:", error.message);
    return null;
  }
}

async function main() {
  console.log("Descargando partido oficial...");

  const respuesta = await fetch(URL_PARTIDO, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html",
    },
  });

  if (!respuesta.ok) {
    throw new Error(`HTTP ${respuesta.status}`);
  }

  const html = await respuesta.text();
  const $ = cheerio.load(html);
  const equipos = [];

  $(".tabla-estadisticas").each((_, tabla) => {
    const contenedor = $(tabla)
  .closest(".table-responsive");

const encabezado = contenedor
  .prevAll(".nombre-equipo")
  .first();
    const imagen = encabezado.find("img").first();

    const nombre = encabezado.find("strong").first().text().trim();
    const escudo = imagen.attr("src") || "";
    const ids = escudo.match(/\/escudos\/(\d+)\/(\d+)/);

    if (!nombre || !ids) {
      throw new Error("No se pudo identificar el equipo de una tabla.");
    }

    const jugadores = [];

    $(tabla).find("tbody tr").each((_, fila) => {
      const jugador = obtenerJugador($, fila);
      if (jugador) jugadores.push(jugador);
    });

    equipos.push({
      name: nombre,
      officialClubId: Number(ids[1]),
      officialTeamId: Number(ids[2]),
      players: jugadores,
      totalPlayerPoints: jugadores.reduce(
        (suma, jugador) => suma + jugador.points,
        0
      ),
    });
  });

  if (equipos.length !== 2) {
    throw new Error(
      `Se esperaban 2 equipos y se encontraron ${equipos.length}.`
    );
  }

  for (const equipo of equipos) {
    if (!equipo.players.length) {
      throw new Error(`No se encontraron jugadores de ${equipo.name}`);
    }
  }

  for (const equipo of equipos) {
    const missingBlocks = equipo.players.filter(j => j.blocks == null).length;
    const missingFouls = equipo.players.filter(j => j.fouls == null).length;
    if (missingBlocks || missingFouls) {
      console.log("Diagnóstico estadística individual oficial:", JSON.stringify({
        equipo: equipo.name, jugadores: equipo.players.length,
        sinTapones: missingBlocks, sinFaltas: missingFouls,
      }));
    }
  }

  extractTeamStats($, equipos);

  const finalPagina = parseOfficialFinal($, URL_PARTIDO);
  const elemento = $("#status-partido");
  console.log("Diagnóstico estado página:", JSON.stringify({
    cantidad: elemento.length,
    clase: elemento.attr("class") || null,
    texto: elemento.text().trim().slice(0, 100),
    marcador: [finalPagina.homeScore, finalPagina.awayScore],
  }));
  if (finalPagina.status !== "finished") {
    const marcadorOficial = await comprobarFinalMarcadorOficial(html, URL_PARTIDO);
    if (marcadorOficial &&
        marcadorOficial.homeScore === finalPagina.homeScore &&
        marcadorOficial.awayScore === finalPagina.awayScore) {
      finalPagina.status = "finished";
      finalPagina.finalEvidence = {
        type: "official-final-status",
        officialUrl: URL_PARTIDO,
        method: "official-scoreboard-confirmed",
      };
      console.log("Final confirmado por marcador oficial y planilla coincidentes.");
    } else {
      console.log("Final no confirmado: estadísticas bloqueadas.");
    }
  }

  const parcialesExtraidos = extraerParcialesDesdeAcciones(html);
  const ultimoParcial = parcialesExtraidos.parciales.at(-1);
  const quarterScores = finalPagina.status === "finished" && parcialesExtraidos.validos &&
    ultimoParcial?.acumuladoLocal === finalPagina.homeScore &&
    ultimoParcial?.acumuladoVisitante === finalPagina.awayScore
    ? parcialesExtraidos.parciales.map(({ periodo, local, visitante }) => ({
        period: periodo <= 4 ? String(periodo) : `OT${periodo - 4}`,
        home: local,
        away: visitante,
      }))
    : null;
  console.log("Parciales oficiales:", quarterScores ? JSON.stringify(quarterScores) : "no verificables");

  const resultado = {
    source: "Liga Nacional",
    ...(quarterScores ? { quarterScores } : {}),
    ...finalPagina,
    matchUrl: URL_PARTIDO,
    teams: equipos,
  };

  fs.writeFileSync(
    OUTPUT,
    JSON.stringify(resultado, null, 2),
    "utf8"
  );

  console.log("Extracción completada:");
  for (const equipo of equipos) {
    console.log(
      `${equipo.name}: ${equipo.players.length} jugadores, ` +
      `${equipo.totalPlayerPoints} puntos`
    );
  }
  console.log(`Archivo generado: ${OUTPUT}`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
