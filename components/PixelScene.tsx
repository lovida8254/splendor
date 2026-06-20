import { CardLevel, TokenColor } from "@/lib/engine";
import { GEM_META } from "./gems";

// Original 16x11 pixel-art sprites (no third-party assets), recolored per gem.
// Palette: O outline, M/R gem base, m/r gem dark, A/L gem light, S skin, s skin-shadow,
//          G gold, d gold-dark, H/W white.
// Each card shows either a themed scene or a character bust (merchant/noble/miner),
// chosen deterministically from the card id for variety.

const SPRITES: Record<string, string[]> = {
  // ---- landmark scenes ----
  mine: [
    "                ",
    "       AA       ",
    "      OAAO      ",
    "      AMMA      ",
    "     OMMMMO     ",
    "  O  AMMMMA  O  ",
    " OmO OMMMMO OmO ",
    "OmmmO OMMO OmmmO",
    "OmmmmOOMMOOmmmmO",
    "OmmmmmmMMmmmmmmO",
    "OOOOOOOOOOOOOOOO",
  ],
  ship: [
    "      O       A ",
    "      O      AAA",
    "    OOMOO    AAA",
    "   OMMMMMO   AAA",
    "   OMMMMMO    A ",
    "   OMMMMMO      ",
    "      O         ",
    " OOOOOOOOOOOOO  ",
    " OMMMMMMMMMMMO  ",
    "  OmmmmmmmmmO   ",
    "AAAAAAAAAAAAAAAA",
  ],
  palace: [
    "      OGGO      ",
    "      GddG      ",
    "  OAO GMMG OAO  ",
    "  OMO GMMG OMO  ",
    "  OMO OMMO OMO  ",
    "  OMOOOMMOOOMO  ",
    "OOOMMMMMMMMMMMOO",
    "OMmMMmMMmMMmMMmO",
    "OMMMMMMMMMMMMMMO",
    "OMmMMMmMMMmMMMmO",
    "OOOOOOOOOOOOOOOO",
  ],
  // ---- character busts ----
  noble: [
    "     OGGGGO     ",
    "    OGdGGdGO    ",
    "     OSSSSO     ",
    "    OSSSSSSO    ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "     OSssSO     ",
    "    OHHHHHHO    ",
    "  OORRRRRRRROO  ",
    " ORRRRRRRRRRRRRO",
    " ORrRRRRRRRRRRrO",
  ],
  merchant: [
    "     ORRRRO     ",
    "    ORRRGRRO    ",
    "    ORRRRRRO    ",
    "     OSSSSO     ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "     OSssSO     ",
    "    OssssssO    ",
    "    OHHHHHHO    ",
    "  OORRRRRRRROO  ",
    " ORRRRRRRRRRRRRO",
  ],
  miner: [
    "                ",
    "     ORRRRO     ",
    "    ORRRRRRO    ",
    "     OSSSSO     ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "     OSssSO     ",
    "    OHHHHHHO    ",
    "  OORRRRRRRROO  ",
    " ORRRRGRRRRRRRO ",
    " ORrRRRRRRRRRrO ",
  ],
  queen: [
    "   OGOGAGOGO    ",
    "   OGGGGGGGGO   ",
    "    OSSSSSSO    ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "     OSssSO     ",
    "    OHHHHHHO    ",
    "   OHRRRRRRHO   ",
    "  ORRRRRRRRRRO  ",
    " ORRRRRLLRRRRRO ",
    " ORrRRRRRRRRrRO ",
  ],
  knight: [
    "      OGO       ",
    "     OMMMO      ",
    "    OMMMMMO     ",
    "    OMOOOMO     ",
    "    OMHHHMO     ",
    "    OMMMMMO     ",
    "     OMMMO      ",
    "    OHHHHHHO    ",
    "  OORRRRRRRROO  ",
    " ORRRRRRRRRRRRRO",
    " ORrRRRRRRRRRRrO",
  ],
  trader: [
    "                ",
    "   OOOOOOOOOO   ",
    "    ORRRRRRO    ",
    "     OSSSSO     ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "     OSssSO     ",
    "    OHHHHHHO    ",
    "  OORRRRRRRROO  ",
    " ORRRRGRRGRRRRO ",
    " ORrRRRRRRRRrRO ",
  ],
  crystal: [
    "                ",
    "   A    A    A  ",
    "  OMO  OMO  OMO ",
    "  OMO  OMO  OMO ",
    "  OMO  OMO  OMO ",
    " OMMMOOMMMOOMMMO",
    " OMMMOOMMMOOMMMO",
    "OmmmmmmmmmmmmmmO",
    "OmmmmmmmmmmmmmmO",
    "OOOOOOOOOOOOOOOO",
    "                ",
  ],
  caravan: [
    "            AAA ",
    "           AAAAA",
    "           AAAAA",
    "     OO  OO     ",
    "    OmmOOmmO    ",
    "  OOmmmmmmmmO   ",
    "  OmmmmmmmmmOO  ",
    "  O O O O OmmO  ",
    "MMMMMMMMMMMMMMMM",
    "mmmmmmmmmmmmmmmm",
    "mmmmmmmmmmmmmmmm",
  ],
  altar: [
    "                ",
    "       A        ",
    "      OAO       ",
    "      AMA       ",
    "     OMMMO      ",
    "      OMO       ",
    "    OOOOOOO     ",
    "    OMMMMMO     ",
    "   OMMMMMMMO    ",
    "  OMMMMMMMMMO   ",
    " OOOOOOOOOOOOO  ",
  ],
  dwarf: [
    "                ",
    "     ORRRRO     ",
    "    ORRRRRRO    ",
    "     OSSSSO     ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "    OHHHHHHO    ",
    "   OHHHHHHHHO   ",
    "   OHHHHHHHHO   ",
    "  OORRRRRRRROO  ",
    " ORRRRRRRRRRRRRO",
  ],
  lantern: [
    "      OGO       ",
    "      OGO       ",
    "     OGGGO      ",
    "    OGAAAGO     ",
    "    OGAAAGO     ",
    "    OGAAAGO     ",
    "     OGGGO      ",
    "      OGO       ",
    "                ",
    " mmmmmmmmmmmmmm ",
    "OOOOOOOOOOOOOOOO",
  ],
  lighthouse: [
    "       OO       ",
    "      OAAO      ",
    "      OMMO      ",
    "      OMMO      ",
    "     OMMMMO     ",
    "     OMmMMO     ",
    "     OMMmMO     ",
    "    OMMMMMMO    ",
    "   OMMMMMMMMO   ",
    "AAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAA",
  ],
  navigator: [
    "                ",
    "   OOOOOOOOOO   ",
    "    OMMMMMMO    ",
    "     OSSSSO     ",
    "    OSHSSHSO    ",
    "    OSSSSSSO  OO",
    "     OSssSO     ",
    "    OHHHHHHO    ",
    "  OORRRRRRRROO  ",
    " ORRRRRRRRRRRRRO",
    " ORrRRRRRRRRRRrO",
  ],
  king: [
    "    OGAGAGO     ",
    "    OGGGGGGO    ",
    "     OSSSSO     ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "    OHHHHHHO    ",
    "    OHHHHHHO    ",
    "   OHHHHHHHHO   ",
    "  OORRRRRRRROO  ",
    " ORRRRGGGGRRRRO ",
    " ORrRRRRRRRRrRO ",
  ],
  cathedral: [
    "       OO       ",
    "      OMMO      ",
    "      OMMO      ",
    "     OMMMMO     ",
    "    OMMAAMMO    ",
    "    OMAAAAMO    ",
    "   OMMMMMMMMO   ",
    "  OMMmMMmMMmMO  ",
    "  OMMmMMmMMmMO  ",
    "  OMMMMMMMMMMO  ",
    "OOOOOOOOOOOOOOOO",
  ],
  geode: [
    "                ",
    "    OmmmmmmO    ",
    "   OmmAAAAmmO   ",
    "  OmmAMMMMAmmO  ",
    "  OmAMMMMMMAmO  ",
    "  OmAMMMMMMAmO  ",
    "  OmmAMMMMAmmO  ",
    "   OmmAAAAmmO   ",
    "    OmmmmmmO    ",
    "     OmmmmO     ",
    "                ",
  ],
  prospector: [
    "                ",
    "     OMMMMO     ",
    "    OMAAAMMO    ",
    "     OSSSSO     ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "     OSssSO     ",
    "    OHHHHHHO    ",
    "  OORRRRRRRROO  ",
    " ORRRRRRRRRRRRRO",
    " ORrRRRRRRRRRRrO",
  ],
  compass: [
    "                ",
    "      OAAO      ",
    "     OMAAMO     ",
    "    OMMAAMMO    ",
    "  OMMMMAAMMMMO  ",
    "  OAAAAAAAAAAO  ",
    "  OMMMMAAMMMMO  ",
    "    OMMAAMMO    ",
    "     OMAAMO     ",
    "      OAAO      ",
    "                ",
  ],
  sailor: [
    "                ",
    "     OHHHHO     ",
    "    OHHHHHHO    ",
    "     OSSSSO     ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "     OSssSO     ",
    "    OHHHHHHO    ",
    "  OORHRHRHRROO  ",
    " ORHRHRHRHRHRHO ",
    " ORrHRHRHRHRrHO ",
  ],
  princess: [
    "                ",
    "     OGAGO      ",
    "    OSSSSSSO    ",
    "    OSHSSHSO    ",
    "    OSSSSSSO    ",
    "     OSssSO     ",
    "    OLLLLLLO    ",
    "   OLRRRRRRLO   ",
    "  ORRRRRRRRRRO  ",
    " ORRRRLLLLRRRRO ",
    " ORrRRRRRRRRrRO ",
  ],
  fountain: [
    "       A        ",
    "      AAA       ",
    "     OAAAO      ",
    "    OMMMMMMO    ",
    "     OMMMMO     ",
    "      OMMO      ",
    "      OMMO      ",
    "   OMMMMMMMMO   ",
    "  OMMAAAAAAMMO  ",
    " OMMMMMMMMMMMMO ",
    "OOOOOOOOOOOOOOOO",
  ],
};

