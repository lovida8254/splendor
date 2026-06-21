/* Verifies the interactive tutorial: each guided action auto-advances the coach. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const step = () => p.evaluate(() => window.__game.getState().tutorialStep);

await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForFunction(() => !!window.__game, { timeout: 15000 });

// start tutorial
await p.evaluate(() => window.__game.getState().startTutorial());
await wait(400);
console.log("after start, step =", await step()); // expect 0

// step 0 (welcome) -> next
await p.evaluate(() => window.__game.getState().tutorialNext());
await wait(300);
console.log("step =", await step()); // expect 1

// step 1: take 3 different tokens
await p.evaluate(() => {
  const s = window.__game.getState();
  const g = s.game;
  ["white", "blue", "green"].filter((c) => g.pool[c] >= 1).forEach((c) => s.toggleToken(c));
  s.confirmTake();
});
await wait(600);
const s2 = await step();
console.log("after take, step =", s2); // expect 2

// step 2: buy the first affordable board card
const bought = await p.evaluate(() => {
  const s = window.__game.getState();
  for (const level of [1, 2, 3]) {
    const slots = s.game.board[level];
    for (let slot = 0; slot < slots.length; slot++) {
      if (!slots[slot]) continue;
      s.openPurchase({ from: "board", level, slot });
      const before = s.actions.length;
      s.confirmPurchase();
      if (window.__game.getState().actions.length > before) return true;
      window.__game.getState().cancelPurchase();
    }
  }
  return false;
});
await wait(600);
const s3 = await step();
console.log("bought =", bought, "step =", s3); // expect 3

// step 3: reserve a board card
await p.evaluate(() => {
  const s = window.__game.getState();
  for (const level of [1, 2, 3]) {
    const slots = s.game.board[level];
    for (let slot = 0; slot < slots.length; slot++) {
      if (slots[slot]) {
        s.reserve({ from: "board", level, slot });
        return;
      }
    }
  }
});
await wait(600);
const s4 = await step();
console.log("after reserve, step =", s4); // expect 4

// step 4 (nobles) -> next ; step 5 (finish) -> end
await p.evaluate(() => window.__game.getState().tutorialNext());
await wait(200);
const s5 = await step();
await p.evaluate(() => window.__game.getState().endTutorial());
await wait(300);
const ended = await p.evaluate(() => ({ tut: window.__game.getState().tutorialStep, game: !!window.__game.getState().game }));
console.log("step5 =", s5, "ended =", JSON.stringify(ended));

const ok =
  s2 === 2 && bought && s3 === 3 && s4 === 4 && s5 === 5 && ended.tut === null && ended.game === false && errs.length === 0;
console.log(`errors=${errs.length}`);
console.log(ok ? "\nTUTORIAL OK" : "\nTUTORIAL FAILED");
await b.close();
process.exit(ok ? 0 : 1);
