// Disparador único de la sincronización oficial LNB + LAB.
// El token de GitHub se configura como secreto GITHUB_TOKEN en Cloudflare.
const WORKFLOW = "actualizar-lna-completo.yml";
const REPOSITORY = "piky7/la-naranja-argentina";
const REF = "main";

function requestedMode(date) {
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();

  // Fixture completo de ambas competencias cada 6 horas.
  if (minute === 0 && hour % 6 === 0) return "full";

  // Resultados recientes cada 10 minutos en las franjas habituales de actividad.
  if (minute % 10 === 0 && [0, 1, 2, 3, 4, 14, 15, 16, 17, 21, 22, 23].includes(hour)) {
    return "recent";
  }
  return null;
}

export default {
  async scheduled(controller, env) {
    const now = new Date(controller.scheduledTime);
    const mode = requestedMode(now);
    if (!mode) return;
    if (!env.GITHUB_TOKEN) throw new Error("Falta secreto GITHUB_TOKEN");

    const response = await fetch(
      `https://api.github.com/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "lna-sync-cloudflare-worker",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: REF, inputs: { mode } }),
      }
    );
    if (response.status !== 204) {
      throw new Error(`GitHub rechazó la solicitud: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
    }
    console.log(`Sincronización unificada LNB + LAB ${mode} solicitada: ${now.toISOString()}`);
  },
  async fetch() {
    return new Response("lna-sync activo; dispara la sincronización unificada LNB + LAB", { status: 200 });
  },
};
