import { TokenColor } from "@/lib/engine";
import { GEM_META } from "./gems";

// Original 12x12 pixel-art gem sprite (no third-party assets).
// O=outline, L=light, H=highlight, B=base, D=dark, ' '=transparent.
const ROWS = [
  "    OOOO    ",
  "   OLLBBO   ",
  "  OLLLBBBO  ",
  " OLLLBBBBDO ",
  "OLLLHBBBBDDO",
  "OLLBBBBBBDDO",
  "OLLBBBBBBDDO",
  " OLBBBBBBDO ",
  "  OLBBBBDO  ",
  "   OLBBDO   ",
  "    OLDO    ",
  "     OO     ",
];

/** A blocky pixel-art gem in the given color. Crisp at any size. */
export function PixelGem({ color, size = 64 }: { color: TokenColor; size?: number }) {
  const m = GEM_META[color];
  const map: Record<string, string> = {
    O: "#120c1d",
    L: m.light,
    H: "#ffffff",
    B: m.hex,
    D: m.dark,
  };
  const n = 12;
  const px = size / n;
  const rects: JSX.Element[] = [];
  ROWS.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const fill = map[ch];
      if (!fill) return;
      rects.push(
        <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px + 0.6} height={px + 0.6} fill={fill} />,
      );
    });
  });
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      style={{ imageRendering: "pixelated" }}
      className="drop-shadow-[0_2px_3px_rgba(0,0,0,.5)]"
    >
      {rects}
    </svg>
  );
}
