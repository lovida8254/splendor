/* Verifies presence: two clients in a room see each other as connected. */
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
  await g.createRoom([{ name: "호스트", isAI: false }, { name: "참가자", isAI: false }], 60, true);
  return window.__game.getState().online?.code;
});
console.log("room:", code);

await B.evaluate(async (code) => {
  const g = window.__game.getState();
  g.openOnline();
  await g.joinRoom(code);
  await window.__game.getState().claimSeat(1);
}, code);
await C.evaluate(async (code) => {
  const g = window.__game.getState();
  g.openOnline();
  await g.joinRoom(code); // spectator
}, code);

await wait(6000); // allow heartbeats + polls

const pres = (p) => p.evaluate(() => (window.__game.getState().online?.presence ?? []).map((m) => ({ name: m.name, seat: m.seat })));
const pa = await pres(A);
const pb = await pres(B);
console.log("A sees:", JSON.stringify(pa));
console.log("B sees:", JSON.stringify(pb));

// expect 3 connected (host seat0, 참가자 seat1, spectator seat null) on both sides
const okA = pa.length >= 3 && pa.some((m) => m.seat === null);
const okB = pb.length >= 3;
console.log(`errors=${errs.length}` + (errs.length ? ` -> ${errs.slice(0, 2).join(" | ")}` : ""));
const ok = okA && okB && errs.length === 0;
console.log(ok ? "\nPRESENCE OK" : "\nPRESENCE FAILED");

await browser.close();
process.exit(ok ? 0 : 1);
