import { matchResults } from "./matchResults";
import { flashscoreSchedule } from "./flashscoreSchedule";
import { broadcasts } from "./broadcasts";

const fixture = [
  // SEPTIEMBRE 2026

  ["2026-09-28", [
    ["lanus", "gimnasia"],
  ]],

  ["2026-09-30", [
    ["penarol", "gimnasia"],
    ["argentino", "ferro"],
    ["san-martin", "instituto"],
  ]],

  // OCTUBRE 2026

  ["2026-10-01", [
    ["olimpico", "platense"],
  ]],

  ["2026-10-02", [
    ["regatas", "instituto"],
  ]],

  ["2026-10-03", [
    ["quimsa", "platense"],
  ]],

  ["2026-10-04", [
    ["gimnasia", "la-union"],
  ]],

  ["2026-10-05", [
    ["quimsa", "atenas"],
    ["ferro", "regatas"],
  ]],

  ["2026-10-06", [
    ["platense", "la-union"],
  ]],

  ["2026-10-07", [
    ["olimpico", "atenas"],
    ["boca", "obera"],
    ["penarol", "regatas"],
  ]],

  ["2026-10-08", [
    ["racing-chivilcoy", "san-martin"],
    ["independiente-oliva", "ferro"],
    ["san-lorenzo", "gimnasia"],
  ]],

  ["2026-10-09", [
    ["lanus", "obera"],
  ]],

  ["2026-10-10", [
    ["argentino", "san-martin"],
    ["instituto", "ferro"],
    ["racing-chivilcoy", "gimnasia"],
  ]],

  ["2026-10-11", [
    ["olimpico", "boca"],
  ]],

  ["2026-10-12", [
    ["argentino", "gimnasia"],
    ["atenas", "ferro"],
  ]],

  ["2026-10-13", [
    ["quimsa", "boca"],
    ["obera", "racing-chivilcoy"],
  ]],

  ["2026-10-15", [
    ["independiente-oliva", "atenas"],
    ["lanus", "penarol"],
    ["la-union", "racing-chivilcoy"],
  ]],

  ["2026-10-17", [
    ["san-lorenzo", "penarol"],
    ["platense", "obera"],
  ]],

  ["2026-10-18", [
    ["regatas", "olimpico"],
  ]],

  ["2026-10-19", [
    ["independiente-oliva", "lanus"],
    ["san-lorenzo", "obera"],
  ]],

  ["2026-10-20", [
    ["ferro", "platense"],
    ["san-martin", "olimpico"],
  ]],

  ["2026-10-21", [
    ["instituto", "lanus"],
    ["gimnasia", "obera"],
  ]],

  ["2026-10-23", [
    ["argentino", "quimsa"],
    ["atenas", "lanus"],
    ["racing-chivilcoy", "boca"],
  ]],

  ["2026-10-25", [
    ["boca", "argentino"],
    ["la-union", "independiente-oliva"],
    ["racing-chivilcoy", "quimsa"],
  ]],

  ["2026-10-26", [
    ["lanus", "regatas"],
  ]],

  ["2026-10-27", [
    ["penarol", "san-martin"],
    ["obera", "independiente-oliva"],
  ]],

  ["2026-10-28", [
    ["boca", "regatas"],
    ["platense", "san-lorenzo"],
    ["gimnasia", "ferro"],
  ]],

  ["2026-10-29", [
    ["lanus", "san-martin"],
  ]],

  ["2026-10-31", [
    ["olimpico", "penarol"],
  ]],

  // NOVIEMBRE 2026

  ["2026-11-01", [
    ["atenas", "racing-chivilcoy"],
    ["instituto", "gimnasia"],
  ]],

  ["2026-11-02", [
    ["quimsa", "penarol"],
  ]],

  ["2026-11-03", [
    ["la-union", "argentino"],
    ["atenas", "gimnasia"],
    ["independiente-oliva", "racing-chivilcoy"],
  ]],

  ["2026-11-05", [
    ["obera", "argentino"],
    ["independiente-oliva", "gimnasia"],
    ["instituto", "racing-chivilcoy"],
  ]],

  ["2026-11-06", [
    ["platense", "san-martin"],
    ["san-lorenzo", "regatas"],
  ]],

  ["2026-11-07", [
    ["boca", "la-union"],
  ]],

  ["2026-11-08", [
    ["racing-chivilcoy", "regatas"],
    ["ferro", "san-martin"],
    ["quimsa", "instituto"],
  ]],

  ["2026-11-09", [
    ["lanus", "la-union"],
  ]],

  ["2026-11-10", [
    ["argentino", "regatas"],
    ["boca", "san-martin"],
    ["olimpico", "instituto"],
  ]],

  ["2026-11-11", [
    ["platense", "penarol"],
  ]],

  ["2026-11-12", [
    ["atenas", "san-lorenzo"],
  ]],

  ["2026-11-13", [
    ["ferro", "penarol"],
  ]],

  ["2026-11-14", [
    ["gimnasia", "platense"],
    ["independiente-oliva", "san-lorenzo"],
  ]],

  ["2026-11-15", [
    ["argentino", "lanus"],
    ["la-union", "atenas"],
    ["san-martin", "quimsa"],
  ]],

  ["2026-11-16", [
    ["instituto", "san-lorenzo"],
  ]],

  ["2026-11-17", [
    ["obera", "atenas"],
    ["racing-chivilcoy", "lanus"],
    ["regatas", "quimsa"],
  ]],

  ["2026-11-19", [
    ["olimpico", "ferro"],
  ]],

  ["2026-11-20", [
    ["atenas", "instituto"],
  ]],

  ["2026-11-21", [
    ["quimsa", "ferro"],
  ]],

  // DICIEMBRE 2026

  ["2026-12-04", [
    ["olimpico", "san-lorenzo"],
  ]],

  ["2026-12-06", [
    ["quimsa", "san-lorenzo"],
  ]],

  ["2026-12-07", [
    ["san-martin", "atenas"],
    ["ferro", "racing-chivilcoy"],
  ]],

  ["2026-12-08", [
    ["gimnasia", "boca"],
  ]],

  ["2026-12-09", [
    ["instituto", "argentino"],
    ["regatas", "atenas"],
    ["platense", "racing-chivilcoy"],
  ]],

  ["2026-12-10", [
    ["penarol", "boca"],
    ["obera", "olimpico"],
  ]],

  ["2026-12-11", [
    ["independiente-oliva", "argentino"],
  ]],

  ["2026-12-12", [
    ["san-lorenzo", "boca"],
    ["lanus", "platense"],
    ["la-union", "olimpico"],
  ]],

  ["2026-12-13", [
    ["atenas", "argentino"],
    ["penarol", "obera"],
  ]],

  ["2026-12-15", [
    ["ferro", "obera"],
  ]],

  ["2026-12-16", [
    ["argentino", "san-lorenzo"],
    ["la-union", "quimsa"],
  ]],

  ["2026-12-17", [
    ["san-martin", "independiente-oliva"],
  ]],

  ["2026-12-18", [
    ["obera", "quimsa"],
    ["racing-chivilcoy", "san-lorenzo"],
  ]],

  ["2026-12-19", [
    ["instituto", "platense"],
    ["olimpico", "gimnasia"],
    ["regatas", "independiente-oliva"],
  ]],

  ["2026-12-21", [
    ["atenas", "platense"],
    ["olimpico", "lanus"],
    ["quimsa", "gimnasia"],
  ]],

  ["2026-12-23", [
    ["penarol", "argentino"],
    ["quimsa", "lanus"],
    ["independiente-oliva", "platense"],
    ["regatas", "la-union"],
  ]],

  ["2026-12-26", [
    ["boca", "ferro"],
    ["obera", "regatas"],
    ["san-martin", "la-union"],
  ]],

  ["2026-12-27", [
    ["lanus", "san-lorenzo"],
    ["olimpico", "quimsa"],
  ]],

  ["2026-12-28", [
    ["racing-chivilcoy", "argentino"],
    ["platense", "boca"],
    ["obera", "la-union"],
  ]],

  ["2026-12-29", [
    ["regatas", "san-martin"],
    ["ferro", "san-lorenzo"],
    ["instituto", "independiente-oliva"],
  ]],

  // ENERO 2027

  ["2027-01-10", [
    ["instituto", "boca"],
    ["lanus", "ferro"],
    ["san-lorenzo", "san-martin"],
  ]],

  ["2027-01-12", [
    ["independiente-oliva", "boca"],
    ["gimnasia", "san-martin"],
  ]],

  ["2027-01-13", [
    ["la-union", "instituto"],
  ]],

  ["2027-01-14", [
    ["atenas", "boca"],
    ["independiente-oliva", "penarol"],
  ]],

  ["2027-01-15", [
    ["racing-chivilcoy", "olimpico"],
    ["obera", "instituto"],
  ]],

  ["2027-01-16", [
    ["atenas", "penarol"],
  ]],

  ["2027-01-17", [
    ["argentino", "olimpico"],
  ]],

  ["2027-01-18", [
    ["instituto", "penarol"],
    ["platense", "regatas"],
  ]],

  ["2027-01-19", [
    ["boca", "lanus"],
    ["san-lorenzo", "la-union"],
  ]],

  ["2027-01-20", [
    ["gimnasia", "regatas"],
    ["quimsa", "independiente-oliva"],
  ]],

  ["2027-01-21", [
    ["ferro", "la-union"],
  ]],

  ["2027-01-22", [
    ["olimpico", "independiente-oliva"],
  ]],

  ["2027-01-23", [
    ["platense", "argentino"],
    ["penarol", "la-union"],
    ["obera", "san-martin"],
  ]],

  ["2027-01-25", [
    ["ferro", "argentino"],
    ["boca", "racing-chivilcoy"],
  ]],

  ["2027-01-26", [
    ["instituto", "atenas"],
    ["obera", "platense"],
    ["la-union", "san-martin"],
  ]],

  ["2027-01-27", [
    ["lanus", "racing-chivilcoy"],
  ]],

  ["2027-01-28", [
    ["la-union", "platense"],
    ["regatas", "ferro"],
  ]],

  ["2027-01-29", [
    ["boca", "san-lorenzo"],
    ["penarol", "racing-chivilcoy"],
    ["quimsa", "obera"],
  ]],

  ["2027-01-30", [
    ["san-martin", "ferro"],
    ["gimnasia", "independiente-oliva"],
  ]],

  ["2027-01-31", [
    ["san-lorenzo", "platense"],
    ["olimpico", "obera"],
  ]],

  // FEBRERO 2027

  ["2027-02-02", [
    ["la-union", "lanus"],
  ]],

  ["2027-02-03", [
    ["penarol", "platense"],
    ["quimsa", "regatas"],
    ["instituto", "san-martin"],
  ]],

  ["2027-02-04", [
    ["ferro", "boca"],
    ["obera", "lanus"],
  ]],

  ["2027-02-05", [
    ["argentino", "racing-chivilcoy"],
    ["atenas", "san-martin"],
    ["olimpico", "regatas"],
  ]],

  ["2027-02-06", [
    ["gimnasia", "quimsa"],
  ]],

  ["2027-02-07", [
    ["independiente-oliva", "san-martin"],
  ]],

  ["2027-02-08", [
    ["ferro", "quimsa"],
  ]],

  ["2027-02-09", [
    ["san-lorenzo", "argentino"],
    ["la-union", "obera"],
  ]],

  ["2027-02-11", [
    ["argentino", "boca"],
    ["lanus", "instituto"],
  ]],

  ["2027-02-13", [
    ["lanus", "atenas"],
    ["boca", "instituto"],
  ]],

  ["2027-02-14", [
    ["argentino", "independiente-oliva"],
  ]],

  ["2027-02-15", [
    ["penarol", "atenas"],
    ["platense", "instituto"],
    ["obera", "san-lorenzo"],
  ]],

  ["2027-02-16", [
    ["san-martin", "gimnasia"],
    ["racing-chivilcoy", "independiente-oliva"],
  ]],

  ["2027-02-17", [
    ["boca", "olimpico"],
  ]],

  ["2027-02-18", [
    ["atenas", "quimsa"],
    ["regatas", "gimnasia"],
  ]],

  ["2027-02-19", [
    ["lanus", "olimpico"],
    ["san-lorenzo", "ferro"],
  ]],

  ["2027-02-20", [
    ["san-martin", "penarol"],
    ["la-union", "gimnasia"],
    ["instituto", "quimsa"],
  ]],

  ["2027-02-21", [
    ["san-lorenzo", "olimpico"],
  ]],

  ["2027-02-22", [
    ["regatas", "penarol"],
    ["independiente-oliva", "quimsa"],
  ]],

  // MARZO 2027

  ["2027-03-04", [
    ["atenas", "independiente-oliva"],
    ["regatas", "boca"],
    ["platense", "gimnasia"],
  ]],

  ["2027-03-05", [
    ["penarol", "lanus"],
  ]],

  ["2027-03-06", [
    ["san-martin", "boca"],
    ["quimsa", "olimpico"],
    ["ferro", "gimnasia"],
  ]],

  ["2027-03-07", [
    ["penarol", "san-lorenzo"],
    ["regatas", "racing-chivilcoy"],
  ]],

  ["2027-03-08", [
    ["independiente-oliva", "instituto"],
  ]],

  ["2027-03-09", [
    ["san-martin", "racing-chivilcoy"],
  ]],

  ["2027-03-10", [
    ["argentino", "platense"],
  ]],

  ["2027-03-11", [
    ["san-lorenzo", "lanus"],
  ]],

  ["2027-03-12", [
    ["racing-chivilcoy", "platense"],
    ["regatas", "obera"],
    ["independiente-oliva", "la-union"],
  ]],

  ["2027-03-13", [
    ["olimpico", "argentino"],
    ["boca", "penarol"],
  ]],

  ["2027-03-14", [
    ["atenas", "la-union"],
    ["san-martin", "obera"],
  ]],

  ["2027-03-15", [
    ["quimsa", "argentino"],
    ["gimnasia", "penarol"],
    ["regatas", "san-lorenzo"],
  ]],

  ["2027-03-16", [
    ["lanus", "independiente-oliva"],
    ["instituto", "la-union"],
  ]],

  ["2027-03-17", [
    ["san-martin", "san-lorenzo"],
    ["obera", "ferro"],
  ]],

  ["2027-03-18", [
    ["boca", "gimnasia"],
    ["penarol", "independiente-oliva"],
    ["quimsa", "racing-chivilcoy"],
  ]],

  ["2027-03-19", [
    ["regatas", "lanus"],
    ["la-union", "ferro"],
  ]],

  ["2027-03-20", [
    ["olimpico", "racing-chivilcoy"],
    ["obera", "gimnasia"],
  ]],

  ["2027-03-21", [
    ["argentino", "instituto"],
    ["san-martin", "lanus"],
    ["la-union", "san-lorenzo"],
  ]],

  ["2027-03-23", [
    ["atenas", "obera"],
    ["penarol", "instituto"],
    ["platense", "olimpico"],
  ]],

  ["2027-03-25", [
    ["lanus", "boca"],
    ["platense", "quimsa"],
    ["gimnasia", "olimpico"],
    ["racing-chivilcoy", "instituto"],
  ]],

  ["2027-03-26", [
    ["argentino", "la-union"],
    ["san-martin", "regatas"],
    ["independiente-oliva", "obera"],
  ]],

  ["2027-03-27", [
    ["san-lorenzo", "quimsa"],
  ]],

  ["2027-03-28", [
    ["ferro", "lanus"],
    ["instituto", "obera"],
    ["racing-chivilcoy", "la-union"],
  ]],

  ["2027-03-29", [
    ["regatas", "argentino"],
    ["san-lorenzo", "atenas"],
  ]],
];

