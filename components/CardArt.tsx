"use client";

import { useState } from "react";
import { Card, Noble } from "@/lib/engine";
import { CARD_IMAGE_FILES, NOBLE_IMAGE_FILES } from "@/lib/assets";
import { PixelScene } from "./PixelScene";

/** Card illustration: user-supplied image (public/cards/<id>.<ext>) or pixel art. */
export function CardArt({ card }: { card: Card }) {
  const file = CARD_IMAGE_FILES[card.id];
  const [err, setErr] = useState(false);
  if (file && !err) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={`cards/${file}`}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setErr(true)}
        draggable={false}
      />
    );
  }
  return <PixelScene level={card.level} color={card.bonus} cardId={card.id} />;
}

/** Noble portrait: user-supplied image (public/nobles/<id>.<ext>) or null (crest). */
export function NobleArt({ noble }: { noble: Noble }) {
  const file = NOBLE_IMAGE_FILES[noble.id];
  const [err, setErr] = useState(false);
  if (!file || err) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={`nobles/${file}`}
      alt=""
      className="h-full w-full rounded-full object-cover"
      onError={() => setErr(true)}
      draggable={false}
    />
  );
}
