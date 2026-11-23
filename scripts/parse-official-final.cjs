function parseOfficialFinal($, officialUrl) {
  const status = $("#status-partido");
  const score = selector => {
    const text = $(selector).text().trim();
    return /^\d+$/.test(text) ? Number(text) : null;
  };
  const finished = status.length === 1 && status.hasClass("finalizado") &&
    status.text().trim().toLowerCase() === "finalizado";
  return {
    status: finished ? "finished" : "unverified",
    homeScore: score("#score-local"),
    awayScore: score("#score-visitante"),
    ...(finished ? { finalEvidence: {
      type: "official-final-status", officialUrl,
    } } : {}),
  };
}

module.exports = { parseOfficialFinal };
