/* Live end-to-end: an online game auto-finishes (timeout AI), results save, leaderboard shows them. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "https://splendor-red.vercel.app";
const browser = await chromium.launch();
const errs = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => !!window.__game, { timeout: 20000 });
  return p;
}

const NAME_A = "리더테스트A";
const NAME_B = "리더테스트B";

const A = await open();
const B = await open();

const code = await A.evaluate(async (nm) => {
  const g = window.__game.getState();
  g.setSpeed("fast");
  g.openOnline();
  // 2s turn timeout + AI takeover -> nobody acts, AI plays both seats to completion
  await g.createRoom([{ name: nm[0], isAI: false }, { name: nm[1], isAI: false }], 2, true);
  return window.__game.getState().online?.code;
}, [NAME_A, NAME_B]);
console.log("room:", code);

await B.evaluate(async (code) => {
  const g = window.__game.getState();
  g.setSpeed("fast");
  g.openOnline();
  await g.joinRoom(code);
  await window.__game.getState().claimSeat(1);
}, code);
await wait(1500);
await A.evaluate(async () => window.__game.getState().startRoom());

// wait for the game to finish (AI-driven via timeout)
let phase = "playing";
for (let i = 0; i < 90 && phase !== "finished"; i++) {
  await wait(3000);
  phase = await A.evaluate(() => window.__game.getState().game?.phase);
  if (i % 5 === 0) console.log(`  t=${i * 3}s phase=${phase} turn=${await A.evaluate(() => window.__game.getState().game?.turnCount)}`);
}
console.log("final phase:", phase);
await wait(4000); // let result upserts land

// A leaves to the menu, opens the global leaderboard
await A.evaluate(() => window.__game.getState().leaveRoom());
await A.getByRole("button", { name: /게임 시작/ }).waitFor({ timeout: 15000 });
await A.getByRole("button", { name: /전적/ }).click();
await A.getByRole("button", { name: /글로벌 리더보드/ }).click();
await wait(2500);
const body = await A.evaluate(() => document.body.innerText);

const hasA = body.includes(NAME_A);
const hasB = body.includes(NAME_B);
console.log("leaderboard shows A:", hasA, "B:", hasB, "errors:", errs.length);

const ok = phase === "finished" && hasA && hasB && errs.length === 0;
console.log(ok ? "\nLEADERBOARD LIVE OK" : "\nLEADERBOARD LIVE FAILED");
await browser.close();
process.exit(ok ? 0 : 1);
