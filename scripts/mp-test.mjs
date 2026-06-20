/* Two-client online multiplayer test against the dev server + Supabase.
   Verifies: create room -> join -> claim seat -> start -> action syncs both ways. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errs = [];

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => !!window.__game, { timeout: 15000 });
  return p;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const A = await newPage();
const B = await newPage();

// A creates a 2-human room
const code = await A.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.createRoom([{ name: "A", isAI: false }, { name: "B", isAI: false }]);
  return window.__game.getState().online?.code;
});
console.log("room code:", code);
if (!code) throw new Error("createRoom failed (no code)");

// B joins + claims seat 1
await B.evaluate(async (code) => {
  const g = window.__game.getState();
  g.openOnline();
  await g.joinRoom(code);
  await window.__game.getState().claimSeat(1);
}, code);
await wait(1500);

// A sees seat 1 claimed?
const seatsSeenByA = await A.evaluate(() => window.__game.getState().online?.seats);
console.log("seats seen by A:", JSON.stringify(seatsSeenByA));

// A starts
await A.evaluate(async () => {
  await window.__game.getState().startRoom();
});
await wait(2000);

// both should be in a playing game
const playing = async (p) => p.evaluate(() => {
  const s = window.__game.getState();
  return !!s.game && s.online?.status === "playing";
});
console.log("A playing:", await playing(A), "| B playing:", await playing(B));

// whoever's turn it is takes 3 tokens
async function tryAct(p) {
  return p.evaluate(() => {
    const s = window.__game.getState();
    if (!s.canActMain()) return null;
    const g = s.game;
    const colors = ["white", "blue", "green", "red", "black"].filter((c) => g.pool[c] >= 1).slice(0, 3);
    colors.forEach((c) => s.toggleToken(c));
    s.confirmTake();
    return { by: s.online.clientId, colors };
  });
}
let acted = await tryAct(A);
let actor = "A";
if (!acted) {
  acted = await tryAct(B);
  actor = "B";
}
console.log("acted by:", actor, JSON.stringify(acted));
await wait(2000);

const snap = (p) => p.evaluate(() => {
  const s = window.__game.getState();
  const g = s.game;
  return { actions: s.actions.length, cur: g.currentPlayerIndex, turn: g.turnCount };
});
const sa = await snap(A);
const sb = await snap(B);
console.log("A state:", JSON.stringify(sa));
console.log("B state:", JSON.stringify(sb));

const synced = sa.actions === sb.actions && sa.cur === sb.cur && sa.actions >= 1;
console.log("sync:", synced);

// rematch (host = A) and verify both reset to a fresh game
await A.evaluate(async () => {
  await window.__game.getState().rematch();
});
await wait(2500);
const ra = await snap(A);
const rb = await snap(B);
console.log("after rematch A:", JSON.stringify(ra), "B:", JSON.stringify(rb));
const rematched = ra.actions === 0 && rb.actions === 0 && ra.turn === 0 && rb.turn === 0;

console.log(`errors=${errs.length}` + (errs.length ? ` -> ${errs.slice(0, 2).join(" | ")}` : ""));
const ok = synced && rematched && errs.length === 0;
console.log(ok ? "\nMULTIPLAYER + REMATCH OK" : "\nMULTIPLAYER TEST FAILED");

await browser.close();
process.exit(ok ? 0 : 1);
