"use client";

import { useEffect } from "react";

/** Registers the service worker so the app installs and runs offline. */
export default function PWARegister() {
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
