"use client";

import { useState } from "react";
import clsx from "clsx";
import { BookOpen, X, Crown, Coins, Layers, Gem, Trophy, Bookmark } from "lucide-react";
import { TokenColor } from "@/lib/engine";
import { GEM_META, GemImg } from "./gems";

const GEM_ROW: TokenColor[] = ["white", "blue", "green", "red", "black", "gold"];

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl border border-white/10 p-3"
      style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(0,0,0,0.18))" }}
    >
      <h3 className="mb-1.5 flex items-center gap-2 font-display text-sm font-bold text-gold">
        <Icon size={15} /> {title}
      </h3>
      <div className="space-y-1 text-[13px] leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

/** A "How to play" button that opens an original rules summary overlay. */
export default function HowToPlay({ className, label = "게임 방법" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={clsx("flex items-center justify-center gap-2 transition", className)}
      >
        <BookOpen size={16} /> {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/65 p-4 animate-fadein"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[88vh] w-full max-w-lg overflow-y-auto thin-scroll rounded-2xl border border-gold/50 p-5"
            style={{
              background: "linear-gradient(180deg, #30333c 0%, #1a1c21 100%)",
              boxShadow: "0 0 22px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), 0 24px 50px rgba(0,0,0,0.55)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="brand-text font-display text-2xl font-bold tracking-wider">게임 방법</h2>
              <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2.5">
              <Section icon={Trophy} title="목표">
                <p>보석 토큰을 모아 개발 카드를 구매하고, 카드와 귀족의 <b className="text-gold">명성 점수</b>를 쌓습니다. 먼저 <b className="text-gold">15점</b>에 도달하면 그 라운드를 끝까지 진행한 뒤 최고 점수자가 승리합니다.</p>
              </Section>

              <Section icon={Coins} title="매 턴 — 아래 중 하나만">
                <p>① <b className="text-ink">서로 다른 색 토큰 3개</b> 가져오기</p>
                <p>② <b className="text-ink">같은 색 토큰 2개</b> 가져오기 (그 색이 <b>4개 이상</b> 남아 있을 때만)</p>
                <p>③ <b className="text-ink">카드 1장 예약</b> + 골드(조커) 1개 받기 (예약은 최대 3장)</p>
                <p>④ <b className="text-ink">개발 카드 1장 구매</b></p>
              </Section>

              <Section icon={Gem} title="토큰">
                <div className="my-1 flex flex-wrap items-start gap-2.5">
                  {GEM_ROW.map((c) => (
                    <div key={c} className="flex w-[52px] flex-col items-center gap-1">
                      <GemImg color={c} size={36} />
                      <span className="text-center text-[10px] leading-tight text-ink-muted2">
                        {GEM_META[c].label}
                      </span>
                    </div>
                  ))}
                </div>
                <p>5색 보석(다이아·사파이어·에메랄드·루비·오닉스)과 <b className="text-gold">골드(조커)</b>가 있습니다. 골드는 부족한 어떤 색이든 대체합니다.</p>
                <p>턴 종료 시 토큰을 <b>10개</b>까지만 보유할 수 있어, 초과분은 반환합니다.</p>
              </Section>

              <Section icon={Layers} title="개발 카드 · 보너스">
                <p>구매한 카드는 우상단 색의 <b className="text-gold">영구 보너스(할인)</b>를 줍니다. 같은 색 카드를 모을수록 그 색 비용이 점점 싸집니다.</p>
                <p>비용은 보너스로 먼저 상쇄하고, 부족분만 토큰(또는 골드)으로 냅니다.</p>
              </Section>

              <Section icon={Crown} title="귀족">
                <p>보유한 카드 보너스가 귀족의 요구치를 충족하면 턴 종료 시 자동으로 방문하여 <b className="text-gold">+3점</b>을 줍니다. (토큰이 아니라 <b>카드 보너스</b>로 판정, 턴당 1명)</p>
              </Section>

              <Section icon={Bookmark} title="예약 · 승리">
                <p>예약은 카드를 선점하고 골드를 얻는 수단입니다(최대 3장, 본인만 구매 가능).</p>
                <p>15점 도달 후 그 라운드가 끝나면 최고 점수자 승리. <b>동점 시 구매한 카드 수가 적은 쪽</b>이 이깁니다.</p>
              </Section>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="btn-gold mt-4 w-full rounded-xl py-3 font-display font-bold tracking-wide"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
