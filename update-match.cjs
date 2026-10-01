const { execFileSync } = require("child_process");

const scripts = [
  "auto-flashscore.cjs",
  "normalizer-flashscore.cjs",
  "generate-matchstats.cjs",
  "update-matchstats.cjs",
];

function runScript(script) {
  console.log("");
  console.log("========================================");
  console.log(`EJECUTANDO: ${script}`);
  console.log("========================================");
  console.log("");

  execFileSync(
    process.execPath,
    [script],
    {
      stdio: "inherit",
    }
  );
}

function main() {
  console.log("");
  console.log("========================================");
  console.log("ACTUALIZACIÓN AUTOMÁTICA LNA");
  console.log("========================================");
  console.log("");

  try {
    scripts.forEach(runScript);

    console.log("");
    console.log("========================================");
    console.log("ACTUALIZACIÓN COMPLETADA");
    console.log("========================================");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("========================================");
    console.error("ACTUALIZACIÓN INTERRUMPIDA");
    console.error("========================================");
    console.error("");

    console.error(
      "Uno de los pasos falló."
    );

    process.exit(1);
  }
}

main();