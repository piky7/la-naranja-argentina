import { matchResults } from "./matchResults";

import { broadcasts } from "./broadcasts";
import { officialSchedule } from "./officialSchedule";

// Correcciones manuales de TV: tienen prioridad sobre el archivo generado automáticamente.
const manualBroadcasts = {
  "2026-10-23-racing-chivilcoy-boca": "TyC Sports",
  "2026-10-28-boca-regatas": "DSports",
  "2026-10-29-lanus-san-martin": "TyC Sports",
  "2026-10-31-quimsa-penarol": "TyC Sports",
  "2026-11-04-olimpico-lanus": "TyC Sports",
  "2026-11-06-boca-san-martin": "DSports",
  "2026-11-10-ferro-san-martin": "TyC Sports",
  "2026-11-11-platense-penarol": "DSports",
};

// La única fuente de fechas, horarios y encuentros es la Liga Nacional.
// Los resultados se complementan mediante matchResults y la TV se asigna por
// clave fecha-local-visitante, sin mantener un segundo fixture manual.
const groupedMatches = officialSchedule.reduce(
  (groups, match) => {
    if (!groups[match.date]) {
      groups[match.date] = [];
    }

    groups[match.date].push(match);
    return groups;
  },
  {}
);

export const matches = Object.entries(groupedMatches)
  .flatMap(([date, games]) =>
    games.map((match, index) => {
      const { homeTeam, awayTeam } = match;

      const resultKey =
        `${date}-${homeTeam}-${awayTeam}`;

      const automaticResult = matchResults[resultKey];
      const broadcast = broadcasts[resultKey];

      const status =
        automaticResult?.status === "finished"
          ? "finished"
          : "scheduled";

      const time =
        match.time ??
        automaticResult?.time ??
        null;

      const tv = manualBroadcasts[resultKey]
        ? [manualBroadcasts[resultKey]]
        : broadcast?.channel
          ? [broadcast.channel]
        : automaticResult?.tv?.length
          ? automaticResult.tv
          : status === "scheduled"
            ? ["Básquet Pass"]
            : [];

      return {
        id: `${date}-${homeTeam}-${awayTeam}-${index + 1}`,
        date,
        officialUrl: match.officialUrl ?? null,
        homeTeam,
        awayTeam,
        time,
        venue: automaticResult?.venue ?? null,
        tv,
        status,
        homeScore: automaticResult?.homeScore ?? null,
        awayScore: automaticResult?.awayScore ?? null,
      };
    })
  );