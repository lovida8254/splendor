/** Seat-swapped head-to-head to measure true AI strength ordering. */
import { aiAction } from "@/lib/ai/ai";
import { AILevel, applyAction, newGame, PlayerConfig } from "@/lib/engine";
import { mulberry32 } from "@/lib/engine/util";

function playMatch(a: AILevel, b: AILevel, seed: number): "A" | "B" {
  const players: PlayerConfig[] = [
    { name: "A", isAI: true, aiLevel: a },
    { name: "B", isAI: true, aiLevel: b },
  ];
  let state = newGame({ players, seed });
  const rng = mulberry32(seed * 2654435761 + 7);
  let count = 0;
  while (state.phase !== "finished" && count < 5000) {
    state = applyAction(state, aiAction(state, rng), rng);
    count++;
  }
  return state.winnerId === "P1" ? "A" : "B";
}

function compare(strong: AILevel, weak: AILevel, games: number) {
  let strongWins = 0;
  for (let i = 0; i < games; i++) {
    // Seat the "strong" AI as A on even seeds, as B on odd seeds.
    if (i % 2 === 0) {
      if (playMatch(strong, weak, 1000 + i) === "A") strongWins++;
    } else {
      if (playMatch(weak, strong, 1000 + i) === "B") strongWins++;
    }
  }
  const pct = ((strongWins / games) * 100).toFixed(1);
  console.log(`${strong} vs ${weak}: ${strong} won ${strongWins}/${games} (${pct}%)`);
}

const N = Number(process.argv[2] ?? 100);
compare("hard", "normal", N);
compare("normal", "easy", N);
compare("hard", "easy", N);
