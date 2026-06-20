/* Generate the social share (Open Graph) image: public/og.png (1200x630). */
import sharp from "sharp";
import { join } from "node:path";
import { existsSync } from "node:fs";

const ROOT = process.cwd();
const W = 1200;
const H = 630;

function gemSVG(cx, cy, r) {
  const pts = (rr, off = 0) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (Math.PI / 4) * i + off;
      return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
    });
  const outer = pts(r, Math.PI / 8);
  const table = pts(r * 0.42, Math.PI / 8);
  const facets = outer
    .map((o, i) => {
      const o2 = outer[(i + 1) % 8];
      const t = table[i];
      const t2 = table[(i + 1) % 8];
      const fill = i % 2 === 0 ? "#d8b25e" : "#a9823a";
      return `<polygon points="${t[0]},${t[1]} ${o[0]},${o[1]} ${o2[0]},${o2[1]} ${t2[0]},${t2[1]}" fill="${fill}" stroke="#1a1626" stroke-width="2"/>`;
    })
    .join("");
  const girdle = `<polygon points="${outer.map((p) => p.join(",")).join(" ")}" fill="#8a672c" stroke="#1a1626" stroke-width="4"/>`;
  const tablePoly = `<polygon points="${table.map((p) => p.join(",")).join(" ")}" fill="url(#tbl)" stroke="rgba(255,255,255,.4)" stroke-width="2"/>`;
  return girdle + facets + tablePoly;
}

const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="rgba(12,9,22,0.92)"/>
      <stop offset="0.55" stop-color="rgba(12,9,22,0.7)"/>
      <stop offset="1" stop-color="rgba(12,9,22,0.35)"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4e3ad"/>
      <stop offset="0.55" stop-color="#d8b25e"/>
      <stop offset="1" stop-color="#a9823a"/>
    </linearGradient>
    <radialGradient id="tbl" cx="40%" cy="35%" r="75%">
      <stop offset="0" stop-color="#f7e8b8"/>
      <stop offset="0.6" stop-color="#d8b25e"/>
      <stop offset="1" stop-color="#8a672c"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <g transform="translate(0,0)">${gemSVG(1045, 330, 150)}</g>
  <text x="80" y="300" font-family="Georgia, 'Times New Roman', serif" font-size="118" font-weight="700"
        letter-spacing="6" fill="url(#gold)">SPLENDOR</text>
  <rect x="84" y="334" width="400" height="3" fill="#d8b25e" opacity="0.7"/>
  <text x="94" y="400" font-family="'Malgun Gothic','Segoe UI',sans-serif" font-size="40" fill="#ece8f6">르네상스 보석상 보드게임</text>
  <text x="94" y="460" font-family="'Malgun Gothic','Segoe UI',sans-serif" font-size="34" fill="#d8b25e" font-weight="600">온라인 멀티 · vs AI · 로컬 핫시트</text>
</svg>`;

const bgPath = join(ROOT, "public", "background.webp");
const overlay = Buffer.from(svg);

async function main() {
  const base = existsSync(bgPath)
    ? sharp(bgPath).resize(W, H, { fit: "cover" })
    : sharp({ create: { width: W, height: H, channels: 3, background: "#161221" } });
  await base.composite([{ input: overlay }]).png().toFile(join(ROOT, "public", "og.png"));
  console.log("wrote public/og.png");
}
main();
