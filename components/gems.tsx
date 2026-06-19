import { Gem, Sparkles } from "lucide-react";
import { TokenColor } from "@/lib/engine";
import clsx from "clsx";

export const GEM_META: Record<
  TokenColor,
  { hex: string; label: string; short: string; textDark: boolean }
> = {
  white: { hex: "#e9ecf6", label: "다이아몬드", short: "W", textDark: true },
  blue: { hex: "#3a72df", label: "사파이어", short: "B", textDark: false },
  green: { hex: "#21a06a", label: "에메랄드", short: "G", textDark: false },
  red: { hex: "#dd3a57", label: "루비", short: "R", textDark: false },
  black: { hex: "#6a6188", label: "오닉스", short: "K", textDark: false },
  gold: { hex: "#e6bd55", label: "골드(조커)", short: "★", textDark: true },
};

/** A small cost pip: colored chip with a number. */
export function Pip({
  color,
  n,
  size = "sm",
}: {
  color: TokenColor;
  n: number;
  size?: "sm" | "md";
}) {
  const m = GEM_META[color];
  return (
    <span
      title={`${m.label} ${n}`}
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-semibold leading-none ring-1 ring-black/30",
        size === "sm" ? "h-5 w-5 text-[11px]" : "h-7 w-7 text-sm",
      )}
      style={{ background: m.hex, color: m.textDark ? "#1a1626" : "#fff" }}
    >
      {n}
    </span>
  );
}

/** A gem token disc (for the supply / player holdings). */
export function GemToken({
  color,
  count,
  size = "md",
  onClick,
  disabled,
  selected,
  highlight,
}: {
  color: TokenColor;
  count: number;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  highlight?: boolean;
}) {
  const m = GEM_META[color];
  const dims = size === "lg" ? "h-14 w-14" : size === "md" ? "h-11 w-11" : "h-8 w-8";
  const Icon = color === "gold" ? Sparkles : Gem;
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !interactive}
      aria-label={`${m.label} ${count}개`}
      title={`${m.label} (${m.short}) · ${count}개`}
      className={clsx(
        "relative grid place-items-center rounded-full ring-1 transition",
        dims,
        interactive && !disabled ? "cursor-pointer hover:scale-105" : "cursor-default",
        disabled && interactive ? "opacity-35" : "",
        selected ? "ring-2 ring-gold shadow-[0_0_14px_rgba(216,178,94,.55)]" : "ring-black/40",
        highlight && !selected ? "ring-gold/70" : "",
      )}
      style={{
        background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.45), ${m.hex} 60%, rgba(0,0,0,.25))`,
      }}
    >
      <Icon
        size={size === "lg" ? 22 : size === "md" ? 18 : 14}
        className={m.textDark ? "text-black/55" : "text-white/85"}
        strokeWidth={2.2}
      />
      <span
        className={clsx(
          "absolute -bottom-1.5 -right-1.5 grid place-items-center rounded-full bg-velvet ring-1 ring-line2 font-bold",
          size === "lg" ? "h-6 w-6 text-xs" : "h-5 w-5 text-[10px]",
        )}
      >
        {count}
      </span>
    </button>
  );
}
