import {
  BonusMap,
  GemColor,
  GEM_COLORS,
  GemCost,
  Player,
  RNG,
  TokenColor,
  TOKEN_COLORS,
  TokenPool,
} from "./types";

export function zeroGems(): GemCost {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

export function zeroBonus(): BonusMap {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0 };
}

export function zeroTokens(): TokenPool {
  return { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 };
}

export function totalTokens(p: Player): number {
  return TOKEN_COLORS.reduce((s, c) => s + p.tokens[c], 0);
}

export function sumTokenPool(t: Partial<TokenPool>): number {
  return TOKEN_COLORS.reduce((s, c) => s + (t[c] ?? 0), 0);
}

export function cardCostSum(cost: GemCost): number {
  return GEM_COLORS.reduce((s, c) => s + cost[c], 0);
}

/** Mulberry32: small, fast, deterministic PRNG seeded by an integer. */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** In-place Fisher-Yates shuffle using the provided RNG. Returns the same array. */
export function shuffle<T>(arr: T[], rng: RNG): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function isGemColor(c: string): c is GemColor {
  return (GEM_COLORS as string[]).includes(c);
}

export function isTokenColor(c: string): c is TokenColor {
  return (TOKEN_COLORS as string[]).includes(c);
}
