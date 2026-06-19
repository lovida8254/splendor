import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGame } from "./gameStore";
import { GEM_COLORS } from "@/lib/engine";
import { makeCard, makePlayer, makeState } from "@/lib/engine/testutil";

function reset() {
  useGame.getState().abandon();
}

beforeEach(() => {
  vi.useFakeTimers();
  reset();
});
afterEach(() => {
  reset();
  vi.useRealTimers();
});

describe("되돌리기(undo)", () => {
  it("사람의 토큰 가져오기를 되돌리면 직전 상태로 복원된다", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0);
    useGame.getState().startGame([
      { name: "H", isAI: false },
      { name: "AI", isAI: true, aiLevel: "easy" },
    ]);
    spy.mockRestore();

    const [a, b, c] = GEM_COLORS;
    useGame.getState().toggleToken(a);
    useGame.getState().toggleToken(b);
    useGame.getState().toggleToken(c);
    useGame.getState().confirmTake();

    let g = useGame.getState().game!;
    expect(g.players[0].tokens[a]).toBe(1);
    expect(useGame.getState().canUndo()).toBe(true);

    useGame.getState().undo();
    g = useGame.getState().game!;
    expect(g.players[0].tokens[a]).toBe(0);
    expect(g.currentPlayerIndex).toBe(0);
    expect(useGame.getState().actions.length).toBe(0);
    expect(useGame.getState().canUndo()).toBe(false);
  });
});

describe("리플레이(replay)", () => {
  it("전원 AI 게임 종료 후 리플레이 스크럽이 동작", () => {
    useGame.getState().startGame([
      { name: "AI1", isAI: true, aiLevel: "normal" },
      { name: "AI2", isAI: true, aiLevel: "normal" },
    ]);
    let guard = 0;
    while (useGame.getState().game?.phase !== "finished" && guard < 4000) {
      vi.advanceTimersByTime(700);
      guard++;
    }
    const total = useGame.getState().history.length - 1;
    expect(total).toBeGreaterThan(5);

    useGame.getState().enterReplay();
    expect(useGame.getState().replayActive).toBe(true);
    expect(useGame.getState().game!.turnCount).toBe(0); // initial state

    useGame.getState().replayTo(5);
    expect(useGame.getState().replayIndex).toBe(5);
    const midLog = useGame.getState().game!.log.length;
    expect(midLog).toBeLessThanOrEqual(5);

    useGame.getState().exitReplay();
    expect(useGame.getState().replayActive).toBe(false);
    expect(useGame.getState().game!.phase).toBe("finished");
  });
});

describe("수동 지불", () => {
  function setupBuyable(tokens: Record<string, number>, cost: Record<string, number>) {
    useGame.getState().startGame([{ name: "H", isAI: false }, { name: "AI", isAI: true }]);
    const card = makeCard({ id: "BUY", level: 1, prestige: 1, bonus: "red", cost });
    const game = makeState({
      players: [makePlayer("P1", { tokens: { ...tokens } as any }), makePlayer("P2")],
      board: { 1: [card, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
      pool: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
    });
    useGame.setState({ game, history: [game], actions: [] });
  }

  it("자동 지불로 구매", () => {
    setupBuyable({ white: 1, gold: 2 }, { white: 3 });
    useGame.getState().openPurchase({ from: "board", level: 1, slot: 0 });
    expect(useGame.getState().purchaseSource).not.toBeNull();
    useGame.getState().confirmPurchase(); // auto
    const g = useGame.getState().game!;
    expect(g.players[0].bonuses.red).toBe(1);
    expect(g.players[0].prestige).toBe(1);
    expect(useGame.getState().purchaseSource).toBeNull();
  });

  it("명시적 결제 플랜(색 토큰 대신 골드)로 구매", () => {
    // cost white:2, have white:3 + gold:2 -> pay all with gold, keep white tokens
    setupBuyable({ white: 3, gold: 2 }, { white: 2 });
    useGame.getState().openPurchase({ from: "board", level: 1, slot: 0 });
    useGame.getState().confirmPurchase({ white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 2 });
    const g = useGame.getState().game!;
    expect(g.players[0].tokens.white).toBe(3); // color tokens preserved
    expect(g.players[0].tokens.gold).toBe(0);
    expect(g.players[0].bonuses.red).toBe(1);
  });
});

describe("예약 카드 구매 (골드 소진 후)", () => {
  it("색 토큰이 충분하면 골드가 0이어도 예약 카드를 구매할 수 있다", () => {
    useGame.getState().startGame([{ name: "H", isAI: false }, { name: "AI", isAI: true }]);
    const reserved = makeCard({ id: "R", level: 2, prestige: 2, bonus: "blue", cost: { red: 3 } });
    const game = makeState({
      players: [makePlayer("P1", { reserved: [reserved], tokens: { red: 3, gold: 0 } as any }), makePlayer("P2")],
      pool: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
    });
    useGame.setState({ game, history: [game], actions: [] });

    useGame.getState().openPurchase({ from: "reserved", cardId: "R" });
    expect(useGame.getState().purchaseSource).not.toBeNull();
    useGame.getState().confirmPurchase();
    const g = useGame.getState().game!;
    expect(g.players[0].reserved.length).toBe(0);
    expect(g.players[0].bonuses.blue).toBe(1);
  });

  it("색 토큰도 골드도 부족하면 구매가 차단된다(정상 규칙)", () => {
    useGame.getState().startGame([{ name: "H", isAI: false }, { name: "AI", isAI: true }]);
    const reserved = makeCard({ id: "R", level: 2, bonus: "blue", cost: { red: 3 } });
    const game = makeState({
      players: [makePlayer("P1", { reserved: [reserved], tokens: { red: 2, gold: 0 } as any }), makePlayer("P2")],
      pool: { white: 0, blue: 0, green: 0, red: 0, black: 0, gold: 0 },
    });
    useGame.setState({ game, history: [game], actions: [] });
    useGame.getState().openPurchase({ from: "reserved", cardId: "R" });
    expect(useGame.getState().purchaseSource).toBeNull(); // blocked, message set
  });
});

describe("속도 설정", () => {
  it("setSpeed가 반영된다", () => {
    useGame.getState().setSpeed("fast");
    expect(useGame.getState().speed).toBe("fast");
    useGame.getState().setSpeed("slow");
    expect(useGame.getState().speed).toBe("slow");
  });
});
