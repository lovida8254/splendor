"use client";

import clsx from "clsx";
import { CARD_LEVELS } from "@/lib/engine";
import { useGame } from "@/store/gameStore";
import TurnBar from "./TurnBar";
import NobleRow from "./NobleTile";
import CardRow from "./CardRow";
import TokenBank from "./TokenBank";
import LogPanel from "./LogPanel";
import { PlayerSummary } from "./PlayerPanel";
import DockDrawer from "./DockDrawer";
import { DiscardModal, GameOverModal, NobleModal, PurchaseModal } from "./Modals";
import ReplayBar from "./ReplayBar";
import FlyLayer from "./FlyLayer";
import Toasts from "./Toasts";
import TutorialCoach from "./TutorialCoach";

export default function GameBoard() {
  const game = useGame((s) => s.game)!;
  const replayActive = useGame((s) => s.replayActive);
  const inTutorial = useGame((s) => s.tutorialStep !== null);
  const levelsTopDown = [...CARD_LEVELS].reverse(); // 3,2,1

  return (
    <div
      className={clsx(
        "safe-area mx-auto max-w-[1320px] px-2 py-3 sm:px-5 sm:py-4",
        // during the tutorial the coach card is pinned to the bottom — add scroll
        // room so the bottom (Level-1) card row can clear it and stay tappable.
        inTutorial && "pb-[260px]",
      )}
    >
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
      <div data-tutorial="cards">
        {levelsTopDown.map((lvl) => (
          <CardRow key={lvl} level={lvl} />
        ))}
      </div>

      {/* current player's holdings — hidden in a right slide-out drawer */}
      <DockDrawer />

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
      <TutorialCoach />
    </div>
  );
}
