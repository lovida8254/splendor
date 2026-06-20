"use client";

import { useState } from "react";
import { Card, Noble } from "@/lib/engine";
import {
  CARD_BG_BY_LEVEL_COLOR,
  CARD_IMAGE_FILES,
  NOBLE_BG,
  NOBLE_IMAGE_FILES,
} from "@/lib/assets";

/** Resolved image filename for a card (per-id first, then level+color), or null. */
export function cardImage(card: Card): string | null {
  return CARD_IMAGE_FILES[card.id] ?? CARD_BG_BY_LEVEL_COLOR[`${card.level}_${card.bonus}`] ?? null;
}

/** Resolved image filename for a noble (per-id portrait, else shared backdrop), or null. */
export function nobleImage(noble: Noble): string | null {
  return NOBLE_IMAGE_FILES[noble.id] ?? NOBLE_BG ?? null;
}

/** A background image that swaps to a fallback render if it fails to load. */
export function ImageBg({
  src,
  fallback,
  className,
}: {
  src: string;
  fallback?: React.ReactNode;
  className?: string;
}) {
  const [err, setErr] = useState(false);
  if (err) return <>{fallback ?? null}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt=""
      className={className ?? "absolute inset-0 h-full w-full object-cover"}
      onError={() => setErr(true)}
      draggable={false}
    />
  );
}
