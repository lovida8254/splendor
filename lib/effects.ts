import { Action, GameState, GemColor } from "@/lib/engine";
import { playSound } from "@/lib/sound";
import { pushToast } from "@/store/toastStore";

const COLOR_KO: Record<GemColor, string> = {
  white: "다이아몬드",
  blue: "사파이어",
  green: "에메랄드",
  red: "루비",
  black: "오닉스",
};

const SCORE_MENTS = [
  "한 발 앞서나갑니다!",
  "기세가 오릅니다.",
  "명성을 쌓고 있습니다.",
  "추격이 시작됩니다.",
  "보석상의 위엄!",
];

function pickMent(seed: number): string {
  return SCORE_MENTS[Math.abs(seed) % SCORE_MENTS.length];
}

function aiMent(action: Action): string {
  switch (action.type) {
    case "TAKE_THREE":
      return `토큰 ${action.colors.length}개를 가져갑니다`;
    case "TAKE_TWO":
      return `${COLOR_KO[action.color]} 토큰 2개를 가져갑니다`;
    case "RESERVE":
      return "카드를 예약합니다";
    case "PURCHASE":
      return "카드를 구매합니다";
    case "PASS":
      return "이번 턴은 패스합니다";
    default:
      return "수를 둡니다";
  }
}

/**
 * Side effects after an action is applied: sounds + popup toasts (score ments,
 * AI activity). Browser-only; no-op during SSR / tests.
 */
export function runEffects(prev: GameState, next: GameState, action: Action): void {
  if (typeof window === "undefined") return;
  const idx = prev.currentPlayerIndex;
  const actor = prev.players[idx];
  const after = next.players[idx];

  switch (action.type) {
    case "TAKE_THREE":
    case "TAKE_TWO":
      playSound("take");
      break;
    case "RESERVE":
      playSound("reserve");
      break;
    case "PURCHASE":
      playSound("buy");
      break;
    default:
      break;
  }

  const nobleUp = after.nobles.length > actor.nobles.length;
  if (nobleUp) playSound("noble");

  const scoreUp = after.prestige - actor.prestige;
  if (scoreUp > 0) {
    playSound("score");
    pushToast({
      tone: "score",
      title: `${actor.name}  +${scoreUp}점`,
      sub: nobleUp ? "귀족이 방문했습니다!" : pickMent(after.prestige + idx),
    });
  } else if (actor.isAI) {
    pushToast({ tone: "ai", title: actor.name, sub: aiMent(action) });
  }

  if (next.phase === "finished" && prev.phase !== "finished") {
    playSound("win");
  }
}
