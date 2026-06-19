/* Playwright UI wiring test: take tokens, undo, purchase modal, replay.
   Asserts no console errors and screenshots key interactions. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });

const BENIGN = ["Extra attributes from the server", "Download the React DevTools", "was preloaded using link preload"];
const errors = [];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 850 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && !BENIGN.some((b) => m.text().includes(b)) && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

function log(s) {
  console.log(s);
}

await page.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.getByText("SPLENDOR").first().waitFor({ timeout: 15000 });
await page.getByRole("button", { name: /게임 시작/ }).click();
await page.getByText("공급처").first().waitFor({ timeout: 15000 });

// Force a deterministic human turn via the test store hook.
await page.evaluate(() => {
  const store = window.__game;
  const s = store.getState();
  const g = structuredClone(s.game);
  g.currentPlayerIndex = 0;
  g.phase = "playing";
  g.pendingDiscard = false;
  g.pendingNoble = null;
  store.setState({ game: g, history: [g], actions: [] });
});
await page.waitForTimeout(200);

// 1) Take three tokens.
let took = false;
const colors = ["white", "blue", "green", "red", "black"];
const picked = [];
for (const c of colors) {
  const btn = page.getByTestId(`supply-${c}`);
  if ((await btn.count()) && (await btn.isEnabled())) {
    await btn.click();
    picked.push(c);
    if (picked.length === 3) break;
  }
}
if (picked.length >= 1) {
  const confirm = page.getByTestId("take-confirm");
  if (await confirm.isEnabled()) {
    await confirm.click();
    took = true;
  }
}
log(`take tokens: picked=${picked.length} confirmed=${took}`);
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/ui-after-take.png` });

// 2) Undo.
const undo = page.getByTestId("undo");
const undoEnabled = (await undo.count()) && (await undo.isEnabled());
if (undoEnabled) await undo.click();
await page.waitForTimeout(200);
const afterUndo = await page.evaluate(() => window.__game.getState().actions.length);
log(`undo: enabled=${undoEnabled} actionsAfter=${afterUndo}`);

// 3) Purchase modal — craft a free affordable card, open modal, screenshot, confirm.
await page.evaluate(() => {
  const store = window.__game;
  const g = structuredClone(store.getState().game);
  g.currentPlayerIndex = 0;
  g.phase = "playing";
  g.pendingDiscard = false;
  g.pendingNoble = null;
  if (g.board[1][0]) g.board[1][0].cost = { white: 0, blue: 0, green: 0, red: 0, black: 0 };
  store.setState({ game: g, history: [g], actions: [] });
  store.getState().openPurchase({ from: "board", level: 1, slot: 0 });
});
await page.getByText("카드 구매").first().waitFor({ timeout: 5000 });
await page.screenshot({ path: `${OUT}/ui-purchase-modal.png` });
await page.getByRole("button", { name: /구매 확정/ }).click();
await page.waitForTimeout(300);
const bought = await page.evaluate(() => {
  const g = window.__game.getState().game;
  return g.players[0].purchased.length;
});
log(`purchase: bought=${bought}`);

// 4) Replay.
const replay = page.getByTestId("replay");
const replayEnabled = (await replay.count()) && (await replay.isEnabled());
if (replayEnabled) {
  await replay.click();
  await page.getByText("리플레이").first().waitFor({ timeout: 4000 });
  await page.screenshot({ path: `${OUT}/ui-replay.png` });
  await page.getByRole("button", { name: /종료/ }).click();
}
log(`replay: enabled=${replayEnabled}`);

await ctx.close();
await browser.close();

const ok = took && bought >= 1 && errors.length === 0;
console.log(`\nerrors=${errors.length}` + (errors.length ? ` -> ${errors.slice(0, 3).join(" | ")}` : ""));
console.log(ok ? "UI INTERACTION OK" : "UI INTERACTION ISSUES");
process.exit(ok ? 0 : 1);
