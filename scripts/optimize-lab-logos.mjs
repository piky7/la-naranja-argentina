import sharp from "sharp";
import { readFile, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const schedulePath = resolve(root, "data/lab/labSchedule.json");
const outputDir = resolve(root, "public/lab-team-logos");
const schedule = JSON.parse(await readFile(schedulePath, "utf8"));
const teams = [...new Map((schedule.teams || []).map(team => [String(team.teamId), team])).values()];
if (!teams.length) throw new Error("No se encontraron equipos LAB para optimizar sus escudos.");

// Elimina únicamente el fondo conectado a los bordes, conservando los blancos
// y otros colores que estén encerrados dentro del escudo.
const removeBackground = ({ data, info }) => {
  const { width, height, channels } = info;
  if (channels < 4 || width < 2 || height < 2) return data;
  const corners = [
    0,
    (width - 1) * channels,
    ((height - 1) * width) * channels,
    ((height * width) - 1) * channels,
  ];
  const background = [0, 1, 2].map(channel =>
    corners.map(index => data[index + channel]).sort((a, b) => a - b)[1]
  );
  const thresholdSquared = 52 * 52;
  const total = width * height;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const isBackground = pixel => {
    const index = pixel * channels;
    if (data[index + 3] === 0) return true;
    const dr = data[index] - background[0];
    const dg = data[index + 1] - background[1];
    const db = data[index + 2] - background[2];
    return dr * dr + dg * dg + db * db <= thresholdSquared;
  };
  const add = pixel => {
    if (pixel < 0 || pixel >= total || visited[pixel] || !isBackground(pixel)) return;
    visited[pixel] = 1;
    queue[tail++] = pixel;
  };

  for (let x = 0; x < width; x++) {
    add(x);
    add((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    add(y * width);
    add(y * width + width - 1);
  }

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    if (x > 0) add(pixel - 1);
    if (x < width - 1) add(pixel + 1);
    if (pixel >= width) add(pixel - width);
    if (pixel < total - width) add(pixel + width);
  }

  for (let i = 0; i < total; i++) {
    if (visited[i]) data[i * channels + 3] = 0;
  }
  return data;
};

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

let originalBytes = 0;
let webpBytes = 0;
let converted = 0;

for (let offset = 0; offset < teams.length; offset += 4) {
  const batch = teams.slice(offset, offset + 4);
  const results = await Promise.all(batch.map(async team => {
    const id = String(team.teamId);
    const url = team.crestUrl || `https://www.laliganacional.com.ar/escudos/${team.clubId}/${id}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "LaNaranjaArgentina/1.0 (+https://lanaranjaargentina.com.ar)", Accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`${team.name}: HTTP ${response.status} al descargar el escudo`);
    const input = Buffer.from(await response.arrayBuffer());
    if (input.length < 100) throw new Error(`${team.name}: archivo de escudo vacío o inválido`);
    const { data, info } = await sharp(input, { failOn: "error" })
      .resize({ width: 256, height: 256, fit: "inside", withoutEnlargement: true })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const transparent = removeBackground({ data, info });
    const outputPath = resolve(outputDir, `${id}.webp`);
    const output = await sharp(transparent, { raw: info })
      .webp({ quality: 88, alphaQuality: 100, effort: 5 })
      .toFile(outputPath);
    return { inputBytes: input.length, outputBytes: output.size };
  }));
  for (const result of results) {
    originalBytes += result.inputBytes;
    webpBytes += result.outputBytes;
    converted++;
  }
}

if (converted !== teams.length || !webpBytes) {
  throw new Error(`Conversión LAB incompleta: ${converted}/${teams.length}`);
}
console.log(`Escudos LAB: ${converted} convertidos a WebP con fondo transparente, ${(originalBytes / 1024).toFixed(1)} KiB → ${(webpBytes / 1024).toFixed(1)} KiB`);
