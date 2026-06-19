"use client";

import { CARD_LEVELS } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import TurnBar from "./TurnBar";
import NobleRow from "./NobleTile";
import CardRow from "./CardRow";
import TokenBank from "./TokenBank";
import LogPanel from "./LogPanel";
import { CurrentDock, PlayerSummary } from "./PlayerPanel";
import { DiscardModal, GameOverModal, NobleModal } from "./Modals";

export default function GameBoard() {
  const game = useGame((s) => s.game)!;
  const levelsTopDown = [...CARD_LEVELS].reverse(); // 3,2,1

  return (
    <div className="safe-area mx-auto max-w-[1320px] px-2 py-3 sm:px-5 sm:py-4">
      <TurnBar />

      <div className="fold-aware grid grid-cols-1 gap-3 md:grid-cols-[1fr_minmax(248px,300px)] md:gap-4">
        {/* main column */}
        <div className="space-y-3 md:space-y-4">
          <NobleRow />

          <div className="space-y-3">
            {levelsTopDown.map((lvl) => (
              <CardRow key={lvl} level={lvl} />
            ))}
          </div>

          <CurrentDock />
        </div>

        {/* sidebar */}
        <div className="space-y-4">
          <TokenBank />
          <div className="space-y-2">
            {game.players.map((p, i) => (
              <PlayerSummary key={p.id} player={p} index={i} />
            ))}
          </div>
          <LogPanel />
        </div>
      </div>

      <DiscardModal />
      <NobleModal />
      <GameOverModal />
    </div>
  );
}
