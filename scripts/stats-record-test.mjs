/* End-to-end: a finished local game gets recorded to stats. */
import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:3001";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 900, height: 900 } })).newPage();
await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForFunction(() => !!window.__game, { timeout: 15000 });
await p.evaluate(() => {
  const g = window.__game.getState();
  g.setSpeed("fast");
  g.startGame([{ name: "AI1", isAI: true, aiLevel: "easy" }, { name: "AI2", isAI: true, aiLevel: "easy" }]);
});
let phase = "playing";
for (let i = 0; i < 80 && phase !== "finished"; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  phase = await p.evaluate(() => window.__game.getState().game?.phase);
}
const rec = await p.evaluate(() => {
  const raw = localStorage.getItem("splendor:stats:v1");
  const arr = raw ? JSON.parse(raw) : [];
  return { count: arr.length, last: arr[arr.length - 1] };
});
console.log("phase:", phase, "recorded:", JSON.stringify(rec));
const ok = phase === "finished" && rec.count >= 1 && rec.last?.mode === "ai" && !!rec.last?.winner;
console.log(ok ? "STATS RECORD OK" : "STATS RECORD FAILED");
await b.close();
process.exit(ok ? 0 : 1);
