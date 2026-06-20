/* Verifies the Stats modal: empty state, then renders injected records correctly. */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3001";
const browser = await chromium.launch();
const errs = [];

async function fresh() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.getByRole("button", { name: /게임 시작/ }).waitFor({ timeout: 15000 });
  return p;
}

// 1) empty state
const p1 = await fresh();
await p1.getByRole("button", { name: /전적/ }).click();
await p1.getByText("아직 완료된 게임이 없습니다").waitFor({ timeout: 4000 });
console.log("empty state: OK");

// 2) inject records, reload, verify computed stats render
const p2 = await fresh();
await p2.evaluate(() => {
  const now = Date.now();
  const recs = [
    { ts: now, mode: "ai", players: 2, names: ["나", "AI"], winner: "나", meWon: true, mePrestige: 15, meCards: 11, meNobles: 1, turns: 28 },
    { ts: now, mode: "ai", players: 2, names: ["나", "AI"], winner: "AI", meWon: false, mePrestige: 12, meCards: 9, meNobles: 0, turns: 31 },
    { ts: now, mode: "online", players: 3, names: ["나", "B", "C"], winner: "나", meWon: true, mePrestige: 16, meCards: 13, meNobles: 2, turns: 35 },
  ];
  localStorage.setItem("splendor:stats:v1", JSON.stringify(recs));
});
await p2.reload({ waitUntil: "domcontentloaded" });
await p2.getByRole("button", { name: /게임 시작/ }).waitFor({ timeout: 15000 });
await p2.getByRole("button", { name: /전적/ }).click();
await p2.getByText("총 게임").waitFor({ timeout: 4000 });
const body = await p2.evaluate(() => document.body.innerText);

const hasGames3 = /총 게임\s*3/.test(body);
const hasWinRate = /승률\s*67%/.test(body); // 2 wins / 3 decisive
const hasBest = /최고 점수\s*16/.test(body);
console.log("games=3:", hasGames3, "winRate67%:", hasWinRate, "best16:", hasBest, "errors:", errs.length);

const ok = hasGames3 && hasWinRate && hasBest && errs.length === 0;
console.log(ok ? "\nSTATS UI OK" : "\nSTATS UI FAILED");
await browser.close();
process.exit(ok ? 0 : 1);
