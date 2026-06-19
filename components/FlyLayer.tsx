"use client";

import { useEffect, useState } from "react";
import { Flight, useFly } from "@/store/flyStore";
import { CoinFace, GEM_META } from "./gems";
import { PixelGem } from "./PixelGem";

function CardChip({ color }: { color: Flight["color"] }) {
  const m = GEM_META[color];
  return (
    <span
      className="grid place-items-center rounded-md ring-1 ring-gold/40"
      style={{
        width: 34,
        height: 46,
        background: `linear-gradient(157deg, ${m.hex}55, #1a1430 75%)`,
        boxShadow: "0 6px 14px rgba(0,0,0,.5)",
      }}
    >
      <PixelGem color={color} size={26} />
    </span>
  );
}

function FlyToken({ f, onDone }: { f: Flight; onDone: () => void }) {
  const [moved, setMoved] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setMoved(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  // safety: remove even if transitionend doesn't fire
  useEffect(() => {
    const t = setTimeout(onDone, 900 + f.delay);
    return () => clearTimeout(t);
  }, [f.delay, onDone]);

  const dx = f.x1 - f.x0;
  const dy = f.y1 - f.y0;
  return (
    <span
      onTransitionEnd={onDone}
      style={{
        position: "fixed",
        left: f.x0,
        top: f.y0,
        transform: moved
          ? `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.6)`
          : "translate(-50%, -50%) scale(1)",
        opacity: moved ? 0.15 : 1,
        transition: `transform 520ms cubic-bezier(.45,.05,.3,1) ${f.delay}ms, opacity 520ms ease-in ${f.delay}ms`,
        willChange: "transform, opacity",
      }}
    >
      {f.kind === "card" ? <CardChip color={f.color} /> : <CoinFace color={f.color} size={30} />}
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
