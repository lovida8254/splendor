/* Verifies 3-player quick match: 3 clients matchmake into one room, auto-start; 2p doesn't join 3p. */
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
const code = (p) => p.evaluate(() => window.__game.getState().online?.code);

const A = await open();
const B = await open();
const C = await open();
const D = await open();

// A hosts a 3-player quick room (present host)
await A.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.createRoom(
    [{ name: "삼A", isAI: false }, { name: "삼B", isAI: false }, { name: "삼C", isAI: false }],
    60,
    true,
    true,
  );
});
const codeA = await code(A);
console.log("A hosts 3p:", codeA);
await wait(1800);

// B then C quick-match into 3p
for (const P of [B, C]) {
  await P.evaluate(async () => {
    const g = window.__game.getState();
    g.openOnline();
    await g.quickMatch(3);
  });
  await wait(1500);
}
// D quick-matches 2p -> must NOT join the 3p room
await D.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.quickMatch(2);
});
await wait(1500);

const codeB = await code(B);
const codeC = await code(C);
const codeD = await code(D);
console.log("B:", codeB, "C:", codeC, "D(2p):", codeD);

// wait for auto-start of the 3p room
let st = {};
for (let i = 0; i < 15; i++) {
  await wait(1200);
  st = {
    a: await A.evaluate(() => window.__game.getState().online?.status),
    b: await B.evaluate(() => window.__game.getState().online?.status),
    c: await C.evaluate(() => window.__game.getState().online?.status),
    g: await C.evaluate(() => window.__game.getState().game?.players?.length),
  };
  if (st.a === "playing" && st.b === "playing" && st.c === "playing") break;
}
console.log("state:", JSON.stringify(st));

const sameRoom = codeB === codeA && codeC === codeA;
const dSeparate = codeD && codeD !== codeA;
const started = st.a === "playing" && st.b === "playing" && st.c === "playing" && st.g === 3;
const ok = sameRoom && dSeparate && started && errs.length === 0;
console.log(`sameRoom=${sameRoom} dSeparate=${dSeparate} started=${started} errors=${errs.length}`);
console.log(ok ? "\nQUICK MATCH 3P OK" : "\nQUICK MATCH 3P FAILED");
await browser.close();
process.exit(ok ? 0 : 1);
