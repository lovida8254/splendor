/** Generate PWA PNG icons (any + maskable, 192/512) from an inline SVG. */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public", "icons");
mkdirSync(OUT, { recursive: true });

/** A faceted gem in gold gradient. `scale` controls content size within the 512 box. */
function svg(scale: number, rounded: boolean): string {
  const S = 512;
  const cx = S / 2;
  const cy = S / 2;
  const r = (S / 2) * scale; // gem radius
  // Hexagonal gem outline (top crown + bottom point).
  const topY = cy - r * 0.62;
  const midY = cy - r * 0.18;
  const botY = cy + r * 0.92;
  const lx = cx - r * 0.82;
  const rx = cx + r * 0.82;
  const ilx = cx - r * 0.42;
  const irx = cx + r * 0.42;
  const tableY = cy - r * 0.18;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a2142"/>
      <stop offset="1" stop-color="#161221"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4e3ad"/>
      <stop offset="0.5" stop-color="#d8b25e"/>
      <stop offset="1" stop-color="#a9823a"/>
    </linearGradient>
    <linearGradient id="goldDark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#caa860"/>
      <stop offset="1" stop-color="#8a672c"/>
    </linearGradient>
  </defs>
  <rect width="${S}" height="${S}" rx="${rounded ? 96 : 0}" fill="url(#bg)"/>
  <g stroke="#1a1626" stroke-width="3" stroke-linejoin="round">
    <!-- crown facets -->
    <polygon points="${lx},${tableY} ${ilx},${topY} ${irx},${topY} ${rx},${tableY}" fill="url(#gold)"/>
    <polygon points="${lx},${tableY} ${ilx},${topY} ${cx},${midY}" fill="url(#goldDark)"/>
    <polygon points="${rx},${tableY} ${irx},${topY} ${cx},${midY}" fill="url(#goldDark)"/>
    <polygon points="${ilx},${topY} ${irx},${topY} ${cx},${midY}" fill="url(#gold)"/>
    <!-- pavilion (lower point) -->
    <polygon points="${lx},${tableY} ${cx},${midY} ${cx},${botY}" fill="url(#goldDark)"/>
    <polygon points="${rx},${tableY} ${cx},${midY} ${cx},${botY}" fill="url(#gold)"/>
  </g>
</svg>`;
}

async function emit(name: string, size: number, scale: number, rounded: boolean) {
  const buf = Buffer.from(svg(scale, rounded));
  await sharp(buf).resize(size, size).png().toFile(join(OUT, name));
  console.log("wrote", name);
}

async function main() {
  // "any" icons: rounded card, gem fills ~76%.
  await emit("icon-192.png", 192, 0.76, true);
  await emit("icon-512.png", 512, 0.76, true);
  // maskable: full-bleed bg, gem within safe zone ~58%.
  await emit("icon-maskable-192.png", 192, 0.58, false);
  await emit("icon-maskable-512.png", 512, 0.58, false);
}

main();
