import clsx from "clsx";
import { TokenColor } from "@/lib/engine";

export const GEM_META: Record<
  TokenColor,
  { hex: string; light: string; dark: string; label: string; short: string; textDark: boolean }
> = {
  white: { hex: "#e9ecf6", light: "#ffffff", dark: "#b9bed0", label: "다이아몬드", short: "W", textDark: true },
  blue: { hex: "#3a72df", light: "#7ea8f5", dark: "#1f4699", label: "사파이어", short: "B", textDark: false },
  green: { hex: "#21a06a", light: "#5fd29c", dark: "#136241", label: "에메랄드", short: "G", textDark: false },
  red: { hex: "#dd3a57", light: "#f4798c", dark: "#92223a", label: "루비", short: "R", textDark: false },
  black: { hex: "#6a6188", light: "#9a90bd", dark: "#3d3656", label: "오닉스", short: "K", textDark: false },
  gold: { hex: "#e6bd55", light: "#f7e29a", dark: "#a9822f", label: "골드(조커)", short: "★", textDark: true },
};

/** A faceted round-brilliant gem rendered as inline SVG. Crisp at any size. */
export function GemJewel({ color, size = 28 }: { color: TokenColor; size?: number }) {
  const m = GEM_META[color];
  const id = `g-${color}`;
  const C = 50;
  const outerR = 47;
  const tableR = 18;
  const pts = (r: number, off = 0) =>
    Array.from({ length: 8 }, (_, i) => {
      const a = (Math.PI / 4) * i + off;
      return [C + r * Math.cos(a), C + r * Math.sin(a)] as const;
    });
  const outer = pts(outerR, Math.PI / 8);
  const table = pts(tableR, Math.PI / 8);
  const facets = outer.map((o, i) => {
    const o2 = outer[(i + 1) % 8];
    const t = table[i];
    const t2 = table[(i + 1) % 8];
    return `${t[0]},${t[1]} ${o[0]},${o[1]} ${o2[0]},${o2[1]} ${t2[0]},${t2[1]}`;
  });
  const tablePoly = table.map((p) => `${p[0]},${p[1]}`).join(" ");
  const girdle = outer.map((p) => `${p[0]},${p[1]}`).join(" ");

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="block drop-shadow-[0_1px_2px_rgba(0,0,0,.5)]">
      <defs>
        <radialGradient id={`${id}-tbl`} cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor={m.light} />
          <stop offset="0.6" stopColor={m.hex} />
          <stop offset="1" stopColor={m.dark} />
        </radialGradient>
      </defs>
      <polygon points={girdle} fill={m.dark} stroke="rgba(0,0,0,.45)" strokeWidth="2" strokeLinejoin="round" />
      {facets.map((f, i) => (
        <polygon
          key={i}
          points={f}
          fill={i % 2 === 0 ? m.hex : m.dark}
          stroke="rgba(0,0,0,.28)"
          strokeWidth="0.8"
          opacity={i % 2 === 0 ? 0.95 : 0.8}
        />
      ))}
      <polygon points={tablePoly} fill={`url(#${id}-tbl)`} stroke="rgba(255,255,255,.35)" strokeWidth="0.8" />
      <polygon points={table.slice(0, 3).map((p) => `${p[0]},${p[1]}`).join(" ") + ` ${C},${C}`} fill="#fff" opacity="0.22" />
    </svg>
  );
}

/**
 * A gem token (poker-chip style coin with the jewel inset).
 * `stack` renders depth discs to imply a pile (supply). `count` shows in a pill.
 */
