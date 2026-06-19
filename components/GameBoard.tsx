"use client";

import { CARD_LEVELS } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import TurnBar from "./TurnBar";
import NobleRow from "./NobleTile";
import CardRow from "./CardRow";
import TokenBank from "./TokenBank";
import LogPanel from "./LogPanel";
import { PlayerSummary, ReservedDock } from "./PlayerPanel";
import { DiscardModal, GameOverModal, NobleModal, PurchaseModal } from "./Modals";
import ReplayBar from "./ReplayBar";
import FlyLayer from "./FlyLayer";

export default function GameBoard() {
  const game = useGame((s) => s.game)!;
  const replayActive = useGame((s) => s.replayActive);
  const levelsTopDown = [...CARD_LEVELS].reverse(); // 3,2,1

  return (
    <div className="safe-area mx-auto max-w-[1320px] px-2 py-3 sm:px-5 sm:py-4">
      <TurnBar />

      {/* All players' holdings + score, visible at the top (reference layout) */}
      <div className="mb-1 flex items-center gap-3 px-1 text-[10px] text-ink-muted2">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-2.5 rounded-[2px] bg-ink-muted/70" /> 보유 카드
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-ink-muted/70" /> 보유 코인
        </span>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {game.players.map((p, i) => (
          <PlayerSummary key={p.id} player={p} index={i} />
        ))}
      </div>

      <div className="fold-aware grid grid-cols-1 gap-3 md:grid-cols-[1fr_minmax(248px,300px)] md:gap-4">
        {/* main column */}
        <div className="space-y-3 md:space-y-4">
          <NobleRow />
          <div className="space-y-3">
            {levelsTopDown.map((lvl) => (
              <CardRow key={lvl} level={lvl} />
            ))}
          </div>
          <ReservedDock />
        </div>

        {/* sidebar */}
        <div className="space-y-3 md:space-y-4">
          <TokenBank />
          <LogPanel />
        </div>
      </div>

      {!replayActive && (
        <>
          <PurchaseModal />
          <DiscardModal />
          <NobleModal />
          <GameOverModal />
        </>
      )}
      <ReplayBar />
      <FlyLayer />
    </div>
  );
}
