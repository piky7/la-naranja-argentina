
const url = "https://www.laliganacional.com.ar/laliga/partido/v2c2MfGitadyIcQpevTABGMij4F6zeKwIRMPcpRSXblCIwrJyY3cFpHw==/argentino-j-vs-boca";

async function main() {
  console.log("LNA - Prueba del marcador oficial");
  console.log("Partido: Argentino de Junín vs Boca");

  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "User-Agent": "LNA-Live-Test/1.0",
    },
  });

  console.log("HTTP:", response.status);

  if (!response.ok) {
    throw new Error(`Error HTTP ${response.status}`);
  }

  const html = await response.text();
  const regexCambio = /INICIO|FINAL/gi;
let cambio;
let cantidad = 0;

console.log("\n=== BUSQUEDA DE CAMBIOS ===");

while ((cambio = regexCambio.exec(html)) !== null) {
  const fragmento = html.slice(
    Math.max(0, cambio.index - 150),
    Math.min(html.length, cambio.index + 250)
  );

  if (/PERIODO|PERÍODO/i.test(fragmento)) {
    console.log(`\n--- CAMBIO ${++cantidad} ---`);
    console.log(fragmento.replace(/\s+/g, " "));

    if (cantidad >= 10) break;
  }
}
const cambiosPeriodo = [
  ...html.matchAll(
    /<li\b[^>]*class="[^"]*\b(INICIO|FINAL)-PERIODO\b[^"]*"[^>]*>/gi
  )
].map((m) => {
  const fragmento = html.slice(m.index, m.index + 500);
  const numero = fragmento.match(
    /<strong[^>]*>[\s\S]*?(?:INICIO|FINAL)-PERIODO\s*<span>\s*(\d+)\s*<\/span>/i
  );

  return {
    tipo: m[1].toUpperCase(),
    periodo: numero ? Number(numero[1]) : null,
    posicion: m.index,
  };
});
const ultimaAccion = html.match(
  /Cuarto\s+(\d+)\s*-\s*(\d{2}:\d{2}:\d{2})/i
);

const posicionUltimaAccion = ultimaAccion?.index ?? Infinity;
const ultimoCambio = cambiosPeriodo[0] ?? null;

const enDescanso =
  ultimoCambio?.tipo === "FINAL" &&
  ultimoCambio.posicion < posicionUltimaAccion;

console.log("\n=== ESTADO DETECTADO ===");
console.log("Último cambio:", ultimoCambio);
console.log("Posición última acción:", posicionUltimaAccion);
console.log("En descanso:", enDescanso);

const eventosPeriodo = [
  ...html.matchAll(/Cuarto\s+(\d+)\s*-\s*(\d{2}:\d{2}:\d{2})/gi)
].map((m) => ({
  cuarto: Number(m[1]),
  tiempo: m[2],
}));

console.log("\n=== CAMBIOS DE PERÍODO ===");
console.log(cambiosPeriodo);
console.log("Último cambio:", cambiosPeriodo[0] ?? "Sin datos");

console.log("\n=== PERÍODOS DETECTADOS ===");
console.log("Eventos encontrados:", eventosPeriodo.length);
console.log(
  "Períodos presentes:",
  [...new Set(eventosPeriodo.map((evento) => evento.cuarto))]
);
console.log("Primer evento:", eventosPeriodo[0] ?? "Sin datos");
console.log("Último evento:", eventosPeriodo.at(-1) ?? "Sin datos");
const regexCuarto = /cuarto/gi;
let encontrado;
let vistos = 0;

while ((encontrado = regexCuarto.exec(html)) !== null && vistos < 8) {
  console.log(`\n--- CUARTO ${++vistos} ---`);
  console.log(
    html.slice(
      Math.max(0, encontrado.index - 200),
      Math.min(html.length, encontrado.index + 250)
    ).replace(/\s+/g, " ")
  );
}

const periodoDetectado = eventosPeriodo.length
  ? Math.max(...eventosPeriodo.map((evento) => evento.cuarto))
  : null;

console.log(
  "Período detectado:",
  periodoDetectado ? `${periodoDetectado}° cuarto` : "Sin datos"
);
  console.log("Caracteres recibidos:", html.length);

  const patrones = [
    /marcador/gi,
    /resultado/gi,
    /score/gi,
    /periodo/gi,
    /cuarto/gi,
    /reloj/gi,
    /clock/gi,
  ];

  for (const patron of patrones) {
    console.log(
      `${patron.source}:`,
      [...html.matchAll(patron)].length
    );
  }

const regex = /marcador|score|resultado/gi;

let coincidencia;
let contador = 0;

while ((coincidencia = regex.exec(html)) !== null) {
  const inicio = Math.max(0, coincidencia.index - 150);
  const fin = Math.min(html.length, coincidencia.index + 250);

  console.log(`\n--- Coincidencia ${++contador} ---`);
  console.log(
    html.slice(inicio, fin).replace(/\s+/g, " ")
  );

  if (contador >= 15) break;
}

const idMatch = html.match(/var\s+idEnc\s*=\s*['"]([^'"]+)['"]/);

if (!idMatch) {
  throw new Error("No se encontró el identificador del marcador");
}

const idEnc = idMatch[1];

console.log("ID oficial detectado:", idEnc);

const marcadorUrl = new URL(
  `/laliga/partido/Marcador/${idEnc}`,
  "https://www.laliganacional.com.ar"
);

marcadorUrl.searchParams.set("handler", "Recargar");
marcadorUrl.searchParams.set("key", "");

console.log("\n--- PRUEBA ENDPOINT MARCADOR ---");

const respuestaMarcador = await fetch(marcadorUrl, {
  headers: {
    Accept: "*/*",
    Referer: url,
    "User-Agent": "LNA-Live-Test/1.0",
  },
});

console.log("HTTP:", respuestaMarcador.status);
console.log(
  "Content-Type:",
  respuestaMarcador.headers.get("content-type")
);

const contenidoMarcador = await respuestaMarcador.text();
console.log("\n=== HTML DEL MARCADOR OFICIAL ===");
console.log(contenidoMarcador.slice(0, 5000));
console.log("=== FIN HTML MARCADOR ===\n");
const estado =
  contenidoMarcador.match(/data-estado="([^"]*)"/)?.[1] ?? null;

const finalizada =
  contenidoMarcador.match(/data-finalizada="([^"]*)"/)?.[1] ?? null;

const tablero =
  contenidoMarcador.match(
    /<div class="marcador-scoreboard"[\s\S]*?<\/div>\s*<\/div>/
  )?.[0] ?? "";

const puntos = [
  ...tablero.matchAll(
    /<div class="marcador-box[^"]*">\s*([^<]*)\s*<\/div>/g
  )
].map((match) => match[1].trim());

console.log("\n=== LNA LIVE OFICIAL ===");
console.log("Partido: Argentino de Junín vs Boca");
console.log("Local:", puntos[0] ?? "Sin datos");
console.log("Visitante:", puntos[1] ?? "Sin datos");
console.log("Estado:", estado || "No informado");
console.log("Finalizado:", finalizada);
console.log("Consulta:", new Date().toLocaleTimeString("es-AR"));

  console.log("Prueba finalizada.");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
