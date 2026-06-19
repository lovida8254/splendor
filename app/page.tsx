"use client";

import { useGame } from "@/store/gameStore";
import SetupScreen from "@/components/SetupScreen";
import GameBoard from "@/components/GameBoard";

export default function Home() {
  const game = useGame((s) => s.game);
  return (
    <main className="min-h-[100dvh] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {game ? <GameBoard /> : <SetupScreen />}
    </main>
  );
}
