/* Verifies spectator mode: a client without a seat watches read-only and stays synced. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => !!window.__game, { timeout: 15000 });
  return p;
}

const A = await open();
const B = await open();
const C = await open(); // spectator

const code = await A.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.createRoom([{ name: "A", isAI: false }, { name: "B", isAI: false }], null, false);
  return window.__game.getState().online?.code;
});

await B.evaluate(async (code) => {
  const g = window.__game.getState();
  g.openOnline();
  await g.joinRoom(code);
  await window.__game.getState().claimSeat(1);
}, code);
await C.evaluate(async (code) => {
  const g = window.__game.getState();
  g.openOnline();
  await g.joinRoom(code); // no claimSeat -> spectator
}, code);
await wait(1500);
await A.evaluate(async () => window.__game.getState().startRoom());
await wait(2000);

const cView = await C.evaluate(() => {
  const s = window.__game.getState();
  return { hasGame: !!s.game, status: s.online?.status, canAct: s.canActMain(), seat: Object.values(s.online.seats).includes(s.online.clientId) };
});
console.log("spectator C:", JSON.stringify(cView));

// a real player acts; spectator must see it but never be able to act
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
await wait(2000);

const cAfter = await C.evaluate(() => ({ actions: window.__game.getState().actions.length, canAct: window.__game.getState().canActMain() }));
console.log("spectator after action:", JSON.stringify(cAfter));

const ok =
  cView.hasGame && cView.status === "playing" && cView.canAct === false && cView.seat === false &&
  cAfter.actions >= 1 && cAfter.canAct === false && errs.length === 0;
console.log(`errors=${errs.length}` + (errs.length ? ` -> ${errs.slice(0, 2).join(" | ")}` : ""));
console.log(ok ? "\nSPECTATOR OK" : "\nSPECTATOR FAILED");

await browser.close();
process.exit(ok ? 0 : 1);
