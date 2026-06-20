"use client";

import { useEffect } from "react";
import { useGame } from "@/store/gameStore";
import SetupScreen from "@/components/SetupScreen";
import GameBoard from "@/components/GameBoard";
import OnlineLobby from "@/components/OnlineLobby";
import Chat from "@/components/Chat";

export default function Home() {
  const game = useGame((s) => s.game);
  const online = useGame((s) => s.online);
  const openOnline = useGame((s) => s.openOnline);

  // Deep link (?room=CODE) takes priority; otherwise auto-reconnect to the
  // last online room (e.g. after a refresh) — same clientId keeps your seat.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("room");
    const st = useGame.getState();
    if (code) {
      if (!st.online && !st.game) openOnline();
    } else {
      void st.tryReconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let content: React.ReactNode;
  if (online) {
    const inGame = online.status !== "lobby" && game;
    content = inGame ? <GameBoard /> : <OnlineLobby />;
  } else {
    content = game ? <GameBoard /> : <SetupScreen />;
  }

  return (
    <main className="min-h-[100dvh] pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      {content}
      <Chat />
    </main>
  );
}