// Per-level pools mixing character busts and landmark scenes for variety.
const POOLS: Record<CardLevel, string[]> = {
  1: ["miner", "mine", "crystal", "altar", "dwarf", "lantern", "geode", "prospector"],
  2: ["merchant", "ship", "caravan", "trader", "lighthouse", "navigator", "compass", "sailor"],
  3: ["noble", "palace", "queen", "knight", "king", "cathedral", "princess", "fountain"],
};

function hash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h);
}

const W = 16;
const H = 11;

/** A themed pixel-art illustration for a card, varied by id and tinted to its gem. */
export function PixelScene({
  level,
  color,
  cardId,
  className,
}: {
  level: CardLevel;
  color: TokenColor;
  cardId: string;
  className?: string;
}) {
  const m = GEM_META[color];
  const map: Record<string, string> = {
    O: "#120c1d",
    M: m.hex,
    m: m.dark,
    A: m.light,
    R: m.hex,
    r: m.dark,
    L: m.light,
    S: "#e8c9a0",
    s: "#c79e74",
    G: "#e6bd55",
    d: "#a9822f",
    H: "#ffffff",
    W: "#ffffff",
  };
  const pool = POOLS[level];
  const sprite = SPRITES[pool[hash(cardId) % pool.length]];

  const rects: JSX.Element[] = [];
  sprite.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = map[row[x]];
      if (!fill) continue;
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.04} height={1.04} fill={fill} />);
    }
  });
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      width="100%"
      height="100%"
      className={className}
      style={{ imageRendering: "pixelated" }}
    >
      {rects}
    </svg>
  );
}
