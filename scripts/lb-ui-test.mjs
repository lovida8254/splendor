import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://localhost:3001";
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 900, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto(`${BASE}/?test=1`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.getByRole("button", { name: /게임 시작/ }).waitFor({ timeout: 15000 });
await p.getByRole("button", { name: /전적/ }).click();
await p.getByRole("button", { name: /글로벌 리더보드/ }).click();
await p.waitForTimeout(2500);
const body = await p.evaluate(() => document.body.innerText);
const hasLbHeader = /글로벌 리더보드/.test(body);
const settled = /온라인 전적이 없습니다|플레이어/.test(body); // empty msg or a populated table
console.log("header:", hasLbHeader, "settled:", settled, "errors:", errs.length);
console.log(hasLbHeader && settled && errs.length === 0 ? "LB UI OK" : "LB UI FAILED");
await b.close();
process.exit(hasLbHeader && settled && errs.length === 0 ? 0 : 1);
