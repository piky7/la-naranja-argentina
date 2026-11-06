// Formato compacto guardado en el campo de identidad ya existente en D1.
// No se usa contenido HTML/SVG proporcionado por el usuario.
export const SPORTS_SHAPES = [
  ["classic","Clásico"],["pointed","En punta"],["rounded","Redondeado"],
  ["flat","Rectangular"],["wide","Ancho"],
];
export const SPORTS_PATTERNS = [
  ["solid","Liso"],["vertical","Rayas verticales"],["thin","Rayas finas"],
  ["diagonal","Franja diagonal"],["horizontal","Franja horizontal"],
  ["double","Dos franjas"],["half","Mitad superior/inferior"],["quarters","Cuatro sectores"],
];
export const SPORTS_PLACEMENTS = [
  ["top","Nombre arriba"],["middle","Nombre al centro"],["bottom","Nombre abajo"],["none","Sin nombre interior"],
];
export const SPORTS_BORDERS = [
  ["simple","Borde simple"],["double","Borde doble"],["thick","Borde grueso"],
];
export const DEFAULT_SPORTS_DESIGN = Object.freeze({
  shape:"classic", pattern:"vertical", placement:"top", border:"double", label:"",
});
const allowed = (collection, value) => collection.some(([id]) => id === value);
export function parseSportsDesign(value) {
  const parts = typeof value === "string" ? value.split(":") : [];
  if (parts.length !== 6 || parts[0] !== "sport") return { ...DEFAULT_SPORTS_DESIGN };
  const [,shape,pattern,placement,border,label] = parts;
  if (!/^[A-Z0-9 _-]{0,20}$/.test(label) || !allowed(SPORTS_SHAPES, shape) || !allowed(SPORTS_PATTERNS, pattern) ||
      !allowed(SPORTS_PLACEMENTS, placement) || !allowed(SPORTS_BORDERS, border)) {
    return { ...DEFAULT_SPORTS_DESIGN };
  }
  return { shape,pattern,placement,border,label };
}
export function serializeSportsDesign(design) {
  const d = { ...DEFAULT_SPORTS_DESIGN, ...design };
  const label = String(d.label || "").trim().toUpperCase().replace(/[^A-Z0-9 _-]/g, "").slice(0,20);
  return "sport:" + d.shape + ":" + d.pattern + ":" + d.placement + ":" + d.border + ":" + label;
}
export function isSportsDesign(value) {
  if (typeof value !== "string" || !value.startsWith("sport:")) return false;
  return serializeSportsDesign(parseSportsDesign(value)) === value;
}
