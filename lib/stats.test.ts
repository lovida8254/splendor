import { describe, it, expect, beforeEach } from "vitest";
import { recordGameOnce, loadRecords, clearRecords, computeStats, GameRecord } from "./stats";

// in-memory localStorage for the node test env
beforeEach(() => {
  const store: Record<string, string> = {};
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {},
    key: () => null,
    length: 0,
  } as Storage;
  clearRecords();
});

function rec(p: Partial<GameRecord>): GameRecord {
  return {
    ts: 1,
    mode: "ai",
    players: 2,
    names: ["me", "AI"],
    winner: "me",
    meWon: true,
    mePrestige: 15,
    meCards: 12,
    meNobles: 1,
    turns: 30,
    ...p,
  };
}

describe("stats", () => {
  it("records once per signature (dedup)", () => {
    expect(recordGameOnce("g1", rec({}))).toBe(true);
    expect(recordGameOnce("g1", rec({}))).toBe(false); // same sig ignored
    expect(recordGameOnce("g2", rec({}))).toBe(true);
    expect(loadRecords()).toHaveLength(2);
  });

  it("computes wins / winRate over decisive games only", () => {
    recordGameOnce("a", rec({ mode: "ai", meWon: true, mePrestige: 16 }));
    recordGameOnce("b", rec({ mode: "ai", meWon: false, mePrestige: 9 }));
    recordGameOnce("c", rec({ mode: "online", meWon: true, mePrestige: 17 }));
    recordGameOnce("d", rec({ mode: "hotseat", meWon: null, mePrestige: null })); // not decisive

    const s = computeStats(loadRecords());
    expect(s.games).toBe(4);
    expect(s.decisive).toBe(3);
    expect(s.wins).toBe(2);
    expect(s.winRate).toBeCloseTo(2 / 3, 5);
    expect(s.byMode.ai.games).toBe(2);
    expect(s.byMode.ai.wins).toBe(1);
    expect(s.byMode.online.wins).toBe(1);
    expect(s.byMode.hotseat.games).toBe(1);
    expect(s.bestPrestige).toBe(17);
  });

  it("handles empty history", () => {
    const s = computeStats([]);
    expect(s.games).toBe(0);
    expect(s.winRate).toBe(0);
    expect(s.avgTurns).toBe(0);
  });
});
