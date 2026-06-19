import { describe, expect, it } from "vitest";
import { applyAction, validate } from "./actions";
import { autoPayment, canAfford, deficit, validatePayment } from "./payment";
import { Action, GameState } from "./types";
import { makeCard, makeNoble, makePlayer, makeState } from "./testutil";
import { totalTokens } from "./util";

function expectInvalid(state: GameState, action: Action) {
  expect(validate(state, action).ok).toBe(false);
  expect(() => applyAction(state, action)).toThrow();
}

describe("TAKE_TWO (같은 색 2개)", () => {
  it("해당 색이 3개면 불가, 4개면 가능", () => {
    const s3 = makeState({ pool: { white: 3, blue: 3, green: 3, red: 3, black: 3, gold: 5 } });
    expectInvalid(s3, { type: "TAKE_TWO", color: "white" });

    const s4 = makeState({ pool: { white: 4, blue: 0, green: 0, red: 0, black: 0, gold: 0 } });
    expect(validate(s4, { type: "TAKE_TWO", color: "white" }).ok).toBe(true);
    const after = applyAction(s4, { type: "TAKE_TWO", color: "white" });
    expect(after.players[0].tokens.white).toBe(2);
    expect(after.pool.white).toBe(2);
  });
});

describe("TAKE_THREE (서로 다른 색)", () => {
  it("3색 이상 가능하면 정확히 3색을 가져와야 한다", () => {
    const s = makeState({ pool: { white: 1, blue: 1, green: 1, red: 1, black: 1, gold: 0 } });
    expectInvalid(s, { type: "TAKE_THREE", colors: ["white", "blue"] }); // 2개는 불가
    expect(validate(s, { type: "TAKE_THREE", colors: ["white", "blue", "green"] }).ok).toBe(true);
  });

  it("가능한 색이 2종뿐이면 2개만 가져간다", () => {
    const s = makeState({ pool: { white: 1, blue: 1, green: 0, red: 0, black: 0, gold: 0 } });
    expect(validate(s, { type: "TAKE_THREE", colors: ["white", "blue"] }).ok).toBe(true);
    expectInvalid(s, { type: "TAKE_THREE", colors: ["white"] });
    const after = applyAction(s, { type: "TAKE_THREE", colors: ["white", "blue"] });
    expect(after.players[0].tokens.white).toBe(1);
    expect(after.players[0].tokens.blue).toBe(1);
  });

  it("중복 색은 거부", () => {
    const s = makeState({ pool: { white: 5, blue: 5, green: 5, red: 5, black: 5, gold: 0 } });
    expectInvalid(s, { type: "TAKE_THREE", colors: ["white", "white", "blue"] });
  });
});

