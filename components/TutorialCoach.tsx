"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { GraduationCap, ArrowRight, X, Check } from "lucide-react";
import { useGame } from "@/store/gameStore";
import type { Action } from "@/lib/engine";

type Step = {
  title: string;
  body: string;
  manual?: boolean; // advance via the "다음" button
  finish?: boolean; // last step
  goal?: (actionType: Action["type"]) => boolean; // auto-advance when the player does this
  highlight?: "bank" | "cards" | "nobles";
};

const STEPS: Step[] = [
  {
    title: "환영합니다!",
    body: "스플렌더의 목표는 보석상이 되어 명성 15점에 먼저 도달하는 것이에요. 직접 해보며 익혀봅시다.",
    manual: true,
  },
  {
    title: "① 토큰 가져오기",
    body: "공급처에서 서로 다른 색 코인 3개를 고른 뒤 '가져오기'를 누르세요. 토큰으로 카드를 삽니다.",
    goal: (t) => t === "TAKE_THREE" || t === "TAKE_TWO",
    highlight: "bank",
  },
  {
    title: "② 카드 구매",
    body: "모은 토큰으로 카드를 사보세요. 카드의 보석(보너스)은 다음 구매부터 영구 할인이 됩니다.",
    goal: (t) => t === "PURCHASE",
    highlight: "cards",
  },
  {
    title: "③ 카드 예약",
    body: "마음에 드는 카드를 '예약'하면 골드(만능 토큰) 1개를 받고 나중에 살 수 있어요. 한 장 예약해보세요.",
    goal: (t) => t === "RESERVE",
    highlight: "cards",
  },
  {
    title: "④ 귀족의 방문",
    body: "보유한 보석(카드 보너스)이 귀족의 요구 조건을 충족하면, 귀족이 찾아와 추가 명성 3점을 줍니다.",
    manual: true,
    highlight: "nobles",
  },
  {
    title: "준비 완료!",
    body: "기본을 모두 익혔어요. 이제 실전(vs AI · 온라인)에서 즐겨보세요!",
    manual: true,
    finish: true,
  },
];

type Rect = { top: number; left: number; width: number; height: number };

export default function TutorialCoach() {
  const step = useGame((s) => s.tutorialStep);
  const actions = useGame((s) => s.actions);
  const next = useGame((s) => s.tutorialNext);
  const end = useGame((s) => s.endTutorial);
  const [rect, setRect] = useState<Rect | null>(null);
  // when the spotlighted region reaches into the lower screen (e.g. the card
  // rows), dock the coach card at the TOP so it never covers the cards' buy
  // buttons — otherwise it stays at the bottom.
  const [dockTop, setDockTop] = useState(false);

  const cur = step != null ? STEPS[step] : null;

  // auto-advance when the learner performs the step's action
  useEffect(() => {
    if (!cur?.goal) return;
    const last = actions[actions.length - 1];
    if (last && cur.goal(last.type)) next();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions.length, step]);

  // spotlight the highlighted region
  useEffect(() => {
    const sel = cur?.highlight;
    if (!sel) {
      setRect(null);
      setDockTop(false);
      return;
    }
    const find = () => document.querySelector(`[data-tutorial="${sel}"]`);
    const update = () => {
      const el = find();
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        // if the highlight reaches into the bottom ~45% of the viewport, the
        // bottom-docked coach card would cover it → flip the coach to the top.
        setDockTop(r.top + r.height > window.innerHeight * 0.55);
      }
    };
    find()?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(update, 350); // after scroll settles
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    const iv = setInterval(update, 500);
    return () => {
      clearTimeout(t);
      clearInterval(iv);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (step == null || !cur) return null;

  return (
    <>
      {/* spotlight: dims everything except the highlighted box, lets clicks pass through */}
      {rect && (
        <div
          className="pointer-events-none fixed z-[80] rounded-2xl transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55), 0 0 0 2px #d8b25e, 0 0 24px rgba(216,178,94,0.7)",
          }}
        />
      )}
      {/* dim backdrop when no specific target (welcome/finish) */}
      {!rect && <div className="pointer-events-none fixed inset-0 z-[80] bg-black/45" />}

      {/* coach card — docks at top when the spotlight is in the lower screen */}
      <div
        className={clsx(
          "fixed inset-x-0 z-[81] flex justify-center p-3",
          dockTop
            ? "top-0 pt-[max(0.75rem,env(safe-area-inset-top))]"
            : "bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="gold-frame panel-glass w-full max-w-md rounded-2xl p-4 shadow-2xl animate-fadein">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-display text-sm font-bold text-gold">
              <GraduationCap size={16} /> 튜토리얼
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {STEPS.map((_, i) => (
                  <span
                    key={i}
                    className={clsx("h-1.5 w-1.5 rounded-full", i === step ? "bg-gold" : i < step ? "bg-gold/50" : "bg-line2")}
                  />
                ))}
              </div>
              <button onClick={end} title="튜토리얼 종료" className="text-ink-muted hover:text-ink">
                <X size={16} />
              </button>
            </div>
          </div>

          <h3 className="font-display text-base font-bold text-ink">{cur.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{cur.body}</p>

          <div className="mt-3 flex items-center justify-between gap-2">
            {cur.goal ? (
              <span className="text-[12px] font-medium text-gold/90">직접 해보세요 ↑</span>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {cur.goal && (
                <button onClick={next} className="text-xs text-ink-muted2 underline-offset-2 hover:text-ink-muted hover:underline">
                  건너뛰기
                </button>
              )}
              {cur.finish ? (
                <button onClick={end} className="btn-gold flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold">
                  <Check size={15} /> 완료
                </button>
              ) : cur.manual ? (
                <button onClick={next} className="btn-gold flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold">
                  다음 <ArrowRight size={15} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
