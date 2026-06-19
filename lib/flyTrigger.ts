import { useFly } from "@/store/flyStore";
import {
  Action,
  autoPayment,
  Card,
  CardSource,
  GameState,
  TOKEN_COLORS,
  TokenColor,
} from "@/lib/engine";

interface Move {
  color: TokenColor;
  from: string; // CSS selector
  to: string;
  kind?: "coin" | "card";
}

function centerOf(sel: string): { x: number; y: number } | null {
  const el = document.querySelector(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function supplySel(c: TokenColor): string {
  return `[data-testid="supply-${c}"]`;
}
function playerSel(idx: number, c: TokenColor): string {
  return `[data-fly="player-${idx}-${c}"]`;
}
function playerPanelSel(idx: number): string {
  return `[data-fly="player-${idx}"]`;
}
function cardSourceSel(source: Extract<CardSource, { from: "board" | "deck" | "reserved" }>): string {
  if (source.from === "board") return `[data-fly-card="board-${source.level}-${source.slot}"]`;
  if (source.from === "deck") return `[data-fly-card="deck-${source.level}"]`;
  return `[data-fly-card="reserved-${source.cardId}"]`;
}

function findCard(
  game: GameState,
  source: Extract<CardSource, { from: "board" | "reserved" }>,
  playerIdx: number,
): Card | null {
  if (source.from === "board") return game.board[source.level][source.slot] ?? null;
  return game.players[playerIdx].reserved.find((c) => c.id === source.cardId) ?? null;
}

function spawn(moves: Move[]) {
  const flights = [];
  let i = 0;
  for (const m of moves) {
    const a = centerOf(m.from);
    const b = centerOf(m.to);
    if (a && b) {
      flights.push({ color: m.color, x0: a.x, y0: a.y, x1: b.x, y1: b.y, delay: i * 70, kind: m.kind ?? "coin" });
      i++;
    }
  }
  if (flights.length) useFly.getState().spawn(flights);
}

/**
 * Spawn token-flight animations for an action, based on the pre-action state.
 * Covers both human and AI moves. No-op outside the browser.
 */
export function triggerFly(prev: GameState, action: Action): void {
  if (typeof document === "undefined") return;
  const idx = prev.currentPlayerIndex;
  const moves: Move[] = [];

  switch (action.type) {
    case "TAKE_THREE":
      for (const c of action.colors) moves.push({ color: c, from: supplySel(c), to: playerSel(idx, c) });
      break;
    case "TAKE_TWO":
      moves.push({ color: action.color, from: supplySel(action.color), to: playerSel(idx, action.color) });
      moves.push({ color: action.color, from: supplySel(action.color), to: playerSel(idx, action.color) });
      break;
    case "RESERVE": {
      // reserved card flies to the player's panel
      const card =
        action.source.from === "board"
          ? prev.board[action.source.level][action.source.slot]
          : prev.decks[action.source.level][prev.decks[action.source.level].length - 1];
      if (card) moves.push({ color: card.bonus, from: cardSourceSel(action.source), to: playerPanelSel(idx), kind: "card" });
      if (prev.pool.gold > 0)
        moves.push({ color: "gold", from: supplySel("gold"), to: playerSel(idx, "gold") });
      break;
    }
    case "PURCHASE": {
      const card = findCard(prev, action.source, idx);
      if (!card) break;
      // the bought card flies to the player's panel
      moves.push({ color: card.bonus, from: cardSourceSel(action.source), to: playerPanelSel(idx), kind: "card" });
      const pay = action.payment ?? autoPayment(prev.players[idx], card);
      for (const c of TOKEN_COLORS) {
        for (let k = 0; k < (pay[c] ?? 0); k++) {
          moves.push({ color: c, from: playerSel(idx, c), to: supplySel(c) });
        }
      }
      break;
    }
    default:
      return;
  }
  spawn(moves);
}
