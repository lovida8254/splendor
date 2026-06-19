import {
  BonusMap,
  Card,
  CardLevel,
  GameState,
  GemColor,
  GemCost,
  Noble,
  Player,
  TokenPool,
} from "./types";
import { zeroBonus, zeroGems, zeroTokens } from "./util";

let cardSeq = 0;

interface CardSpec {
  id?: string;
  level?: CardLevel;
  prestige?: number;
  bonus?: GemColor;
  cost?: Partial<GemCost>;
}

export function makeCard(partial: CardSpec): Card {
  cardSeq++;
  return {
    id: partial.id ?? `T-${cardSeq}`,
    level: partial.level ?? 1,
    prestige: partial.prestige ?? 0,
    bonus: partial.bonus ?? "white",
    cost: { ...zeroGems(), ...(partial.cost ?? {}) },
  };
}

interface NobleSpec {
  id?: string;
  name?: string;
  requirement?: Partial<BonusMap>;
}

export function makeNoble(partial: NobleSpec): Noble {
  return {
    id: partial.id ?? "N-T",
    name: partial.name,
    prestige: 3,
    requirement: { ...zeroBonus(), ...(partial.requirement ?? {}) },
  };
}

type PlayerSpec = Omit<Partial<Player>, "tokens" | "bonuses"> & {
  tokens?: Partial<TokenPool>;
  bonuses?: Partial<BonusMap>;
};

export function makePlayer(id: string, overrides: PlayerSpec = {}): Player {
  return {
    id,
    name: overrides.name ?? id,
    isAI: overrides.isAI ?? false,
    aiLevel: overrides.aiLevel,
    tokens: { ...zeroTokens(), ...(overrides.tokens ?? {}) },
    bonuses: { ...zeroBonus(), ...(overrides.bonuses ?? {}) },
    reserved: overrides.reserved ?? [],
    purchased: overrides.purchased ?? [],
    nobles: overrides.nobles ?? [],
    prestige: overrides.prestige ?? 0,
  };
}

/** A fully controlled 2-player state with empty board/decks unless provided. */
export function makeState(overrides: Partial<GameState> = {}): GameState {
  const base: GameState = {
    players: overrides.players ?? [makePlayer("P1"), makePlayer("P2")],
    pool: { ...zeroTokens(), ...(overrides.pool ?? {}) },
    board: overrides.board ?? { 1: [null, null, null, null], 2: [null, null, null, null], 3: [null, null, null, null] },
    decks: overrides.decks ?? { 1: [], 2: [], 3: [] },
    nobles: overrides.nobles ?? [],
    currentPlayerIndex: overrides.currentPlayerIndex ?? 0,
    startPlayerIndex: overrides.startPlayerIndex ?? 0,
    turnCount: overrides.turnCount ?? 0,
    round: overrides.round ?? 1,
    phase: overrides.phase ?? "playing",
    finalRoundTriggeredBy: overrides.finalRoundTriggeredBy ?? null,
    winnerId: overrides.winnerId ?? null,
    log: overrides.log ?? [],
    pendingDiscard: overrides.pendingDiscard ?? false,
    pendingNoble: overrides.pendingNoble ?? null,
  };
  return base;
}

export function fullPool(n: number): TokenPool {
  return { white: n, blue: n, green: n, red: n, black: n, gold: 5 };
}
