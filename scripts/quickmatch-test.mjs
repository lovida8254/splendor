/* Verifies quick match: B finds A's public room, joins, host auto-starts, both synced. */
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

// A hosts a public quick room (present host)
const codeA = await A.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.createRoom([{ name: "퀵A", isAI: false }, { name: "퀵B", isAI: false }], 60, true, true);
  return window.__game.getState().online?.code;
});
console.log("A hosts:", codeA);
await wait(2000);

// B uses quick match -> should find and join A's room
await B.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.quickMatch();
});
const codeB = await B.evaluate(() => window.__game.getState().online?.code);
console.log("B matched into:", codeB);

// wait for host auto-start + sync
let st = {};
for (let i = 0; i < 15; i++) {
  await wait(1200);
  st = {
    aStatus: await A.evaluate(() => window.__game.getState().online?.status),
    bStatus: await B.evaluate(() => window.__game.getState().online?.status),
    aGame: await A.evaluate(() => !!window.__game.getState().game),
    bGame: await B.evaluate(() => !!window.__game.getState().game),
    aActs: await A.evaluate(() => window.__game.getState().actions.length),
    bActs: await B.evaluate(() => window.__game.getState().actions.length),
  };
  if (st.aStatus === "playing" && st.bStatus === "playing" && st.aGame && st.bGame) break;
}
console.log("state:", JSON.stringify(st));

const ok =
  codeB === codeA &&
  st.aStatus === "playing" &&
  st.bStatus === "playing" &&
  st.aGame &&
  st.bGame &&
  st.aActs === st.bActs &&
  errs.length === 0;
console.log(`errors=${errs.length}`);
console.log(ok ? "\nQUICK MATCH OK" : "\nQUICK MATCH FAILED");
await browser.close();
process.exit(ok ? 0 : 1);
