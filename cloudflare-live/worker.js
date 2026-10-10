
const LIVE_URL =
  "https://raw.githubusercontent.com/piky7/la-naranja-argentina/main/src/data/live-matches.json";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/live") {
      return new Response(
        "LNA Live Worker funcionando",
        { status: 200 }
      );
    }

    try {
      const response = await fetch(LIVE_URL, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `GitHub respondió ${response.status}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data.liveMatches)) {
        throw new Error("Formato LIVE inválido");
      }

      return new Response(
        JSON.stringify(data),
        {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        }
      );
    } catch (error) {
      console.error(
        "Error obteniendo LIVE:",
        error.message
      );

      return new Response(
        JSON.stringify({
          error: "No se pudo obtener el LIVE",
          liveMatches: [],
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-store",
          },
        }
      );
    }
  },
};
