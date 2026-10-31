import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { teams } from "../data/teams";

const site = "https://lanaranjaargentina.com.ar";
const defaultDescription = "Seguí la Liga Nacional de Básquet argentino: resultados en vivo, fixture, tabla de posiciones, equipos, jugadores y estadísticas de la temporada 2026/27.";

const pages = {
  "/": ["La Naranja Argentina | Liga Nacional de Básquet", defaultDescription],
  "/liga": ["Liga Nacional 2026/27 | Fixture, Resultados y Posiciones", "Fixture, resultados, próximos partidos y tabla de posiciones de la Liga Nacional de Básquet 2026/27."],
  "/equipos": ["Equipos de la Liga Nacional de Básquet 2026/27", "Conocé los equipos de la Liga Nacional de Básquet 2026/27, sus planteles, partidos y estadísticas."],
  "/jugadores": ["Jugadores de la Liga Nacional de Básquet 2026/27", "Consultá jugadores, equipos y estadísticas de la Liga Nacional de Básquet argentino 2026/27."],
  "/prode": ["Prode LNA | Próximamente", "Próximamente: Prode de La Naranja Argentina, rankings, ligas privadas y estadísticas de pronósticos de la Liga Nacional."],
  "/estadisticas": ["Estadísticas de la Liga Nacional de Básquet 2026/27", "Promedios, goleadores y estadísticas de jugadores de la Liga Nacional de Básquet 2026/27."],
  "/acerca": ["Acerca de La Naranja Argentina", "Conocé La Naranja Argentina, el sitio dedicado a la Liga Nacional de Básquet."],
  "/privacidad": ["Política de Privacidad | La Naranja Argentina", "Consultá la política de privacidad de La Naranja Argentina."],
};

function setMeta(selector, attribute, content) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    const match = selector.match(/meta\[(name|property)="([^"]+)"\]/);
    if (!match) return;
    element.setAttribute(match[1], match[2]);
    document.head.appendChild(element);
  }
  element.setAttribute(attribute, content);
}

export default function SeoMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.replace(/\/$/, "") || "/";
    const teamId = path.startsWith("/equipos/") ? decodeURIComponent(path.slice(9)) : null;
    const team = teamId ? teams.find((item) => item.id === teamId) : null;
    const [title, description] = team
      ? [`${team.name} | Plantel, Resultados y Estadísticas`, `Conocé el plantel, los resultados, próximos partidos y estadísticas de ${team.name} en la Liga Nacional de Básquet 2026/27.`]
      : (pages[path] || pages["/"]);

    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);

    let canonical = document.head.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    const url = site + path;
    canonical.href = url;
    setMeta('meta[property="og:url"]', "content", url);
  }, [pathname]);

  return null;
}
