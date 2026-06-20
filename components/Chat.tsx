"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { MessageCircle, X, Send } from "lucide-react";
import { useGame } from "@/store/gameStore";

export default function Chat() {
  const online = useGame((s) => s.online);
  const chat = useGame((s) => s.chat);
  const sendChat = useGame((s) => s.sendChat);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [seen, setSeen] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    if (open) setSeen(chat.length);
  }, [chat.length, open]);

  if (!online) return null;
  const myClient = online.clientId;
  const unread = Math.max(0, chat.length - seen);

  function submit() {
    const t = text.trim();
    if (!t) return;
    sendChat(t);
    setText("");
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setSeen(chat.length);
          }}
          className="gold-frame fixed bottom-4 right-4 z-[75] grid h-12 w-12 place-items-center rounded-full panel-glass text-gold transition hover:brightness-110"
          title="채팅"
        >
          <MessageCircle size={20} />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="gold-frame panel-glass fixed bottom-4 right-4 z-[75] flex h-[60vh] max-h-[440px] w-[300px] max-w-[92vw] flex-col rounded-2xl">
          <div className="flex items-center justify-between border-b border-line2 px-3 py-2">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-gold">
              <MessageCircle size={15} /> 채팅
            </span>
            <button onClick={() => setOpen(false)} className="text-ink-muted hover:text-ink">
              <X size={17} />
            </button>
          </div>

          <div ref={listRef} className="thin-scroll flex-1 space-y-1.5 overflow-y-auto p-3">
            {chat.length === 0 && <p className="text-[11px] text-ink-muted2">아직 메시지가 없습니다.</p>}
            {chat.map((m) => {
              const mine = m.client === myClient;
              return (
                <div key={m.id} className={clsx("flex flex-col", mine ? "items-end" : "items-start")}>
                  <span className="text-[10px] text-ink-muted2">{m.name}</span>
                  <span
                    className={clsx(
                      "max-w-[85%] break-words rounded-lg px-2.5 py-1.5 text-[13px]",
                      mine ? "bg-gold/20 text-ink" : "bg-black/30 text-ink",
                    )}
                  >
                    {m.text}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 border-t border-line2 p-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="메시지 입력..."
              maxLength={300}
              className="min-w-0 flex-1 rounded-lg border border-line2 bg-velvet px-2.5 py-2 text-sm text-ink outline-none focus:border-gold-soft"
            />
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="btn-gold grid h-9 w-9 place-items-center rounded-lg disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
