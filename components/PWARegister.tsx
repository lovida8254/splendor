"use client";

import { useEffect } from "react";
import { useGame } from "@/store/gameStore";

/** Registers the service worker so the app installs and runs offline. */
export default function PWARegister() {
  useEffect(() => {
    // Test-only hook: expose the store when ?test=1 (for automated UI tests).
    if (typeof window !== "undefined" && window.location.search.includes("test=1")) {
      (window as unknown as { __game?: typeof useGame }).__game = useGame;
    }
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(() => {
        /* SW registration is best-effort */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);
  return null;
}
