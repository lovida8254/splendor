"use client";

import { useEffect, useState } from "react";
import { Flight, useFly } from "@/store/flyStore";
import { CoinFace, GEM_META } from "./gems";
import { PixelScene } from "./PixelScene";

/** The full card floating during a card flight (real art if available). */
function CardChip({ f }: { f: Flight }) {
  const m = GEM_META[f.color];
  return (
    <div
      className="overflow-hidden rounded-xl border-2 border-gold/70 shadow-[0_14px_34px_rgba(0,0,0,.6)]"
      style={{ width: 86, height: 150, background: `linear-gradient(157deg, ${m.hex}33, #181228)` }}
    >
      {f.cardSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`cards/${f.cardSrc}`} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <PixelScene level={f.cardLevel ?? 1} color={f.color} cardId={f.cardId ?? "x"} />
      )}
    </div>
  );
}

const FLIGHT_MS = 620;

function FlyToken({ f, onDone }: { f: Flight; onDone: () => void }) {
  // stage 0: appear at source · 1: hover (lifted) · 2: fly to target
  const [stage, setStage] = useState(0);
  const hold = f.hold ?? 700;

  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setStage(1)));
    const t = setTimeout(() => setStage(2), f.delay + hold);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
  }, [f.delay, hold]);

  // safety removal once the whole sequence is done
  useEffect(() => {
    const t = setTimeout(onDone, f.delay + hold + FLIGHT_MS + 150);
    return () => clearTimeout(t);
  }, [f.delay, hold, onDone]);

  const dx = f.x1 - f.x0;
  const dy = f.y1 - f.y0;
  const flying = stage === 2;

  return (
    <span
      onTransitionEnd={(e) => {
        if (flying && e.propertyName === "transform") onDone();
      }}
      style={{
        position: "fixed",
        left: f.x0,
        top: f.y0,
        transform: flying
          ? `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`
          : stage === 1
            ? "translate(-50%, -50%) scale(1.18)" // hovering, slightly lifted
            : "translate(-50%, -50%) scale(0.9)",
        opacity: flying ? 0.15 : 1,
        filter: stage === 1 ? "drop-shadow(0 0 8px rgba(216,178,94,.6))" : "none",
        transition: flying
          ? `transform ${FLIGHT_MS}ms cubic-bezier(.45,.05,.3,1), opacity ${FLIGHT_MS}ms ease-in`
          : "transform 220ms ease-out, filter 220ms ease-out",
        willChange: "transform, opacity",
      }}
    >
      {f.kind === "card" ? <CardChip f={f} /> : <CoinFace color={f.color} size={30} />}
    </span>
  );
}

/** Fixed overlay that renders in-flight tokens between supply and players. */
export default function FlyLayer() {
  const flights = useFly((s) => s.flights);
  const remove = useFly((s) => s.remove);
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {flights.map((f) => (
        <FlyToken key={f.id} f={f} onDone={() => remove(f.id)} />
      ))}
    </div>
  );
}
