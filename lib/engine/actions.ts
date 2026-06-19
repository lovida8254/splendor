import { eligibleNobles } from "./nobles";
import { realMainActions } from "./moves";
import { autoPayment, canAfford, validatePayment } from "./payment";
import {
  Action,
  Card,
  CardLevel,
  GameState,
  GEM_COLORS,
  GemColor,
  Noble,
  Player,
  RNG,
  TOKEN_COLORS,
  TokenColor,
  TokenPool,
  ValidationResult,
} from "./types";
import { clone, sumTokenPool, totalTokens, zeroTokens } from "./util";

const TOKEN_LIMIT = 10;
const MAX_RESERVED = 3;
const WIN_PRESTIGE = 15;

function current(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

/** Number of supply colors (excluding gold) that still have at least one token. */
function availableColors(state: GameState): number {
  return GEM_COLORS.filter((c) => state.pool[c] >= 1).length;
}

function log(state: GameState, type: string, detail: string) {
  state.log.push({
    turn: state.turnCount + 1,
    playerId: current(state).id,
    type,
    detail,
  });
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export function validate(state: GameState, action: Action): ValidationResult {
  if (state.phase === "finished") return { ok: false, reason: "게임이 종료되었습니다" };

  // While a discard or noble choice is pending, only those resolutions are legal.
  if (state.pendingDiscard) {
    if (action.type !== "DISCARD_TOKENS")
      return { ok: false, reason: "토큰을 10개로 줄여야 합니다" };
  } else if (state.pendingNoble) {
    if (action.type !== "CHOOSE_NOBLE")
      return { ok: false, reason: "방문할 귀족을 선택해야 합니다" };
  } else if (action.type === "DISCARD_TOKENS" || action.type === "CHOOSE_NOBLE") {
    return { ok: false, reason: "지금은 해당 행동을 할 수 없습니다" };
  }

  const p = current(state);

  switch (action.type) {
    case "TAKE_THREE": {
      const colors = action.colors;
      const unique = new Set(colors);
      if (unique.size !== colors.length) return { ok: false, reason: "같은 색을 중복 선택" };
      if (colors.length < 1 || colors.length > 3)
        return { ok: false, reason: "1~3색만 가능" };
      for (const c of colors) {
        if (!GEM_COLORS.includes(c)) return { ok: false, reason: `잘못된 색 ${c}` };
        if (state.pool[c] < 1) return { ok: false, reason: `${c} 토큰 없음` };
      }
      const required = Math.min(3, availableColors(state));
      if (required === 0) return { ok: false, reason: "가져올 토큰이 없습니다" };
      if (colors.length !== required)
        return { ok: false, reason: `서로 다른 ${required}색을 가져와야 합니다` };
      return { ok: true };
    }

    case "TAKE_TWO": {
      const c = action.color;
      if (!GEM_COLORS.includes(c)) return { ok: false, reason: `잘못된 색 ${c}` };
      if (state.pool[c] < 4)
        return { ok: false, reason: "해당 색이 4개 이상일 때만 2개 가져오기 가능" };
      return { ok: true };
    }

    case "RESERVE": {
      if (p.reserved.length >= MAX_RESERVED)
        return { ok: false, reason: "예약은 최대 3장" };
      const src = action.source;
      if (src.from === "board") {
        const card = state.board[src.level]?.[src.slot];
        if (!card) return { ok: false, reason: "해당 슬롯에 카드가 없습니다" };
      } else {
        if (state.decks[src.level].length === 0)
          return { ok: false, reason: "덱이 비어 블라인드 예약 불가" };
      }
      return { ok: true };
    }

    case "PURCHASE": {
      const card = findPurchaseCard(state, p, action.source);
      if (!card) return { ok: false, reason: "구매할 카드를 찾을 수 없습니다" };
      if (!canAfford(p, card)) return { ok: false, reason: "비용이 부족합니다" };
      if (action.payment) {
        const v = validatePayment(p, card, action.payment);
        if (!v.ok) return { ok: false, reason: v.reason };
      }
      return { ok: true };
    }

    case "DISCARD_TOKENS": {
      if (!state.pendingDiscard) return { ok: false, reason: "반환할 필요가 없습니다" };
      const discard = action.tokens;
      for (const c of TOKEN_COLORS) {
        const v = discard[c] ?? 0;
        if (v < 0) return { ok: false, reason: "음수 반환" };
        if (v > p.tokens[c]) return { ok: false, reason: `${c} 보유량 초과 반환` };
      }
      const excess = totalTokens(p) - TOKEN_LIMIT;
      if (sumTokenPool(discard) !== excess)
        return { ok: false, reason: `정확히 ${excess}개를 반환해야 합니다` };
      return { ok: true };
    }

    case "CHOOSE_NOBLE": {
      if (!state.pendingNoble) return { ok: false, reason: "귀족 선택 단계가 아닙니다" };
      if (!state.pendingNoble.includes(action.nobleId))
        return { ok: false, reason: "선택할 수 없는 귀족입니다" };
      return { ok: true };
    }

    case "PASS": {
      // Only allowed when the player truly has no other action.
      if (realMainActions(state).length > 0)
        return { ok: false, reason: "가능한 행동이 있으면 패스할 수 없습니다" };
      return { ok: true };
    }
  }
}

function findPurchaseCard(
  state: GameState,
  p: Player,
  source: Extract<Action & { type: "PURCHASE" }, object>["source"] | { from: string },
): Card | null {
  if ((source as any).from === "board") {
    const s = source as { from: "board"; level: CardLevel; slot: number };
    return state.board[s.level]?.[s.slot] ?? null;
  }
  if ((source as any).from === "reserved") {
    const s = source as { from: "reserved"; cardId: string };
    return p.reserved.find((c) => c.id === s.cardId) ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Reduction (pure: clones state, never mutates the input)
// ---------------------------------------------------------------------------

export function applyAction(state: GameState, action: Action, rng?: RNG): GameState {
  const v = validate(state, action);
  if (!v.ok) throw new Error(`잘못된 행동: ${action.type} — ${v.reason}`);

  const next = clone(state);
  const p = current(next);

  switch (action.type) {
    case "TAKE_THREE": {
      for (const c of action.colors) {
        next.pool[c] -= 1;
        p.tokens[c] += 1;
      }
      log(next, "TAKE_THREE", action.colors.join(","));
      return afterMainAction(next, rng);
    }

    case "TAKE_TWO": {
      next.pool[action.color] -= 2;
      p.tokens[action.color] += 2;
      log(next, "TAKE_TWO", `${action.color} x2`);
      return afterMainAction(next, rng);
    }

    case "RESERVE": {
      const src = action.source;
      let card: Card;
      if (src.from === "board") {
        card = next.board[src.level][src.slot]!;
        refill(next, src.level, src.slot);
      } else {
        card = next.decks[src.level].pop()!;
      }
      p.reserved.push(card);
      if (next.pool.gold >= 1) {
        next.pool.gold -= 1;
        p.tokens.gold += 1;
      }
      log(next, "RESERVE", `${card.id}${src.from === "deck" ? " (블라인드)" : ""}`);
      return afterMainAction(next, rng);
    }

    case "PURCHASE": {
      const src = action.source;
      const card = findPurchaseCard(next, p, src)!;
      const payment = action.payment ?? autoPayment(p, card);
      // Pay: remove from player, return to supply.
      for (const c of TOKEN_COLORS) {
        const amt = payment[c] ?? 0;
        p.tokens[c] -= amt;
        next.pool[c] += amt;
      }
      // Remove card from its origin.
      if (src.from === "board") {
        next.board[src.level][src.slot] = null;
        refill(next, src.level, src.slot);
      } else {
        p.reserved = p.reserved.filter((c) => c.id !== card.id);
      }
      p.purchased.push(card);
      p.bonuses[card.bonus] += 1;
      p.prestige += card.prestige;
      log(next, "PURCHASE", `${card.id} (+${card.prestige})`);
      return afterMainAction(next, rng);
    }

    case "DISCARD_TOKENS": {
      for (const c of TOKEN_COLORS) {
        const amt = action.tokens[c] ?? 0;
        p.tokens[c] -= amt;
        next.pool[c] += amt;
      }
      log(next, "DISCARD", describeTokens(action.tokens));
      next.pendingDiscard = false;
      // Discard resolved; continue to noble + end-of-turn.
      return nobleGateThenFinalize(next, rng);
    }

    case "CHOOSE_NOBLE": {
      const noble = next.nobles.find((n) => n.id === action.nobleId)!;
      grantNoble(next, p, noble);
      next.pendingNoble = null;
      return finalize(next, rng);
    }

    case "PASS": {
      log(next, "PASS", "가능한 행동 없음");
      return afterMainAction(next, rng);
    }
  }
}

function refill(state: GameState, level: CardLevel, slot: number) {
  state.board[level][slot] = state.decks[level].pop() ?? null;
}

function grantNoble(state: GameState, p: Player, noble: Noble) {
  p.nobles.push(noble);
  p.prestige += noble.prestige;
  state.nobles = state.nobles.filter((n) => n.id !== noble.id);
  log(state, "NOBLE", noble.name ?? noble.id);
}

function describeTokens(t: Partial<TokenPool>): string {
  return TOKEN_COLORS.filter((c) => (t[c] ?? 0) > 0)
    .map((c) => `${c}:${t[c]}`)
    .join(" ");
}

// ---------------------------------------------------------------------------
// End-of-turn pipeline: discard gate -> noble gate -> finalize/advance
// ---------------------------------------------------------------------------

function afterMainAction(state: GameState, rng?: RNG): GameState {
  const p = current(state);
  if (totalTokens(p) > TOKEN_LIMIT) {
    state.pendingDiscard = true;
    return state; // wait for DISCARD_TOKENS
  }
  return nobleGateThenFinalize(state, rng);
}

function nobleGateThenFinalize(state: GameState, rng?: RNG): GameState {
  const p = current(state);
  const eligible = eligibleNobles(p, state.nobles);
  if (eligible.length > 1) {
    state.pendingNoble = eligible.map((n) => n.id);
    return state; // wait for CHOOSE_NOBLE
  }
  if (eligible.length === 1) {
    grantNoble(state, p, eligible[0]);
  }
  return finalize(state, rng);
}

function finalize(state: GameState, _rng?: RNG): GameState {
  const p = current(state);

  // Trigger the final round the first time anyone reaches the win threshold.
  if (p.prestige >= WIN_PRESTIGE && state.finalRoundTriggeredBy === null) {
    state.finalRoundTriggeredBy = p.id;
    state.phase = "finalRound";
  }

  const n = state.players.length;
  const nextIndex = (state.currentPlayerIndex + 1) % n;
  state.turnCount += 1;

  if (nextIndex === state.startPlayerIndex) {
    // A full round just completed.
    if (state.phase === "finalRound") {
      state.phase = "finished";
      state.winnerId = computeWinner(state);
      state.currentPlayerIndex = nextIndex;
      return state;
    }
    state.round += 1;
  }
  state.currentPlayerIndex = nextIndex;
  return state;
}

/**
 * Winner: highest prestige; tie-break fewest purchased cards (PRD 2.7);
 * remaining ties resolved by lowest player index for determinism.
 */
export function computeWinner(state: GameState): string {
  const ranked = [...state.players].sort((a, b) => {
    if (b.prestige !== a.prestige) return b.prestige - a.prestige;
    if (a.purchased.length !== b.purchased.length)
      return a.purchased.length - b.purchased.length;
    return state.players.indexOf(a) - state.players.indexOf(b);
  });
  return ranked[0].id;
}

/** Final standings, best first (same ordering as computeWinner). */
export function standings(state: GameState): Player[] {
  return [...state.players].sort((a, b) => {
    if (b.prestige !== a.prestige) return b.prestige - a.prestige;
    if (a.purchased.length !== b.purchased.length)
      return a.purchased.length - b.purchased.length;
    return state.players.indexOf(a) - state.players.indexOf(b);
  });
}