describe("RESERVE (예약)", () => {
  it("골드가 0개여도 예약 가능, 골드만 미지급", () => {
    const card = makeCard({ id: "C1", level: 1 });
    const s = makeState({
      board: { 1: [card, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      pool: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
    });
    const after = applyAction(s, { type: "RESERVE", source: { from: "board", level: 1, slot: 0 } });
    expect(after.players[0].reserved.map((c) => c.id)).toContain("C1");
    expect(after.players[0].tokens.gold).toBe(0);
  });

  it("골드가 있으면 1개 지급, 보드 슬롯은 덱에서 보충", () => {
    const top = makeCard({ id: "TOP", level: 1 });
    const onBoard = makeCard({ id: "ONB", level: 1 });
    const s = makeState({
      board: { 1: [onBoard, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      decks: { 1: [top], 2: [], 3: [] },
      pool: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 5 },
    });
    const after = applyAction(s, { type: "RESERVE", source: { from: "board", level: 1, slot: 0 } });
    expect(after.players[0].tokens.gold).toBe(1);
    expect(after.pool.gold).toBe(4);
    expect(after.board[1][0]?.id).toBe("TOP"); // refilled
  });

  it("예약 3장 보유 시 추가 예약 차단", () => {
    const s = makeState({
      players: [
        makePlayer("P1", { reserved: [makeCard({}), makeCard({}), makeCard({})] }),
        makePlayer("P2"),
      ],
      board: { 1: [makeCard({ id: "X" }), null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
    });
    expectInvalid(s, { type: "RESERVE", source: { from: "board", level: 1, slot: 0 } });
  });

  it("덱이 비었으면 블라인드 예약 불가", () => {
    const s = makeState({ decks: { 1: [], 2: [], 3: [] } });
    expectInvalid(s, { type: "RESERVE", source: { from: "deck", level: 1 } });
  });

  it("덱 블라인드 예약 가능", () => {
    const s = makeState({
      decks: { 1: [makeCard({ id: "D1" })], 2: [], 3: [] },
      pool: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 5 },
    });
    const after = applyAction(s, { type: "RESERVE", source: { from: "deck", level: 1 } });
    expect(after.players[0].reserved.map((c) => c.id)).toContain("D1");
  });
});

describe("PURCHASE (구매)", () => {
  it("보너스만으로 비용 전액 충당 시 토큰 0 지불", () => {
    const card = makeCard({ id: "C", level: 1, prestige: 1, bonus: "red", cost: { white: 2 } });
    const s = makeState({
      players: [makePlayer("P1", { bonuses: { white: 2, blue: 0, green: 0, red: 0, black: 0 } }), makePlayer("P2")],
      board: { 1: [card, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
    });
    const p = s.players[0];
    expect(canAfford(p, card)).toBe(true);
    expect(autoPayment(p, card)).toMatchObject({ white: 0, gold: 0 });
    const after = applyAction(s, { type: "PURCHASE", source: { from: "board", level: 1, slot: 0 } });
    expect(after.players[0].bonuses.red).toBe(1);
    expect(after.players[0].prestige).toBe(1);
    expect(after.players[0].purchased.map((c) => c.id)).toContain("C");
  });

  it("골드로 부족분 정확히 충당, 골드 초과분은 사용 안 함", () => {
    const card = makeCard({ id: "C", level: 1, cost: { white: 3 } });
    const s = makeState({
      players: [
        makePlayer("P1", { tokens: { white: 1, blue: 0, green: 0, red: 0, black: 0, gold: 5 } }),
        makePlayer("P2"),
      ],
      board: { 1: [card, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
    });
    const p = s.players[0];
    const pay = autoPayment(p, card);
    expect(pay.white).toBe(1);
    expect(pay.gold).toBe(2); // need 3 white, have 1 -> 2 gold
    const after = applyAction(s, { type: "PURCHASE", source: { from: "board", level: 1, slot: 0 } });
    expect(after.players[0].tokens.gold).toBe(3); // 5 - 2
    expect(after.players[0].tokens.white).toBe(0);
    expect(after.pool.white).toBe(1); // returned
    expect(after.pool.gold).toBe(2); // returned
  });

  it("지불 불가하면 거부", () => {
    const card = makeCard({ id: "C", cost: { white: 5 } });
    const s = makeState({
      players: [makePlayer("P1", { tokens: { white: 1, blue: 0, green: 0, red: 0, black: 0, gold: 1 } }), makePlayer("P2")],
      board: { 1: [card, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
    });
    expectInvalid(s, { type: "PURCHASE", source: { from: "board", level: 1, slot: 0 } });
  });

  it("예약 카드 구매 가능", () => {
    const card = makeCard({ id: "R", level: 2, prestige: 2, cost: { blue: 1 } });
    const s = makeState({
      players: [
        makePlayer("P1", { reserved: [card], tokens: { white: 0, blue: 1, green: 0, red: 0, black: 0, gold: 0 } }),
        makePlayer("P2"),
      ],
    });
    const after = applyAction(s, { type: "PURCHASE", source: { from: "reserved", cardId: "R" } });
    expect(after.players[0].reserved.length).toBe(0);
    expect(after.players[0].prestige).toBe(2);
  });

  it("validatePayment: 초과 지불/골드 오용 거부", () => {
    const card = makeCard({ cost: { white: 2 } });
    const p = makePlayer("P1", { tokens: { white: 3, blue: 0, green: 0, red: 0, black: 0, gold: 2 } });
    expect(validatePayment(p, card, { white: 3, blue: 0, green: 0, red: 0, black: 0, gold: 0 }).ok).toBe(false); // 초과
    expect(validatePayment(p, card, { white: 1, blue: 0, green: 0, red: 0, black: 0, gold: 1 }).ok).toBe(true);
    expect(validatePayment(p, card, { white: 2, blue: 0, green: 0, red: 0, black: 0, gold: 1 }).ok).toBe(false); // 골드 초과
  });
});

describe("토큰 한도 (턴 종료 10개)", () => {
  it("11개가 되면 반환 강제, 카드 보너스는 한도 제외", () => {
    // 9 tokens + take 3 = ... use take_three to reach 11.
    const s = makeState({
      players: [
        makePlayer("P1", {
          tokens: { white: 3, blue: 3, green: 3, red: 0, black: 0, gold: 0 },
          bonuses: { white: 5, blue: 5, green: 5, red: 5, black: 5 }, // bonuses don't count
        }),
        makePlayer("P2"),
      ],
      pool: { white: 5, blue: 5, green: 5, red: 5, black: 5, gold: 0 },
    });
    const after = applyAction(s, { type: "TAKE_THREE", colors: ["red", "black", "white"] });
    expect(totalTokens(after.players[0])).toBe(12);
    expect(after.pendingDiscard).toBe(true);
    expect(after.currentPlayerIndex).toBe(0); // turn not advanced yet

    const resolved = applyAction(after, {
      type: "DISCARD_TOKENS",
      tokens: { white: 1, blue: 1, gold: 0 },
    });
    expect(totalTokens(resolved.players[0])).toBe(10);
    expect(resolved.pendingDiscard).toBe(false);
    expect(resolved.currentPlayerIndex).toBe(1); // advanced
  });

  it("정확한 초과분이 아니면 거부", () => {
    const s = makeState({
      players: [makePlayer("P1", { tokens: { white: 6, blue: 6, green: 0, red: 0, black: 0, gold: 0 } }), makePlayer("P2")],
      pendingDiscard: true,
    });
    expectInvalid(s, { type: "DISCARD_TOKENS", tokens: { white: 1 } }); // 2개 반환해야 함
    expect(validate(s, { type: "DISCARD_TOKENS", tokens: { white: 2 } }).ok).toBe(true);
  });
});

describe("귀족 방문", () => {
  it("단일 충족 시 자동 획득", () => {
    const card = makeCard({ id: "C", bonus: "white", cost: {} }); // free
    const noble = makeNoble({ id: "N1", requirement: { white: 1 } });
    const s = makeState({
      board: { 1: [card, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      nobles: [noble],
    });
    const after = applyAction(s, { type: "PURCHASE", source: { from: "board", level: 1, slot: 0 } });
    expect(after.players[0].nobles.map((n) => n.id)).toContain("N1");
    expect(after.players[0].prestige).toBe(3);
    expect(after.nobles.length).toBe(0);
  });

  it("다중 충족 시 1명만 선택, 나머지는 남는다", () => {
    const card = makeCard({ id: "C", bonus: "white", cost: {} });
    const n1 = makeNoble({ id: "N1", requirement: { white: 1 } });
    const n2 = makeNoble({ id: "N2", requirement: { white: 1 } });
    const s = makeState({
      board: { 1: [card, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      nobles: [n1, n2],
    });
    const pending = applyAction(s, { type: "PURCHASE", source: { from: "board", level: 1, slot: 0 } });
    expect(pending.pendingNoble?.sort()).toEqual(["N1", "N2"]);
    expect(pending.currentPlayerIndex).toBe(0); // not advanced

    const resolved = applyAction(pending, { type: "CHOOSE_NOBLE", nobleId: "N1" });
    expect(resolved.players[0].nobles.map((n) => n.id)).toEqual(["N1"]);
    expect(resolved.nobles.map((n) => n.id)).toEqual(["N2"]); // other remains
    expect(resolved.currentPlayerIndex).toBe(1); // advanced
  });
});

describe("게임 종료 & 승리", () => {
  it("15점 도달 시 현재 라운드를 끝까지 진행 후 종료", () => {
    const card = makeCard({ id: "WIN", level: 3, prestige: 3, bonus: "red", cost: {} });
    const s = makeState({
      players: [makePlayer("P1", { prestige: 12 }), makePlayer("P2", { prestige: 5 })],
      board: { 1: [null, null, null, null], 2: [null, null, null, null], 3: [card, null, null, null] },
      pool: { white: 5, blue: 5, green: 5, red: 5, black: 5, gold: 5 },
    });
    // P1 buys -> reaches 15 -> final round triggered.
    const t1 = applyAction(s, { type: "PURCHASE", source: { from: "board", level: 3, slot: 0 } });
    expect(t1.players[0].prestige).toBe(15);
    expect(t1.phase).toBe("finalRound");
    expect(t1.finalRoundTriggeredBy).toBe("P1");
    expect(t1.currentPlayerIndex).toBe(1); // P2 still gets a turn

    // P2 takes their final turn -> round completes -> finished.
    const t2 = applyAction(t1, { type: "TAKE_THREE", colors: ["white", "blue", "green"] });
    expect(t2.phase).toBe("finished");
    expect(t2.winnerId).toBe("P1");
  });

  it("동점 시 구매 카드 수가 적은 쪽 승리", () => {
    const s = makeState({
      players: [
        makePlayer("P1", { prestige: 15, purchased: [makeCard({}), makeCard({}), makeCard({})] }),
        makePlayer("P2", { prestige: 15, purchased: [makeCard({}), makeCard({})] }),
      ],
      phase: "finalRound",
      finalRoundTriggeredBy: "P1",
      currentPlayerIndex: 1,
      pool: { white: 5, blue: 5, green: 5, red: 5, black: 5, gold: 0 },
    });
    const done = applyAction(s, { type: "TAKE_THREE", colors: ["white", "blue", "green"] });
    expect(done.phase).toBe("finished");
    expect(done.winnerId).toBe("P2"); // fewer cards
  });
});

describe("덱 보충", () => {
  it("구매 후 덱이 비었으면 슬롯은 빈 채로 유지", () => {
    const card = makeCard({ id: "C", cost: {} });
    const s = makeState({
      board: { 1: [card, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      decks: { 1: [], 2: [], 3: [] },
    });
    const after = applyAction(s, { type: "PURCHASE", source: { from: "board", level: 1, slot: 0 } });
    expect(after.board[1][0]).toBeNull();
  });
});
