import { canAfford } from "./payment";
import {
  Action,
  CardLevel,
  CARD_LEVELS,
  GameState,
  GEM_COLORS,
  GemColor,
  Player,
  TOKEN_COLORS,
  TokenPool,
} from "./types";
import { totalTokens } from "./util";

function current(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

/** k-combinations of an array. */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const [head, ...rest] = arr;
  const withHead = combinations(rest, k - 1).map((c) => [head, ...c]);
  const withoutHead = combinations(rest, k);
  return [...withHead, ...withoutHead];
}

/**
 * The four "real" main actions available to the current player, with no PASS
 * fallback. Empty if the player is genuinely stuck.
 */
export function realMainActions(state: GameState): Action[] {
  if (state.phase === "finished" || state.pendingDiscard || state.pendingNoble) return [];
  const p = current(state);
  const actions: Action[] = [];

  // TAKE_THREE: exactly min(3, availableColors) distinct colors.
  const avail = GEM_COLORS.filter((c) => state.pool[c] >= 1);
  const takeCount = Math.min(3, avail.length);
  if (takeCount > 0) {
    for (const combo of combinations(avail, takeCount)) {
      actions.push({ type: "TAKE_THREE", colors: combo });
    }
  }

  // TAKE_TWO: colors with >= 4 in supply.
  for (const c of GEM_COLORS) {
    if (state.pool[c] >= 4) actions.push({ type: "TAKE_TWO", color: c });
  }

  // RESERVE: board slots + deck tops, if under the reserve limit.
  if (p.reserved.length < 3) {
    for (const level of CARD_LEVELS) {
      for (let slot = 0; slot < state.board[level].length; slot++) {
        if (state.board[level][slot]) {
          actions.push({ type: "RESERVE", source: { from: "board", level, slot } });
        }
      }
      if (state.decks[level].length > 0) {
        actions.push({ type: "RESERVE", source: { from: "deck", level } });
      }
    }
  }

  // PURCHASE: affordable board cards + reserved cards.
  for (const level of CARD_LEVELS) {
    for (let slot = 0; slot < state.board[level].length; slot++) {
      const card = state.board[level][slot];
      if (card && canAfford(p, card)) {
        actions.push({ type: "PURCHASE", source: { from: "board", level, slot } });
      }
    }
  }
  for (const card of p.reserved) {
    if (canAfford(p, card)) {
      actions.push({ type: "PURCHASE", source: { from: "reserved", cardId: card.id } });
    }
  }

  return actions;
}

/**
 * Legal main actions for the current player. If the player is genuinely stuck
 * (no tokens to take, reserves full, nothing affordable) the only legal action
 * is a forced PASS — Splendor's rule for an unactionable turn.
 */
export function legalMainActions(state: GameState): Action[] {
  if (state.phase === "finished" || state.pendingDiscard || state.pendingNoble) return [];
  const actions = realMainActions(state);
  return actions.length > 0 ? actions : [{ type: "PASS" }];
}

/**
 * A simple, legal discard that returns the exact excess down to 10 tokens.
 * Returns gold last (gold is the most valuable), then the colors the player
 * holds the most of. Used by AI and as a UI default.
 */
export function autoDiscard(state: GameState): Partial<TokenPool> {
  const p = current(state);
  let excess = totalTokens(p) - 10;
  const discard: Partial<TokenPool> = {};
  if (excess <= 0) return discard;

  // Prefer discarding colors the player has most of; keep gold for last.
  const order = [...GEM_COLORS]
    .sort((a, b) => p.tokens[b] - p.tokens[a])
    .concat("gold" as GemColor);
  for (const c of order as (keyof TokenPool)[]) {
    if (excess <= 0) break;
    const take = Math.min(excess, p.tokens[c]);
    if (take > 0) {
      discard[c] = take;
      excess -= take;
    }
  }
  return discard;
}
