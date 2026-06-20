/* One-off: back up oversized source art (*.png.png) to art_src/ and write
   web-optimized .webp into public/cards (and noble bg into public/nobles). */
import sharp from "sharp";
import { readdirSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CARDS = join(ROOT, "public", "cards");
const NOBLES = join(ROOT, "public", "nobles");
const SRC = join(ROOT, "art_src");
mkdirSync(SRC, { recursive: true });
mkdirSync(NOBLES, { recursive: true });

const files = readdirSync(CARDS).filter((f) => f.toLowerCase().endsWith(".png.png"));
for (const f of files) {
  const base = f.slice(0, -".png.png".length); // e.g. "L1_White_Diamond"
  const orig = join(CARDS, f);
  const backup = join(SRC, f);
  renameSync(orig, backup); // move heavy original out of the served/committed tree

  const isNoble = /noble/i.test(base);
  const dest = isNoble ? NOBLES : CARDS;
  const max = isNoble ? { width: 360, height: 360 } : { width: 512, height: 800 };
  await sharp(backup)
    .resize({ ...max, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(join(dest, `${base}.webp`));
  console.log("optimized", base + ".webp", "->", isNoble ? "nobles" : "cards");
}
console.log("done");
