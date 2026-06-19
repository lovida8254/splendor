import cardsRaw from "@/data/cards.json";
import noblesRaw from "@/data/nobles.json";
import { Card, CardLevel, GEM_COLORS, Noble } from "./types";

// Validate and normalize the seed data once at module load so any malformed
// data fails loudly rather than silently corrupting a game.

function validateCards(raw: unknown): Card[] {
  if (!Array.isArray(raw)) throw new Error("cards.json must be an array");
  const cards = raw as Card[];
  const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
  const ids = new Set<string>();
  for (const c of cards) {
    if (!c.id || ids.has(c.id)) throw new Error(`Card id missing/duplicate: ${c.id}`);
    ids.add(c.id);
    if (![1, 2, 3].includes(c.level)) throw new Error(`Card ${c.id} bad level ${c.level}`);
    if (!GEM_COLORS.includes(c.bonus)) throw new Error(`Card ${c.id} bad bonus ${c.bonus}`);
    if (typeof c.prestige !== "number" || c.prestige < 0 || c.prestige > 5)
      throw new Error(`Card ${c.id} bad prestige ${c.prestige}`);
    for (const g of GEM_COLORS) {
      const v = c.cost[g];
      if (typeof v !== "number" || v < 0) throw new Error(`Card ${c.id} bad cost for ${g}`);
    }
    byLevel[c.level]++;
  }
  if (byLevel[1] !== 40 || byLevel[2] !== 30 || byLevel[3] !== 20) {
    throw new Error(
      `Card level counts wrong: L1=${byLevel[1]} L2=${byLevel[2]} L3=${byLevel[3]} (expected 40/30/20)`,
    );
  }
  return cards;
}

function validateNobles(raw: unknown): Noble[] {
  if (!Array.isArray(raw)) throw new Error("nobles.json must be an array");
  const nobles = raw as Noble[];
  if (nobles.length !== 10) throw new Error(`Expected 10 nobles, got ${nobles.length}`);
  const ids = new Set<string>();
  for (const n of nobles) {
    if (!n.id || ids.has(n.id)) throw new Error(`Noble id missing/duplicate: ${n.id}`);
    ids.add(n.id);
    if (n.prestige !== 3) throw new Error(`Noble ${n.id} prestige must be 3`);
    for (const g of GEM_COLORS) {
      const v = n.requirement[g];
      if (typeof v !== "number" || v < 0) throw new Error(`Noble ${n.id} bad requirement for ${g}`);
    }
  }
  return nobles;
}

export const ALL_CARDS: Card[] = validateCards(cardsRaw);
export const ALL_NOBLES: Noble[] = validateNobles(noblesRaw);

export function cardsByLevel(level: CardLevel): Card[] {
  return ALL_CARDS.filter((c) => c.level === level);
}
