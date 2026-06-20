/* Verifies auto-reconnect: a client that reloads rejoins its room & seat. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ctxA = await browser.newContext({ viewport: { width: 900, height: 900 } });
const ctxB = await browser.newContext({ viewport: { width: 900, height: 900 } });

async function open(ctx) {
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => !!window.__game, { timeout: 15000 });
  return p;
}

const A = await open(ctxA);
const B = await open(ctxB);

const code = await A.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.createRoom([{ name: "A", isAI: false }, { name: "B", isAI: false }]);
  return window.__game.getState().online?.code;
});
const aClient = await A.evaluate(() => window.__game.getState().online.clientId);
console.log("room:", code, "A client:", aClient);

await B.evaluate(async (code) => {
  const g = window.__game.getState();
  g.openOnline();
  await g.joinRoom(code);
  await window.__game.getState().claimSeat(1);
}, code);
await wait(1500);
await A.evaluate(async () => window.__game.getState().startRoom());
await wait(2000);

// take one action by whoever's turn it is
async function act(p) {
  return p.evaluate(() => {
    const s = window.__game.getState();
    if (!s.canActMain()) return false;
    const g = s.game;
    ["white", "blue", "green"].filter((c) => g.pool[c] >= 1).forEach((c) => s.toggleToken(c));
    s.confirmTake();
    return true;
  });
}
if (!(await act(A))) await act(B);
await wait(1500);

// === simulate A reloading: a fresh page in the SAME context (same localStorage) ===
await A.close();
const A2 = await open(ctxA); // no ?room param, just /?test=1
await wait(3000); // allow auto-reconnect

const r = await A2.evaluate(() => {
  const s = window.__game.getState();
  return {
    code: s.online?.code ?? null,
    hasGame: !!s.game,
    status: s.online?.status ?? null,
    mySeatClaimed: s.online ? Object.values(s.online.seats).includes(s.online.clientId) : false,
    actions: s.actions.length,
  };
});
console.log("after reload, A2:", JSON.stringify(r));

const ok = r.code === code && r.hasGame && r.status === "playing" && r.mySeatClaimed && errs.length === 0;
console.log(`errors=${errs.length}` + (errs.length ? ` -> ${errs.slice(0, 2).join(" | ")}` : ""));
console.log(ok ? "\nRECONNECT OK" : "\nRECONNECT FAILED");

await browser.close();
process.exit(ok ? 0 : 1);
