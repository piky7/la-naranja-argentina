import argentinoLogo from "../assets/teams-webp/argentino.webp";
import atenasLogo from "../assets/teams-webp/atenas.webp";
import bocaLogo from "../assets/teams-webp/boca.webp";
import ferroLogo from "../assets/teams-webp/ferro.webp";
import gimnasiaLogo from "../assets/teams-webp/gimnasia.webp";
import independienteOlivaLogo from "../assets/teams-webp/independiente-oliva.webp";
import institutoLogo from "../assets/teams-webp/instituto.webp";
import laUnionLogo from "../assets/teams-webp/la-union.webp";
import lanusLogo from "../assets/teams-webp/lanus.webp";
import oberaLogo from "../assets/teams-webp/obera.webp";
import olimpicoLogo from "../assets/teams-webp/olimpico.webp";
import penarolLogo from "../assets/teams-webp/penarol.webp";
import platenseLogo from "../assets/teams-webp/platense.webp";
import quimsaLogo from "../assets/teams-webp/quimsa.webp";
import racingChivilcoyLogo from "../assets/teams-webp/racing-chivilcoy.webp";
import regatasLogo from "../assets/teams-webp/regatas.webp";
import sanLorenzoLogo from "../assets/teams-webp/san-lorenzo.webp";
import sanMartinLogo from "../assets/teams-webp/san-martin.webp";

export const teams = [
  {
    id: "argentino",
    name: "Argentino de Junín",
    shortName: "Argentino",
    abbreviation: "AR",
    city: "Junín",
    province: "Buenos Aires",
    logo: argentinoLogo,
  },
  {
    id: "atenas",
    name: "Atenas",
    shortName: "Atenas",
    abbreviation: "AT",
    city: "Córdoba",
    province: "Córdoba",
    logo: atenasLogo,
  },
  {
    id: "boca",
    name: "Boca Juniors",
    shortName: "Boca",
    abbreviation: "BO",
    city: "Buenos Aires",
    province: "Buenos Aires",
    logo: bocaLogo,
  },
  {
    id: "ferro",
    name: "Ferro Carril Oeste",
    shortName: "Ferro",
    abbreviation: "FE",
    city: "Buenos Aires",
    province: "Buenos Aires",
    logo: ferroLogo,
  },
  {
    id: "gimnasia",
    name: "Gimnasia y Esgrima",
    shortName: "Gimnasia",
    abbreviation: "GE",
    city: "Comodoro Rivadavia",
    province: "Chubut",
    logo: gimnasiaLogo,
  },
  {
    id: "independiente-oliva",
    name: "Independiente de Oliva",
    shortName: "Independiente",
    abbreviation: "IO",
    city: "Oliva",
    province: "Córdoba",
    logo: independienteOlivaLogo,
  },
  {
    id: "instituto",
    name: "Instituto",
    shortName: "Instituto",
    abbreviation: "IN",
    city: "Córdoba",
    province: "Córdoba",
    logo: institutoLogo,
  },
  {
    id: "la-union",
    name: "La Unión de Formosa",
    shortName: "La Unión",
    abbreviation: "LU",
    city: "Formosa",
    province: "Formosa",
    logo: laUnionLogo,
  },
  {
    id: "lanus",
    name: "Lanús",
    shortName: "Lanús",
    abbreviation: "LA",
    city: "Lanús",
    province: "Buenos Aires",
    logo: lanusLogo,
  },
  {
    id: "obera",
    name: "Oberá Tenis Club",
    shortName: "Oberá",
    abbreviation: "OT",
    city: "Oberá",
    province: "Misiones",
    logo: oberaLogo,
  },
  {
    id: "olimpico",
    name: "Olímpico",
    shortName: "Olímpico",
    abbreviation: "OL",
    city: "La Banda",
    province: "Santiago del Estero",
    logo: olimpicoLogo,
  },
  {
    id: "penarol",
    name: "Peñarol",
    shortName: "Peñarol",
    abbreviation: "PE",
    city: "Mar del Plata",
    province: "Buenos Aires",
    logo: penarolLogo,
  },
  {
    id: "platense",
    name: "Platense",
    shortName: "Platense",
    abbreviation: "PL",
    city: "Vicente López",
    province: "Buenos Aires",
    logo: platenseLogo,
  },
  {
    id: "quimsa",
    name: "Quimsa",
    shortName: "Quimsa",
    abbreviation: "QU",
    city: "Santiago del Estero",
    province: "Santiago del Estero",
    logo: quimsaLogo,
  },
  {
    id: "racing-chivilcoy",
    name: "Racing de Chivilcoy",
    shortName: "Racing",
    abbreviation: "RC",
    city: "Chivilcoy",
    province: "Buenos Aires",
    logo: racingChivilcoyLogo,
  },
  {
    id: "regatas",
    name: "Regatas Corrientes",
    shortName: "Regatas",
    abbreviation: "RE",
    city: "Corrientes",
    province: "Corrientes",
    logo: regatasLogo,
  },
  {
    id: "san-lorenzo",
    name: "San Lorenzo",
    shortName: "San Lorenzo",
    abbreviation: "SL",
    city: "Buenos Aires",
    province: "Buenos Aires",
    logo: sanLorenzoLogo,
  },
  {
    id: "san-martin",
    name: "San Martín",
    shortName: "San Martín",
    abbreviation: "SM",
    city: "Corrientes",
    province: "Corrientes",
    logo: sanMartinLogo,
  },
];

// Colores institucionales para degradados sutiles en tarjetas de partidos.
export const teamMatchColors = {
  argentino: "#1764ae", atenas: "#23824a", boca: "#1654b8",
  ferro: "#237d55", gimnasia: "#167344", "independiente-oliva": "#3279bc",
  instituto: "#ce3036", "la-union": "#1878b5", lanus: "#922e4c",
  obera: "#148bc4", olimpico: "#252a34", penarol: "#8999b0",
  platense: "#a76b32", quimsa: "#be293c", "racing-chivilcoy": "#157bb9",
  regatas: "#247eb7", "san-lorenzo": "#a52b48", "san-martin": "#b52e39",
};

export const getMatchColorStyle = (homeId, awayId) => ({
  "--match-home-color": teamMatchColors[homeId] ?? "#18334b",
  "--match-away-color": teamMatchColors[awayId] ?? "#18334b",
});
