"use client";

import { useEffect } from "react";
import { useGame } from "@/store/gameStore";
import SetupScreen from "@/components/SetupScreen";
import GameBoard from "@/components/GameBoard";
import OnlineLobby from "@/components/OnlineLobby";

export default function Home() {
  const game = useGame((s) => s.game);
  const online = useGame((s) => s.online);
  const openOnline = useGame((s) => s.openOnline);

  // Deep link: opening /?room=CODE jumps straight into the online lobby/room.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("room");
    const st = useGame.getState();
    if (code && !st.online && !st.game) openOnline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let content: React.ReactNode;
  if (online) {
    const inGame = online.status !== "lobby" && game;
    content = inGame ? <GameBoard /> : <OnlineLobby />;
  } else {
    content = game ? <GameBoard /> : <SetupScreen />;
  }

  return <main className="min-h-[100dvh] pb-[max(2.5rem,env(safe-area-inset-bottom))]">{content}</main>;
}
