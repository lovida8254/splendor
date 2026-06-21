import { describe, expect, it } from "vitest";
import { ALL_CARDS, ALL_NOBLES } from "./data";
import { newGame, setupConfig } from "./setup";
import { CARD_LEVELS, GEM_COLORS } from "./types";

describe("시드 데이터 무결성 (PRD 10장)", () => {
  it("카드 90장, 레벨별 40/30/20", () => {
    expect(ALL_CARDS.length).toBe(90);
    const byLevel = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
    for (const c of ALL_CARDS) byLevel[c.level]++;
    expect(byLevel[1]).toBe(40);
    expect(byLevel[2]).toBe(30);
    expect(byLevel[3]).toBe(20);
  });

  it("귀족 10장, 모두 prestige 3", () => {
    expect(ALL_NOBLES.length).toBe(10);
    for (const n of ALL_NOBLES) expect(n.prestige).toBe(3);
  });

  it("모든 카드 bonus는 5색, prestige 0~5", () => {
    for (const c of ALL_CARDS) {
      expect(GEM_COLORS).toContain(c.bonus);
      expect(c.prestige).toBeGreaterThanOrEqual(0);
      expect(c.prestige).toBeLessThanOrEqual(5);
    }
  });
});

describe("인원별 셋업 (PRD 2.4)", () => {
  it("2/3/4인 토큰·골드·귀족 수", () => {
    expect(setupConfig(2)).toEqual({ tokens: 4, gold: 5, nobles: 3 });
    expect(setupConfig(3)).toEqual({ tokens: 5, gold: 5, nobles: 4 });
    expect(setupConfig(4)).toEqual({ tokens: 7, gold: 5, nobles: 5 });
  });

  it("1인은 솔로 연습/튜토리얼용 셋업 허용", () => {
    expect(setupConfig(1)).toEqual({ tokens: 7, gold: 5, nobles: 3 });
  });

  it("표준 인원(1~4) 외에는 오류", () => {
    expect(() => setupConfig(0)).toThrow();
    expect(() => setupConfig(5)).toThrow();
  });
});

describe("newGame 초기 상태", () => {
  it("보드 4×3, 귀족 (인원+1), 공급처 토큰 정확", () => {
    const g = newGame({ players: [
      { name: "A", isAI: false },
      { name: "B", isAI: true, aiLevel: "normal" },
      { name: "C", isAI: true, aiLevel: "easy" },
    ], seed: 1 });
    expect(g.players.length).toBe(3);
    expect(g.nobles.length).toBe(4);
    for (const lvl of CARD_LEVELS) {
      expect(g.board[lvl].length).toBe(4);
      expect(g.board[lvl].every((c) => c !== null)).toBe(true);
    }
    for (const c of GEM_COLORS) expect(g.pool[c]).toBe(5);
    expect(g.pool.gold).toBe(5);
    // total cards conserved: board(12) + decks = 90
    const deckTotal = CARD_LEVELS.reduce((s, l) => s + g.decks[l].length, 0);
    expect(deckTotal + 12).toBe(90);
  });

  it("같은 시드면 동일한 초기 배치 (결정적)", () => {
    const a = newGame({ players: [{ name: "A", isAI: false }, { name: "B", isAI: false }], seed: 42 });
    const b = newGame({ players: [{ name: "A", isAI: false }, { name: "B", isAI: false }], seed: 42 });
    expect(a.board[1].map((c) => c?.id)).toEqual(b.board[1].map((c) => c?.id));
    expect(a.nobles.map((n) => n.id)).toEqual(b.nobles.map((n) => n.id));
    expect(a.currentPlayerIndex).toBe(b.currentPlayerIndex);
  });
});
