import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGame } from "./gameStore";
import { GEM_COLORS } from "@/lib/engine";

function reset() {
  useGame.getState().abandon();
  useGame.setState({ message: null, selection: { tokens: {} } });
}

describe("gameStore 통합", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    reset();
  });
  afterEach(() => {
    reset();
    vi.useRealTimers();
  });

  it("전원 AI 게임이 스케줄러를 통해 끝까지 진행된다", () => {
    useGame.getState().startGame([
      { name: "AI1", isAI: true, aiLevel: "hard" },
      { name: "AI2", isAI: true, aiLevel: "normal" },
    ]);

    let guard = 0;
    while (useGame.getState().game?.phase !== "finished" && guard < 4000) {
      vi.advanceTimersByTime(700);
      guard++;
    }
    const game = useGame.getState().game!;
    expect(game.phase).toBe("finished");
    expect(game.winnerId).toBeTruthy();
    const winner = game.players.find((p) => p.id === game.winnerId)!;
    expect(winner.prestige).toBeGreaterThanOrEqual(15);
  });

  it("사람 차례에 토큰 선택 → 가져오기가 적용된다", () => {
    // Deterministic setup: seed/start become fixed when Math.random is mocked.
    const spy = vi.spyOn(Math, "random").mockReturnValue(0); // seed=1, startIndex=0
    useGame.getState().startGame([
      { name: "Human", isAI: false },
      { name: "AI", isAI: true, aiLevel: "easy" },
    ]);
    spy.mockRestore();

    const g0 = useGame.getState().game!;
    expect(g0.currentPlayerIndex).toBe(0);
    expect(g0.players[0].isAI).toBe(false);

    const [a, b, c] = GEM_COLORS;
    useGame.getState().toggleToken(a);
    useGame.getState().toggleToken(b);
    useGame.getState().toggleToken(c);
    // three distinct selected
    const sel = useGame.getState().selection.tokens;
    expect((sel[a] ?? 0) + (sel[b] ?? 0) + (sel[c] ?? 0)).toBe(3);

    useGame.getState().confirmTake();
    const g1 = useGame.getState().game!;
    expect(g1.players[0].tokens[a]).toBe(1);
    expect(g1.players[0].tokens[b]).toBe(1);
    expect(g1.players[0].tokens[c]).toBe(1);
    expect(g1.currentPlayerIndex).toBe(1); // advanced to AI
  });

  it("같은 색 두 번 클릭 → TAKE_TWO 선택 (4개 이상일 때)", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0);
    useGame.getState().startGame([
      { name: "Human", isAI: false },
      { name: "AI", isAI: true, aiLevel: "easy" },
    ]);
    spy.mockRestore();

    const color = GEM_COLORS[0];
    // 2-player game starts each color at 4 -> take-two allowed.
    useGame.getState().toggleToken(color); // -> 1
    useGame.getState().toggleToken(color); // -> 2 (upgrade)
    expect(useGame.getState().selection.tokens[color]).toBe(2);

    useGame.getState().confirmTake();
    const g1 = useGame.getState().game!;
    expect(g1.players[0].tokens[color]).toBe(2);
  });

  it("4개 미만이면 같은 색 두 번 클릭이 해제된다", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0);
    useGame.getState().startGame([
      { name: "H1", isAI: false },
      { name: "H2", isAI: false },
      { name: "H3", isAI: false }, // 3-player: pool color = 5 still >=4, so use a drained scenario instead
    ]);
    spy.mockRestore();

    // Manually drain a color to 3 to test the guard.
    const color = GEM_COLORS[0];
    useGame.setState((s) => {
      const game = structuredClone(s.game!);
      game.pool[color] = 3;
      return { game };
    });
    useGame.getState().toggleToken(color); // -> 1
    useGame.getState().toggleToken(color); // can't upgrade (pool<4) -> deselect
    expect(useGame.getState().selection.tokens[color] ?? 0).toBe(0);
  });
});
