/* Verifies turn timeout: with a short limit and nobody acting, the AI takes over. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open(ctx) {
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => !!window.__game, { timeout: 15000 });
  return p;
}

const A = await open(await browser.newContext());
const B = await open(await browser.newContext());

const code = await A.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.createRoom([{ name: "A", isAI: false }, { name: "B", isAI: false }], 3); // 3s timeout
  return window.__game.getState().online?.code;
});
console.log("room:", code);

await B.evaluate(async (code) => {
  const g = window.__game.getState();
  g.openOnline();
  await g.joinRoom(code);
  await window.__game.getState().claimSeat(1);
}, code);
await wait(1500);
await A.evaluate(async () => window.__game.getState().startRoom());
await wait(2000);

const before = await A.evaluate(() => window.__game.getState().actions.length);
console.log("actions before idling:", before);

// Nobody acts. Wait through several timeout windows.
await wait(9000);

const sa = await A.evaluate(() => ({ a: window.__game.getState().actions.length, t: window.__game.getState().game?.turnCount }));
const sb = await B.evaluate(() => ({ a: window.__game.getState().actions.length, t: window.__game.getState().game?.turnCount }));
console.log("A:", JSON.stringify(sa), "B:", JSON.stringify(sb));

// AI should have taken over at least one turn while idle, and both stay in sync.
const progressed = sa.a > before;
const synced = sa.a === sb.a;
console.log(`errors=${errs.length}` + (errs.length ? ` -> ${errs.slice(0, 2).join(" | ")}` : ""));
const ok = progressed && synced && errs.length === 0;
console.log(ok ? "\nTURN TIMEOUT TAKEOVER OK" : "\nTURN TIMEOUT TEST FAILED");

await browser.close();
process.exit(ok ? 0 : 1);
