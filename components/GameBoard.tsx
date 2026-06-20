"use client";

import { CARD_LEVELS } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import TurnBar from "./TurnBar";
import NobleRow from "./NobleTile";
import CardRow from "./CardRow";
import TokenBank from "./TokenBank";
import LogPanel from "./LogPanel";
import { PlayerSummary } from "./PlayerPanel";
import PlayerDock from "./PlayerDock";
import { DiscardModal, GameOverModal, NobleModal, PurchaseModal } from "./Modals";
import ReplayBar from "./ReplayBar";
import FlyLayer from "./FlyLayer";
import Toasts from "./Toasts";

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

      {/* nobles (left) + coin supply in the empty space to their right */}
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-stretch">
        <div className="shrink-0 self-start lg:self-stretch">
          <NobleRow />
        </div>
        <div className="min-w-0 flex-1">
          <TokenBank />
        </div>
      </div>

      {/* card rows (full width) */}
      <div>
        {levelsTopDown.map((lvl) => (
          <CardRow key={lvl} level={lvl} />
        ))}
      </div>

      {/* bottom dock: current player's gems, owned cards, reserved, nobles */}
      <PlayerDock />

      {/* action log — at the very bottom */}
      <div className="mt-3">
        <LogPanel />
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
      <Toasts />
    </div>
  );
}
