"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BarChart3, X, Trophy, Crown, Bot, Wifi, Users, Trash2 } from "lucide-react";
import clsx from "clsx";
import { loadRecords, computeStats, clearRecords, GameRecord, StatMode } from "@/lib/stats";

const MODE_LABEL: Record<StatMode, string> = { ai: "vs AI", hotseat: "핫시트", online: "온라인" };
const MODE_ICON: Record<StatMode, typeof Bot> = { ai: Bot, hotseat: Users, online: Wifi };

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function StatBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="menu-inset rounded-xl p-3 text-center">
      <div className="text-[11px] uppercase tracking-wider text-ink-muted2">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold text-gold">{value}</div>
      {sub && <div className="text-[11px] text-ink-muted2">{sub}</div>}
    </div>
  );
}

export default function StatsScreen({ className, label = "전적 / 통계" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) setRecords(loadRecords());
  }, [open]);

  const stats = computeStats(records);
  const recent = [...records].reverse().slice(0, 12);

  const modal =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 animate-fadein" onClick={() => setOpen(false)}>
            <div
              className="my-6 w-full max-w-lg rounded-2xl border border-line2 bg-[#1b1d24] shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-line2 px-4 py-3">
                <span className="flex items-center gap-2 font-display text-lg font-bold text-gold">
                  <BarChart3 size={18} /> 전적 / 통계
                </span>
                <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 p-4 text-ink">
                {records.length === 0 ? (
                  <p className="py-10 text-center text-sm text-ink-muted2">아직 완료된 게임이 없습니다.<br />게임을 한 판 끝내면 전적이 기록됩니다.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <StatBox label="총 게임" value={String(stats.games)} />
                      <StatBox label="승리" value={String(stats.wins)} sub={`${stats.decisive}판 중`} />
                      <StatBox label="승률" value={`${Math.round(stats.winRate * 100)}%`} />
                      <StatBox label="최고 점수" value={String(stats.bestPrestige)} sub="명성" />
                    </div>

                    <div>
                      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-ink-muted2">모드별</div>
                      <div className="space-y-1.5">
                        {(Object.keys(MODE_LABEL) as StatMode[]).map((m) => {
                          const ms = stats.byMode[m];
                          if (!ms.games) return null;
                          const Icon = MODE_ICON[m];
                          const rate = ms.games ? Math.round((ms.wins / ms.games) * 100) : 0;
                          return (
                            <div key={m} className="menu-inset flex items-center gap-2 rounded-lg px-3 py-2 text-sm">
                              <Icon size={14} className="text-gold" />
                              <span className="flex-1">{MODE_LABEL[m]}</span>
                              <span className="text-ink-muted">{ms.games}판</span>
                              <span className="text-gold">{ms.wins}승 ({rate}%)</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-1.5 text-right text-[11px] text-ink-muted2">평균 {stats.avgTurns.toFixed(1)}턴 / 게임</div>
                    </div>

                    <div>
                      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-ink-muted2">최근 기록</div>
                      <div className="space-y-1">
                        {recent.map((r, i) => {
                          const Icon = MODE_ICON[r.mode];
                          return (
                            <div key={i} className="flex items-center gap-2 rounded-lg bg-black/20 px-3 py-1.5 text-[13px]">
                              <Icon size={13} className="shrink-0 text-ink-muted2" />
                              <span
                                className={clsx(
                                  "w-8 shrink-0 text-center text-[11px] font-bold",
                                  r.meWon === true ? "text-green-400" : r.meWon === false ? "text-red-400" : "text-ink-muted2",
                                )}
                              >
                                {r.meWon === true ? "승" : r.meWon === false ? "패" : "-"}
                              </span>
                              <span className="flex flex-1 items-center gap-1 truncate text-ink-muted">
                                <Trophy size={11} className="shrink-0 text-gold" /> {r.winner}
                                {r.mePrestige != null && (
                                  <span className="ml-1 flex items-center gap-0.5 text-ink-muted2">
                                    <Crown size={10} /> {r.mePrestige}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-[10px] text-ink-muted2">{fmtDate(r.ts)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm("모든 전적 기록을 삭제할까요?")) {
                          clearRecords();
                          setRecords([]);
                        }
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line2 bg-panel py-2 text-xs text-ink-muted transition hover:bg-panel-2"
                    >
                      <Trash2 size={13} /> 기록 초기화
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        <span className="flex items-center justify-center gap-2">
          <BarChart3 size={16} /> {label}
        </span>
      </button>
      {modal}
    </>
  );
}