export const matches = fixture.flatMap(([date, games]) =>
  games.map(([homeTeam, awayTeam], index) => {
    const isExampleMatch =
      date === "2026-09-28" &&
      homeTeam === "lanus" &&
      awayTeam === "gimnasia";

    const matchKey =
      `${homeTeam}-${awayTeam}`;

    /*
     * DATOS DE FLASHSCORE
     *
     * Si Flashscore conoce la fecha/hora,
     * esos datos tienen prioridad sobre
     * el fixture manual.
     */
    const flashscoreMatch =
      flashscoreSchedule[matchKey];

    const effectiveDate =
      flashscoreMatch?.date ??
      date;

    /*
     * RESULTADO AUTOMÁTICO
     *
     * Se busca usando la fecha efectiva.
     */
    const resultKey =
      `${effectiveDate}-${homeTeam}-${awayTeam}`;

    const automaticResult =
      matchResults[resultKey];
      /*
 * TELEVISACIÓN
 *
 * Básquet Plus informa únicamente los partidos
 * que tienen TyC Sports o DSports.
 *
 * Si no aparece allí y el partido todavía no
 * se jugó, usamos Básquet Pass como fallback.
 */
const broadcastKey =
  `${effectiveDate}-${homeTeam}-${awayTeam}`;

const broadcast =
  broadcasts[broadcastKey];

    return {
      id:
        `${effectiveDate}-${homeTeam}-${awayTeam}-${index + 1}`,

      date:
        effectiveDate,

      homeTeam,

      awayTeam,

      /*
       * PRIORIDAD:
       * 1. Resultado automático
       * 2. Hora de Flashscore
       * 3. Ejemplo antiguo
       * 4. null → la interfaz muestra VS
       */
      time:
        automaticResult?.time ??
        flashscoreMatch?.time ??
        (
          isExampleMatch
            ? "22:05"
            : null
        ),

      venue:
        automaticResult?.venue ??
        (
          isExampleMatch
            ? "Comodoro"
            : null
        ),

    tv:
  automaticResult?.tv?.length
    ? automaticResult.tv
    : broadcast?.channel
      ? [broadcast.channel]
      : (!automaticResult || automaticResult.status === "scheduled")
        ? ["Básquet Pass"]
        : (
            isExampleMatch
              ? ["TyC Sports"]
              : []
          ),

      status:
        automaticResult?.status ??
        (
          isExampleMatch
            ? "finished"
            : "scheduled"
        ),

      homeScore:
        automaticResult?.homeScore ??
        (
          isExampleMatch
            ? 74
            : null
        ),

      awayScore:
        automaticResult?.awayScore ??
        (
          isExampleMatch
            ? 92
            : null
        ),
    };
  })
);