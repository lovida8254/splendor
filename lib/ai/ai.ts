import {
  Action,
  AILevel,
  applyAction,
  autoDiscard,
  canAfford,
  deficit,
  GameState,
  GEM_COLORS,
  legalMainActions,
  Noble,
  Player,
  RNG,
} from "@/lib/engine";

function current(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

/** Closeness of a player to claiming any not-yet-owned noble. */
function nobleProgress(player: Player, nobles: Noble[]): number {
  let score = 0;
  for (const n of nobles) {
    let matched = 0;
    let required = 0;
    for (const c of GEM_COLORS) {
      required += n.requirement[c];
      matched += Math.min(player.bonuses[c], n.requirement[c]);
    }
    if (required > 0) {
      const ratio = matched / required;
      score += ratio * ratio * 8; // accelerating reward as a noble nears completion
    }
  }
  return score;
}

/** Strong positional value of a state from one player's perspective. */
function baseEval(state: GameState, playerId: string): number {
  const p = state.players.find((pl) => pl.id === playerId)!;
  let score = 0;

  score += p.prestige * 100;
  score += p.purchased.length * 2.5; // engine size
  const totalBonus = GEM_COLORS.reduce((s, c) => s + p.bonuses[c], 0);
  score += totalBonus * 5;
  score += nobleProgress(p, state.nobles);

  const colorTokens = GEM_COLORS.reduce((s, c) => s + p.tokens[c], 0);
  score += colorTokens * 0.5 + p.tokens.gold * 1.1;

  const distinctBonus = GEM_COLORS.filter((c) => p.bonuses[c] > 0).length;
  score += distinctBonus * 1.5;

  // Tempo: reward being close to affording valuable visible cards.
  for (const lvl of [1, 2, 3] as const) {
    for (const card of state.board[lvl]) {
      if (!card) continue;
      const d = deficit(p, card);
      const closeness = 1 / (1 + d.gold);
      score += closeness * (0.4 + card.prestige * 0.7);
    }
  }
  // Reward affordable reserved cards (flexibility realized).
  for (const card of p.reserved) {
    if (canAfford(p, card)) score += 0.5 + card.prestige * 0.7;
  }
  return score;
}

/** Myopic evaluation for the easy AI: counts points/engine, ignores planning. */
function myopicEval(state: GameState, playerId: string): number {
  const p = state.players.find((pl) => pl.id === playerId)!;
  let score = 0;
  score += p.prestige * 100;
  score += p.purchased.length * 2;
  const totalBonus = GEM_COLORS.reduce((s, c) => s + p.bonuses[c], 0);
  score += totalBonus * 4;
  const colorTokens = GEM_COLORS.reduce((s, c) => s + p.tokens[c], 0);
  score += colorTokens * 0.4 + p.tokens.gold * 0.8;
  return score;
}

/** Auto-resolve any pending discard/noble for the current mover (used in search). */
function resolvePending(state: GameState, rng: RNG): GameState {
  let s = state;
  let guard = 0;
  while (s.phase !== "finished" && (s.pendingDiscard || s.pendingNoble) && guard < 8) {
    s = applyAction(s, aiAction(s, rng), rng);
    guard++;
  }
  return s;
}

/** Best baseEval the given mover can reach with a single greedy move. */
function bestReply(
  state: GameState,
  moverId: string,
  perspectiveId: string,
  rng: RNG,
  limit: number,
): GameState {
  const moves = legalMainActions(state);
  // Rank candidates cheaply (immediate baseEval for the mover), expand top `limit`.
  const ranked = moves
    .map((a) => {
      try {
        const r = resolvePending(applyAction(state, a, rng), rng);
        return { a, r, q: baseEval(r, moverId) };
      } catch {
        return null;
      }
    })
    .filter((x): x is { a: Action; r: GameState; q: number } => x !== null)
    .sort((x, y) => y.q - x.q)
    .slice(0, limit);

  let best = ranked[0]?.r ?? state;
  let bestScore = -Infinity;
  for (const cand of ranked) {
    const sc = baseEval(cand.r, moverId);
    if (sc > bestScore) {
      bestScore = sc;
      best = cand.r;
    }
  }
  return best;
}

/** 3-ply greedy rollout for the hard AI: my move -> opponent best -> my best. */
function hardScore(resulting: GameState, meId: string, rng: RNG): number {
  const s1 = resolvePending(resulting, rng);
  if (s1.phase === "finished") return baseEval(s1, meId);
  const mover = current(s1).id;
  if (mover === meId) return baseEval(s1, meId); // unexpected; evaluate as-is

  // Opponent plays the reply best for themselves.
  const s2 = bestReply(s1, mover, meId, rng, 10);
  if (s2.phase === "finished" || current(s2).id !== meId) return baseEval(s2, meId);

  // My best follow-up.
  const s3 = bestReply(s2, meId, meId, rng, 10);
  return baseEval(s3, meId);
}

function chooseMainAction(state: GameState, level: AILevel, rng: RNG): Action {
  const me = current(state).id;
  const actions = legalMainActions(state);

  // Evaluate each candidate's immediate position.
  const scored = actions
    .map((action) => {
      let resulting: GameState;
      try {
        resulting = applyAction(state, action, rng);
      } catch {
        return null;
      }
      let s = level === "easy" ? myopicEval(resulting, me) : baseEval(resulting, me);
      if (action.type === "PURCHASE") s += 1.5;
      if (action.type === "RESERVE") s -= 0.4;
      if (level === "easy") s += (rng() - 0.5) * 12; // visibly less sharp
      return { action, resulting, s };
    })
    .filter((x): x is { action: Action; resulting: GameState; s: number } => x !== null);

  if (level !== "hard") {
    return scored.reduce((a, b) => (b.s > a.s ? b : a)).action;
  }

  // Hard: deepen the top candidates with a 3-ply rollout.
  const top = [...scored].sort((a, b) => b.s - a.s).slice(0, 6);
  let best = top[0];
  let bestDeep = -Infinity;
  for (const cand of top) {
    let deep = hardScore(cand.resulting, me, rng);
    if (cand.action.type === "PURCHASE") deep += 1.5;
    if (cand.action.type === "RESERVE") deep -= 0.4;
    if (deep > bestDeep) {
      bestDeep = deep;
      best = cand;
    }
  }
  return best.action;
}

/** Choose among multiple eligible nobles (all worth 3); deterministic. */
function chooseNoble(state: GameState): Action {
  const ids = state.pendingNoble ?? [];
  const chosen = [...ids].sort()[0];
  return { type: "CHOOSE_NOBLE", nobleId: chosen };
}

/** Decide the current AI player's action for whatever the game awaits. */
export function aiAction(state: GameState, rng: RNG): Action {
  const p = current(state);
  const level: AILevel = p.aiLevel ?? "normal";

  if (state.pendingDiscard) {
    return { type: "DISCARD_TOKENS", tokens: autoDiscard(state) };
  }
  if (state.pendingNoble) {
    return chooseNoble(state);
  }
  return chooseMainAction(state, level, rng);
}
