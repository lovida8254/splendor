/* One-off: back up oversized gem token art (public/gem/*.png.png) to art_src/
   and write web-optimized .webp back into public/gem. */
import sharp from "sharp";
import { readdirSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const GEM = join(ROOT, "public", "gem");
const SRC = join(ROOT, "art_src", "gem");
mkdirSync(SRC, { recursive: true });

const files = readdirSync(GEM).filter((f) => f.toLowerCase().endsWith(".png.png"));
for (const f of files) {
  const base = f.slice(0, -".png.png".length);
  const orig = join(GEM, f);
  const backup = join(SRC, f);
  renameSync(orig, backup);
  await sharp(backup)
    .resize({ width: 160, height: 160, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86 })
    .toFile(join(GEM, `${base}.webp`));
  console.log("optimized", base + ".webp");
}
console.log("done");