export function GemToken({
  color,
  count,
  size = "md",
  onClick,
  disabled,
  selected,
  highlight,
  stack,
  showZero = true,
  testId,
}: {
  color: TokenColor;
  count: number;
  size?: "xs" | "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  highlight?: boolean;
  stack?: boolean;
  showZero?: boolean;
  testId?: string;
}) {
  const m = GEM_META[color];
  const px = size === "lg" ? 56 : size === "md" ? 44 : size === "sm" ? 34 : 26;
  const jewel = Math.round(px * 0.56);
  const interactive = !!onClick && !disabled;
  const depth = stack ? Math.min(3, Math.max(0, count)) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-label={`${m.label} ${count}개`}
      title={`${m.label} (${m.short}) · ${count}개`}
      data-testid={testId}
      className={clsx(
        "relative shrink-0 transition-transform",
        interactive ? "cursor-pointer hover:-translate-y-0.5" : "cursor-default",
        selected ? "-translate-y-1" : "",
        !interactive && disabled ? "opacity-40" : "",
      )}
      style={{ width: px, height: px + depth * 3 }}
    >
      {/* depth discs */}
      {Array.from({ length: depth }).map((_, i) => (
        <span
          key={i}
          className="absolute left-0 rounded-full"
          style={{
            width: px,
            height: px,
            top: (depth - i) * 3,
            background: m.dark,
            boxShadow: "inset 0 -2px 3px rgba(0,0,0,.4)",
          }}
        />
      ))}
      {/* top coin */}
      <span
        className="absolute left-0 top-0 grid place-items-center rounded-full"
        style={{
          width: px,
          height: px,
          background: `radial-gradient(circle at 32% 28%, ${m.light}, ${m.hex} 55%, ${m.dark})`,
          // Combine inset highlights with the selection/highlight ring in ONE
          // box-shadow (an inline `ring` would be overridden by this style).
          boxShadow: [
            "inset 0 2px 4px rgba(255,255,255,.35)",
            "inset 0 -3px 5px rgba(0,0,0,.35)",
            selected
              ? "0 0 0 3px #d8b25e, 0 0 16px rgba(216,178,94,.7)"
              : highlight
                ? "0 0 0 1.5px rgba(216,178,94,.5)"
                : "0 0 0 1px rgba(0,0,0,.4)",
          ].join(", "),
        }}
      >
        <GemJewel color={color} size={jewel} />
      </span>
      {/* count pill */}
      {(showZero || count > 0) && (
        <span
          className={clsx(
            "absolute z-10 grid place-items-center rounded-full bg-velvet font-bold text-ink ring-1 ring-gold/50",
            size === "lg" ? "h-6 w-6 text-xs" : size === "md" ? "h-5 w-5 text-[11px]" : "h-4 w-4 text-[9px]",
          )}
          style={{ top: -4, right: -4 }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** A bare coin face (no count/button) used by the fly-animation overlay. */
export function CoinFace({ color, size = 30 }: { color: TokenColor; size?: number }) {
  const m = GEM_META[color];
  return (
    <span
      className="grid place-items-center rounded-full ring-1 ring-black/40"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 32% 28%, ${m.light}, ${m.hex} 55%, ${m.dark})`,
        boxShadow: "inset 0 2px 4px rgba(255,255,255,.35), inset 0 -3px 5px rgba(0,0,0,.35), 0 4px 10px rgba(0,0,0,.4)",
      }}
    >
      <GemJewel color={color} size={Math.round(size * 0.56)} />
    </span>
  );
}

/** A development-card cost chip: colored circle, white number, gem silhouette. */
export function Pip({ color, n, size = "sm" }: { color: TokenColor; n: number; size?: "sm" | "md" }) {
  const m = GEM_META[color];
  const dim = size === "md" ? "h-7 w-7 text-sm" : "h-6 w-6 text-xs";
  return (
    <span
      title={`${m.label} ${n}`}
      className={clsx("relative grid place-items-center rounded-full font-bold ring-1 ring-black/40", dim)}
      style={{
        background: `radial-gradient(circle at 35% 30%, ${m.light}, ${m.hex} 60%, ${m.dark})`,
        color: m.textDark ? "#1a1626" : "#fff",
        textShadow: m.textDark ? "none" : "0 1px 1px rgba(0,0,0,.5)",
      }}
    >
      {n}
    </span>
  );
}
