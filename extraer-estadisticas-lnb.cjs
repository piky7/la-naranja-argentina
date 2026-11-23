
const fs = require("node:fs");

const url = process.argv[2];

if (!url) {
  console.error("Uso: node extraer-estadisticas-lnb.cjs URL");
  process.exit(1);
}

const allowedHost = "www.laliganacional.com.ar";

function limpiar(texto) {
  return texto
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const parsedUrl = new URL(url);

  if (
    parsedUrl.protocol !== "https:" ||
    parsedUrl.hostname !== allowedHost ||
    !parsedUrl.pathname.startsWith("/laliga/partido/")
  ) {
    throw new Error("La URL no corresponde a un partido oficial.");
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();

  const patron =
    /<div\s+class="linea[^"]*">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/gi;

  // Buscar cada fila mediante el nombre de la estadística,
  // sin depender de que toda la tabla tenga una estructura fija.
  const nombres = [
    "Tiros de campo",
    "Tiros 2P",
    "Tiros 3P",
    "Tiros Libres",
    "Rebotes totales",
    "Asistencias",
    "Recuperaciones",
    "Tapones",
    "Pérdidas",
"Faltas cometidas"  ];

  const estadisticas = {};

  

for (const nombre of nombres) {
  const etiqueta = `<span class="stat-nombre-completo">${nombre}</span>`;
  const posicion = html.indexOf(etiqueta);

  if (posicion === -1) {
    estadisticas[nombre] = null;
    continue;
  }

  // Buscar la fila más cercana que contiene la estadística.
  const inicio = html.lastIndexOf(
    '<div class="linea',
    posicion
  );

  if (inicio === -1) {
    estadisticas[nombre] = null;
    continue;
  }

  // Solo analizamos el contenido anterior al nombre para
  // identificar el valor del equipo local.
  const antes = html.slice(inicio, posicion);

  const valoresLocales = [
    ...antes.matchAll(
      /<div class="col"[^>]*>([\s\S]*?)<\/div>/g
    )
  ];

  // Analizamos el contenido posterior para el visitante.
  const despues = html.slice(posicion, posicion + 1000);

  const visitante = despues.match(
    /<\/div>\s*<div class="col"[^>]*>([\s\S]*?)<\/div>/
  );

  estadisticas[nombre] =
    valoresLocales.length > 0 && visitante
      ? {
          local: limpiar(valoresLocales[0][1]),
          visitante: limpiar(visitante[1])
        }
      : null;
}


  const resultado = {
    fuente: "Liga Nacional",
    url,
    estadisticas
  };

  console.log(JSON.stringify(resultado, null, 2));

  fs.writeFileSync(
    "estadisticas-lnb-prueba.json",
    JSON.stringify(resultado, null, 2)
  );

  console.log("\nArchivo de prueba generado.");
}

main().catch(error => {
  console.error("Error:", error.message);
  process.exitCode = 1;
});
