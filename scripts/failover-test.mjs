/* Verifies: (1) offline seat -> AI takeover, (2) host disconnect -> auto handoff. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function open() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForFunction(() => !!window.__game, { timeout: 15000 });
  return p;
}
const cur = (p) => p.evaluate(() => window.__game.getState().game?.currentPlayerIndex);
const actCount = (p) => p.evaluate(() => window.__game.getState().actions.length);
async function actIf(p) {
  return p.evaluate(() => {
    const s = window.__game.getState();
    if (!s.canActMain()) return false;
    const g = s.game;
    ["white", "blue", "green"].filter((c) => g.pool[c] >= 1).forEach((c) => s.toggleToken(c));
    s.confirmTake();
    return true;
  });
}

// ---- Part 1: offline seat -> AI takeover (no turn timeout) ----
let A = await open();
let B = await open();
const code1 = await A.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.createRoom([{ name: "A", isAI: false }, { name: "B", isAI: false }], null, true); // no timeout, takeover on
  return window.__game.getState().online?.code;
});
await B.evaluate(async (c) => {
  const g = window.__game.getState();
  g.openOnline();
  await g.joinRoom(c);
  await window.__game.getState().claimSeat(1);
}, code1);
await wait(1500);
await A.evaluate(async () => window.__game.getState().startRoom());
await wait(2500);
// drive until it's B's turn (seat 1)
for (let i = 0; i < 6 && (await cur(A)) !== 1; i++) {
  if (!(await actIf(A))) await actIf(B);
  await wait(1200);
}
const before1 = await actCount(A);
const curBefore = await cur(A);
await B.close(); // B disconnects on B's turn
await wait(12000); // presence window (~8s) + driver tick
const after1 = await actCount(A);
const curAfter = await cur(A);
console.log(`offline takeover: curBefore=${curBefore} actions ${before1}->${after1} curAfter=${curAfter}`);
const offlineOk = curBefore === 1 && after1 > before1;

// ---- Part 2: host disconnect -> handoff ----
let A2 = await open(); // host
let B2 = await open();
const code2 = await A2.evaluate(async () => {
  const g = window.__game.getState();
  g.openOnline();
  await g.createRoom(
    [{ name: "HostA", isAI: false }, { name: "PlayerB", isAI: false }, { name: "Bot", isAI: true, aiLevel: "easy" }],
    null,
    true,
  );
  return window.__game.getState().online?.code;
});
const hostId = await A2.evaluate(() => window.__game.getState().online.clientId);
const bId = await B2.evaluate(async (c) => {
  const g = window.__game.getState();
  g.openOnline();
  await g.joinRoom(c);
  await window.__game.getState().claimSeat(1);
  return window.__game.getState().online.clientId;
}, code2);
await wait(1500);
await A2.evaluate(async () => window.__game.getState().startRoom());
await wait(2500);
await A2.close(); // host disconnects
await wait(12000);
const diag = await B2.evaluate(() => {
  const o = window.__game.getState().online;
  return { hostId: o?.hostId, clientId: o?.clientId, presence: o?.presence, seats: o?.seats, status: o?.status };
});
console.log("B2 diag:", JSON.stringify(diag));
const newHost = await B2.evaluate(() => window.__game.getState().online?.hostId);
console.log(`handoff: oldHost=${hostId.slice(0, 6)} newHost=${newHost?.slice(0, 6)} bId=${bId.slice(0, 6)}`);
const handoffOk = newHost === bId;

const ok = offlineOk && handoffOk;
console.log(`\noffline=${offlineOk} handoff=${handoffOk}`);
console.log(ok ? "FAILOVER OK" : "FAILOVER FAILED");
await browser.close();
process.exit(ok ? 0 : 1);
