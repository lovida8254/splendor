import { Card, GEM_COLORS, Player, TokenPool } from "./types";
import { zeroTokens } from "./util";

export interface Deficit {
  /** Per-color shortfall after applying bonuses and owned color tokens. */
  need: Record<string, number>;
  /** Total gold required to cover all shortfalls. */
  gold: number;
}

/**
 * How much of the card's cost the player cannot cover with bonuses + matching
 * color tokens. The remainder must be paid with gold.
 */
export function deficit(p: Player, card: Card): Deficit {
  const need: Record<string, number> = {};
  let gold = 0;
  for (const c of GEM_COLORS) {
    const d = Math.max(0, card.cost[c] - p.bonuses[c] - p.tokens[c]);
    need[c] = d;
    gold += d;
  }
  return { need, gold };
}

export function canAfford(p: Player, card: Card): boolean {
  return deficit(p, card).gold <= p.tokens.gold;
}

/**
 * Auto payment plan: pay each color's net cost (cost - bonus) with that color's
 * tokens first, then cover any shortfall with gold. Uses only as much gold as
 * needed. Returns the tokens to be returned to the supply.
 */
export function autoPayment(p: Player, card: Card): TokenPool {
  const pay = zeroTokens();
  let goldNeeded = 0;
  for (const c of GEM_COLORS) {
    const net = Math.max(0, card.cost[c] - p.bonuses[c]); // cost after permanent discount
    const useColor = Math.min(net, p.tokens[c]);
    pay[c] = useColor;
    goldNeeded += net - useColor;
  }
  pay.gold = goldNeeded;
  return pay;
}

/**
 * Validate that an explicit payment plan legally covers a card:
 *  - player owns every token spent,
 *  - color tokens are only applied to their own color's net cost,
 *  - gold covers exactly the remaining shortfall,
 *  - no overpayment.
 */
export function validatePayment(
  p: Player,
  card: Card,
  payment: TokenPool,
): { ok: boolean; reason?: string } {
  let goldSpent = payment.gold ?? 0;
  if (goldSpent < 0) return { ok: false, reason: "음수 골드" };
  if (goldSpent > p.tokens.gold) return { ok: false, reason: "골드 부족" };

  for (const c of GEM_COLORS) {
    const spent = payment[c] ?? 0;
    if (spent < 0) return { ok: false, reason: `음수 토큰 (${c})` };
    if (spent > p.tokens[c]) return { ok: false, reason: `${c} 토큰 부족` };
    const net = Math.max(0, card.cost[c] - p.bonuses[c]);
    if (spent > net) return { ok: false, reason: `${c} 초과 지불` };
    const shortfall = net - spent;
    goldSpent -= shortfall;
  }
  if (goldSpent !== 0) {
    return { ok: false, reason: goldSpent > 0 ? "골드 초과 지불" : "골드 부족" };
  }
  return { ok: true };
}
