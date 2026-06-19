import { describe, expect, it } from "vitest";
import { aiAction } from "@/lib/ai/ai";
import { applyAction } from "./actions";
import { legalMainActions, autoDiscard } from "./moves";
import { newGame, PlayerConfig } from "./setup";
import {
  Action,
  CARD_LEVELS,
  GameState,
  GEM_COLORS,
  RNG,
  TOKEN_COLORS,
} from "./types";
import { mulberry32, totalTokens } from "./util";

const MAX_ACTIONS = 5000;

function countCards(state: GameState): number {
  let n = 0;
  for (const lvl of CARD_LEVELS) {
    n += state.board[lvl].filter((c) => c !== null).length;
    n += state.decks[lvl].length;
  }
  for (const p of state.players) n += p.reserved.length + p.purchased.length;
  return n;
}

function checkInvariants(state: GameState, initialPool: Record<string, number>) {
  // Token conservation per color (pool + all players).
  for (const c of TOKEN_COLORS) {
    let total = state.pool[c];
    for (const p of state.players) total += p.tokens[c];
    expect(total, `토큰 보존 위반 (${c})`).toBe(initialPool[c]);
    expect(state.pool[c], `공급처 음수 (${c})`).toBeGreaterThanOrEqual(0);
  }
  // No negative player tokens.
  for (const p of state.players) {
    for (const c of TOKEN_COLORS) {
      expect(p.tokens[c], `플레이어 음수 토큰 ${p.id} ${c}`).toBeGreaterThanOrEqual(0);
    }
    expect(p.reserved.length, `예약 초과 ${p.id}`).toBeLessThanOrEqual(3);
  }
  // Card conservation: always 90.
  expect(countCards(state), "카드 보존 위반").toBe(90);

  // When nothing is pending, every player must be within the 10-token limit.
  if (!state.pendingDiscard && !state.pendingNoble) {
    for (const p of state.players) {
      expect(totalTokens(p), `토큰 한도 위반 ${p.id}`).toBeLessThanOrEqual(10);
    }
  }
}

type Policy = (state: GameState, rng: RNG) => Action;

const randomPolicy: Policy = (state, rng) => {
  if (state.pendingDiscard) return { type: "DISCARD_TOKENS", tokens: autoDiscard(state) };
  if (state.pendingNoble) {
    const ids = state.pendingNoble;
    return { type: "CHOOSE_NOBLE", nobleId: ids[Math.floor(rng() * ids.length)] };
  }
  const actions = legalMainActions(state);
  return actions[Math.floor(rng() * actions.length)];
};

const aiPolicy: Policy = (state, rng) => aiAction(state, rng);

function playGame(players: PlayerConfig[], seed: number, policy: Policy): GameState {
  let state = newGame({ players, seed });
  const initialPool: Record<string, number> = {};
  for (const c of TOKEN_COLORS) {
    let total = state.pool[c];
    for (const p of state.players) total += p.tokens[c];
    initialPool[c] = total;
  }
  const rng = mulberry32(seed ^ 0x9e3779b9);

  let count = 0;
  while (state.phase !== "finished") {
    expect(count, "게임이 종료되지 않음 (무한 루프 가능성)").toBeLessThan(MAX_ACTIONS);
    const action = policy(state, rng);
    expect(action, "정책이 행동을 반환하지 않음").toBeTruthy();
    state = applyAction(state, action, rng);
    checkInvariants(state, initialPool);
    count++;
  }
  return state;
}

describe("랜덤 정책 풀게임 시뮬레이션 (불변식 검증)", () => {
  for (const playerCount of [2, 3, 4]) {
    it(`${playerCount}인 게임 20판이 규칙 위반 없이 완주`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const players: PlayerConfig[] = Array.from({ length: playerCount }, (_, i) => ({
          name: `R${i + 1}`,
          isAI: false,
        }));
        const final = playGame(players, seed * 131 + playerCount, randomPolicy);
        expect(final.phase).toBe("finished");
        expect(final.winnerId).toBeTruthy();
        const winner = final.players.find((p) => p.id === final.winnerId)!;
        // Winner must have the max prestige.
        const maxPrestige = Math.max(...final.players.map((p) => p.prestige));
        expect(winner.prestige).toBe(maxPrestige);
        expect(winner.prestige).toBeGreaterThanOrEqual(15);
      }
    });
  }
});

describe("AI 정책 풀게임 시뮬레이션", () => {
  for (const playerCount of [2, 3, 4]) {
    it(`${playerCount}인 AI 게임 12판 완주 + 합리적 턴 수`, () => {
      for (let seed = 1; seed <= 12; seed++) {
        const players: PlayerConfig[] = Array.from({ length: playerCount }, (_, i) => ({
          name: `AI${i + 1}`,
          isAI: true,
          aiLevel: i === 0 ? "hard" : i === 1 ? "normal" : "easy",
        }));
        const final = playGame(players, seed * 977 + playerCount, aiPolicy);
        expect(final.phase).toBe("finished");
        expect(final.players.find((p) => p.id === final.winnerId)!.prestige).toBeGreaterThanOrEqual(15);
        // AI should win much faster than a random walk.
        expect(final.turnCount).toBeLessThan(400);
      }
    });
  }
});

describe("결정성", () => {
  it("같은 시드 + 같은 정책 => 동일 결과", () => {
    const players: PlayerConfig[] = [
      { name: "AI1", isAI: true, aiLevel: "normal" },
      { name: "AI2", isAI: true, aiLevel: "normal" },
    ];
    const a = playGame(players, 12345, aiPolicy);
    const b = playGame(players, 12345, aiPolicy);
    expect(a.winnerId).toBe(b.winnerId);
    expect(a.turnCount).toBe(b.turnCount);
    expect(a.players.map((p) => p.prestige)).toEqual(b.players.map((p) => p.prestige));
  });
});
