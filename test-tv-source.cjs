const URL =
  "https://www.unocontraunoweb.com/2026/09/30/lnb-calendario-2026-27-dias-horarios-y-tv-partidos/";

async function main() {
  console.log("Probando acceso a Uno Contra Uno...");

  try {
    const response = await fetch(URL, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html",
      },
      signal: AbortSignal.timeout(15000),
    });

    console.log("HTTP:", response.status);

    if (!response.ok) {
      console.log("La fuente no permite el acceso.");
      process.exitCode = 1;
      return;
    }

    const html = await response.text();

    console.log("HTML recibido:", html.length, "caracteres");
    console.log("Contiene TyC Sports:", /TyC Sports/i.test(html));
    console.log("Contiene San Lorenzo:", /San Lorenzo/i.test(html));
    console.log("Contiene Oberá:", /Oberá|Ober&#225;|Ober&aacute;/i.test(html));
  } catch (error) {
    console.error("Error:", error.message);
    process.exitCode = 1;
  }
}

main();