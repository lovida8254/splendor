/**
 * Quick CLI sanity tool: play N full AI games and report outcomes.
 * Usage: npm run sim [games] [players]
 */
import { aiAction } from "@/lib/ai/ai";
import { applyAction, newGame, PlayerConfig } from "@/lib/engine";
import { mulberry32 } from "@/lib/engine/util";

const games = Number(process.argv[2] ?? 20);
const playerCount = Number(process.argv[3] ?? 4);

const levels = ["hard", "normal", "easy", "normal"] as const;
const wins: Record<string, number> = {};
let totalTurns = 0;

for (let g = 0; g < games; g++) {
  const players: PlayerConfig[] = Array.from({ length: playerCount }, (_, i) => ({
    name: `${levels[i % levels.length]}#${i + 1}`,
    isAI: true,
    aiLevel: levels[i % levels.length],
  }));
  let state = newGame({ players, seed: g * 7919 + 1 });
  const rng = mulberry32(g * 104729 + 3);
  let count = 0;
  while (state.phase !== "finished" && count < 5000) {
    state = applyAction(state, aiAction(state, rng), rng);
    count++;
  }
  const winner = state.players.find((p) => p.id === state.winnerId)!;
  wins[winner.name] = (wins[winner.name] ?? 0) + 1;
  totalTurns += state.turnCount;
  console.log(
    `Game ${g + 1}: winner ${winner.name} (${winner.prestige}pt, ${winner.purchased.length} cards) in ${state.turnCount} turns`,
  );
}

console.log("\n=== Summary ===");
console.log(`Games: ${games}, players: ${playerCount}, avg turns: ${(totalTurns / games).toFixed(1)}`);
console.log("Wins:", wins);
